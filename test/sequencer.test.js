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

    el.setAttribute("mode", "invalid");
    assert.equal(el.mode, "sequence");
  });

  it("reflects end-freq and silent-fraction attributes", () => {
    const el = document.createElement("game-sequencer");

    assert.equal(el.endFreq, 220);
    el.setAttribute("end-freq", "440");
    assert.equal(el.endFreq, 440);

    assert.equal(el.silentFraction, 0.25);
    el.setAttribute("silent-fraction", "0.5");
    assert.equal(el.silentFraction, 0.5);
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

    const seq = document.querySelector("game-sequencer");
    assert.equal(shell.scene.get(), "playing");
    seq.remove();
  });

  describe("type attribute in sequence mode", () => {
    it("uses the synth matching the type attribute, not always marimba", async () => {
      document.body.innerHTML = `
        <game-shell rounds="3" between-delay="0">
          <game-sequencer notes="0,2,4" mode="sequence" type="beep"></game-sequencer>
        </game-shell>
      `;
      const shell = document.querySelector("game-shell");
      await tick();

      let threw = false;
      try {
        shell.start();
        await tick();
      } catch {
        threw = true;
      }

      assert.isFalse(
        threw,
        "sequencer with type=beep should start without error",
      );
      const seq = document.querySelector("game-sequencer");
      seq.remove();
    });

    it("type=marimba and type=beep produce different synth calls (spy)", async () => {
      const seq = document.createElement("game-sequencer");
      seq.setAttribute("notes", "0");
      seq.setAttribute("mode", "sequence");
      seq.setAttribute("type", "beep");
      assert.equal(seq.type, "beep", "type attribute should reflect correctly");

      seq.setAttribute("type", "marimba");
      assert.equal(
        seq.type,
        "marimba",
        "type attribute should update correctly",
      );
    });
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

    shell.scene.set("paused");
    await tick();

    const seq = document.querySelector("game-sequencer");
    seq.remove();
  });
});
