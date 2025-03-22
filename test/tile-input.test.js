import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-tile-input", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("length defaults to 5, disabled defaults to false", () => {
    const el = document.createElement("game-tile-input");
    assert.equal(el.length, 5);
    assert.isFalse(el.disabled);
  });

  it("renders one tile cell per character of the word length", () => {
    const el = document.createElement("game-tile-input");
    document.body.appendChild(el);
    assert.equal(el.shadowRoot.querySelectorAll(".tile").length, 5);
  });

  it("keyboard input updates value", () => {
    const el = document.createElement("game-tile-input");
    document.body.appendChild(el);

    const input = el.shadowRoot.querySelector("input");
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(el.value, "a");

    input.value = "ab";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(el.value, "ab");
  });

  it("dispatches game-tile-input on each key", () => {
    const el = document.createElement("game-tile-input");
    document.body.appendChild(el);

    const events = [];
    el.addEventListener("game-tile-input", (e) => {
      events.push({ value: e.value, position: e.position });
    });

    const input = el.shadowRoot.querySelector("input");
    input.value = "a";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(events.length, 1);
    assert.equal(events[0].value, "a");
    assert.equal(events[0].position, 0);

    input.value = "ab";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(events.length, 2);
    assert.equal(events[1].value, "ab");
    assert.equal(events[1].position, 1);
  });

  it("dispatches game-tile-submit on Enter when value is complete", () => {
    const el = document.createElement("game-tile-input");
    document.body.appendChild(el);

    let submitEvent = null;
    el.addEventListener("game-tile-submit", (e) => {
      submitEvent = e;
    });

    const input = el.shadowRoot.querySelector("input");
    input.value = "hello";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      }),
    );

    assert.isNotNull(submitEvent);
    assert.equal(submitEvent.value, "hello");
  });

  it("does not dispatch game-tile-submit on Enter when value is incomplete", () => {
    const el = document.createElement("game-tile-input");
    document.body.appendChild(el);

    let submitEvent = null;
    el.addEventListener("game-tile-submit", (e) => {
      submitEvent = e;
    });

    const input = el.shadowRoot.querySelector("input");
    input.value = "hel";
    input.dispatchEvent(new Event("input", { bubbles: true }));

    input.dispatchEvent(
      new KeyboardEvent("keydown", {
        key: "Enter",
        bubbles: true,
      }),
    );

    assert.isNull(submitEvent);
  });

  it("backspace removes last character", () => {
    const el = document.createElement("game-tile-input");
    document.body.appendChild(el);

    const input = el.shadowRoot.querySelector("input");
    input.value = "abc";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(el.value, "abc");

    input.value = "ab";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    assert.equal(el.value, "ab");
  });

  describe("mark()", () => {
    it("marks a position+letter with a state class", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.mark(0, "a", "good");
      el.mark(1, "b", "close");
      el.mark(2, "c", "wrong");

      const input = el.shadowRoot.querySelector("input");
      input.value = "abc";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.isTrue(tiles[0].classList.contains("good"));
      assert.isTrue(tiles[1].classList.contains("close"));
      assert.isTrue(tiles[2].classList.contains("wrong"));
    });

    it("mark is case-insensitive", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.mark(0, "A", "good");

      const input = el.shadowRoot.querySelector("input");
      input.value = "a";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.isTrue(tiles[0].classList.contains("good"));
    });

    it("mark only applies when letter matches at that position", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.mark(0, "a", "good");

      const input = el.shadowRoot.querySelector("input");
      input.value = "b";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.isFalse(tiles[0].classList.contains("good"));
    });
  });

  describe("clearMarks()", () => {
    it("clears all marks so they no longer apply", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.mark(0, "a", "good");
      el.clearMarks();

      const input = el.shadowRoot.querySelector("input");
      input.value = "a";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.isFalse(tiles[0].classList.contains("good"));
    });
  });

  describe("setTile()", () => {
    it("sets a specific tile letter and state class", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.setTile(0, "X", "good");
      el.setTile(1, "Y", "close");
      el.setTile(4, "Z", "wrong");

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles[0].textContent, "X");
      assert.isTrue(tiles[0].classList.contains("good"));
      assert.isTrue(tiles[0].classList.contains("filled"));

      assert.equal(tiles[1].textContent, "Y");
      assert.isTrue(tiles[1].classList.contains("close"));

      assert.equal(tiles[4].textContent, "Z");
      assert.isTrue(tiles[4].classList.contains("wrong"));
    });

    it("setTile with empty letter clears tile", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.setTile(0, "A", "good");
      assert.equal(el.shadowRoot.querySelectorAll(".tile")[0].textContent, "A");

      el.setTile(0, "", "");
      const tile = el.shadowRoot.querySelectorAll(".tile")[0];
      assert.equal(tile.textContent, "");
      assert.isFalse(tile.classList.contains("good"));
      assert.isFalse(tile.classList.contains("filled"));
    });

    it("setTile with out-of-range index is a no-op", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.setTile(99, "Z", "good");
      el.setTile(-1, "A", "good");
    });
  });

  describe("showResult()", () => {
    it("sets all tiles with letters and state arrays", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.showResult(
        ["h", "e", "l", "l", "o"],
        ["good", "close", "wrong", "good", "close"],
      );

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles[0].textContent, "h");
      assert.isTrue(tiles[0].classList.contains("good"));
      assert.equal(tiles[1].textContent, "e");
      assert.isTrue(tiles[1].classList.contains("close"));
      assert.equal(tiles[2].textContent, "l");
      assert.isTrue(tiles[2].classList.contains("wrong"));
      assert.equal(tiles[3].textContent, "l");
      assert.isTrue(tiles[3].classList.contains("good"));
      assert.equal(tiles[4].textContent, "o");
      assert.isTrue(tiles[4].classList.contains("close"));
    });

    it("handles sparse arrays gracefully", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.showResult(["a", "", "c"], ["good", "", "wrong"]);

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles[0].textContent, "a");
      assert.isTrue(tiles[0].classList.contains("good"));
      assert.equal(tiles[1].textContent, "");
      assert.equal(tiles[2].textContent, "c");
      assert.isTrue(tiles[2].classList.contains("wrong"));
      assert.equal(tiles[3].textContent, "");
      assert.equal(tiles[4].textContent, "");
    });
  });

  describe("clear()", () => {
    it("clears the input value and re-renders tiles", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector("input");
      input.value = "test";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      assert.equal(el.value, "test");

      el.clear();
      assert.equal(el.value, "");

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      for (const tile of tiles) {
        assert.equal(tile.textContent, "");
        assert.isFalse(tile.classList.contains("filled"));
      }
    });
  });

  describe("focus()", () => {
    it("focuses the hidden input element", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.focus();
      const input = el.shadowRoot.querySelector("input");
      assert.equal(el.shadowRoot.activeElement, input);
    });
  });

  describe("length attribute change", () => {
    it("changing length rebuilds the tile grid", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      assert.equal(el.shadowRoot.querySelectorAll(".tile").length, 5);

      el.length = 8;
      assert.equal(el.shadowRoot.querySelectorAll(".tile").length, 8);

      el.length = 3;
      assert.equal(el.shadowRoot.querySelectorAll(".tile").length, 3);
    });

    it("changing length via attribute also rebuilds", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.setAttribute("length", "4");
      assert.equal(el.shadowRoot.querySelectorAll(".tile").length, 4);
    });

    it("changing length clears previous tile content", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector("input");
      input.value = "hello";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      el.length = 3;
      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles.length, 3);
    });
  });

  describe("shell integration", () => {
    it("auto-disables when scene is not playing", async () => {
      document.body.innerHTML = `
        <game-shell game-id="tile-shell" rounds="3" between-delay="0">
          <div when-some-scene="playing">
            <game-tile-input></game-tile-input>
          </div>
        </game-shell>
      `;
      await tick();

      const shell = document.querySelector("game-shell");
      const tile = document.querySelector("game-tile-input");

      assert.isTrue(tile.disabled);

      shell.start();
      await tick();
      assert.isFalse(tile.disabled);

      shell.scene.set("between");
      await tick();
      assert.isTrue(tile.disabled);
    });

    it("auto-clears input on new round", async () => {
      document.body.innerHTML = `
        <game-shell game-id="tile-clear" rounds="3" between-delay="0">
          <div when-some-scene="playing">
            <game-tile-input></game-tile-input>
          </div>
        </game-shell>
      `;
      await tick();

      const shell = document.querySelector("game-shell");
      const tile = document.querySelector("game-tile-input");

      shell.start();
      await tick();

      const input = tile.shadowRoot.querySelector("input");
      input.value = "hello";
      input.dispatchEvent(new Event("input", { bubbles: true }));
      assert.equal(tile.value, "hello");

      shell.scene.set("between");
      await tick();
      shell.round.set(2);
      shell.scene.set("playing");
      await tick();

      assert.equal(tile.value, "");
    });
  });

  describe("value property", () => {
    it("value setter updates tiles", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      el.value = "cat";

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.equal(tiles[0].textContent, "c");
      assert.equal(tiles[1].textContent, "a");
      assert.equal(tiles[2].textContent, "t");
      assert.isTrue(tiles[0].classList.contains("filled"));
    });

    it("value getter returns empty string when no input", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);
      assert.equal(el.value, "");
    });
  });

  describe("cursor rendering", () => {
    it("shows cursor class on the next empty tile", () => {
      const el = document.createElement("game-tile-input");
      document.body.appendChild(el);

      const input = el.shadowRoot.querySelector("input");
      input.value = "ab";
      input.dispatchEvent(new Event("input", { bubbles: true }));

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      assert.isTrue(tiles[2].classList.contains("cursor"));
      assert.isFalse(tiles[0].classList.contains("cursor"));
      assert.isFalse(tiles[1].classList.contains("cursor"));
      assert.isFalse(tiles[3].classList.contains("cursor"));
    });

    it("no cursor when disabled", () => {
      const el = document.createElement("game-tile-input");
      el.setAttribute("disabled", "");
      document.body.appendChild(el);

      const tiles = el.shadowRoot.querySelectorAll(".tile");
      for (const tile of tiles) {
        assert.isFalse(tile.classList.contains("cursor"));
      }
    });
  });
});
