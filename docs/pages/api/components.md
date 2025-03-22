---
layout: doc
title: "UI Components"
permalink: /api/components/
---

HTMLGameKit ships a set of ready-to-use custom elements for common game UI
patterns. All components read signals from the shell automatically — drop
them inside `<game-shell>` and they work.

For layout patterns that use plain elements rather than custom elements, see
[GameShell (Scene Visibility & Overlays)]({{ site.baseurl }}/api/game-shell/),
[Game Area]({{ site.baseurl }}/api/area/), and
[HUD]({{ site.baseurl }}/api/hud/).

{% for group in componentGroups %}

## {{ group.name }}

| Element | Description |
| ------- | ----------- |
{% for tag in group.tags %}{% assign comp = cem[tag] %}{% if comp %}| [`<{{ tag }}>`]({{ site.baseurl }}/api/components/{{ tag | remove: "game-" }}/) | {{ comp.summary }} |
{% endif %}{% endfor %}
{% endfor %}

## CSS Custom Properties

All components respect these CSS custom properties for theming. Set them on `<game-shell>` or any ancestor. The defaults below match the values in `game-base.css`.

| Property                      | Default                    | Description                            |
| ----------------------------- | -------------------------- | -------------------------------------- |
| `--game-bg`                   | `#111`                     | Primary background color               |
| `--game-text`                 | `#eee`                     | Primary text color                     |
| `--game-accent`               | `#fff`                     | Accent color (timer bar, progress bar) |
| `--game-overlay-bg`           | `rgba(0, 0, 0, 0.8)`       | Overlay background                     |
| `--game-btn-bg`               | `#fff`                     | Button background                      |
| `--game-btn-text`             | `#111`                     | Button text color                      |
| `--game-btn-border`           | `rgba(255, 255, 255, 0.5)` | Button border color                    |
| `--game-result-gradient-from` | `#6ee7b7`                  | Result stat gradient start             |
| `--game-result-gradient-to`   | `#3b82f6`                  | Result stat gradient end               |
| `--game-toast-color`          | `var(--game-text, #eee)`   | Toast text color                       |
| `--game-flash-pass`           | `rgba(50, 220, 120, 0.35)` | Flash color on pass                    |
| `--game-flash-fail`           | `rgba(230, 40, 40, 0.3)`   | Flash color on fail                    |
| `--game-between-bg`           | `#111`                     | Between-rounds background              |
