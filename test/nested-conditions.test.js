import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { conditionalDescendants } from "../src/conditions.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("nested when-* conditions", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("hides a nested element whose condition fails", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-fail" rounds="1">
        <div when-some-scene="intro">
          <p id="waiting" when-max-player-count="0">Waiting</p>
          <p id="ready" when-min-player-count="1">Ready</p>
        </div>
      </game-shell>
    `;
    await tick();

    assert.isFalse(document.querySelector("#waiting").hidden);
    assert.isTrue(document.querySelector("#ready").hidden);
  });

  it("reacts to a stat change", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-react" rounds="1">
        <div when-some-scene="intro">
          <p id="waiting" when-max-player-count="0">Waiting</p>
          <p id="ready" when-min-player-count="1">Ready</p>
        </div>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    shell.stats.set({ ...shell.stats.get(), "player-count": 1 });
    await tick();

    assert.isTrue(document.querySelector("#waiting").hidden);
    assert.isFalse(document.querySelector("#ready").hidden);
  });

  it("leaves unconditional nested elements alone", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-plain" rounds="1">
        <div when-some-scene="intro">
          <p id="always">Always</p>
        </div>
      </game-shell>
    `;
    await tick();

    assert.isFalse(document.querySelector("#always").hidden);
    assert.isFalse(document.querySelector("#always").hasAttribute("hidden"));
  });

  it("evaluates conditions more than one level deep", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-deep" rounds="1">
        <div when-some-scene="intro">
          <div class="row">
            <span id="deep" when-eq-scene="playing">Deep</span>
          </div>
        </div>
      </game-shell>
    `;
    await tick();

    assert.isTrue(document.querySelector("#deep").hidden);
  });

  it("does not touch the shell's own children", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-top" rounds="1">
        <div id="top" when-eq-scene="playing">Playing</div>
      </game-shell>
    `;
    await tick();

    const top = document.querySelector("#top");
    assert.isFalse(top.hasAttribute("hidden"));
    assert.isNull(top.assignedSlot);
  });

  it("skips option elements, which are data", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-option" rounds="1" sprite-sheet="/icons.svg">
        <div when-some-scene="intro">
          <game-icon name="volume-2">
            <option id="opt" when-some-muted value="volume-x"></option>
          </game-icon>
        </div>
      </game-shell>
    `;
    await tick();

    assert.isFalse(document.querySelector("#opt").hasAttribute("hidden"));
  });

  it("skips components that read their own conditions", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-owns" rounds="1">
        <div when-some-scene="intro">
          <game-audio>
            <game-sample id="sample" trigger="pass" when-min-score="100"
                         type="beep" notes="440:0"></game-sample>
          </game-audio>
          <game-trophy id="trophy" name="Century" when-min-score="100"></game-trophy>
        </div>
      </game-shell>
    `;
    await tick();

    assert.isFalse(document.querySelector("#sample").hasAttribute("hidden"));
    assert.isFalse(document.querySelector("#trophy").hasAttribute("hidden"));
  });

  it("excludes owned subtrees from the descendant walk", async () => {
    document.body.innerHTML = `
      <game-shell game-id="nested-walk" rounds="1">
        <div when-some-scene="intro">
          <p id="counted" when-eq-scene="ready"></p>
          <game-passage id="passage" when-eq-scene="ready">
            <p id="uncounted" when-eq-scene="ready"></p>
          </game-passage>
        </div>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    const ids = [...conditionalDescendants(shell)].map((el) => el.id);
    assert.deepEqual(ids, ["counted"]);
  });
});
