import { assert } from "@open-wc/testing";
import { Signal, effect } from "../src/signals.js";
import {
  ContextProvider,
  subscribe,
  createContext,
  ContextRequestEvent,
} from "../src/context.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("red-team: effect edge cases", () => {
  it("effect callback that throws — error propagates", () => {
    const s = new Signal.State(0);
    assert.throws(() => {
      effect(() => {
        s.get();
        throw new Error("boom");
      });
    }, /boom/);
  });

  it("effect with cleanup that throws — processPending catches it, re-run still happens", async () => {
    const s = new Signal.State("a");
    const log = [];
    let firstRun = true;
    const dispose = effect(() => {
      const val = s.get();
      log.push(`run:${val}`);
      if (firstRun) {
        firstRun = false;
        return () => {
          log.push("cleanup-throw");
          throw new Error("cleanup error");
        };
      }
      return () => log.push("cleanup-ok");
    });
    assert.deepEqual(log, ["run:a"]);

    s.set("b");
    await tick();

    assert.isTrue(
      log.includes("cleanup-throw"),
      "cleanup should have been called",
    );

    try {
      dispose();
    } catch {}
  });

  it("effect disposed during its own callback (re-entrant dispose)", () => {
    const holder = { dispose: null };
    let runCount = 0;
    holder.dispose = effect(() => {
      runCount++;
      if (runCount === 1 && holder.dispose) {
        holder.dispose();
      }
    });
    assert.equal(runCount, 1, "effect ran once");
    holder.dispose();
  });

  it("effect with signal that never changes runs exactly once", () => {
    const s = new Signal.State(42);
    let runCount = 0;
    const dispose = effect(() => {
      s.get();
      runCount++;
    });
    assert.equal(runCount, 1);
    dispose();
    assert.equal(runCount, 1, "should not have run again");
  });

  it("double dispose does not throw", () => {
    const dispose = effect(() => {});
    dispose();
    dispose();
  });

  it("effect with already-aborted AbortSignal — runs once then is disposed", async () => {
    const ac = new AbortController();
    ac.abort();
    const s = new Signal.State(0);
    let runCount = 0;
    effect(
      () => {
        s.get();
        runCount++;
      },
      { signal: ac.signal },
    );
    assert.equal(runCount, 1, "effect should run once on creation");

    await tick();
    const afterSettle = runCount;
    assert.isAtMost(
      afterSettle,
      2,
      "at most one spurious re-run from pending queue",
    );
  });

  it("rapidly setting a signal many times batches to a single effect re-run", async () => {
    const s = new Signal.State(0);
    let runCount = 0;
    const dispose = effect(() => {
      s.get();
      runCount++;
    });
    assert.equal(runCount, 1, "initial run");

    for (let i = 1; i <= 100; i++) {
      s.set(i);
    }

    await tick();
    assert.isAtMost(runCount, 3, "should batch rapid signal sets");
    dispose();
  });

  it("effect that reads multiple signals re-runs when ANY changes", async () => {
    const a = new Signal.State("a");
    const b = new Signal.State("b");
    const log = [];
    const dispose = effect(() => {
      log.push(`${a.get()}+${b.get()}`);
    });
    assert.deepEqual(log, ["a+b"]);

    a.set("A");
    await tick();
    assert.include(log, "A+b");

    b.set("B");
    await tick();
    assert.include(log, "A+B");

    dispose();
  });

  it("effect cleanup returns non-function — no crash on re-run", async () => {
    const s = new Signal.State(0);
    const dispose = effect(() => {
      s.get();
      return 42;
    });

    s.set(1);
    await tick();
    dispose();
  });
});

describe("red-team: context edge cases", () => {
  let host;

  beforeEach(() => {
    host = document.createElement("div");
    document.body.appendChild(host);
  });

  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("setValue with same value does NOT notify subscribers", () => {
    const ctx = createContext("red-same");
    const provider = new ContextProvider(host, ctx, "val");

    const values = [];
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (value) => values.push(value), true),
    );
    assert.deepEqual(values, ["val"]);

    provider.setValue("val");
    assert.deepEqual(
      values,
      ["val"],
      "should NOT call subscriber for same value",
    );
  });

  it("setValue with different value DOES notify subscribers", () => {
    const ctx = createContext("red-diff");
    const provider = new ContextProvider(host, ctx, "a");

    const values = [];
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (value) => values.push(value), true),
    );
    assert.deepEqual(values, ["a"]);

    provider.setValue("b");
    assert.deepEqual(values, ["a", "b"]);
  });

  it("subscribe without signal option works", () => {
    const ctx = createContext("red-nosignal");
    const provider = new ContextProvider(host, ctx, "initial");

    const values = [];
    subscribe(host, ctx, (value) => values.push(value));
    assert.deepEqual(values, ["initial"]);

    provider.setValue("updated");
    assert.deepEqual(values, ["initial", "updated"]);
  });

  it("subscribe with already-aborted signal — callback is called once then unsubscribed", () => {
    const ctx = createContext("red-pre-aborted");
    const provider = new ContextProvider(host, ctx, "first");
    const ac = new AbortController();
    ac.abort();

    const values = [];
    subscribe(host, ctx, (value) => values.push(value), { signal: ac.signal });
    assert.deepEqual(values, [], "should not deliver when already aborted");

    provider.setValue("second");
    assert.deepEqual(values, [], "should not deliver after abort");
  });

  it("multiple subscribers all receive updates", () => {
    const ctx = createContext("red-multi");
    const provider = new ContextProvider(host, ctx, 0);

    const a = [];
    const b = [];
    const c = [];

    host.dispatchEvent(new ContextRequestEvent(ctx, (v) => a.push(v), true));
    host.dispatchEvent(new ContextRequestEvent(ctx, (v) => b.push(v), true));
    host.dispatchEvent(new ContextRequestEvent(ctx, (v) => c.push(v), true));

    assert.deepEqual(a, [0]);
    assert.deepEqual(b, [0]);
    assert.deepEqual(c, [0]);

    provider.setValue(1);
    assert.deepEqual(a, [0, 1]);
    assert.deepEqual(b, [0, 1]);
    assert.deepEqual(c, [0, 1]);
  });

  it("context request for wrong key — provider ignores it", () => {
    const ctx = createContext("red-right");
    new ContextProvider(host, ctx, "hello");

    let received = false;
    document.body.addEventListener("context-request", (e) => {
      if (e.context === "red-wrong") received = true;
    });

    host.dispatchEvent(new ContextRequestEvent("red-wrong", () => {}));
    assert.isTrue(
      received,
      "event for wrong context should propagate past provider",
    );
  });

  it("ContextProvider with null initial value does not crash", () => {
    const ctx = createContext("red-null");
    const provider = new ContextProvider(host, ctx, null);
    assert.isNull(provider.value);

    let received;
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => {
        received = v;
      }),
    );
    assert.isNull(received);
  });

  it("ContextProvider with undefined initial value does not crash", () => {
    const ctx = createContext("red-undef");
    const provider = new ContextProvider(host, ctx, undefined);
    assert.isUndefined(provider.value);

    let received = "sentinel";
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => {
        received = v;
      }),
    );
    assert.isUndefined(received);
  });

  it("subscriber callback that throws — setValue propagates the error (no try/catch)", () => {
    const ctx = createContext("red-throw-sub");
    const provider = new ContextProvider(host, ctx, 0);

    const valuesA = [];

    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => valuesA.push(v), true),
    );

    assert.deepEqual(valuesA, [0], "first subscriber received initial value");

    let shouldThrow = false;
    host.dispatchEvent(
      new ContextRequestEvent(
        ctx,
        (v) => {
          if (shouldThrow) throw new Error("subscriber error");
        },
        true,
      ),
    );

    shouldThrow = true;
    let threwOnSet = false;
    try {
      provider.setValue(1);
    } catch {
      threwOnSet = true;
    }
    assert.isTrue(threwOnSet, "setValue throws when subscriber throws");

    assert.deepEqual(valuesA, [0, 1], "first subscriber still receives update");
  });
});
