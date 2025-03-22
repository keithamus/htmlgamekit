---
layout: doc
title: "Utilities"
permalink: /api/utilities/
---

# Utilities

| Function | Export | Docs |
|---|---|---|
| `formatValue(v, format)` | Named export from `htmlgamekit` | below |
| `GameShell.toBase64Url(buf)` | Static on `GameShell` | [GameShell]({{ site.baseurl }}/api/game-shell/) |
| `GameShell.fromBase64Url(str)` | Static on `GameShell` | [GameShell]({{ site.baseurl }}/api/game-shell/) |
| `GameShell.encodeUint16WithBitmask(scale?)` | Static on `GameShell` | [GameShell]({{ site.baseurl }}/api/game-shell/) |
| `GameShell.encodeUint16Array(scale?, roundCount?)` | Static on `GameShell` | [GameShell]({{ site.baseurl }}/api/game-shell/) |
| `gameScores(id, opts)` | Named export from `htmlgamekit` | [Scoring]({{ site.baseurl }}/scoring/) |
| `noopScores` | Named export from `htmlgamekit` | [Scoring]({{ site.baseurl }}/scoring/) |
| `groupParam()` | Named export from `htmlgamekit` | [GameShell]({{ site.baseurl }}/api/game-shell/) |
| `appendGroupParam(url)` | Named export from `htmlgamekit` | [GameShell]({{ site.baseurl }}/api/game-shell/) |

## `formatValue(v, format)`

Formats a numeric game value for display.

```js
import { formatValue } from "htmlgamekit";
```

**Parameters:**

- `v` — value to format.
- `format` — format specifier:
  - `"ms"` — rounds to integer and appends `"ms"` (e.g. `342.7` → `"343ms"`)
  - `"Ndp"` — fixed-point with N decimal places (e.g. `"2dp"` formats `0.1` as `"0.10"`)
  - anything else — `String(v)`

**Returns:** `string`

```js
formatValue(342.7, "ms");    // "343ms"
formatValue(0.123, "2dp");   // "0.12"
formatValue(42, "plain");    // "42"
```

Used by `<game-stat>`, `<game-result-stat>`, and `<game-signal>` via their `format` attribute.
