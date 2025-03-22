// Custom Elements Manifest analyzer configuration for HTMLGameKit.
//
// HTMLGameKit uses a declarative `static attrs` pattern instead of
// `static get observedAttributes()`.  This plugin teaches the CEM
// analyzer to extract attribute/property metadata from that pattern,
// and resolves tag names from `defineAll()`.

// Map from class name -> tag name, mirroring defineAll() in src/index.js.
const TAG_MAP = {
  GameShell: "game-shell",
  GameRoundCounter: "game-round-counter",
  GameStat: "game-stat",
  GameTimer: "game-timer",
  GameShare: "game-share",
  GameScoreForm: "game-score-form",
  GameLeaderboard: "game-leaderboard",
  GameChallenge: "game-challenge",
  GameResultStat: "game-result-stat",
  GameQuiz: "game-quiz",
  GameResultMessage: "game-result-message",
  GameFlash: "game-flash",
  GameBetween: "game-between",
  GameSignal: "game-signal",
  GameIcon: "game-icon",
  GameAudio: "game-audio",
  GameSample: "game-sample",
  GameSequencer: "game-sequencer",
  GameTileInput: "game-tile-input",
  GameToast: "game-toast",
  GameTrophy: "game-trophy",
  GamePreferences: "game-preferences",
  GamePreference: "game-preference",
  GameScoreHistogram: "game-score-histogram",
  GameWordSource: "game-word-source",
};

// Convert kebab-case to camelCase (mirrors the runtime helper).
function camelCase(attr) {
  return attr.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

// Map our internal type names to CEM type text.
function cemType(spec) {
  switch (spec.type) {
    case "boolean":
      return { text: "boolean" };
    case "long":
    case "number":
      return { text: "number" };
    case "enum":
      return { text: (spec.values || []).map((v) => `'${v}'`).join(" | ") };
    case "string":
      return { text: "string" };
    case "string?":
      return { text: "string | null" };
    default:
      return { text: "string" };
  }
}

// Resolve the default value as a string for CEM.
function cemDefault(spec) {
  if (spec.type === "boolean") return undefined; // presence-based
  if (spec.type === "enum") {
    const d = spec.missing ?? spec.default ?? null;
    return d !== null ? `'${d}'` : undefined;
  }
  if (spec.default !== undefined) return String(spec.default);
  return undefined;
}

function htmlgamekitPlugin() {
  // Accumulated attrs data keyed by className, collected during analyzePhase.
  const classAttrs = new Map();

  return {
    name: "htmlgamekit-plugin",

    analyzePhase({ ts, node, moduleDoc }) {
      // Look for `static attrs = { ... }` on class declarations.
      if (node.kind !== ts.SyntaxKind.ClassDeclaration || !node.name) return;

      const className = node.name.text;

      for (const member of node.members || []) {
        // Match: static attrs = { ... }
        if (
          member.kind === ts.SyntaxKind.PropertyDeclaration &&
          member.modifiers?.some(
            (m) => m.kind === ts.SyntaxKind.StaticKeyword,
          ) &&
          member.name?.text === "attrs" &&
          member.initializer?.kind === ts.SyntaxKind.ObjectLiteralExpression
        ) {
          const attrs = parseStaticAttrs(ts, member.initializer);
          classAttrs.set(className, attrs);
        }
      }
    },

    moduleLinkPhase({ moduleDoc }) {
      for (const decl of moduleDoc.declarations || []) {
        if (decl.kind !== "class") continue;

        const className = decl.name;

        // --- Tag name ---
        if (!decl.tagName && TAG_MAP[className]) {
          decl.tagName = TAG_MAP[className];
          decl.customElement = true;
        }

        // All classes that map to a tag are custom elements
        if (TAG_MAP[className]) {
          decl.customElement = true;
        }

        // --- Attributes from static attrs ---
        const attrs = classAttrs.get(className);
        if (!attrs) continue;

        if (!decl.attributes) decl.attributes = [];
        if (!decl.members) decl.members = [];

        for (const [attrName, spec] of Object.entries(attrs)) {
          const type = cemType(spec);
          const dflt = cemDefault(spec);
          const propName = spec.prop || camelCase(attrName);

          // Add attribute entry (skip if JSDoc already declared it).
          if (!decl.attributes.find((a) => a.name === attrName)) {
            const attr = {
              name: attrName,
              type,
              fieldName: propName,
            };
            if (dflt !== undefined) attr.default = dflt;
            decl.attributes.push(attr);
          }

          // Add IDL property as a field member (skip if already present).
          if (!decl.members.find((m) => m.name === propName)) {
            const field = {
              kind: "field",
              name: propName,
              type,
              attribute: attrName,
            };
            if (dflt !== undefined) field.default = dflt;
            decl.members.push(field);
          }
        }
      }
    },

    packageLinkPhase({ customElementsManifest }) {
      for (const mod of customElementsManifest.modules || []) {
        for (const decl of mod.declarations || []) {
          if (!decl.tagName) continue;

          // De-duplicate events: the analyzer auto-detects dispatchEvent()
          // calls and sometimes misreads constructor args as event names.
          // Keep only events whose name starts with a known event prefix
          // or were declared via @fires (which have a description).
          if (decl.events?.length) {
            const seen = new Set();
            decl.events = decl.events.filter((e) => {
              if (!e.name) return false;
              // Events from @fires JSDoc have a description
              if (e.description && !seen.has(e.name)) {
                seen.add(e.name);
                return true;
              }
              // Keep auto-detected events that look like real event names
              // (contain a hyphen) and weren't already declared via JSDoc
              if (!e.description && e.name.includes("-") && !seen.has(e.name)) {
                seen.add(e.name);
                return true;
              }
              return false;
            });
          }

          // Ensure exports include custom-element-definition entries.
          const hasDefExport = mod.exports?.some(
            (e) =>
              e.kind === "custom-element-definition" && e.name === decl.tagName,
          );
          if (!hasDefExport) {
            if (!mod.exports) mod.exports = [];
            mod.exports.push({
              kind: "custom-element-definition",
              name: decl.tagName,
              declaration: {
                name: decl.name,
                module: mod.path,
              },
            });
          }
        }
      }
    },
  };
}

/**
 * Parse a `static attrs = { ... }` ObjectLiteralExpression into a
 * plain object keyed by attribute name, with spec fields.
 */
function parseStaticAttrs(ts, objLiteral) {
  const result = {};
  for (const prop of objLiteral.properties || []) {
    if (prop.kind !== ts.SyntaxKind.PropertyAssignment) continue;
    const attrName = prop.name?.text ?? prop.name?.getText?.();
    if (!attrName) continue;
    const spec = parseSpecObject(ts, prop.initializer);
    if (spec) result[attrName] = spec;
  }
  return result;
}

function parseSpecObject(ts, node) {
  if (node?.kind !== ts.SyntaxKind.ObjectLiteralExpression) return null;
  const spec = {};
  for (const p of node.properties || []) {
    if (p.kind !== ts.SyntaxKind.PropertyAssignment) continue;
    const key = p.name?.text ?? p.name?.getText?.();
    if (!key) continue;
    spec[key] = evalLiteral(ts, p.initializer);
  }
  return spec;
}

function evalLiteral(ts, node) {
  if (!node) return undefined;
  switch (node.kind) {
    case ts.SyntaxKind.StringLiteral:
      return node.text;
    case ts.SyntaxKind.NumericLiteral:
      return Number(node.text);
    case ts.SyntaxKind.TrueKeyword:
      return true;
    case ts.SyntaxKind.FalseKeyword:
      return false;
    case ts.SyntaxKind.NullKeyword:
      return null;
    case ts.SyntaxKind.ArrayLiteralExpression:
      return (node.elements || []).map((e) => evalLiteral(ts, e));
    default:
      return node.getText?.() ?? undefined;
  }
}

export default {
  globs: ["src/**/*.js"],
  exclude: [
    "src/synth.js",
    "src/signals.js",
    "src/auto.js",
    "src/game-base.css",
    "src/scores.js",
    "src/context.js",
    "src/conditions.js",
    "src/triggers.js",
    "src/pending-task.js",
  ],
  outdir: ".",
  plugins: [htmlgamekitPlugin()],
};
