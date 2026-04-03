// Navigation data. Component children are derived from the CEM so adding a
// component to source automatically adds it to the sidebar without touching
// this file. Only display-name overrides and sort order are maintained here.

const fs = require("fs");
const path = require("path");

// Human-readable titles for tags where "Game Foo" (default derivation) is
// not the right label.
const DISPLAY_NAMES = {
  "game-round-counter": "Round Counter",
  "game-stat": "Stat",
  "game-signal": "Signal",
  "game-score-histogram": "Score Histogram",
  "game-result-stat": "Result Stat",
  "game-result-message": "Result Message",
  "game-score-form": "Score Form",
  "game-tile-input": "Tile Input",
  "game-word-source": "Word Source",
};

// Explicit display order. Tags not listed here appear alphabetically at
// the end of the list.
const NAV_ORDER = [
  "game-timer",
  "game-flash",
  "game-between",
  "game-toast",
  "game-round-counter",
  "game-stat",
  "game-signal",
  "game-result-stat",
  "game-result-message",
  "game-score-form",
  "game-leaderboard",
  "game-score-histogram",
  "game-share",
  "game-challenge",
  "game-trophy",
  "game-preferences",
  "game-preference",
  "game-quiz",
  "game-tile-input",
  "game-word-source",
  "game-icon",
  "game-audio",
  "game-sample",
  "game-sequencer",
  "game-passage",
  "game-debug",
];

function defaultTitle(tag) {
  // "game-foo-bar" → "Foo Bar"
  return tag
    .replace("game-", "")
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

module.exports = () => {
  const manifestPath = path.resolve(__dirname, "../../custom-elements.json");
  if (!fs.existsSync(manifestPath)) return [];

  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const knownTags = new Set();
  for (const mod of manifest.modules || []) {
    for (const decl of mod.declarations || []) {
      if (decl.tagName && decl.tagName !== "game-shell") {
        knownTags.add(decl.tagName);
      }
    }
  }

  const ordered = NAV_ORDER.filter((t) => knownTags.has(t));
  const remainder = [...knownTags].filter((t) => !NAV_ORDER.includes(t)).sort();

  const componentChildren = [...ordered, ...remainder].map((tag) => ({
    title: DISPLAY_NAMES[tag] || defaultTitle(tag),
    url: `/api/components/${tag.replace("game-", "")}/`,
  }));

  return [
    { title: "Getting Started", url: "/getting-started/" },
    { title: "Architecture", url: "/architecture/" },
    { section: "Concepts" },
    { title: "GameComponent", url: "/api/game-component/" },
    { title: "Events", url: "/api/events/" },
    { title: "Signals", url: "/api/signals/" },
    { title: "Context Protocol", url: "/api/context/" },
    { title: "Scenes", url: "/api/scenes/" },
    { title: "Triggers", url: "/api/triggers/" },
    { title: "Conditions", url: "/api/conditions/" },
    { title: "Scoring", url: "/scoring/" },
    { section: "API Reference" },
    { title: "GameShell", url: "/api/game-shell/" },
    { title: "Round Progressions", url: "/api/progressions/" },
    { title: "Game Area", url: "/api/area/" },
    { title: "HUD", url: "/api/hud/" },
    {
      title: "UI Components",
      url: "/api/components/",
      children: componentChildren,
    },
    { title: "Utilities", url: "/api/utilities/" },
    { section: "Tutorials" },
    { title: "Click Counter", url: "/tutorials/click-counter/" },
    { title: "Reaction Time", url: "/tutorials/reaction-time/" },
    { title: "Capital Quiz", url: "/tutorials/capital-quiz/" },
    { title: "Word Guess", url: "/tutorials/word-guess/" },
    { title: "Scoring & Leaderboards", url: "/tutorials/scoring/" },
  ];
};
