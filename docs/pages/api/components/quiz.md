---
title: "GameQuiz"
permalink: /api/components/quiz/
demo: quiz
demoHeight: 450px
demoTitle: Quiz demo
cemSkip: [events]
---

A fully declarative quiz/trivia game component. Questions are defined as native `<fieldset>` elements with `<input type="radio">` options in the light DOM. The component handles round selection, answer shuffling, visual feedback, and scoring automatically.

### How Questions Are Defined

Each `<fieldset>` is one question:

| Element / Attribute                | Purpose                                                |
| ---------------------------------- | ------------------------------------------------------ |
| `<fieldset>`                       | Wraps one question                                     |
| `data-tier="N"` on `<fieldset>`    | Assigns the question to difficulty tier N (default: 0) |
| `<legend>`                         | The question prompt                                    |
| `<label>` + `<input type="radio">` | One answer option                                      |
| `data-correct` on an `<input>`     | Marks the correct answer                               |

### Behavior

1. **Question selection** — On each round, the component reads the `difficulty` signal's `tierIndex` from the game state and picks a question from that tier. If no questions remain in the requested tier, it falls back to the closest lower tier, then to any tier with available questions. Questions within a tier are drawn without repeats until the pool is exhausted, then it resets.

2. **Answer shuffling** — The `<label>` elements inside the selected `<fieldset>` are shuffled into a random order each time the question is shown.

3. **Answering** — When the player selects a radio input, all inputs are immediately disabled. The correct answer's label gets the `correct` CSS class, and if the player was wrong, the selected label gets the `wrong` CSS class.

4. **Scoring** — A correct answer dispatches `GameRoundPassEvent(1, "Correct!")` and increments the streak. A wrong answer dispatches `GameRoundFailEvent("Wrong!")` and resets the streak to 0.

### Events Dispatched

<dl class="def">

<dt><span class="badge event">game-round-pass</span></dt>
<dd>
Dispatched with score <code>1</code> and feedback <code>"Correct!"</code> when the player selects the correct answer.
</dd>

<dt><span class="badge event">game-round-fail</span></dt>
<dd>
Dispatched with reason <code>"Wrong!"</code> when the player selects an incorrect answer.
</dd>

<dt><span class="badge event">game-stat-update</span></dt>
<dd>
Dispatched on every answer:

- `key: "streak"`, `value: number` — Always dispatched. Current consecutive correct answer count (resets to 0 on wrong answer).
- `key: "tier"`, `value: string` — Only dispatched when the `difficulty` signal has a `tierName` (i.e. a tier progression is active).
</dd>

</dl>

### Signal Access

| Signal        | Usage                                            |
| ------------- | ------------------------------------------------ |
| Shell signals | Reads `scene`, `round`, and `difficulty` signals |

### Styling

Questions live in the light DOM, so they are styled with normal CSS. The `game-base.css` stylesheet provides default styles for `game-quiz fieldset`, `game-quiz label`, and the `.correct` / `.wrong` feedback classes applied to labels after an answer. Override these in your own stylesheet to customise the appearance.

### Usage

```html
<div when-some-scene="playing between paused">
  <game-quiz>
    <fieldset data-tier="0">
      <legend>What is the capital of France?</legend>
      <label>
        <input type="radio" name="q" value="Paris" data-correct />
        Paris
      </label>
      <label> <input type="radio" name="q" value="Lyon" /> Lyon </label>
      <label>
        <input type="radio" name="q" value="Marseille" /> Marseille
      </label>
      <label> <input type="radio" name="q" value="Nice" /> Nice </label>
    </fieldset>

    <fieldset data-tier="1">
      <legend>What is the capital of Turkey?</legend>
      <label>
        <input type="radio" name="q" value="Ankara" data-correct />
        Ankara
      </label>
      <label> <input type="radio" name="q" value="Istanbul" /> Istanbul </label>
      <label> <input type="radio" name="q" value="Izmir" /> Izmir </label>
      <label> <input type="radio" name="q" value="Antalya" /> Antalya </label>
    </fieldset>
  </game-quiz>
</div>
```
