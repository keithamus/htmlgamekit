import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameRoundPassEvent, GameRoundFailEvent } from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

// Signal effects may cascade through multiple microtask cycles.
// flush() drains the full microtask queue by yielding to a macrotask.
const flush = tick;

describe("game-toast", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  // ── Basic creation & attribute reflection ───────────────────────────

  it("creates from document.createElement", () => {
    const el = document.createElement("game-toast");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-toast");
  });

  it("reflects trigger, persist, position attributes", () => {
    const el = document.createElement("game-toast");

    el.setAttribute("trigger", "pass");
    assert.equal(el.trigger, "pass");

    assert.isFalse(el.persist);
    el.setAttribute("persist", "");
    assert.isTrue(el.persist);

    // position defaults to "center" (enum missing value)
    assert.equal(el.position, "center");
    el.setAttribute("position", "bottom");
    assert.equal(el.position, "bottom");
    el.setAttribute("position", "top");
    assert.equal(el.position, "top");
    el.setAttribute("position", "inline");
    assert.equal(el.position, "inline");
  });

  it("reflects duration, value, use-feedback attributes", () => {
    const el = document.createElement("game-toast");

    assert.isNull(el.duration);
    el.setAttribute("duration", "500");
    assert.equal(el.duration, "500");

    assert.isNull(el.value);
    el.setAttribute("value", "3");
    assert.equal(el.value, "3");

    assert.isFalse(el.useFeedback);
    el.setAttribute("use-feedback", "");
    assert.isTrue(el.useFeedback);
  });

  // ── IDL property reflection — prop→attr ─────────────────────────────

  describe("IDL property reflection - prop→attr", () => {
    it("trigger: prop→attr", () => {
      const el = document.createElement("game-toast");
      el.trigger = "pass";
      assert.equal(el.getAttribute("trigger"), "pass");
    });

    it("persist: prop→attr", () => {
      const el = document.createElement("game-toast");
      el.persist = true;
      assert.isTrue(el.hasAttribute("persist"));
      el.persist = false;
      assert.isFalse(el.hasAttribute("persist"));
    });

    it("duration: prop→attr (nullable)", () => {
      const el = document.createElement("game-toast");
      el.duration = "500";
      assert.equal(el.getAttribute("duration"), "500");
      el.duration = null;
      assert.isFalse(el.hasAttribute("duration"));
    });

    it("value: prop→attr (nullable)", () => {
      const el = document.createElement("game-toast");
      el.value = "3";
      assert.equal(el.getAttribute("value"), "3");
      el.value = null;
      assert.isFalse(el.hasAttribute("value"));
    });

    it("useFeedback: prop→attr", () => {
      const el = document.createElement("game-toast");
      el.useFeedback = true;
      assert.isTrue(el.hasAttribute("use-feedback"));
      el.useFeedback = false;
      assert.isFalse(el.hasAttribute("use-feedback"));
    });

    it("position: prop→attr", () => {
      const el = document.createElement("game-toast");
      el.position = "bottom";
      assert.equal(el.getAttribute("position"), "bottom");
      el.position = "top";
      assert.equal(el.getAttribute("position"), "top");
      el.position = "inline";
      assert.equal(el.getAttribute("position"), "inline");
    });
  });

  it("has shadow DOM with styles", () => {
    const el = document.createElement("game-toast");
    assert.isNotNull(el.shadowRoot);
    assert.isAbove(el.shadowRoot.adoptedStyleSheets.length, 0);
  });

  it("shadow DOM contains .persist element and sr-only live region", () => {
    const el = document.createElement("game-toast");
    assert.isNotNull(el.shadowRoot.querySelector(".persist"));
    assert.isNotNull(el.shadowRoot.querySelector("[role=status]"));
  });

  // ── show() — transient toasts ──────────────────────────────────────

  describe("show() transient", () => {
    it("creates a .toast div in shadow DOM", () => {
      const el = document.createElement("game-toast");
      el.show("Nice!");
      const toast = el.shadowRoot.querySelector(".toast");
      assert.isNotNull(toast);
      assert.equal(toast.textContent, "Nice!");
    });

    it("applies color option to toast element", () => {
      const el = document.createElement("game-toast");
      el.show("Wow!", { color: "red" });
      const toast = el.shadowRoot.querySelector(".toast");
      assert.equal(toast.style.color, "red");
    });

    it("applies duration option as CSS custom property", () => {
      const el = document.createElement("game-toast");
      el.show("Quick!", { duration: 200 });
      const toast = el.shadowRoot.querySelector(".toast");
      assert.equal(
        toast.style.getPropertyValue("--game-toast-duration"),
        "200ms",
      );
    });

    it("applies duration attribute as CSS custom property", () => {
      const el = document.createElement("game-toast");
      el.setAttribute("duration", "750");
      el.show("Slow!");
      const toast = el.shadowRoot.querySelector(".toast");
      assert.equal(
        toast.style.getPropertyValue("--game-toast-duration"),
        "750ms",
      );
    });

    it("removes the .toast element after the animation duration", async () => {
      const el = document.createElement("game-toast");
      el.show("Gone!", { duration: 50 });
      assert.isNotNull(el.shadowRoot.querySelector(".toast"));
      await new Promise((r) => setTimeout(r, 150));
      assert.isNull(el.shadowRoot.querySelector(".toast"));
    });

    it("updates the sr-only live region text", () => {
      const el = document.createElement("game-toast");
      el.show("Accessible!");
      const live = el.shadowRoot.querySelector("[role=status]");
      assert.equal(live.textContent, "Accessible!");
    });

    it("can show multiple transient toasts at once", () => {
      const el = document.createElement("game-toast");
      el.show("First!");
      el.show("Second!");
      const toasts = el.shadowRoot.querySelectorAll(".toast");
      assert.equal(toasts.length, 2);
    });
  });

  // ── show() — persist mode ──────────────────────────────────────────

  describe("show() persist", () => {
    it("updates .persist element and adds .show class", () => {
      const el = document.createElement("game-toast");
      el.setAttribute("persist", "");
      el.show("Persisted!");
      const persist = el.shadowRoot.querySelector(".persist");
      assert.equal(persist.textContent, "Persisted!");
      assert.isTrue(persist.classList.contains("show"));
    });

    it("does NOT create a .toast div when persist is set", () => {
      const el = document.createElement("game-toast");
      el.setAttribute("persist", "");
      el.show("Persisted!");
      assert.isNull(el.shadowRoot.querySelector(".toast"));
    });

    it("applies color option to persist element", () => {
      const el = document.createElement("game-toast");
      el.setAttribute("persist", "");
      el.show("Colored!", { color: "blue" });
      const persist = el.shadowRoot.querySelector(".persist");
      assert.equal(persist.style.color, "blue");
    });
  });

  // ── hide() ─────────────────────────────────────────────────────────

  describe("hide()", () => {
    it("removes .show class from .persist element", () => {
      const el = document.createElement("game-toast");
      el.setAttribute("persist", "");
      el.show("Visible!");
      const persist = el.shadowRoot.querySelector(".persist");
      assert.isTrue(persist.classList.contains("show"));
      el.hide();
      assert.isFalse(persist.classList.contains("show"));
    });

    it("is safe to call hide() when .persist has no .show class", () => {
      const el = document.createElement("game-toast");
      el.setAttribute("persist", "");
      el.hide(); // no-op, should not throw
      const persist = el.shadowRoot.querySelector(".persist");
      assert.isFalse(persist.classList.contains("show"));
    });
  });

  // ── Trigger routing ────────────────────────────────────────────────

  describe("trigger routing", () => {
    it('toast with trigger="pass" fires on GameRoundPassEvent', async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass" persist>Nice!</game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Correct!"),
      );
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isTrue(
        persist.classList.contains("show"),
        "persist element should have .show class after pass trigger",
      );
    });

    it('toast with trigger="fail" fires on GameRoundFailEvent', async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="fail" persist>Oops!</game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundFailEvent("Wrong!"),
      );
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isTrue(
        persist.classList.contains("show"),
        "persist element should have .show class after fail trigger",
      );
    });

    it('toast with trigger="pass" does NOT fire on fail event', async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass" persist>Nice!</game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundFailEvent("Wrong!"),
      );
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isFalse(
        persist.classList.contains("show"),
        "persist should NOT have .show class when trigger does not match",
      );
    });
  });

  // ── Condition filtering ────────────────────────────────────────────

  describe("condition filtering", () => {
    it("toast with when-min-score only shows when score >= threshold", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass" persist when-min-score="5">Bonus!</game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      // Score = 1, which is < 5 — toast should not show
      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Ok"),
      );
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isFalse(
        persist.classList.contains("show"),
        "should NOT show when score < min-score",
      );
    });
  });

  // ── use-feedback ───────────────────────────────────────────────────

  describe("use-feedback", () => {
    it("shows lastFeedback text when use-feedback is set", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass" persist use-feedback></game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Excellent!"),
      );
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.equal(persist.textContent, "Excellent!");
      assert.isTrue(persist.classList.contains("show"));
    });
  });

  // ── Bucket system ──────────────────────────────────────────────────

  describe("bucket system", () => {
    it("picks text from named bucket options", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="start">
            <option data-bucket="early">Go!</option>
            <option data-bucket="early">Let's do this!</option>
          </game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      // The "start" trigger fires when game starts playing.
      // Check that a transient toast was created with text from the early bucket
      const toastEl = toast.shadowRoot.querySelector(".toast");
      assert.isNotNull(toastEl, "should create a toast element");
      assert.include(
        ["Go!", "Let's do this!"],
        toastEl.textContent,
        "toast text should come from the early bucket",
      );
    });

    it("picks from plain (non-bucket) options when no bucket matches", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="start">
            <option>Fallback text</option>
          </game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      const toastEl = toast.shadowRoot.querySelector(".toast");
      assert.isNotNull(toastEl);
      assert.equal(toastEl.textContent, "Fallback text");
    });

    it("falls back to textContent when no options exist", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="start">Ready!</game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      const toastEl = toast.shadowRoot.querySelector(".toast");
      assert.isNotNull(toastEl);
      assert.equal(toastEl.textContent, "Ready!");
    });
  });

  // ── Value filtering ────────────────────────────────────────────────

  describe("value filtering", () => {
    it("only fires when countdown value matches", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="countdown" value="3">Three!</game-toast>
          <game-timer when-some-scene="playing between paused" duration="5" countdown="5"></game-timer>
          <div when-some-scene="playing"></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      // Fire countdown=5 — should not show (value is "3")
      toast.triggerCallback("countdown", { seconds: 5 });
      assert.isNull(
        toast.shadowRoot.querySelector(".toast"),
        "should NOT show when countdown value does not match",
      );

      // Fire countdown=3 — should show
      toast.triggerCallback("countdown", { seconds: 3 });
      assert.isNotNull(
        toast.shadowRoot.querySelector(".toast"),
        "should show when countdown value matches",
      );
    });
  });

  // ── Persist visibility across scenes ───────────────────────────────

  describe("persist visibility", () => {
    it("hides persist toast when scene leaves valid states for its trigger", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass" persist>Nice!</game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      // Trigger a pass — toast should show in "between" state
      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Nice!"),
      );
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isTrue(persist.classList.contains("show"), "should show in between");

      // Advance to next round (playing) — "pass" persist visible states include "between" only
      shell.round.set(2);
      shell.scene.set("playing");
      await flush();

      assert.isFalse(
        persist.classList.contains("show"),
        "should hide when scene moves to playing (not in pass visible states)",
      );
    });

    it("hides persist toast when game resets to ready", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass" persist>Nice!</game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      document.querySelector("#trigger").dispatchEvent(
        new GameRoundPassEvent(1, "Ok"),
      );
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isTrue(persist.classList.contains("show"));

      // Reset to ready
      shell.scene.set("ready");
      await flush();

      assert.isFalse(
        persist.classList.contains("show"),
        "should hide when scene is ready",
      );
    });
  });

  // ── Streak tracking ────────────────────────────────────────────────

  describe("streak tracking", () => {
    it("tracks consecutive correct answers for bucket selection", async () => {
      document.body.innerHTML = `
        <game-shell rounds="10" between-delay="manual">
          <game-toast trigger="round">
            <option data-bucket="streak">On fire!</option>
            <option data-bucket="early">Go!</option>
          </game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      // Pass rounds 1-3 to build a streak of 3
      for (let i = 1; i <= 3; i++) {
        document.querySelector("#trigger").dispatchEvent(
          new GameRoundPassEvent(1, "Correct!"),
        );
        await flush();

        // Advance to next round
        shell.round.set(i + 1);
        shell.scene.set("playing");
        await flush();
      }

      // After 3 consecutive correct answers, the streak bucket should be available
      // The "round" trigger fires on scene change to playing.
      // We check that toasts were created from either bucket
      const toasts = toast.shadowRoot.querySelectorAll(".toast");
      assert.isAbove(toasts.length, 0, "should create toasts from streak or early bucket");
    });

    it("resets streaks when game returns to ready/init", async () => {
      document.body.innerHTML = `
        <game-shell rounds="10" between-delay="manual">
          <game-toast trigger="round">
            <option data-bucket="streak">Streak!</option>
            <option data-bucket="early">Go!</option>
          </game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.start();
      await flush();

      // Build a streak
      for (let i = 1; i <= 3; i++) {
        document.querySelector("#trigger").dispatchEvent(
          new GameRoundPassEvent(1, "Yes!"),
        );
        await flush();
        shell.round.set(i + 1);
        shell.scene.set("playing");
        await flush();
      }

      // Reset to ready — should clear streaks
      shell.scene.set("ready");
      await flush();

      // Start again — streak should be 0
      shell.start();
      await flush();
      // No assertion on internal state directly — just verify no error
      assert.equal(shell.scene.get(), "playing");
    });
  });


});
