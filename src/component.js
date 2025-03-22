import { subscribe } from "./context.js";
import { effect } from "./signals.js";
import { DOM_TRIGGERS, detectStateTriggers } from "./triggers.js";

export function camelCase(str) {
  return str.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/** Coerce a raw attribute string into the declared type. */
function coerce(raw, spec) {
  if (spec.type === "boolean") return raw !== null;

  if (raw === null) {
    if (spec.type === "string?") return null;
    if (spec.type === "enum") return spec.missing ?? spec.default ?? null;
    return spec.default ?? (spec.type === "long" || spec.type === "number" ? 0 : "");
  }

  if (spec.type === "enum") {
    if (spec.values && spec.values.includes(raw)) return raw;
    return spec.invalid ?? spec.default ?? null;
  }

  if (spec.type === "long") {
    const n = parseInt(raw, 10);
    return Number.isFinite(n) ? n : (spec.default ?? 0);
  }
  if (spec.type === "number") {
    const n = parseFloat(raw);
    return Number.isFinite(n) ? n : (spec.default ?? 0);
  }

  return raw;
}

/**
 * Install IDL property reflections on a custom-element class based on its
 * `static attrs` declaration. Call once per class (e.g. in a static block
 * or from `define()`). Safe to call multiple times — no-ops if already done.
 *
 * Also wires up `observedAttributes` (merging with any hand-written list)
 * and a base `attributeChangedCallback` that calls `this.attributeChanged()`
 * when it exists.
 */
export function initAttrs(Ctor) {
  if (Ctor.__attrsReady) return;
  Ctor.__attrsReady = true;

  const specs = Ctor.attrs;
  if (!specs) return;

  const attrNames = Object.keys(specs);

  const existing = Object.getOwnPropertyDescriptor(Ctor, "observedAttributes");
  const existingList = existing?.get ? existing.get.call(Ctor) : (existing?.value ?? []);
  const merged = [...new Set([...existingList, ...attrNames])];

  Object.defineProperty(Ctor, "observedAttributes", {
    configurable: true,
    get() { return merged; },
  });

  for (const attr of attrNames) {
    const spec = specs[attr];
    // Allow `prop` override when the camelCase name conflicts with an
    // existing instance field (e.g. GameShell has Signal.State fields that
    // collide with the natural camelCase of the attribute name).
    const prop = spec.prop ?? camelCase(attr);

    // Skip if the subclass already has a hand-written descriptor.
    if (Object.getOwnPropertyDescriptor(Ctor.prototype, prop)) continue;

    Object.defineProperty(Ctor.prototype, prop, {
      configurable: true,
      enumerable: true,
      get() {
        return coerce(this.getAttribute(attr), spec);
      },
      set(value) {
        if (spec.type === "boolean") {
          this.toggleAttribute(attr, !!value);
        } else if (value === null || value === undefined) {
          this.removeAttribute(attr);
        } else {
          this.setAttribute(attr, value);
        }
      },
    });
  }

  const origACCB = Ctor.prototype.attributeChangedCallback;
  Ctor.prototype.attributeChangedCallback = function (name, oldVal, newVal) {
    if (origACCB) origACCB.call(this, name, oldVal, newVal);
    if (typeof this.attributeChanged === "function") {
      this.attributeChanged(name, oldVal, newVal);
    }
  };
}

/**
 * Base class for all interactive HTMLGameKit custom elements. Provides
 * reactive signal effects, shell access, trigger lifecycle, and
 * automatic cleanup via AbortController.
 *
 * @summary Base class for game components
 */
export default class GameComponent extends HTMLElement {
  #abort;
  #shell = null;
  #prevState = "init";
  #prevTierIndex = -1;
  #domAbort = null;

  static styles;
  static template = "<slot></slot>";

  static define(tag, registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }



  constructor() {
    super();
    if (this.constructor.styles || this.constructor.template) {
      this.attachShadow({ mode: "open" });
      if (this.constructor.styles) {
        this.shadowRoot.adoptedStyleSheets = [this.constructor.styles];
      }
      if (this.constructor.template) {
        this.shadowRoot.innerHTML = this.constructor.template;
      }
    }
  }

  get abort() {
    if (!this.#abort) this.#abort = new AbortController();
    return this.#abort;
  }

  get signal() {
    return this.abort.signal;
  }

  get shell() {
    if (this.#shell) return this.#shell;
    this.#shell = this.closest("game-shell");
    return this.#shell;
  }

  subscribe(context, callback) {
    subscribe(this, context, callback, { signal: this.signal });
  }

  connectedCallback() {
    const shell = this.shell;
    if (!shell) return;

    if (typeof this.effectCallback === "function") {
      effect(() => this.effectCallback(shell), { signal: this.signal });
    }

    if (typeof this.resultCallback === "function") {
      let ran = false;
      effect(() => {
        const scene = shell.scene.get();
        if (scene === "result" && !ran) {
          ran = true;
          this.resultCallback(shell);
        } else if (scene !== "result") {
          ran = false;
        }
      }, { signal: this.signal });
    }

    if (typeof this.triggerCallback === "function") {
      const hasTimeout = typeof this.timeoutCallback === "function"
        || this.trigger === "timeout";
      effect(() => {
        const scene = shell.scene.get();
        const round = shell.round.get();
        const lrp = shell.lastRoundPassed.get();
        const lf = shell.lastFeedback.get();
        const diff = shell.difficulty.get();

        const triggerState = { scene, round, lastRoundPassed: lrp, lastFeedback: lf, difficulty: diff };
        const prev = this.#prevState;
        this.#prevState = scene;

        const { triggers, tierIndex } = detectStateTriggers(
          triggerState, prev, this.#prevTierIndex,
          () => hasTimeout,
        );
        this.#prevTierIndex = tierIndex;

        for (const t of triggers) {
          if (t === "timeout" && typeof this.timeoutCallback === "function") {
            this.timeoutCallback(null);
          } else {
            this.triggerCallback(t, null);
          }
        }

        if (scene === "playing" && prev !== "playing") {
          this.#bindDomTriggers();
        } else if (scene !== "playing" && prev === "playing") {
          this.#unbindDomTriggers();
        }
      }, { signal: this.signal });
    }
  }

  disconnectedCallback() {
    this.#abort?.abort();
    this.#abort = null;
    this.#shell = null;
  }

  #bindDomTriggers() {
    this.#unbindDomTriggers();
    const shell = this.shell;
    if (!shell) return;
    this.#domAbort = new AbortController();
    const { signal } = this.#domAbort;

    for (const [triggerName, eventName] of Object.entries(DOM_TRIGGERS)) {
      shell.addEventListener(eventName, (e) => {
        this.triggerCallback(triggerName, e);
      }, { signal });
    }
  }

  #unbindDomTriggers() {
    this.#domAbort?.abort();
    this.#domAbort = null;
  }
}

export function css(strings, ...values) {
  const sheet = new CSSStyleSheet();
  sheet.replaceSync(String.raw(strings, ...values));
  return sheet;
}
