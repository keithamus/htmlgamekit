---
layout: doc
title: "GameComponent"
permalink: /api/game-component/
---

Base class for building custom game UI elements. Extends `HTMLElement` with
shadow DOM, scoped styles, declarative templates, signal-based reactivity, and
an automatic abort signal for cleanup.

## Import

```js
import { GameComponent, css } from "htmlgamekit";
```

## Usage

```js
class RoundDisplay extends GameComponent {
  static styles = css`
    :host {
      display: block;
      font-size: 1.5rem;
    }
    .round {
      color: var(--game-accent, #0af);
    }
  `;

  static template = `
    <span class="round">
      Round <span id="current">1</span> / <span id="total">?</span>
    </span>
  `;

  connectedCallback() {
    // Use this.signal for any work that should stop on disconnect
    someAsyncTask({ signal: this.signal });
    super.connectedCallback();
  }

  effectCallback({ round, rounds }) {
    this.shadowRoot.getElementById("current").textContent = round.get();
    this.shadowRoot.getElementById("total").textContent = rounds.get();
  }
}

RoundDisplay.define("round-display");
```

---

## Attribute Reflection (`static attrs`)

Declare `static attrs` on your class to get automatic attribute observation,
property reflection, and typed coercion. The `define()` method wires everything
up.

```js
class MyComponent extends GameComponent {
  static attrs = {
    duration: { type: "number", default: 10 },
    mode: {
      type: "enum",
      values: ["easy", "hard"],
      missing: "easy",
      invalid: "easy",
    },
    label: { type: "string" },
    description: { type: "string?" },
    disabled: { type: "boolean" },
    "max-score": { type: "long", default: 100 },
  };
}

MyComponent.define("my-component");
// Now:
//   el.duration    -> 10 (reads attribute, coerces to number)
//   el.duration = 5  -> setAttribute("duration", "5")
//   el.mode        -> "easy" (enumerated with missing/invalid defaults)
//   el.disabled    -> false (boolean, presence-based)
//   el.maxScore    -> 100 (kebab-case attribute, camelCase property)
//   el.description -> null (string?, null when attribute absent)
```

### Supported Types

| Type      | Behavior                                     | Default when absent                        |
| --------- | -------------------------------------------- | ------------------------------------------ |
| `string`  | Non-nullable string                          | `""` (or `spec.default`)                   |
| `string?` | Nullable string                              | `null`                                     |
| `long`    | Integer via `parseInt`                       | `0` (or `spec.default`)                    |
| `number`  | Float via `parseFloat`                       | `0` (or `spec.default`)                    |
| `boolean` | Presence-based (`true` if attribute present) | `false`                                    |
| `enum`    | Must match one of `spec.values`              | `spec.default` (absent and invalid cases)  |

### Spec Fields

| Field     | Required  | Description                                                                                    |
| --------- | --------- | ---------------------------------------------------------------------------------------------- |
| `type`    | Yes       | One of the type strings above                                                                  |
| `default` | No        | Fallback when the attribute is absent or has an invalid value                                  |
| `values`  | Enum only | Array of valid canonical values                                                                |
| `missing` | Enum only | Overrides `default` for the absent-attribute case only                                         |
| `invalid` | Enum only | Overrides `default` for the unrecognised-value case only                                       |
| `prop`    | No        | Override the IDL property name (default: camelCase of the attribute name)                      |

For enums, `default` is the simplest option when missing and invalid should behave the same. Use `missing` and/or `invalid` only when they need to differ:

```js
static attrs = {
  // same fallback for both missing and invalid:
  mode: { type: "enum", values: ["a", "b", "c"], default: "a" },

  // different fallbacks:
  mode: { type: "enum", values: ["a", "b", "c"], default: "a", missing: "b" },
  //   absent → "b", invalid → "a"
};
```

### Property Naming

Attribute names are converted to camelCase for the IDL property: `when-min-score` becomes `whenMinScore`, `start-bpm` becomes `startBpm`. Use the `prop` field to override this when the natural name would conflict with an existing field.

### Reactivity

All declared attributes are automatically added to `observedAttributes`. When an attribute changes, the base `attributeChangedCallback` fires. Subclasses can define an `attributeChanged(name, oldValue, newValue)` method to react:

```js
class MyTimer extends GameComponent {
  static attrs = {
    duration: { type: "number", default: 10 },
  };

  attributeChanged(name) {
    if (name === "duration") this.#restart();
  }
}
```

### For non-GameComponent Elements

Elements that extend `HTMLElement` directly can use `initAttrs()`:

```js
import { initAttrs } from "htmlgamekit";

class MyDataElement extends HTMLElement {
  static attrs = {
    key: { type: "string" },
  };

  static define(tag, registry = customElements) {
    initAttrs(this);
    registry.define(tag, this);
  }
}
```

---

## Static Properties

<dl class="def">

<dt><span class="badge prop">static styles</span></dt>
<dd>
<code>CSSStyleSheet</code> -- A constructed stylesheet to adopt into the shadow root. Create one with the <a href="#css-tagged-template"><code>css</code></a> tagged template literal.

```js
static styles = css`
  :host { display: block; }
  p { margin: 0; }
`;
```

If not set, the shadow root receives no adopted stylesheets.

</dd>

<dt><span class="badge prop">static template</span></dt>
<dd>
<code>string</code> -- HTML string used as the shadow root's initial <code>innerHTML</code>. Defaults to <code>"&lt;slot&gt;&lt;/slot&gt;"</code>, which projects all light DOM children.

```js
static template = `
  <div class="wrapper">
    <slot></slot>
  </div>
`;
```

</dd>

</dl>

---

## Instance Properties

<dl class="def">

<dt><span class="badge prop">.shell</span></dt>
<dd>
<code>object</code> -- The nearest ancestor <code>&lt;game-shell&gt;</code> element, found via <code>this.closest("game-shell")</code>. The shell exposes all game state as <code>Signal.State</code> properties directly on the element. Lazily resolved on first access and cached for the component's lifetime.

```js
this.shell.scene.get(); // "playing"
this.shell.score.get(); // 42
```

Returns <code>null</code> if the component is not a descendant of a <code>&lt;game-shell&gt;</code>.

</dd>

<dt><span class="badge prop">.abort</span></dt>
<dd>
<code>AbortController</code> -- The component's <code>AbortController</code>. Created lazily on first access. Aborted when the component disconnects from the DOM. Exposed so subclasses can use it for lifecycle management.
</dd>

<dt><span class="badge prop">.signal</span></dt>
<dd>
<code>AbortSignal</code> -- Shorthand for <code>this.abort.signal</code>. An <code>AbortSignal</code> that is aborted when the component disconnects from the DOM. Use it with <code>addEventListener</code>, <code>fetch</code>, or any API that accepts an abort signal.

```js
connectedCallback() {
  window.addEventListener("resize", this.onResize, { signal: this.signal });
}
```

</dd>

</dl>

---

## Methods

<dl class="def">

<dt><span class="badge method">.effectCallback(shell)</span></dt>
<dd>
Override this method to react to shell signal changes. It is called automatically when the component connects and re-called whenever any signal read inside it changes. The effect is automatically disposed when the component disconnects.

The shell object is passed as the argument. Destructure only the signals you need:

```js
effectCallback({ scene, round }) {
  // Re-runs whenever scene or round changes
  this.#updateDisplay(scene.get(), round.get());
}
```

If you also need to do one-time setup (DOM queries, event listeners), do that in `connectedCallback` and call `super.connectedCallback()` at the end:

```js
connectedCallback() {
  this.#el = this.shadowRoot.querySelector(".value");
  this.addEventListener("click", this.#onClick, { signal: this.signal });
  super.connectedCallback();
}

effectCallback({ score }) {
  this.#el.textContent = score.get();
}
```

Effects are batched via microtasks -- multiple signal writes in the same synchronous block coalesce into a single effect run.

</dd>

<dt><span class="badge method">.subscribe(context, callback)</span></dt>
<dd>
Subscribe to a <a href="/api/context/">context</a> value. The callback fires immediately with the current value and again whenever the provider updates it. The subscription is automatically cleaned up when the component disconnects (tied to <code>this.signal</code>).

This is the right choice for custom contexts or non-signal use cases. For game state signals, use <code>effectCallback</code> instead.

```js
import { gameWordContext } from "htmlgamekit/words";

// inside connectedCallback:
this.subscribe(gameWordContext, (word) => {
  this.#target = word;
});
```

**Parameters:**

- `context` -- A context object created by `createContext()`.
- `callback` -- `(value) => void` -- Called with the current and every subsequent value.

</dd>

<dt><span class="badge method">triggerCallback(name, event)</span></dt>
<dd>
Override this method to react to trigger lifecycle events. The trigger system is automatically initialised when this method is present — no manual setup needed.

Fires for all state triggers (<code>start</code>, <code>round</code>, <code>pass</code>, <code>fail</code>, <code>timeout</code>, <code>complete</code>, <code>tier-up</code>) and DOM triggers (<code>click</code>, <code>keydown</code>, etc.) during the <code>playing</code> state.

```js
triggerCallback(name, event) {
  if (name === "pass") this.#playSound();
}
```

See [Triggers]({{ site.baseurl }}/api/triggers/) for the full list of trigger names.

</dd>

<dt><span class="badge method">timeoutCallback(event)</span></dt>
<dd>
Override this method to handle timeouts separately from failures. When present, the system will fire <code>timeoutCallback</code> instead of <code>triggerCallback("fail")</code> when a round times out. Its presence also signals to the trigger system that this component distinguishes timeout from fail, enabling the <code>timeout</code> trigger to fire (rather than folding into <code>fail</code>).

```js
timeoutCallback(event) {
  this.#showTimeoutMessage();
}
```

</dd>

<dt><span class="badge method">resultCallback(shell)</span></dt>
<dd>
Override this method to run logic exactly once when the game enters the <code>result</code> scene. Automatically resets after the scene leaves <code>result</code>, so it fires once per game. Automatically disposed on disconnect.

```js
resultCallback(shell) {
  const score = shell.score.get();
  this.#renderFinalChart(score);
}
```

</dd>

<dt><span class="badge method">static define(tag, registry?)</span></dt>
<dd>
Register the custom element with the given tag name. Optionally pass a <code>CustomElementRegistry</code> for scoped registries.

```js
RoundDisplay.define("round-display");
```

</dd>

</dl>

---

## `css` Tagged Template

The `css` tagged template literal creates a `CSSStyleSheet` using `new CSSStyleSheet()` and `replaceSync`. This is the recommended way to define component styles because adopted stylesheets are shared across all instances of the component rather than duplicated per element.

```js
import { css } from "htmlgamekit";

const sheet = css`
  :host {
    display: block;
    padding: 1rem;
  }
  .highlight {
    color: var(--game-accent, gold);
  }
`;
// sheet instanceof CSSStyleSheet -> true
```

The template literal is evaluated once at class definition time, producing a single `CSSStyleSheet` object reused by every instance.

---

## Lifecycle

### Constructor

The constructor (called via `super()`) performs the following setup:

1. Attaches an **open shadow root** (`this.attachShadow({ mode: "open" })`).
2. If `static styles` is defined, sets `this.shadowRoot.adoptedStyleSheets = [this.constructor.styles]`.
3. Sets `this.shadowRoot.innerHTML` to `static template` (default: `"<slot></slot>"`).

### `disconnectedCallback()`

Aborts the internal `AbortController`, which:

- Disposes the `effectCallback` reactive effect.
- Cancels all context subscriptions made via `.subscribe()`.
- Removes any event listeners registered with `{ signal: this.signal }`.
- Aborts any in-flight `fetch` calls or other signal-aware operations.
- Clears the cached `shell` reference.

Subclasses may override `disconnectedCallback()` for additional cleanup, but should call `super.disconnectedCallback()`.
