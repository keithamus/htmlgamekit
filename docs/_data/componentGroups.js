// Groups used by the UI Components index page. Each entry has a name and
// an ordered list of tag names. Tags not listed here are omitted from the
// index table (edge case: they still appear in the sidebar via nav.js).

module.exports = [
  {
    name: "HUD & In-Game Display",
    tags: [
      "game-round-counter",
      "game-stat",
      "game-signal",
      "game-timer",
      "game-between",
    ],
  },
  {
    name: "Feedback & Effects",
    tags: ["game-flash", "game-toast"],
  },
  {
    name: "Results & Scoring",
    tags: [
      "game-result-stat",
      "game-result-message",
      "game-score-form",
      "game-leaderboard",
      "game-score-histogram",
    ],
  },
  {
    name: "Social & Multiplayer",
    tags: ["game-share", "game-challenge", "game-trophy"],
  },
  {
    name: "Settings",
    tags: ["game-preferences", "game-preference"],
  },
  {
    name: "Game Logic",
    tags: ["game-quiz", "game-tile-input", "game-word-source", "game-passage"],
  },
  {
    name: "Primitives",
    tags: ["game-icon", "game-debug"],
  },
  {
    name: "Audio",
    tags: ["game-audio", "game-sample", "game-sequencer"],
  },
];
