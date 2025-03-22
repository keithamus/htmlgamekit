import { assert } from "@open-wc/testing";
import { Signal } from "../src/signals.js";
import { matchesConditions } from "../src/conditions.js";

function makeShell({
  score = 0,
  round = 0,
  rounds = 0,
  scene = "",
  roundScores = [],
  difficulty = {},
  stats = {},
  trophyCount = 0,
  unlockedTrophies = new Set(),
} = {}) {
  const roundScoresSignal = new Signal.State(roundScores);
  return {
    score: new Signal.State(score),
    round: new Signal.State(round),
    rounds: new Signal.State(rounds),
    scene: new Signal.State(scene),
    roundScores: roundScoresSignal,
    roundScore: new Signal.Computed(() => { const rs = roundScoresSignal.get(); return rs.length ? rs.at(-1) : 0; }),
    bestRoundScore: new Signal.Computed(() => { const rs = roundScoresSignal.get(); return rs.length ? rs.reduce((a, b) => Math.max(a, b), -Infinity) : 0; }),
    worstRoundScore: new Signal.Computed(() => { const rs = roundScoresSignal.get(); return rs.length ? rs.reduce((a, b) => Math.min(a, b), Infinity) : 0; }),
    difficulty: new Signal.State(difficulty),
    stats: new Signal.State(stats),
    trophyCount,
    isTrophyUnlocked: (id) => unlockedTrophies.has(id),
  };
}

describe("matchesConditions red-team", () => {
  let el;

  beforeEach(() => {
    el = document.createElement("div");
  });

  afterEach(() => {
    el.remove();
  });

  describe("NaN and Infinity in numeric conditions", () => {
    it("NaN condition value fails (non-finite threshold is rejected)", () => {
      el.setAttribute("when-min-score", "abc");
      assert.isFalse(matchesConditions(el, makeShell({ score: 0 })));
    });

    it("Infinity as min-score fails (non-finite threshold is rejected)", () => {
      el.setAttribute("when-min-score", "Infinity");
      assert.isFalse(matchesConditions(el, makeShell({ score: 999999 })));
      assert.isFalse(matchesConditions(el, makeShell({ score: Infinity })));
    });

    it("negative threshold in when-min-score passes for almost any score", () => {
      el.setAttribute("when-min-score", "-10");
      assert.isTrue(matchesConditions(el, makeShell({ score: 0 })));
      assert.isTrue(matchesConditions(el, makeShell({ score: -9 })));
      assert.isFalse(matchesConditions(el, makeShell({ score: -11 })));
    });
  });

  describe("when-eq-scene edge cases", () => {
    it("empty when-eq-scene blocks everything with a non-empty scene", () => {
      el.setAttribute("when-eq-scene", "");
      assert.isFalse(matchesConditions(el, makeShell({ scene: "playing" })));
      assert.isFalse(matchesConditions(el, makeShell({ scene: "init" })));
    });

    it("empty when-eq-scene passes when scene is empty string", () => {
      el.setAttribute("when-eq-scene", "");
      assert.isTrue(matchesConditions(el, makeShell({ scene: "" })));
    });

    it("XSS string in when-eq-scene is just a string comparison", () => {
      const xss = "<script>alert(1)</script>";
      el.setAttribute("when-eq-scene", xss);
      assert.isFalse(matchesConditions(el, makeShell({ scene: "playing" })));
      assert.isTrue(matchesConditions(el, makeShell({ scene: xss })));
    });
  });

  describe("difficulty with missing object", () => {
    it("fails when difficulty has no matching key", () => {
      el.setAttribute("when-eq-tier-name", "Hard");
      assert.isFalse(matchesConditions(el, makeShell({ difficulty: {} })));
    });

    it("fails when difficulty signal is empty object", () => {
      el.setAttribute("when-eq-tier-name", "Hard");
      assert.isFalse(matchesConditions(el, makeShell()));
    });
  });

  describe("when-min-trophy-count edge cases", () => {
    it("fails when trophyCount is 0", () => {
      el.setAttribute("when-min-trophy-count", "1");
      assert.isFalse(matchesConditions(el, makeShell({ trophyCount: 0 })));
    });
  });

  describe("when-some-trophy / when-no-trophy with no unlocked trophies", () => {
    it("when-some-trophy fails when no trophies unlocked", () => {
      el.setAttribute("when-some-trophy", "gold");
      assert.isFalse(matchesConditions(el, makeShell()));
    });

    it("when-no-trophy passes when no trophies unlocked", () => {
      el.setAttribute("when-no-trophy", "gold");
      assert.isTrue(matchesConditions(el, makeShell()));
    });

    it("trophy id hyphens are preserved in lookup", () => {
      el.setAttribute("when-some-trophy", "gold-star");
      // "goldstar" (no hyphen) should NOT match id="gold-star"
      assert.isFalse(matchesConditions(el, makeShell({ unlockedTrophies: new Set(["goldstar"]) })));
      assert.isTrue(matchesConditions(el, makeShell({ unlockedTrophies: new Set(["gold-star"]) })));
    });
  });

  describe("roundScores edge cases", () => {
    it("empty roundScores defaults to 0 for when-min-round-score", () => {
      el.setAttribute("when-min-round-score", "5");
      // empty roundScores → resolves to undefined → defaults to 0 → 0 < 5 → fails
      assert.isFalse(matchesConditions(el, makeShell({ roundScores: [] })));
    });

    it("empty roundScores defaults to 0 for when-max-round-score", () => {
      el.setAttribute("when-max-round-score", "5");
      // empty roundScores → resolves to undefined → defaults to 0 → 0 <= 5 → passes
      assert.isTrue(matchesConditions(el, makeShell({ roundScores: [] })));
    });

    it("extremely large roundScores array does not crash", () => {
      el.setAttribute("when-min-round-score", "5");
      const huge = new Array(200_000).fill(10);
      assert.isTrue(matchesConditions(el, makeShell({ roundScores: huge })));
    });
  });

  describe("impossible condition combinations (AND logic)", () => {
    it("min-score > max-score is always false", () => {
      el.setAttribute("when-min-score", "5");
      el.setAttribute("when-max-score", "3");
      assert.isFalse(matchesConditions(el, makeShell({ score: 4 })));
      assert.isFalse(matchesConditions(el, makeShell({ score: 5 })));
      assert.isFalse(matchesConditions(el, makeShell({ score: 3 })));
    });

    it("min-round > max-round is always false", () => {
      el.setAttribute("when-min-round", "10");
      el.setAttribute("when-max-round", "5");
      assert.isFalse(matchesConditions(el, makeShell({ round: 7 })));
    });
  });

  describe("unknown comparators are silently ignored", () => {
    it("an unrecognised when- prefix does not crash and passes", () => {
      el.setAttribute("when-weird-score", "10");
      assert.isTrue(matchesConditions(el, makeShell({ score: 5 })));
    });
  });
});
