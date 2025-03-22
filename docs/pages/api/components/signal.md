---
title: "GameSignal"
permalink: /api/components/signal/
cemSkip: [attrs]
---

A lightweight element that binds to any shell signal, stat, or difficulty property and renders its value as text content. No shadow DOM, no styles — just reactive text. Use it anywhere you need to display a live game value.

### Attributes

All attributes reflect as IDL properties of the same name.

<dl class="def">

<dt><span class="badge attr">key</span> <code>.key</code></dt>
<dd>
<code>string</code> -- The value to display. Case-insensitive. Resolved in order:

1. **Shell signals**: `score`, `round`, `rounds`, `scene`, `groupId`, `groupName`, `trophyCount`, `passStreak`, `failStreak`, `peakPassStreak`, `peakFailStreak`, `roundScore`, `bestRoundScore`, `worstRoundScore`, `url`
2. **Difficulty properties**: any key from the difficulty object (e.g. `tierName`, `level`)
3. **Stats**: any key from the stats map (e.g. `streak`, `totalDE`)
</dd>

<dt><span class="badge attr">format</span> <code>.format</code></dt>
<dd>
<code>string?</code> -- Optional format specifier. See
<a href="{{ site.baseurl }}/api/utilities/#formatvaluev-format"><code>formatValue</code></a> for supported formats
(<code>"ms"</code>, <code>"2dp"</code>, etc.). Only used when
<code>formatScore</code> is not set on the shell (for the <code>score</code>
key).
</dd>

</dl>

### Special Keys

**`score`** -- Uses `shell.formatScoreSignal` if set, otherwise falls back to the `format` attribute or raw string.

**`round`** -- Shows `round/rounds` when total rounds are configured, or just the round number for open-ended games.

**`url`** -- Builds a full shareable URL from `encodedResult` (e.g. `https://example.com/game?r=...`). Returns the current page URL if no encoded result is set. Preserves any `?g=` group parameter.

### Design Notes

- **No shadow DOM** -- renders as inline text, inherits parent styles.
- **Reactive** -- re-renders via `effectCallback` when the bound signal changes. Only the specific signal(s) referenced by `key` are tracked as dependencies.
- **Case-insensitive** -- `key="score"` and `key="Score"` both work.
- **Composable** -- use inside HUDs, between screens, overlays, toasts, or custom components.

### Usage

```html
<!-- Score (formatted by shell.formatScore if set) -->
<game-signal key="score"></game-signal>

<!-- Round with total -->
<game-signal key="round"></game-signal>

<!-- Stat with formatting -->
<game-signal key="totalDE" format="4dp"></game-signal>

<!-- Difficulty property -->
<game-signal key="tierName"></game-signal>

<!-- Group name -->
<game-signal key="groupName"></game-signal>
```
