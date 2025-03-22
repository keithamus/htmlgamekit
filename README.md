# HTMLGameKit

A Web Components game framework. Declarative HTML game shells with state machines, round progressions, timers, and more.

HTMLGameKit is a set of custom elements that give you everything you need to
build simple browser-based games with nothing but HTML, CSS, and a pinch of
JavaScript. No build step required.

## Documentation

Full docs, tutorials, and interactive demos at **[htmlgamekit.dev](https://htmlgamekit.dev)**.

## Quick Start

```
npm install htmlgamekit
```

```html
<script type="importmap">
  { "imports": { "htmlgamekit/": "./node_modules/htmlgamekit/" } }
</script>
<script type="module" src="htmlgamekit/src/index.js"></script>

<game-shell rounds="5">
  <!-- your game here -->
</game-shell>
```

See the [Getting Started](https://htmlgamekit.dev/getting-started/) guide and
[examples/](examples/) directory for more.

## License

MIT - Keith Cirkel

## Sponsors

If you find this useful, consider [sponsoring](https://github.com/sponsors/keithamus).
