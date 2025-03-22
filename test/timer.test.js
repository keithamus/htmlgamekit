import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-timer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement and has correct nodeName", () => {
    const el = document.createElement("game-timer");
    assert.equal(el.nodeName, "GAME-TIMER");
  });

  it("default duration is 10 and default countdown is 0", () => {
    const el = document.createElement("game-timer");
    assert.equal(el.duration, 10);
    assert.equal(el.countdown, 0);
  });

  it("reflects duration attribute to property", () => {
    const el = document.createElement("game-timer");
    el.setAttribute("duration", "5");
    assert.equal(el.duration, 5);
  });

  describe("IDL property reflection - prop→attr", () => {
    it("duration: prop→attr", () => {
      const el = document.createElement("game-timer");
      el.duration = 30;
      assert.equal(el.getAttribute("duration"), "30");
    });

    it("countdown: prop→attr", () => {
      const el = document.createElement("game-timer");
      el.countdown = 5;
      assert.equal(el.getAttribute("countdown"), "5");
    });
  });

  it("start() begins the timer", () => {
    document.body.innerHTML = "<game-timer duration='1'></game-timer>";
    const timer = document.querySelector("game-timer");
    timer.start();
    // The timer stores #running privately; we verify by checking that tick events fire
    let ticked = false;
    timer.addEventListener("game-timer-tick", () => { ticked = true; });
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        assert.isTrue(ticked, "timer should dispatch tick events after start");
        timer.stop();
        resolve();
      });
    });
  });

  it("stop() stops the timer", () => {
    document.body.innerHTML = "<game-timer duration='1'></game-timer>";
    const timer = document.querySelector("game-timer");
    timer.start();
    timer.stop();
    let ticked = false;
    timer.addEventListener("game-timer-tick", () => { ticked = true; });
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        assert.isFalse(ticked, "timer should not dispatch tick events after stop");
        resolve();
      });
    });
  });

  it("dispatches game-timer-tick events while running", (done) => {
    document.body.innerHTML = "<game-timer duration='0.05'></game-timer>";
    const timer = document.querySelector("game-timer");
    timer.addEventListener("game-timer-tick", (e) => {
      assert.isNumber(e.remaining);
      assert.isNumber(e.fraction);
      timer.stop();
      done();
    });
    timer.start();
  });

  it("dispatches game-timer-expired when time runs out", (done) => {
    document.body.innerHTML = "<game-timer duration='0.02'></game-timer>";
    const timer = document.querySelector("game-timer");
    timer.addEventListener("game-timer-expired", () => {
      done();
    });
    timer.start();
  });

  it("auto-starts when scene is 'playing' inside a game-shell", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <div when-some-scene="playing"><game-timer duration="5"></game-timer></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    const timer = document.querySelector("game-timer");
    let ticked = false;
    timer.addEventListener("game-timer-tick", () => { ticked = true; });
    shell.start();
    await microtask();
    // Wait for at least one rAF to fire a tick
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    assert.isTrue(ticked, "timer should auto-start when scene becomes playing");
    timer.stop();
  });

  it("auto-stops when scene leaves 'playing' inside a game-shell", async () => {
    document.body.innerHTML = `
      <game-shell id="s" rounds="3">
        <div when-some-scene="playing"><game-timer duration="5"></game-timer></div>
      </game-shell>
    `;
    await tick();
    const shell = document.querySelector("#s");
    const timer = document.querySelector("game-timer");
    shell.start();
    await microtask();
    // Verify timer is ticking
    let tickCount = 0;
    timer.addEventListener("game-timer-tick", () => { tickCount++; });
    await new Promise((r) => requestAnimationFrame(r));
    const countBefore = tickCount;
    // Move scene away from playing
    shell.scene.set("between");
    await microtask();
    tickCount = 0;
    // Wait a couple frames - no more ticks should come
    await new Promise((r) => requestAnimationFrame(r));
    await new Promise((r) => requestAnimationFrame(r));
    assert.equal(tickCount, 0, "timer should stop when scene leaves playing");
  });
});
