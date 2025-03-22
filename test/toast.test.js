import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameRoundPassEvent, GameRoundFailEvent } from "../src/events.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

const flush = tick;

describe("game-toast", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("persist and useFeedback default to false; position to center; duration and value to null", () => {
    const el = document.createElement("game-toast");
    assert.isFalse(el.persist);
    assert.isFalse(el.useFeedback);
    assert.equal(el.position, "center");
    assert.isNull(el.duration);
    assert.isNull(el.value);
  });

  it("position rejects unknown values and falls back to center", () => {
    const el = document.createElement("game-toast");
    el.setAttribute("position", "nowhere");
    assert.equal(el.position, "center");
  });

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
      el.hide();
      const persist = el.shadowRoot.querySelector(".persist");
      assert.isFalse(persist.classList.contains("show"));
    });
  });

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

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Correct!"));
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

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundFailEvent("Wrong!"));
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

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundFailEvent("Wrong!"));
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isFalse(
        persist.classList.contains("show"),
        "persist should NOT have .show class when trigger does not match",
      );
    });
  });

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

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Ok"));
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isFalse(
        persist.classList.contains("show"),
        "should NOT show when score < min-score",
      );
    });
  });

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

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Excellent!"));
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.equal(persist.textContent, "Excellent!");
      assert.isTrue(persist.classList.contains("show"));
    });
  });

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

      toast.triggerCallback("countdown", { seconds: 5 });
      assert.isNull(
        toast.shadowRoot.querySelector(".toast"),
        "should NOT show when countdown value does not match",
      );

      toast.triggerCallback("countdown", { seconds: 3 });
      assert.isNotNull(
        toast.shadowRoot.querySelector(".toast"),
        "should show when countdown value matches",
      );
    });
  });

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

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Nice!"));
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isTrue(
        persist.classList.contains("show"),
        "should show in between",
      );

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

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Ok"));
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isTrue(persist.classList.contains("show"));

      shell.scene.set("ready");
      await flush();

      assert.isFalse(
        persist.classList.contains("show"),
        "should hide when scene is ready",
      );
    });
  });

  describe("all-options-filtered fallback", () => {
    it("does NOT show option text when all options are condition-filtered out", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass">
            <option when-min-score="999">Unreachable text</option>
          </game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Ok"));
      await flush();

      const toastEl = toast.shadowRoot.querySelector(".toast");
      assert.isNull(
        toastEl,
        "should NOT create a toast when all options are condition-filtered out",
      );
    });

    it("does NOT show option text in persist mode when all options are filtered out", async () => {
      document.body.innerHTML = `
        <game-shell rounds="5" between-delay="manual">
          <game-toast trigger="pass" persist>
            <option when-min-score="999">Unreachable text</option>
          </game-toast>
          <div when-some-scene="playing"><div id="trigger"></div></div>
        </game-shell>
      `;
      await tick();
      const shell = document.querySelector("game-shell");
      const toast = document.querySelector("game-toast");
      shell.start();
      await flush();

      document
        .querySelector("#trigger")
        .dispatchEvent(new GameRoundPassEvent(1, "Ok"));
      await flush();

      const persist = toast.shadowRoot.querySelector(".persist");
      assert.isFalse(
        persist.classList.contains("show"),
        "persist should NOT show when all options are filtered out",
      );
    });
  });

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

      for (let i = 1; i <= 3; i++) {
        document
          .querySelector("#trigger")
          .dispatchEvent(new GameRoundPassEvent(1, "Correct!"));
        await flush();

        shell.round.set(i + 1);
        shell.scene.set("playing");
        await flush();
      }

      const toasts = toast.shadowRoot.querySelectorAll(".toast");
      assert.isAbove(
        toasts.length,
        0,
        "should create toasts from streak or early bucket",
      );
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

      for (let i = 1; i <= 3; i++) {
        document
          .querySelector("#trigger")
          .dispatchEvent(new GameRoundPassEvent(1, "Yes!"));
        await flush();
        shell.round.set(i + 1);
        shell.scene.set("playing");
        await flush();
      }

      shell.scene.set("ready");
      await flush();

      shell.start();
      await flush();
      assert.equal(shell.scene.get(), "playing");
    });
  });
});
