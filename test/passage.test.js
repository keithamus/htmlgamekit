import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("game-passage", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("defines as a custom element", () => {
    assert.isDefined(customElements.get("game-passage"));
  });

  it("adds id to visited collection when it becomes active", async () => {
    document.body.innerHTML = `
      <game-shell game-id="passage-visit" rounds="1">
        <game-passage id="lobby" when-some-scene="ready">
          <p>You are in the lobby.</p>
        </game-passage>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    // Shell starts at ready, so the passage should be slotted
    assert.isTrue(shell.hasInCollection("visited", "lobby"));
  });

  it("uses custom collection name when specified", async () => {
    document.body.innerHTML = `
      <game-shell game-id="passage-custom-col" rounds="1">
        <game-passage id="room-a" collection="rooms" when-some-scene="ready">
          <p>Room A</p>
        </game-passage>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    assert.isTrue(shell.hasInCollection("rooms", "room-a"));
    assert.isFalse(shell.hasInCollection("visited", "room-a"));
  });

  it("evaluates when-* conditions on children", async () => {
    document.body.innerHTML = `
      <game-shell game-id="passage-children" rounds="1">
        <game-passage id="foyer" when-some-scene="ready">
          <div id="first" when-no-visited="foyer">First time here!</div>
          <div id="revisit" when-some-visited="foyer">Welcome back!</div>
        </game-passage>
      </game-shell>
    `;
    await tick();

    // Children are evaluated BEFORE the visit is tracked, so on first
    // activation when-no-visited passes (first-visit visible) and
    // when-some-visited fails (revisit hidden).
    const first = document.getElementById("first");
    const revisit = document.getElementById("revisit");

    assert.isFalse(first.hidden, "first-visit content should be visible on first activation");
    assert.isTrue(revisit.hidden, "revisit content should be hidden on first activation");
  });

  it("does not add to visited when passage is not active", async () => {
    document.body.innerHTML = `
      <game-shell game-id="passage-inactive" rounds="1">
        <game-passage id="cellar" when-some-scene="playing">
          <p>Dark cellar</p>
        </game-passage>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    // Shell is at "ready", not "playing", so passage is not slotted
    assert.isFalse(shell.hasInCollection("visited", "cellar"));
  });

  it("first-visit content shows on first activation", async () => {
    document.body.innerHTML = `
      <game-shell game-id="passage-first" rounds="1">
        <game-passage id="garden" when-some-scene="playing">
          <div id="fv" when-no-visited="garden">A beautiful garden!</div>
          <div id="rv" when-some-visited="garden">The garden again.</div>
        </game-passage>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    // Not yet active
    assert.isFalse(shell.hasInCollection("visited", "garden"));

    // Activate by changing scene to playing
    shell.start();
    await tick();

    // Now garden should be visited
    assert.isTrue(shell.hasInCollection("visited", "garden"));
  });

  it("displays as contents (no extra box)", async () => {
    document.body.innerHTML = `
      <game-shell game-id="passage-display" rounds="1">
        <game-passage id="x" when-some-scene="ready">hi</game-passage>
      </game-shell>
    `;
    await tick();

    const passage = document.querySelector("game-passage");
    const style = getComputedStyle(passage);
    assert.equal(style.display, "contents");
  });
});
