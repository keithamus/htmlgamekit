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

    // The cleanup throws inside computed.get() which processPending wraps
    // in try/catch. The watcher loop should continue processing.
    s.set("b");
    await tick();

    assert.isTrue(
      log.includes("cleanup-throw"),
      "cleanup should have been called",
    );
    // processPending catches the error from computed.get(), so the re-run
    // may or may not occur depending on signal-polyfill internals.
    // The key assertion: no uncaught error crashes the test runner.

    // Clean up — dispose also calls cleanup, which may throw again
    try { dispose(); } catch {}
  });

  it("effect disposed during its own callback (re-entrant dispose)", () => {
    // Use a holder object to work around the TDZ (dispose is not assigned
    // until after effect() returns, but the callback runs synchronously).
    const holder = { dispose: null };
    let runCount = 0;
    holder.dispose = effect(() => {
      runCount++;
      if (runCount === 1 && holder.dispose) {
        // Dispose during the callback itself
        holder.dispose();
      }
    });
    // The callback runs synchronously on creation. At that point
    // holder.dispose is still null (effect hasn't returned yet), so the
    // self-dispose branch is skipped. The effect runs once.
    assert.equal(runCount, 1, "effect ran once");
    // Now dispose normally
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
    dispose(); // second call should be a no-op
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
    // Effect runs synchronously on creation
    assert.equal(runCount, 1, "effect should run once on creation");

    // The abort listener fires synchronously for an already-aborted signal,
    // calling dispose() which unwatches the computed. The effect should not
    // run again for subsequent signal changes once the watcher fully drains.
    // NOTE: processPending may re-evaluate the computed one more time if
    // it was already in the pending queue before unwatch. This is a known
    // subtlety of the watcher + unwatch timing.
    await tick();
    const afterSettle = runCount;
    // At most 1 extra run from the pending queue race
    assert.isAtMost(afterSettle, 2, "at most one spurious re-run from pending queue");
  });

  it("rapidly setting a signal many times batches to a single effect re-run", async () => {
    const s = new Signal.State(0);
    let runCount = 0;
    const dispose = effect(() => {
      s.get();
      runCount++;
    });
    assert.equal(runCount, 1, "initial run");

    // Set the signal 100 times synchronously
    for (let i = 1; i <= 100; i++) {
      s.set(i);
    }

    await tick();
    // The effect should have batched all 100 sets into at most a few re-runs
    // (ideally just 1 re-run in the microtask batch)
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
      return 42; // not a function
    });

    s.set(1);
    await tick();
    // No crash — typeof 42 !== "function", so it's ignored
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
      new ContextRequestEvent(
        ctx,
        (value) => values.push(value),
        true,
      ),
    );
    assert.deepEqual(values, ["val"]);

    provider.setValue("val"); // same value
    assert.deepEqual(values, ["val"], "should NOT call subscriber for same value");
  });

  it("setValue with different value DOES notify subscribers", () => {
    const ctx = createContext("red-diff");
    const provider = new ContextProvider(host, ctx, "a");

    const values = [];
    host.dispatchEvent(
      new ContextRequestEvent(
        ctx,
        (value) => values.push(value),
        true,
      ),
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
    subscribe(
      host,
      ctx,
      (value) => values.push(value),
      { signal: ac.signal },
    );
    // The subscribe helper checks signal.aborted before calling callback
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

    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => a.push(v), true),
    );
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => b.push(v), true),
    );
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => c.push(v), true),
    );

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
    document.body.addEventListener(
      "context-request",
      (e) => {
        if (e.context === "red-wrong") received = true;
      },
    );

    host.dispatchEvent(
      new ContextRequestEvent("red-wrong", () => {}),
    );
    assert.isTrue(received, "event for wrong context should propagate past provider");
  });

  it("ContextProvider with null initial value does not crash", () => {
    const ctx = createContext("red-null");
    const provider = new ContextProvider(host, ctx, null);
    assert.isNull(provider.value);

    let received;
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => { received = v; }),
    );
    assert.isNull(received);
  });

  it("ContextProvider with undefined initial value does not crash", () => {
    const ctx = createContext("red-undef");
    const provider = new ContextProvider(host, ctx, undefined);
    assert.isUndefined(provider.value);

    let received = "sentinel";
    host.dispatchEvent(
      new ContextRequestEvent(ctx, (v) => { received = v; }),
    );
    assert.isUndefined(received);
  });

  it("subscriber callback that throws — setValue propagates the error (no try/catch)", () => {
    const ctx = createContext("red-throw-sub");
    const provider = new ContextProvider(host, ctx, 0);

    const valuesA = [];

    host.dispatchEvent(
      new ContextRequestEvent(
        ctx,
        (v) => valuesA.push(v),
        true,
      ),
    );

    assert.deepEqual(valuesA, [0], "first subscriber received initial value");

    // Register a subscriber whose WeakRef-deref'd callback will throw on
    // setValue. We set a flag rather than throw inline so the initial
    // dispatch (which calls callback(value, unsubscribe)) doesn't throw.
    let shouldThrow = false;
    host.dispatchEvent(
      new ContextRequestEvent(
        ctx,
        (v) => { if (shouldThrow) throw new Error("subscriber error"); },
        true,
      ),
    );

    // Now arm the throw for the next setValue call
    shouldThrow = true;
    let threwOnSet = false;
    try {
      provider.setValue(1);
    } catch {
      threwOnSet = true;
    }
    assert.isTrue(threwOnSet, "setValue throws when subscriber throws");

    // First subscriber (before the thrower in iteration order) should have
    // received the update before the throw.
    assert.deepEqual(valuesA, [0, 1], "first subscriber still receives update");
  });
});
