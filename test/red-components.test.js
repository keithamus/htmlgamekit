import { assert } from "@open-wc/testing";
import "../src/auto.js";
import GameComponent from "../src/component.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("red-team: component edge cases", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  describe("trophy edge cases", () => {
    it("unlocking one trophy does not affect others", async () => {
      document.body.innerHTML = `
        <game-shell game-id="red-trophy-isolate" rounds="3">
          <game-trophy id="a" name="A"></game-trophy>
          <game-trophy id="b" name="B"></game-trophy>
        </game-shell>
      `;
      await tick();
      document.querySelector("game-trophy#a").unlock();
      assert.isTrue(document.querySelector("game-trophy#a").unlocked);
      assert.isFalse(document.querySelector("game-trophy#b").unlocked);
    });

    it("duplicate unlock does not fire a second event", async () => {
      document.body.innerHTML = `
        <game-shell game-id="red-trophy-dup" rounds="3">
          <game-trophy id="dup" name="Dup"></game-trophy>
        </game-shell>
      `;
      await tick();
      const trophy = document.querySelector("game-trophy#dup");
      const events = [];
      trophy.addEventListener("game-trophy-unlock", (e) => events.push(e));

      trophy.unlock();
      trophy.unlock();
      trophy.unlock();

      assert.equal(events.length, 1);
      assert.isTrue(trophy.unlocked);
    });

    it("trophy without an id still unlocks cleanly", async () => {
      document.body.innerHTML = `
        <game-shell game-id="red-trophy-noid" rounds="3">
          <game-trophy name="No Id"></game-trophy>
        </game-shell>
      `;
      await tick();
      const trophy = document.querySelector("game-trophy");
      trophy.unlock();
      assert.isTrue(trophy.unlocked);
    });
  });

  describe("timer edge cases", () => {
    it('duration="0" expires immediately on first tick', (done) => {
      document.body.innerHTML = '<game-timer duration="0"></game-timer>';
      const timer = document.querySelector("game-timer");
      timer.addEventListener("game-timer-expired", () => done());
      timer.start();
    });

    it('duration="-5" expires immediately (remaining clamped to 0)', (done) => {
      document.body.innerHTML = '<game-timer duration="-5"></game-timer>';
      const timer = document.querySelector("game-timer");
      timer.addEventListener("game-timer-expired", () => done());
      timer.start();
    });

    it('duration="NaN" — bar width becomes NaN% but no crash', () => {
      document.body.innerHTML = '<game-timer duration="NaN"></game-timer>';
      const timer = document.querySelector("game-timer");
      assert.equal(timer.duration, 10);
      timer.start();
      timer.stop();
    });

    it("start() then immediate stop() then start() is a clean restart", (done) => {
      document.body.innerHTML = '<game-timer duration="0.05"></game-timer>';
      const timer = document.querySelector("game-timer");
      timer.start();
      timer.stop();
      timer.addEventListener("game-timer-expired", () => done());
      timer.start();
    });

    it("double start() without stop — second start calls stop internally, no leaked rAF", () => {
      document.body.innerHTML = '<game-timer duration="5"></game-timer>';
      const timer = document.querySelector("game-timer");
      timer.start();
      timer.start();
      let tickCount = 0;
      timer.addEventListener("game-timer-tick", () => tickCount++);
      return new Promise((resolve) => {
        requestAnimationFrame(() => {
          assert.isAtMost(tickCount, 1, "should not have duplicate rAF loops");
          timer.stop();
          resolve();
        });
      });
    });
  });

  describe("toast edge cases", () => {
    it("rapid show() calls create multiple .toast elements that auto-clean", async () => {
      const el = document.createElement("game-toast");
      for (let i = 0; i < 10; i++) {
        el.show(`Toast ${i}`, { duration: 50 });
      }
      const toasts = el.shadowRoot.querySelectorAll(".toast");
      assert.equal(toasts.length, 10, "all 10 toasts should exist initially");

      await new Promise((r) => setTimeout(r, 200));
      const remaining = el.shadowRoot.querySelectorAll(".toast");
      assert.equal(remaining.length, 0, "all toasts should be cleaned up");
    });

    it("show(undefined) creates a toast element (textContent is empty string)", () => {
      const el = document.createElement("game-toast");
      el.show(undefined);
      const toast = el.shadowRoot.querySelector(".toast");
      assert.isNotNull(toast);
      assert.equal(toast.textContent, "");
    });

    it('show("") creates a toast with empty string', () => {
      const el = document.createElement("game-toast");
      el.show("");
      const toast = el.shadowRoot.querySelector(".toast");
      assert.isNotNull(toast);
      assert.equal(toast.textContent, "");
    });
  });

  describe("tile-input edge cases", () => {
    it('length="0" creates zero tiles', () => {
      const el = document.createElement("game-tile-input");
      el.setAttribute("length", "0");
      document.body.appendChild(el);
      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles.length, 0);
      const input = el.shadowRoot.querySelector("input");
      assert.equal(input.maxLength, 0);
    });

    it('length="-1" clamps to 0 tiles', () => {
      const el = document.createElement("game-tile-input");
      el.setAttribute("length", "-1");
      document.body.appendChild(el);
      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles.length, 0, "negative length creates 0 tiles");
      const input = el.shadowRoot.querySelector("input");
      assert.equal(input.maxLength, 0, "maxLength clamped to 0");
    });

    it('length="999" creates 999 tiles without crashing', () => {
      const el = document.createElement("game-tile-input");
      el.setAttribute("length", "999");
      document.body.appendChild(el);
      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles.length, 999);
    });

    it("non-alpha characters are stripped from input", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);
      const input = el.shadowRoot.querySelector("input");
      input.value = "123!@#";
      input.dispatchEvent(new Event("input"));
      assert.equal(input.value, "");
    });

    it("input exceeding maxLength is handled by browser truncation", () => {
      const el = document.createElement("game-tile-input");
      el.setAttribute("length", "3");
      document.body.appendChild(el);
      const input = el.shadowRoot.querySelector("input");
      input.value = "ABCDEF";
      input.dispatchEvent(new Event("input"));
      const val = input.value;
      assert.match(val, /^[a-zA-Z]*$/);
    });

    it("mark() with out-of-bounds position does not crash", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);
      el.mark(999, "z", "good");
      el.mark(-1, "a", "bad");
      el.value = "abc";
      assert.isOk(true, "no crash on out-of-bounds mark");
    });

    it("showResult() with mismatched array lengths does not crash", () => {
      const el = document.createElement("game-tile-input");
      el.setAttribute("length", "5");
      document.body.appendChild(el);
      el.showResult(["a", "b"], ["good"]);
      el.showResult(
        ["a", "b", "c", "d", "e", "f", "g"],
        ["good", "bad", "close", "wrong", "good", "good", "bad"],
      );
      assert.isOk(true, "no crash on mismatched array lengths");
    });
  });

  describe("between edge cases", () => {
    it("game-between with no data-between children does not crash", async () => {
      document.body.innerHTML = `
        <game-shell rounds="3" between-delay="manual">
          <div when-some-scene="playing"><div id="trigger"></div></div>
          <div when-some-scene="between">
            <game-between>
              <p>No data-between attributes here</p>
            </game-between>
          </div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.start();
      await microtask();
      shell.lastFeedback.set("Test");
      shell.scene.set("between");
      await microtask();
      assert.equal(
        shell.scene.get(),
        "between",
        "should reach between scene without crash",
      );
    });

    it("game-between outside of game-shell does not crash", async () => {
      document.body.innerHTML =
        "<game-between><span data-between='feedback'></span></game-between>";
      await tick();
      const between = document.querySelector("game-between");
      assert.isOk(between, "element exists without crash");
    });
  });

  describe("quiz edge cases", () => {
    it("quiz with no fieldsets does not crash when round starts", async () => {
      document.body.innerHTML = `
        <game-shell rounds="3" between-delay="manual">
          <game-quiz when-some-scene="playing">
            <!-- no fieldsets -->
          </game-quiz>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.start();
      await microtask();
      assert.equal(shell.scene.get(), "playing", "game started without crash");
    });

    it("quiz with all radios already checked unchecks them on round setup", async () => {
      document.body.innerHTML = `
        <game-shell rounds="3" between-delay="manual">
          <game-quiz when-some-scene="playing">
            <fieldset data-tier="0">
              <legend>Q1</legend>
              <label><input type="radio" name="q1" data-correct checked>A</label>
              <label><input type="radio" name="q1">B</label>
            </fieldset>
          </game-quiz>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.start();
      await microtask();
      const radios = document.querySelectorAll("game-quiz input[type=radio]");
      for (const radio of radios) {
        assert.isFalse(
          radio.checked,
          "radio should be unchecked after round setup",
        );
      }
    });
  });

  describe("preferences edge cases", () => {
    it('preference with unknown type falls back to "toggle"', () => {
      const el = document.createElement("game-preference");
      el.setAttribute("type", "slider");
      assert.equal(el.type, "toggle");
    });

    it("corrupt localStorage data does not crash — loads defaults", async () => {
      localStorage.setItem("pref-corrupt-preferences", "not json");

      const shell = document.createElement("game-shell");
      shell.setAttribute("game-id", "pref-corrupt");

      const prefs = document.createElement("game-preferences");
      const pref = document.createElement("game-preference");
      pref.setAttribute("key", "sound");
      pref.setAttribute("type", "toggle");
      pref.setAttribute("default", "true");
      prefs.appendChild(pref);
      shell.appendChild(prefs);
      document.body.appendChild(shell);
      await tick();

      assert.equal(
        prefs.get("sound"),
        true,
        "should use default after corrupt localStorage",
      );
    });
  });

  describe("component lifecycle", () => {
    it("component outside game-shell — shell is null, connectedCallback returns early", async () => {
      document.body.innerHTML = "<game-timer duration='5'></game-timer>";
      await tick();
      const timer = document.querySelector("game-timer");
      assert.isNull(timer.shell);
      assert.isNotNull(timer.shadowRoot);
      timer.start();
      timer.stop();
    });

    it("shell signals remain functional after a sibling component is removed", async () => {
      document.body.innerHTML = `
        <game-shell game-id="red-sibling" rounds="3">
          <game-flash></game-flash>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const flash = document.querySelector("game-flash");
      flash.remove();
      shell.scene.set("ready");
      await microtask();
      assert.equal(
        shell.scene.get(),
        "ready",
        "shell still functional after sibling removal",
      );
    });
  });
});
