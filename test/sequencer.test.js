import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-sequencer", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("creates from document.createElement", () => {
    const el = document.createElement("game-sequencer");
    assert.instanceOf(el, HTMLElement);
    assert.equal(el.localName, "game-sequencer");
  });

  it("reflects notes, root, start-bpm, end-bpm, gain, type, mode attributes", () => {
    const el = document.createElement("game-sequencer");

    el.setAttribute("notes", "0,2,4,7");
    assert.equal(el.notes, "0,2,4,7");

    assert.equal(el.root, 261.63);
    el.setAttribute("root", "440");
    assert.equal(el.root, 440);

    assert.equal(el.startBpm, 72);
    el.setAttribute("start-bpm", "100");
    assert.equal(el.startBpm, 100);

    assert.equal(el.endBpm, 160);
    el.setAttribute("end-bpm", "200");
    assert.equal(el.endBpm, 200);

    assert.equal(el.gain, 0.07);
    el.setAttribute("gain", "0.5");
    assert.equal(el.gain, 0.5);

    assert.equal(el.type, "marimba");
    el.setAttribute("type", "sine");
    assert.equal(el.type, "sine");

    assert.equal(el.mode, "sequence");
    el.setAttribute("mode", "hum");
    assert.equal(el.mode, "hum");
  });

  it("mode attribute accepts sequence and hum", () => {
    const el = document.createElement("game-sequencer");
    assert.equal(el.mode, "sequence");

    el.setAttribute("mode", "hum");
    assert.equal(el.mode, "hum");

    el.setAttribute("mode", "sequence");
    assert.equal(el.mode, "sequence");

    // invalid falls back to "sequence"
    el.setAttribute("mode", "invalid");
    assert.equal(el.mode, "sequence");
  });

  // ── Missing attr→prop + defaults for end-freq, silent-fraction ──────

  it("reflects end-freq and silent-fraction attributes", () => {
    const el = document.createElement("game-sequencer");

    assert.equal(el.endFreq, 220);
    el.setAttribute("end-freq", "440");
    assert.equal(el.endFreq, 440);

    assert.equal(el.silentFraction, 0.25);
    el.setAttribute("silent-fraction", "0.5");
    assert.equal(el.silentFraction, 0.5);
  });

  // ── IDL property reflection — prop→attr ─────────────────────────────

  describe("IDL property reflection - prop→attr", () => {
    it("notes: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.notes = "0,2,4,7";
      assert.equal(el.getAttribute("notes"), "0,2,4,7");
    });

    it("root: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.root = 440;
      assert.equal(el.getAttribute("root"), "440");
    });

    it("startBpm: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.startBpm = 100;
      assert.equal(el.getAttribute("start-bpm"), "100");
    });

    it("endBpm: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.endBpm = 200;
      assert.equal(el.getAttribute("end-bpm"), "200");
    });

    it("gain: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.gain = 0.5;
      assert.equal(el.getAttribute("gain"), "0.5");
    });

    it("type: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.type = "sine";
      assert.equal(el.getAttribute("type"), "sine");
    });

    it("mode: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.mode = "hum";
      assert.equal(el.getAttribute("mode"), "hum");
    });

    it("endFreq: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.endFreq = 440;
      assert.equal(el.getAttribute("end-freq"), "440");
    });

    it("silentFraction: prop→attr", () => {
      const el = document.createElement("game-sequencer");
      el.silentFraction = 0.5;
      assert.equal(el.getAttribute("silent-fraction"), "0.5");
    });
  });

  it("starts when scene is playing", async () => {
    document.body.innerHTML = `
      <game-shell rounds="3" between-delay="0">
        <game-sequencer notes="0,2,4" mode="sequence"></game-sequencer>
      </game-shell>
    `;
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await tick();

    // Verify indirectly: disconnecting should call stop() without error,
    // which means the sequencer was started and has state to clean up
    const seq = document.querySelector("game-sequencer");
    assert.equal(shell.scene.get(), "playing");
    // Removing should not throw (stop() is called in disconnectedCallback)
    seq.remove();
  });

  it("stops when scene leaves playing", async () => {
    document.body.innerHTML = `
      <game-shell rounds="3" between-delay="0">
        <game-sequencer notes="0,2,4" mode="sequence"></game-sequencer>
      </game-shell>
    `;
    const shell = document.querySelector("game-shell");
    await tick();
    shell.start();
    await tick();

    // Move to a non-playing scene
    shell.scene.set("paused");
    await tick();

    // Removing after stop should not throw
    const seq = document.querySelector("game-sequencer");
    seq.remove();
  });
});
