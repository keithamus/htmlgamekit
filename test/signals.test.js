import { assert } from "@open-wc/testing";
import { Signal, effect } from "../src/signals.js";

const tick = () => new Promise((r) => queueMicrotask(r));

describe("signals", () => {
  describe("effect()", () => {
    it("runs immediately on creation", () => {
      let ran = false;
      const dispose = effect(() => {
        ran = true;
      });
      assert.isTrue(ran);
      dispose();
    });

    it("re-runs when a dependency changes", async () => {
      const s = new Signal.State(0);
      let observed = -1;
      const dispose = effect(() => {
        observed = s.get();
      });
      assert.equal(observed, 0);

      s.set(42);
      await tick();
      assert.equal(observed, 42);
      dispose();
    });

    it("calls cleanup function before re-run", async () => {
      const s = new Signal.State("a");
      const log = [];
      const dispose = effect(() => {
        const val = s.get();
        log.push(`run:${val}`);
        return () => log.push(`cleanup:${val}`);
      });
      assert.deepEqual(log, ["run:a"]);

      s.set("b");
      await tick();
      assert.deepEqual(log, ["run:a", "cleanup:a", "run:b"]);
      dispose();
    });

    it("is disposed when AbortSignal fires", async () => {
      const ac = new AbortController();
      const s = new Signal.State(0);
      let observed = -1;
      effect(
        () => {
          observed = s.get();
        },
        { signal: ac.signal },
      );
      assert.equal(observed, 0);

      ac.abort();
      s.set(99);
      await tick();
      assert.equal(observed, 0, "effect should not re-run after abort");
    });

    it("calls cleanup on dispose", () => {
      let cleanedUp = false;
      const dispose = effect(() => {
        return () => {
          cleanedUp = true;
        };
      });
      assert.isFalse(cleanedUp);
      dispose();
      assert.isTrue(cleanedUp);
    });

    it("calls cleanup when AbortSignal fires", () => {
      const ac = new AbortController();
      let cleanedUp = false;
      effect(
        () => {
          return () => {
            cleanedUp = true;
          };
        },
        { signal: ac.signal },
      );
      assert.isFalse(cleanedUp);
      ac.abort();
      assert.isTrue(cleanedUp);
    });

    it("re-runs multiple effects tracking the same signal", async () => {
      const s = new Signal.State(0);
      let a = -1;
      let b = -1;
      const disposeA = effect(() => {
        a = s.get();
      });
      const disposeB = effect(() => {
        b = s.get();
      });
      assert.equal(a, 0);
      assert.equal(b, 0);

      s.set(7);
      await tick();
      assert.equal(a, 7);
      assert.equal(b, 7);

      disposeA();
      disposeB();
    });
  });
});
