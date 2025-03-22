import { assert } from "@open-wc/testing";
import "../src/auto.js";
import GameComponent, { initAttrs, css } from "../src/component.js";
import { formatValue } from "../src/format.js";
import { Signal } from "../src/signals.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("initAttrs / attribute reflection", () => {
  let el;

  beforeEach(() => {
    document.body.innerHTML = "<game-timer></game-timer>";
    el = document.querySelector("game-timer");
  });

  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  describe("number attribute", () => {
    it("returns the default value when the attribute is absent", () => {
      assert.equal(el.duration, 10);
    });

    it("reflects a set attribute to the property", () => {
      el.setAttribute("duration", "25");
      assert.equal(el.duration, 25);
    });

    it("reflects a set property to the attribute", () => {
      el.duration = 42;
      assert.equal(el.getAttribute("duration"), "42");
      assert.equal(el.duration, 42);
    });
  });

  describe("long attribute", () => {
    it("returns the default value when the attribute is absent", () => {
      assert.equal(el.countdown, 0);
    });

    it("parses integer values from attribute", () => {
      el.setAttribute("countdown", "5");
      assert.equal(el.countdown, 5);
    });

    it("returns default for non-numeric string", () => {
      el.setAttribute("countdown", "abc");
      assert.equal(el.countdown, 0);
    });
  });

  describe("boolean attribute", () => {
    it("returns false when the attribute is absent", () => {
      document.body.innerHTML = "";
      document.body.innerHTML = "<game-shell></game-shell>";
      const shell = document.querySelector("game-shell");
      assert.isFalse(shell.demo);
    });

    it("returns true when the attribute is present", () => {
      document.body.innerHTML = "";
      document.body.innerHTML = "<game-shell demo></game-shell>";
      const shell = document.querySelector("game-shell");
      assert.isTrue(shell.demo);
    });

    it("toggles the attribute via the property setter", () => {
      document.body.innerHTML = "";
      document.body.innerHTML = "<game-shell></game-shell>";
      const shell = document.querySelector("game-shell");
      assert.isFalse(shell.demo);
      shell.demo = true;
      assert.isTrue(shell.hasAttribute("demo"));
      shell.demo = false;
      assert.isFalse(shell.hasAttribute("demo"));
    });
  });

  describe("string attribute", () => {
    it("returns empty string when absent for non-nullable", () => {
      document.body.innerHTML = "";
      document.body.innerHTML = "<game-stat></game-stat>";
      const stat = document.querySelector("game-stat");
      assert.equal(stat.key, "");
    });
  });

  describe("string? (nullable) attribute", () => {
    it("returns null when absent", () => {
      document.body.innerHTML = "";
      document.body.innerHTML = "<game-toast></game-toast>";
      const toast = document.querySelector("game-toast");
      assert.isNull(toast.value);
    });

    it("returns the string value when present", () => {
      document.body.innerHTML = "";
      document.body.innerHTML = '<game-toast value="hello"></game-toast>';
      const toast = document.querySelector("game-toast");
      assert.equal(toast.value, "hello");
    });
  });

  describe("enum attribute", () => {
    it("returns default when attribute is absent", () => {
      document.body.innerHTML = "<game-toast></game-toast>";
      assert.equal(document.querySelector("game-toast").position, "center");
    });

    it("returns default when attribute has an invalid value", () => {
      document.body.innerHTML = '<game-toast position="nowhere"></game-toast>';
      assert.equal(document.querySelector("game-toast").position, "center");
    });

    it("returns the value for a valid string", () => {
      document.body.innerHTML = '<game-toast position="bottom"></game-toast>';
      assert.equal(document.querySelector("game-toast").position, "bottom");
    });

    it("missing overrides default for absent attribute only", () => {
      class TestEl extends HTMLElement {
        static attrs = {
          mode: {
            type: "enum",
            values: ["a", "b"],
            default: "a",
            missing: "b",
          },
        };
        static define(tag, reg = customElements) {
          initAttrs(this);
          reg.define(tag, this);
        }
      }
      TestEl.define("test-enum-missing");
      document.body.innerHTML = "<test-enum-missing></test-enum-missing>";
      assert.equal(
        document.querySelector("test-enum-missing").mode,
        "b",
        "absent → missing",
      );
      document.body.innerHTML =
        '<test-enum-missing mode="x"></test-enum-missing>';
      assert.equal(
        document.querySelector("test-enum-missing").mode,
        "a",
        "invalid → default, not missing",
      );
    });

    it("invalid overrides default for invalid values only", () => {
      class TestEl2 extends HTMLElement {
        static attrs = {
          mode: {
            type: "enum",
            values: ["a", "b"],
            default: "a",
            invalid: "b",
          },
        };
        static define(tag, reg = customElements) {
          initAttrs(this);
          reg.define(tag, this);
        }
      }
      TestEl2.define("test-enum-invalid");
      document.body.innerHTML = "<test-enum-invalid></test-enum-invalid>";
      assert.equal(
        document.querySelector("test-enum-invalid").mode,
        "a",
        "absent → default, not invalid",
      );
      document.body.innerHTML =
        '<test-enum-invalid mode="x"></test-enum-invalid>';
      assert.equal(
        document.querySelector("test-enum-invalid").mode,
        "b",
        "invalid → invalid override",
      );
    });
  });

  describe("initAttrs idempotency", () => {
    it("is safe to call multiple times (no-op second call)", () => {
      const Ctor = class extends HTMLElement {
        static attrs = { foo: { type: "string", default: "bar" } };
      };
      initAttrs(Ctor);
      initAttrs(Ctor);
      assert.isTrue(Ctor.__attrsReady);
    });
  });
});

describe("css tagged template", () => {
  it("returns a CSSStyleSheet", () => {
    const sheet = css`
      :host {
        display: block;
      }
    `;
    assert.instanceOf(sheet, CSSStyleSheet);
  });
});

describe("formatValue", () => {
  it('formats "ms" correctly', () => {
    assert.equal(formatValue(123.456, "ms"), "123ms");
    assert.equal(formatValue(0, "ms"), "0ms");
  });

  it('formats "2dp" correctly', () => {
    assert.equal(formatValue(3.14159, "2dp"), "3.14");
    assert.equal(formatValue(1, "2dp"), "1.00");
  });

  it('formats "1dp" correctly', () => {
    assert.equal(formatValue(3.14159, "1dp"), "3.1");
  });

  it("returns String(v) for unrecognised format", () => {
    assert.equal(formatValue(42, "unknown"), "42");
  });

  it("passes non-number through for dp format", () => {
    assert.equal(formatValue("hello", "2dp"), "hello");
  });
});

describe("GameComponent lifecycle", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  describe("shell getter", () => {
    it("returns null when not inside a game-shell", () => {
      document.body.innerHTML = "<game-flash></game-flash>";
      const flash = document.querySelector("game-flash");
      assert.isNull(flash.shell);
    });

    it("returns the game-shell when inside one", async () => {
      document.body.innerHTML =
        "<game-shell><game-flash></game-flash></game-shell>";
      const shell = document.querySelector("game-shell");
      const flash = document.querySelector("game-flash");
      assert.strictEqual(flash.shell, shell);
    });
  });

  describe("effectCallback(shell)", () => {
    it("is called reactively when shell signals change", async () => {
      document.body.innerHTML =
        '<game-shell rounds="3" between-delay="0"><game-flash></game-flash></game-shell>';
      await tick();
      const shell = document.querySelector("game-shell");
      const flash = document.querySelector("game-flash");
      shell.start();
      assert.equal(shell.scene.get(), "playing");
      shell.dispatchEvent(
        new (await import("../src/events.js")).GameRoundPassEvent(1),
      );
      assert.equal(shell.scene.get(), "between");
      await new Promise((r) => queueMicrotask(r));
      assert.isTrue(flash.matches(":state(pass)"));
    });
  });

  describe("signal (AbortSignal)", () => {
    it("is available as an AbortSignal for cleanup", () => {
      document.body.innerHTML = "<game-flash></game-flash>";
      const flash = document.querySelector("game-flash");
      assert.instanceOf(flash.signal, AbortSignal);
      assert.isFalse(flash.signal.aborted);
    });
  });

  describe("disconnectedCallback", () => {
    it("cleans up abort controller", () => {
      document.body.innerHTML = "<game-flash></game-flash>";
      const flash = document.querySelector("game-flash");
      const sig = flash.signal;
      assert.isFalse(sig.aborted);
      flash.remove();
      assert.isTrue(sig.aborted);
    });

    it("clears the cached shell reference", async () => {
      document.body.innerHTML =
        "<game-shell><game-flash></game-flash></game-shell>";
      const flash = document.querySelector("game-flash");
      assert.isNotNull(flash.shell);
      flash.remove();
      document.body.appendChild(flash);
      assert.isNull(flash.shell);
    });
  });
});
