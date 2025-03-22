import { assert } from "@open-wc/testing";
import { Signal } from "../src/signals.js";
import { matchesConditions } from "../src/conditions.js";

/**
 * Build a minimal shell mock with Signal.State properties.
 * Only the fields provided are populated; others default to sensible values.
 */
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
    roundScore: new Signal.Computed(() => {
      const rs = roundScoresSignal.get();
      return rs.length ? rs.at(-1) : 0;
    }),
    bestRoundScore: new Signal.Computed(() => {
      const rs = roundScoresSignal.get();
      return rs.length ? rs.reduce((a, b) => Math.max(a, b), -Infinity) : 0;
    }),
    worstRoundScore: new Signal.Computed(() => {
      const rs = roundScoresSignal.get();
      return rs.length ? rs.reduce((a, b) => Math.min(a, b), Infinity) : 0;
    }),
    difficulty: new Signal.State(difficulty),
    stats: new Signal.State(stats),
    trophyCount,
    isTrophyUnlocked: (id) => unlockedTrophies.has(id),
  };
}

describe("matchesConditions", () => {
  let el;

  beforeEach(() => {
    el = document.createElement("div");
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("returns true when no conditions are set", () => {
    assert.isTrue(matchesConditions(el, makeShell({ score: 5, round: 2 })));
  });

  describe("when-min-score", () => {
    it("passes when score >= N", () => {
      el.setAttribute("when-min-score", "10");
      assert.isTrue(matchesConditions(el, makeShell({ score: 10 })));
      assert.isTrue(matchesConditions(el, makeShell({ score: 20 })));
    });

    it("fails when score < N", () => {
      el.setAttribute("when-min-score", "10");
      assert.isFalse(matchesConditions(el, makeShell({ score: 9 })));
    });
  });

  describe("when-max-score", () => {
    it("passes when score <= N", () => {
      el.setAttribute("when-max-score", "10");
      assert.isTrue(matchesConditions(el, makeShell({ score: 10 })));
      assert.isTrue(matchesConditions(el, makeShell({ score: 5 })));
    });

    it("fails when score > N", () => {
      el.setAttribute("when-max-score", "10");
      assert.isFalse(matchesConditions(el, makeShell({ score: 11 })));
    });
  });

  describe("when-min-round", () => {
    it("passes when round >= N", () => {
      el.setAttribute("when-min-round", "3");
      assert.isTrue(matchesConditions(el, makeShell({ round: 3 })));
      assert.isTrue(matchesConditions(el, makeShell({ round: 5 })));
    });

    it("fails when round < N", () => {
      el.setAttribute("when-min-round", "3");
      assert.isFalse(matchesConditions(el, makeShell({ round: 2 })));
    });
  });

  describe("when-max-round", () => {
    it("passes when round <= N", () => {
      el.setAttribute("when-max-round", "5");
      assert.isTrue(matchesConditions(el, makeShell({ round: 5 })));
      assert.isTrue(matchesConditions(el, makeShell({ round: 3 })));
    });

    it("fails when round > N", () => {
      el.setAttribute("when-max-round", "5");
      assert.isFalse(matchesConditions(el, makeShell({ round: 6 })));
    });
  });

  describe("when-min-{stat} / when-max-{stat}", () => {
    it("passes when stat value >= N", () => {
      el.setAttribute("when-min-streak", "3");
      assert.isTrue(matchesConditions(el, makeShell({ stats: { streak: 3 } })));
      assert.isTrue(matchesConditions(el, makeShell({ stats: { streak: 5 } })));
    });

    it("fails when stat value < N", () => {
      el.setAttribute("when-min-streak", "3");
      assert.isFalse(
        matchesConditions(el, makeShell({ stats: { streak: 2 } })),
      );
    });

    it("defaults missing stat to 0", () => {
      el.setAttribute("when-min-streak", "1");
      assert.isFalse(matchesConditions(el, makeShell({ stats: {} })));
      assert.isFalse(matchesConditions(el, makeShell()));
    });

    it("passes when stat value <= N", () => {
      el.setAttribute("when-max-avg-time", "500");
      assert.isTrue(
        matchesConditions(el, makeShell({ stats: { avgTime: 400 } })),
      );
      assert.isFalse(
        matchesConditions(el, makeShell({ stats: { avgTime: 600 } })),
      );
    });
  });

  describe("when-eq-{key}", () => {
    it("passes when scene matches", () => {
      el.setAttribute("when-eq-scene", "playing");
      assert.isTrue(matchesConditions(el, makeShell({ scene: "playing" })));
    });

    it("fails when scene does not match", () => {
      el.setAttribute("when-eq-scene", "playing");
      assert.isFalse(matchesConditions(el, makeShell({ scene: "result" })));
    });

    it("matches difficulty property by normalised key", () => {
      el.setAttribute("when-eq-tier-name", "Hard");
      assert.isTrue(
        matchesConditions(el, makeShell({ difficulty: { tierName: "Hard" } })),
      );
      assert.isFalse(
        matchesConditions(el, makeShell({ difficulty: { tierName: "Easy" } })),
      );
    });
  });

  describe("when-some-trophy / when-no-trophy", () => {
    it("when-some-trophy passes when trophy is unlocked", () => {
      el.setAttribute("when-some-trophy", "gold-star");
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["gold-star"]) }),
        ),
      );
    });

    it("when-some-trophy fails when trophy is not unlocked", () => {
      el.setAttribute("when-some-trophy", "gold-star");
      assert.isFalse(matchesConditions(el, makeShell()));
    });

    it("when-some-trophy preserves hyphens in id", () => {
      el.setAttribute("when-some-trophy", "gold-star");
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["gold-star"]) }),
        ),
      );
      assert.isFalse(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["goldstar"]) }),
        ),
      );
    });

    it("when-no-trophy passes when trophy is NOT unlocked", () => {
      el.setAttribute("when-no-trophy", "gold-star");
      assert.isTrue(matchesConditions(el, makeShell()));
    });

    it("when-no-trophy fails when trophy IS unlocked", () => {
      el.setAttribute("when-no-trophy", "gold-star");
      assert.isFalse(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["gold-star"]) }),
        ),
      );
    });
  });

  describe("when-min-trophy-count / when-max-trophy-count", () => {
    it("passes when unlocked count >= N", () => {
      el.setAttribute("when-min-trophy-count", "3");
      assert.isTrue(matchesConditions(el, makeShell({ trophyCount: 3 })));
      assert.isTrue(matchesConditions(el, makeShell({ trophyCount: 5 })));
    });

    it("fails when unlocked count < N", () => {
      el.setAttribute("when-min-trophy-count", "3");
      assert.isFalse(matchesConditions(el, makeShell({ trophyCount: 2 })));
    });

    it("defaults to 0 when no trophies unlocked", () => {
      el.setAttribute("when-min-trophy-count", "1");
      assert.isFalse(matchesConditions(el, makeShell()));
    });
  });

  describe("when-min-round-score / when-max-round-score", () => {
    it("when-min-round-score passes when last round score >= N", () => {
      el.setAttribute("when-min-round-score", "5");
      assert.isTrue(
        matchesConditions(el, makeShell({ roundScores: [5, 8, 10] })),
      );
    });

    it("when-min-round-score fails when last round score < N", () => {
      el.setAttribute("when-min-round-score", "5");
      assert.isFalse(matchesConditions(el, makeShell({ roundScores: [3] })));
    });

    it("when-max-round-score passes when best round score <= N", () => {
      el.setAttribute("when-max-round-score", "10");
      assert.isTrue(
        matchesConditions(el, makeShell({ roundScores: [5, 8, 10] })),
      );
    });

    it("when-max-round-score fails when best round score > N", () => {
      el.setAttribute("when-max-round-score", "10");
      assert.isFalse(
        matchesConditions(el, makeShell({ roundScores: [5, 8, 11] })),
      );
    });
  });

  describe("when-some-{key} / when-no-{key}", () => {
    it("when-some with no value: passes when value is truthy", () => {
      el.setAttribute("when-some-streak", "");
      assert.isTrue(matchesConditions(el, makeShell({ stats: { streak: 3 } })));
      assert.isFalse(
        matchesConditions(el, makeShell({ stats: { streak: 0 } })),
      );
    });

    it("when-no with no value: passes when value is falsy", () => {
      el.setAttribute("when-no-streak", "");
      assert.isTrue(matchesConditions(el, makeShell({ stats: { streak: 0 } })));
      assert.isFalse(
        matchesConditions(el, makeShell({ stats: { streak: 3 } })),
      );
    });

    it("when-some with value: passes when resolved value is in the set", () => {
      el.setAttribute("when-some-scene", "playing between");
      assert.isTrue(matchesConditions(el, makeShell({ scene: "playing" })));
      assert.isTrue(matchesConditions(el, makeShell({ scene: "between" })));
      assert.isFalse(matchesConditions(el, makeShell({ scene: "result" })));
    });

    it("when-no with value: passes when resolved value is NOT in the set", () => {
      el.setAttribute("when-no-scene", "intro result");
      assert.isTrue(matchesConditions(el, makeShell({ scene: "playing" })));
      assert.isFalse(matchesConditions(el, makeShell({ scene: "init" })));
      assert.isFalse(matchesConditions(el, makeShell({ scene: "result" })));
    });

    it("when-some-scene: 'intro' alias matches init, demo, ready", () => {
      el.setAttribute("when-some-scene", "intro");
      assert.isTrue(matchesConditions(el, makeShell({ scene: "init" })));
      assert.isTrue(matchesConditions(el, makeShell({ scene: "demo" })));
      assert.isTrue(matchesConditions(el, makeShell({ scene: "ready" })));
      assert.isFalse(matchesConditions(el, makeShell({ scene: "playing" })));
    });

    it("when-no-scene: 'intro' alias excludes init, demo, ready", () => {
      el.setAttribute("when-no-scene", "intro");
      assert.isFalse(matchesConditions(el, makeShell({ scene: "init" })));
      assert.isFalse(matchesConditions(el, makeShell({ scene: "ready" })));
      assert.isTrue(matchesConditions(el, makeShell({ scene: "playing" })));
    });

    it("when-some-trophy with multiple ids: passes when any is unlocked", () => {
      el.setAttribute("when-some-trophy", "star crown");
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["star"]) }),
        ),
      );
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["crown"]) }),
        ),
      );
      assert.isFalse(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["other"]) }),
        ),
      );
    });

    it("when-no-trophy with multiple ids: passes when none are unlocked", () => {
      el.setAttribute("when-no-trophy", "star crown");
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["other"]) }),
        ),
      );
      assert.isFalse(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["star"]) }),
        ),
      );
      assert.isFalse(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["star", "crown"]) }),
        ),
      );
    });
  });

  describe("when-all-{key}", () => {
    it("when-all-trophy: passes when all listed trophies are unlocked", () => {
      el.setAttribute("when-all-trophy", "star crown");
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["star", "crown"]) }),
        ),
      );
      assert.isFalse(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["star"]) }),
        ),
      );
      assert.isFalse(
        matchesConditions(el, makeShell({ unlockedTrophies: new Set([]) })),
      );
    });

    it("when-all-trophy with one id: equivalent to when-some-trophy", () => {
      el.setAttribute("when-all-trophy", "star");
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ unlockedTrophies: new Set(["star"]) }),
        ),
      );
      assert.isFalse(
        matchesConditions(el, makeShell({ unlockedTrophies: new Set([]) })),
      );
    });
  });

  describe("multiple conditions (AND logic)", () => {
    it("passes when all conditions are met", () => {
      el.setAttribute("when-min-score", "10");
      el.setAttribute("when-min-round", "2");
      el.setAttribute("when-eq-scene", "playing");
      assert.isTrue(
        matchesConditions(
          el,
          makeShell({ score: 15, round: 3, scene: "playing" }),
        ),
      );
    });

    it("fails when any condition is not met", () => {
      el.setAttribute("when-min-score", "10");
      el.setAttribute("when-min-round", "2");
      el.setAttribute("when-eq-scene", "playing");
      assert.isFalse(
        matchesConditions(
          el,
          makeShell({ score: 5, round: 3, scene: "playing" }),
        ),
      );
    });
  });
});
