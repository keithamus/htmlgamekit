---
layout: doc
title: "Context Protocol"
permalink: /api/context/
---

HTMLGameKit implements the [Context Community Protocol](https://github.com/webcomponents-cg/community-protocols/blob/main/proposals/context.md) for DOM-based data sharing between components that don't share a common shell ancestor.

## Signals vs Context

**For almost all game data, use signals.** The shell exposes all game state as `Signal.State` instances accessible via `this.shell` in any `GameComponent`. This covers scene, score, round, difficulty, stats, sprite sheet URL, and everything else the shell manages.

```js
effectCallback({ scene, score, spriteSheet }) {
  // reactive access to any shell state — no context needed
}
```

**Context is the right choice only when the data provider is not the shell** — that is, when you have a custom element that needs to distribute its own data to its DOM descendants, and those descendants don't have another way to reach it.

The canonical example is `<game-word-source>`: it fetches a word and needs to share it with `<word-game>` below it. Neither is the shell. Context is the natural fit.

```js
// Provider (game-word-source)
this.#provider = new ContextProvider(this, gameWordContext, "");
this.#provider.setValue("crane");

// Consumer (word-game, inside connectedCallback)
this.subscribe(gameWordContext, (word) => {
  this.#target = word;
});
```

If you find yourself using context to share something that the shell already knows about, use signals instead.

---

## Import

```js
import {
  createContext,
  ContextProvider,
  subscribe,
  ContextRequestEvent,
} from "htmlgamekit";
```

---

## `createContext(key)`

<dl class="def">

<dt><span class="badge method">createContext(key)</span></dt>
<dd>
Returns a context identifier. Two calls with the same key return equal contexts, so they can be compared across modules.

**Parameters:**

- `key` -- `string` -- A unique string identifier for the context.

**Returns:** A context object suitable for use with `ContextProvider` and `subscribe`.

```js
export const gameWordContext = createContext("game-word");
```

Export the context object from the module that defines it so consumers can import it.

</dd>

</dl>

---

## `ContextProvider`

Provides a context value to any descendant that requests it.

<dl class="def">

<dt><span class="badge method">new ContextProvider(host, context, initialValue)</span></dt>
<dd>
Creates a new provider attached to <code>host</code>. Immediately begins listening for <code>context-request</code> events from descendants.

**Parameters:**

- `host` -- `HTMLElement` -- The element that owns this provider.
- `context` -- A context object from `createContext`.
- `initialValue` -- The initial value to provide.

```js
connectedCallback() {
  this.#provider = new ContextProvider(this, gameWordContext, "");
  super.connectedCallback();
}
```

</dd>

<dt><span class="badge method">.setValue(value)</span></dt>
<dd>
Update the provided value. All active subscribers are notified synchronously. Skips notification if the new value is strictly equal to the current one.

```js
this.#provider.setValue("crane");
```

</dd>

<dt><span class="badge prop">.value</span></dt>
<dd>
<code>any</code> -- The current provided value (read-only).
</dd>

</dl>

---

## `this.subscribe(context, callback)` on `GameComponent`

The `GameComponent` base class provides a `subscribe` method that handles cleanup automatically — the subscription is released when the component disconnects.

```js
connectedCallback() {
  this.subscribe(gameWordContext, (word) => {
    this.#target = word;
  });
  super.connectedCallback();
}
```

This is the recommended way to consume context inside a `GameComponent`. The subscription fires immediately with the current value and again on every update.

---

## `subscribe(host, context, callback, options?)` (standalone)

For consuming context outside of a `GameComponent`:

<dl class="def">

<dt><span class="badge method">subscribe(host, context, callback, options?)</span></dt>
<dd>
Dispatches a <code>context-request</code> event on <code>host</code>. When a provider above responds, the callback fires immediately with the current value and again on every subsequent update.

**Parameters:**

- `host` -- `HTMLElement` -- The subscribing element.
- `context` -- A context object.
- `callback` -- `(value) => void` -- Called with each value update.
- `options` -- `{ signal?: AbortSignal }` -- Pass an `AbortSignal` to automatically unsubscribe when it aborts.

When the signal aborts, the subscription is removed and the provider releases its reference to the callback.

</dd>

</dl>

---

## GC Safety

`ContextProvider` holds subscriber callbacks via `WeakRef`. If a subscribing element is garbage-collected without explicitly unsubscribing, the provider won't hold it alive. To prevent premature collection (before the element is actually removed), HTMLGameKit stores a strong reference to each callback keyed by its `AbortSignal`, releasing it when the signal aborts. This is transparent — you don't need to interact with it directly.
