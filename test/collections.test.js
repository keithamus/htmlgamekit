import { assert } from "@open-wc/testing";
import { matchesConditions } from "../src/conditions.js";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("collections", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  describe("shell API", () => {
    it("addToCollection creates collection and adds item", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-add" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      const added = shell.addToCollection("inventory", "sword");
      assert.isTrue(added);
      assert.isTrue(shell.hasInCollection("inventory", "sword"));
    });

    it("addToCollection returns false for duplicate", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-dup" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      shell.addToCollection("inventory", "sword");
      const second = shell.addToCollection("inventory", "sword");
      assert.isFalse(second);
    });

    it("removeFromCollection removes an item", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-rm" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      shell.addToCollection("inventory", "key");
      assert.isTrue(shell.hasInCollection("inventory", "key"));

      const removed = shell.removeFromCollection("inventory", "key");
      assert.isTrue(removed);
      assert.isFalse(shell.hasInCollection("inventory", "key"));
    });

    it("removeFromCollection returns false for missing item", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-rm-miss" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      const removed = shell.removeFromCollection("inventory", "nothing");
      assert.isFalse(removed);
    });

    it("hasInCollection returns false for unknown collection", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-unknown" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      assert.isFalse(shell.hasInCollection("nope", "thing"));
    });

    it("collectionSize tracks count", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-size" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      assert.equal(shell.collectionSize("inventory"), 0);
      shell.addToCollection("inventory", "a");
      assert.equal(shell.collectionSize("inventory"), 1);
      shell.addToCollection("inventory", "b");
      assert.equal(shell.collectionSize("inventory"), 2);
      shell.removeFromCollection("inventory", "a");
      assert.equal(shell.collectionSize("inventory"), 1);
    });

    it("collectionEntries returns all items", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-entries" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      shell.addToCollection("visited", "room-a");
      shell.addToCollection("visited", "room-b");
      const entries = shell.collectionEntries("visited");
      assert.includeMembers(entries, ["room-a", "room-b"]);
      assert.equal(entries.length, 2);
    });

    it("collectionEntries returns empty array for unknown collection", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-entries-empty" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      assert.deepEqual(shell.collectionEntries("nope"), []);
    });

    it("clearCollection empties a collection", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-clear" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      shell.addToCollection("flags", "a");
      shell.addToCollection("flags", "b");
      assert.equal(shell.collectionSize("flags"), 2);

      shell.clearCollection("flags");
      assert.equal(shell.collectionSize("flags"), 0);
      assert.isFalse(shell.hasInCollection("flags", "a"));
    });

    it("isCollection returns true for registered collections", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-is" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      assert.isFalse(shell.isCollection("inventory"));
      shell.addToCollection("inventory", "x");
      assert.isTrue(shell.isCollection("inventory"));
    });
  });

  describe("persistence", () => {
    it("persists collection to localStorage", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-persist" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      shell.addToCollection("inventory", "lamp");
      shell.addToCollection("inventory", "key");

      const raw = localStorage.getItem("coll-persist-collection-inventory");
      assert.isNotNull(raw);
      const saved = JSON.parse(raw);
      assert.includeMembers(saved, ["lamp", "key"]);
    });

    it("removes localStorage key when collection is cleared", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-persist-clear" rounds="1"></game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");

      shell.addToCollection("flags", "done");
      assert.isNotNull(
        localStorage.getItem("coll-persist-clear-collection-flags"),
      );

      shell.clearCollection("flags");
      assert.isNull(
        localStorage.getItem("coll-persist-clear-collection-flags"),
      );
    });
  });

  describe("events", () => {
    it("game-collection-add event triggers addToCollection", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-event-add" rounds="1">
          <div id="child"></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const child = document.querySelector("#child");

      child.dispatchEvent(
        new CustomEvent("game-collection-add", {
          bubbles: true,
          composed: true,
          detail: null,
        }),
      );
      // That event doesn't have collection/itemId properties - test the real event
      const { GameCollectionAddEvent } = await import("../src/events.js");
      child.dispatchEvent(new GameCollectionAddEvent("inventory", "sword"));

      assert.isTrue(shell.hasInCollection("inventory", "sword"));
    });

    it("game-collection-remove event triggers removeFromCollection", async () => {
      document.body.innerHTML = `
        <game-shell game-id="coll-event-rm" rounds="1">
          <div id="child"></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.addToCollection("inventory", "key");

      const { GameCollectionRemoveEvent } = await import("../src/events.js");
      const child = document.querySelector("#child");
      child.dispatchEvent(new GameCollectionRemoveEvent("inventory", "key"));

      assert.isFalse(shell.hasInCollection("inventory", "key"));
    });
  });

  describe("conditions", () => {
    function makeShell(collections = {}) {
      const shell = {
        scene: { get: () => "playing" },
        score: { get: () => 0 },
        round: { get: () => 1 },
        rounds: { get: () => 5 },
        difficulty: { get: () => ({}) },
        stats: { get: () => ({}) },
        roundScores: { get: () => [] },
        roundScore: { get: () => 0 },
        bestRoundScore: { get: () => 0 },
        worstRoundScore: { get: () => 0 },
        trophyCount: 0,
        isTrophyUnlocked: () => false,
        _collections: new Map(),
        addToCollection(name, id) {
          if (!this._collections.has(name))
            this._collections.set(name, new Set());
          this._collections.get(name).add(id);
        },
        hasInCollection(name, id) {
          return this._collections.get(name)?.has(id) ?? false;
        },
        collectionSize(name) {
          return this._collections.get(name)?.size ?? 0;
        },
        isCollection(name) {
          return this._collections.has(name);
        },
      };
      for (const [name, items] of Object.entries(collections)) {
        for (const id of items) shell.addToCollection(name, id);
      }
      return shell;
    }

    it("when-some-inventory passes when item is present", () => {
      const el = document.createElement("div");
      el.setAttribute("when-some-inventory", "sword");
      const shell = makeShell({ inventory: ["sword", "shield"] });
      assert.isTrue(matchesConditions(el, shell));
    });

    it("when-some-inventory fails when item is absent", () => {
      const el = document.createElement("div");
      el.setAttribute("when-some-inventory", "sword");
      const shell = makeShell({ inventory: ["shield"] });
      assert.isFalse(matchesConditions(el, shell));
    });

    it("when-some with multiple IDs passes if any present", () => {
      const el = document.createElement("div");
      el.setAttribute("when-some-inventory", "sword lamp");
      const shell = makeShell({ inventory: ["lamp"] });
      assert.isTrue(matchesConditions(el, shell));
    });

    it("when-no-inventory passes when item is absent", () => {
      const el = document.createElement("div");
      el.setAttribute("when-no-inventory", "sword");
      const shell = makeShell({ inventory: ["shield"] });
      assert.isTrue(matchesConditions(el, shell));
    });

    it("when-no-inventory fails when item is present", () => {
      const el = document.createElement("div");
      el.setAttribute("when-no-inventory", "sword");
      const shell = makeShell({ inventory: ["sword"] });
      assert.isFalse(matchesConditions(el, shell));
    });

    it("when-all-inventory passes when all items present", () => {
      const el = document.createElement("div");
      el.setAttribute("when-all-inventory", "sword shield");
      const shell = makeShell({ inventory: ["sword", "shield", "lamp"] });
      assert.isTrue(matchesConditions(el, shell));
    });

    it("when-all-inventory fails when some items missing", () => {
      const el = document.createElement("div");
      el.setAttribute("when-all-inventory", "sword shield");
      const shell = makeShell({ inventory: ["sword"] });
      assert.isFalse(matchesConditions(el, shell));
    });

    it("works with kebab-case collection names", () => {
      const el = document.createElement("div");
      el.setAttribute("when-some-system-prompt", "found");
      const shell = makeShell({ systemPrompt: ["found"] });
      assert.isTrue(matchesConditions(el, shell));
    });

    it("multiple collection conditions combine with AND", () => {
      const el = document.createElement("div");
      el.setAttribute("when-some-inventory", "key");
      el.setAttribute("when-some-visited", "cellar");
      const shell = makeShell({
        inventory: ["key"],
        visited: ["cellar", "kitchen"],
      });
      assert.isTrue(matchesConditions(el, shell));
    });

    it("multiple collection conditions fail if one fails", () => {
      const el = document.createElement("div");
      el.setAttribute("when-some-inventory", "key");
      el.setAttribute("when-some-visited", "cellar");
      const shell = makeShell({ inventory: ["key"], visited: ["kitchen"] });
      assert.isFalse(matchesConditions(el, shell));
    });

    it("collection conditions don't interfere with trophy conditions", () => {
      const el = document.createElement("div");
      el.setAttribute("when-some-trophy", "star");
      const shell = makeShell({ inventory: ["sword"] });
      shell.isTrophyUnlocked = (id) => id === "star";
      assert.isTrue(matchesConditions(el, shell));
    });
  });
});
