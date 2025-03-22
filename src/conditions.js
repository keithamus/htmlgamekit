/**
 * Generic condition system for declarative elements.
 *
 * Checks `when-*` attributes against live shell signals. When called
 * inside an effect, only the signals actually read become dependencies.
 *
 * All conditions follow the pattern: when-{comparator}-{key}="value"
 *
 *   when-min-{key}="N"         -- resolve(key) >= N (numeric)
 *   when-max-{key}="N"         -- resolve(key) <= N (numeric)
 *   when-eq-{key}="value"      -- resolve(key) === value (string equality)
 *   when-no-{key}              -- falsy check (no value: !resolve(key))
 *   when-no-{key}="a b"        -- resolve(key) is not in the set {a, b}
 *   when-some-{key}            -- truthy check (no value: resolve(key))
 *   when-some-{key}="a b"      -- resolve(key) is in the set {a, b}
 *   when-all-{key}="a b"       -- resolve(key) matches all values in the set
 *   when-prob="0.4"            -- Math.random() < 0.4 (stochastic, 0-1)
 *
 * Trophy checks use the key "trophy" with space-separated trophy ids:
 *   when-some-trophy="id"      -- any of the listed trophies are unlocked
 *   when-no-trophy="id"        -- none of the listed trophies are unlocked
 *   when-all-trophy="ida idb"  -- all of the listed trophies are unlocked
 *
 * Scene values support the "intro" alias, which expands to {init, demo, ready}.
 *
 * Key resolution: after the operator is stripped, the remaining kebab-case
 * string is camelCased. So `when-min-pass-streak` → operator `min`, key `passStreak`.
 * Resolution order: shell signals > round scores > trophy count > difficulty > stats.
 */

import { camelCase } from "./component.js";

const SCENE_INTRO = new Set(["init", "demo", "ready"]);

function sceneValues(val) {
  return val.trim().split(/\s+/).flatMap(
    v => v === "intro" ? [...SCENE_INTRO] : [v]
  );
}

/** @deprecated Use camelCase key resolution instead. Only kept for difficulty/stats fallback matching. */
export function normalise(str) {
  return str.replace(/-/g, "").toLowerCase();
}

export function resolve(key, shell) {
  // Direct signal lookup — any Signal.State on the shell is resolved generically.
  const sig = shell[key];
  if (sig && typeof sig.get === "function") return sig.get();

  // trophyCount is a plain getter, not a signal.
  if (key === "trophyCount") return shell.trophyCount;

  // Difficulty and stats object properties.
  const diff = shell.difficulty.get();
  if (diff && typeof diff === "object") {
    for (const [k, v] of Object.entries(diff)) {
      if (camelCase(k) === key) return v;
    }
  }

  const stats = shell.stats.get();
  if (stats && typeof stats === "object") {
    for (const [k, v] of Object.entries(stats)) {
      if (camelCase(k) === key) return v;
    }
  }

  return undefined;
}

export function matchesConditions(el, shell) {
  for (const attr of el.attributes) {
    if (!attr.name.startsWith("when-")) continue;
    const rest = attr.name.slice(5);
    const val = attr.value;

    if (rest === "prob") {
      const p = Number(val);
      if (!Number.isFinite(p) || Math.random() >= p) return false;
      continue;
    }

    if (rest.startsWith("min-")) {
      const key = camelCase(rest.slice(4));
      const n = Number(val);
      if (!Number.isFinite(n) || (resolve(key, shell) ?? 0) < n) return false;
    } else if (rest.startsWith("max-")) {
      const key = camelCase(rest.slice(4));
      const n = Number(val);
      if (!Number.isFinite(n) || (resolve(key, shell) ?? 0) > n) return false;
    } else if (rest.startsWith("eq-")) {
      const key = camelCase(rest.slice(3));
      if (String(resolve(key, shell) ?? "") !== val) return false;
    } else if (rest.startsWith("no-")) {
      const key = camelCase(rest.slice(3));
      if (key === "trophy") {
        const ids = val.trim().split(/\s+/);
        if (ids.some(id => shell.isTrophyUnlocked(id))) return false;
      } else if (val) {
        const cur = String(resolve(key, shell) ?? "");
        const set = key === "scene" ? sceneValues(val) : val.trim().split(/\s+/);
        if (set.includes(cur)) return false;
      } else {
        if (resolve(key, shell)) return false;
      }
    } else if (rest.startsWith("some-")) {
      const key = camelCase(rest.slice(5));
      if (key === "trophy") {
        const ids = val.trim().split(/\s+/);
        if (!ids.some(id => shell.isTrophyUnlocked(id))) return false;
      } else if (val) {
        const cur = String(resolve(key, shell) ?? "");
        const set = key === "scene" ? sceneValues(val) : val.trim().split(/\s+/);
        if (!set.includes(cur)) return false;
      } else {
        if (!resolve(key, shell)) return false;
      }
    } else if (rest.startsWith("all-")) {
      const key = camelCase(rest.slice(4));
      if (key === "trophy") {
        const ids = val.trim().split(/\s+/);
        if (!ids.every(id => shell.isTrophyUnlocked(id))) return false;
      } else {
        const cur = String(resolve(key, shell) ?? "");
        const set = key === "scene" ? sceneValues(val) : val.trim().split(/\s+/);
        if (!set.every(v => v === cur)) return false;
      }
    }
  }
  return true;
}
