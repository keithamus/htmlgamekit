import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("game-trophy", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  // ── Basic element creation ───────────────────────────────────────────

  it("creates from document.createElement", () => {
    const el = document.createElement("game-trophy");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-trophy");
  });

  it("reflects name attribute", () => {
    const el = document.createElement("game-trophy");
    el.setAttribute("name", "Gold Star");
    assert.equal(el.name, "Gold Star");
  });

  it("reflects icon attribute", () => {
    const el = document.createElement("game-trophy");
    el.setAttribute("icon", "star");
    assert.equal(el.icon, "star");
  });

  it("reflects description attribute", () => {
    const el = document.createElement("game-trophy");
    el.setAttribute("description", "Score 100 points");
    assert.equal(el.description, "Score 100 points");
  });

  describe("IDL property reflection - prop→attr", () => {
    it("name: prop→attr", () => {
      const el = document.createElement("game-trophy");
      el.name = "Star";
      assert.equal(el.getAttribute("name"), "Star");
    });

    it("icon: prop→attr", () => {
      const el = document.createElement("game-trophy");
      el.icon = "star";
      assert.equal(el.getAttribute("icon"), "star");
    });

    it("description: prop→attr", () => {
      const el = document.createElement("game-trophy");
      el.description = "Score 100 points";
      assert.equal(el.getAttribute("description"), "Score 100 points");
    });
  });

  it("trophyId returns the element id", () => {
    const el = document.createElement("game-trophy");
    el.id = "my-trophy";
    assert.equal(el.trophyId, "my-trophy");
  });

  // ── Lock/unlock state ────────────────────────────────────────────────

  it("starts locked", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-test" rounds="3">
        <game-trophy id="star" name="Star"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#star");
    assert.isFalse(trophy.unlocked);
  });

  it(".unlock() marks the trophy as unlocked", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-test-unlock" rounds="3">
        <game-trophy id="star" name="Star"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#star");
    trophy.unlock();
    assert.isTrue(trophy.unlocked);
  });

  it(".unlock() is idempotent", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-test-idem" rounds="3">
        <game-trophy id="dup" name="Dup"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#dup");
    const events = [];
    trophy.addEventListener("game-trophy-unlock", (e) => events.push(e));

    trophy.unlock();
    trophy.unlock();

    assert.equal(events.length, 1);
    assert.isTrue(trophy.unlocked);
  });

  // ── Events ───────────────────────────────────────────────────────────

  it("dispatches game-trophy-unlock event on unlock", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-test-event" rounds="3">
        <game-trophy id="medal" name="Medal"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#medal");
    let receivedEvent = null;
    trophy.addEventListener("game-trophy-unlock", (e) => {
      receivedEvent = e;
    });

    trophy.unlock();
    assert.isNotNull(receivedEvent);
    assert.equal(receivedEvent.trophyId, "medal");
    assert.equal(receivedEvent.trophyName, "Medal");
  });

  it("game-trophy-unlock event bubbles to shell", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-test-bubble" rounds="3">
        <game-trophy id="medal" name="Medal"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    const trophy = document.querySelector("game-trophy#medal");
    let received = null;
    shell.addEventListener("game-trophy-unlock", (e) => { received = e; });

    trophy.unlock();
    assert.isNotNull(received);
    assert.equal(received.trophyId, "medal");
  });

  // ── Shell integration ────────────────────────────────────────────────

  it("unlock() registers the trophy with the shell", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-test-shell" rounds="3">
        <game-trophy id="star" name="Star"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    const trophy = document.querySelector("game-trophy#star");

    assert.isFalse(shell.isTrophyUnlocked("star"));
    trophy.unlock();
    assert.isTrue(shell.isTrophyUnlocked("star"));
  });

  it("trophyCount on shell reflects total unlocked", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-test-count" rounds="3">
        <game-trophy id="a" name="A"></game-trophy>
        <game-trophy id="b" name="B"></game-trophy>
        <game-trophy id="c" name="C"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    assert.equal(shell.trophyCount, 0);

    document.querySelector("game-trophy#a").unlock();
    assert.equal(shell.trophyCount, 1);

    document.querySelector("game-trophy#b").unlock();
    assert.equal(shell.trophyCount, 2);

    document.querySelector("game-trophy#c").unlock();
    assert.equal(shell.trophyCount, 3);
  });

  // ── Persistence to localStorage ──────────────────────────────────────

  it("persists unlock to localStorage", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-persist" rounds="3">
        <game-trophy id="alpha" name="Alpha"></game-trophy>
      </game-shell>
    `;
    await tick();

    document.querySelector("game-trophy#alpha").unlock();

    const raw = localStorage.getItem("trophy-persist-trophies");
    assert.isNotNull(raw);
    const saved = JSON.parse(raw);
    assert.include(saved, "alpha");
  });

  it("restores unlocked state from localStorage on connect", async () => {
    localStorage.setItem(
      "trophy-restore-trophies",
      JSON.stringify(["star", "moon"]),
    );

    document.body.innerHTML = `
      <game-shell game-id="trophy-restore" rounds="3">
        <game-trophy id="star" name="Star"></game-trophy>
        <game-trophy id="moon" name="Moon"></game-trophy>
        <game-trophy id="sun" name="Sun"></game-trophy>
      </game-shell>
    `;
    await tick();

    assert.isTrue(document.querySelector("game-trophy#star").unlocked);
    assert.isTrue(document.querySelector("game-trophy#moon").unlocked);
    assert.isFalse(document.querySelector("game-trophy#sun").unlocked);
  });

  it("newly unlocked trophies are added to existing persisted data", async () => {
    localStorage.setItem("trophy-add-trophies", JSON.stringify(["alpha"]));

    document.body.innerHTML = `
      <game-shell game-id="trophy-add" rounds="3">
        <game-trophy id="alpha" name="Alpha"></game-trophy>
        <game-trophy id="beta" name="Beta"></game-trophy>
      </game-shell>
    `;
    await tick();

    assert.isTrue(document.querySelector("game-trophy#alpha").unlocked);
    document.querySelector("game-trophy#beta").unlock();

    const saved = JSON.parse(localStorage.getItem("trophy-add-trophies"));
    assert.include(saved, "alpha");
    assert.include(saved, "beta");
  });

  // ── Auto-unlock ──────────────────────────────────────────────────────

  it("auto-unlock: when-min-score unlocks at result when score meets threshold", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-auto-score" rounds="1">
        <game-trophy id="highscore" name="High Scorer" when-min-score="10"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    const trophy = document.querySelector("game-trophy#highscore");
    assert.isFalse(trophy.unlocked);

    shell.score.set(15);
    shell.scene.set("result");
    await tick();

    assert.isTrue(trophy.unlocked);
  });

  it("auto-unlock: does NOT fire when score is below threshold", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-auto-noscore" rounds="1">
        <game-trophy id="highscore" name="High Scorer" when-min-score="100"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    shell.score.set(50);
    shell.scene.set("result");
    await tick();

    assert.isFalse(document.querySelector("game-trophy#highscore").unlocked);
  });

  it("auto-unlock: when-min-{stat} unlocks when stat meets threshold", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-auto-stat" rounds="1">
        <game-trophy id="streak" name="Streak Master" when-min-streak="3"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    assert.isFalse(document.querySelector("game-trophy#streak").unlocked);

    shell.stats.set({ streak: 3 });
    shell.scene.set("result");
    await tick();

    assert.isTrue(document.querySelector("game-trophy#streak").unlocked);
  });

  it("auto-unlock: when-min-{stat} does NOT unlock when stat is below threshold", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-auto-stat-low" rounds="1">
        <game-trophy id="streak" name="Streak Master" when-min-streak="5"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    shell.stats.set({ streak: 2 });
    shell.scene.set("result");
    await tick();

    assert.isFalse(document.querySelector("game-trophy#streak").unlocked);
  });

  it("auto-unlock: when-eq-{difficulty key} unlocks when difficulty matches", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-auto-diff" rounds="1">
        <game-trophy id="hard-mode" name="Hard Mode" when-eq-tier-name="Hard"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    assert.isFalse(document.querySelector("game-trophy#hard-mode").unlocked);

    shell.difficulty.set({ tierName: "Hard" });
    shell.scene.set("result");
    await tick();

    assert.isTrue(document.querySelector("game-trophy#hard-mode").unlocked);
  });

  it("auto-unlock: when-eq does NOT unlock with wrong value", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-auto-diff-wrong" rounds="1">
        <game-trophy id="hard-mode" name="Hard Mode" when-eq-tier-name="Hard"></game-trophy>
      </game-shell>
    `;
    await tick();

    const shell = document.querySelector("game-shell");
    shell.difficulty.set({ tierName: "Easy" });
    shell.scene.set("result");
    await tick();

    assert.isFalse(document.querySelector("game-trophy#hard-mode").unlocked);
  });

  // ── Shadow DOM rendering ─────────────────────────────────────────────

  it("renders name in shadow DOM", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-render" rounds="1">
        <game-trophy id="named" name="Gold Medal"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#named");
    const nameEl = trophy.shadowRoot.querySelector(".name");
    assert.isNotNull(nameEl);
    assert.equal(nameEl.textContent, "Gold Medal");
  });

  it("renders description in tooltip", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-tooltip" rounds="1">
        <game-trophy id="desc" name="Desc" description="Get 100 points"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#desc");
    const tooltip = trophy.shadowRoot.querySelector(".tooltip");
    assert.isNotNull(tooltip);
    assert.equal(tooltip.textContent, "Get 100 points");
  });

  it("trophy with icon attribute renders a game-icon element", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-icon" rounds="1">
        <game-trophy id="ico" name="Icon Trophy" icon="star"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#ico");
    const iconEl = trophy.shadowRoot.querySelector("game-icon");
    assert.isNotNull(iconEl);
    assert.equal(iconEl.getAttribute("name"), "star");
  });

  it("trophy without icon attribute does not render game-icon", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-noicon" rounds="1">
        <game-trophy id="noico" name="No Icon"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#noico");
    const iconEl = trophy.shadowRoot.querySelector("game-icon");
    assert.isNull(iconEl);
  });

  it(".unlocked reflects lock/unlock transitions", async () => {
    document.body.innerHTML = `
      <game-shell game-id="trophy-state" rounds="1">
        <game-trophy id="s" name="S"></game-trophy>
      </game-shell>
    `;
    await tick();

    const trophy = document.querySelector("game-trophy#s");
    assert.isFalse(trophy.unlocked);
    trophy.unlock();
    assert.isTrue(trophy.unlocked);
  });
});
