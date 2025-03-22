import { assert } from "@open-wc/testing";
import {
  createContext,
  ContextProvider,
  ContextRequestEvent,
  subscribe,
} from "../src/context.js";

describe("context", () => {
  afterEach(() => {
    document.body.innerHTML = "";
  });

  describe("createContext", () => {
    it("returns the key string", () => {
      assert.equal(createContext("my-ctx"), "my-ctx");
    });
  });

  describe("ContextRequestEvent", () => {
    it("has correct type, bubbles, composed, and properties", () => {
      const cb = () => {};
      const e = new ContextRequestEvent("my-ctx", cb, true);
      assert.equal(e.type, "context-request");
      assert.isTrue(e.bubbles);
      assert.isTrue(e.composed);
      assert.equal(e.context, "my-ctx");
      assert.equal(e.callback, cb);
      assert.isTrue(e.subscribe);
    });

    it("defaults subscribe to false", () => {
      const e = new ContextRequestEvent("my-ctx", () => {});
      assert.isFalse(e.subscribe);
    });
  });

  describe("ContextProvider", () => {
    let host;

    beforeEach(() => {
      host = document.createElement("div");
      document.body.appendChild(host);
    });

    it("delivers initial value to a one-time request", () => {
      const ctx = createContext("test-ctx");
      new ContextProvider(host, ctx, 42);

      let received;
      host.dispatchEvent(
        new ContextRequestEvent(ctx, (value) => {
          received = value;
        }),
      );
      assert.equal(received, 42);
    });

    it("delivers value to subscriber and calls callback immediately", () => {
      const ctx = createContext("test-ctx");
      new ContextProvider(host, ctx, "hello");

      let received;
      let unsubFn;
      host.dispatchEvent(
        new ContextRequestEvent(
          ctx,
          (value, unsub) => {
            received = value;
            unsubFn = unsub;
          },
          true,
        ),
      );
      assert.equal(received, "hello");
      assert.isFunction(unsubFn);
    });

    it("setValue updates all subscribers", () => {
      const ctx = createContext("test-ctx");
      const provider = new ContextProvider(host, ctx, "initial");

      const values = [];
      host.dispatchEvent(
        new ContextRequestEvent(
          ctx,
          (value) => {
            values.push(value);
          },
          true,
        ),
      );
      assert.deepEqual(values, ["initial"]);

      provider.setValue("updated");
      assert.deepEqual(values, ["initial", "updated"]);

      provider.setValue("again");
      assert.deepEqual(values, ["initial", "updated", "again"]);
    });

    it("does not notify subscribers when value is the same", () => {
      const ctx = createContext("test-ctx");
      const provider = new ContextProvider(host, ctx, "same");

      const values = [];
      host.dispatchEvent(
        new ContextRequestEvent(
          ctx,
          (value) => {
            values.push(value);
          },
          true,
        ),
      );
      provider.setValue("same");
      assert.deepEqual(values, ["same"], "should not push duplicate");
    });

    it("stops propagation of matching context-request events", () => {
      const ctx = createContext("test-ctx");
      new ContextProvider(host, ctx, "val");

      let parentSaw = false;
      document.body.addEventListener("context-request", () => {
        parentSaw = true;
      });

      host.dispatchEvent(new ContextRequestEvent(ctx, () => {}));
      assert.isFalse(parentSaw, "event should not propagate past provider");
    });

    it("does not intercept events for a different context", () => {
      const ctx = createContext("test-ctx");
      new ContextProvider(host, ctx, "val");

      let received = false;
      document.body.addEventListener("context-request", (e) => {
        if (e.context === "other-ctx") received = true;
      });

      host.dispatchEvent(new ContextRequestEvent("other-ctx", () => {}));
      assert.isTrue(received, "event for different context should propagate");
    });
  });

  describe("subscribe helper", () => {
    let host;

    beforeEach(() => {
      host = document.createElement("div");
      document.body.appendChild(host);
    });

    it("integrates provider and consumer correctly", () => {
      const ctx = createContext("sub-ctx");
      const provider = new ContextProvider(host, ctx, "first");

      const values = [];
      subscribe(host, ctx, (value) => {
        values.push(value);
      });
      assert.deepEqual(values, ["first"]);

      provider.setValue("second");
      assert.deepEqual(values, ["first", "second"]);
    });

    it("cleans up on AbortSignal abort", () => {
      const ctx = createContext("sub-ctx");
      const provider = new ContextProvider(host, ctx, "a");
      const ac = new AbortController();

      const values = [];
      subscribe(
        host,
        ctx,
        (value) => {
          values.push(value);
        },
        { signal: ac.signal },
      );
      assert.deepEqual(values, ["a"]);

      provider.setValue("b");
      assert.deepEqual(values, ["a", "b"]);

      ac.abort();
      provider.setValue("c");
      assert.deepEqual(values, ["a", "b"], "should not receive after abort");
    });

    it("does not deliver value if signal is already aborted", () => {
      const ctx = createContext("sub-ctx");
      new ContextProvider(host, ctx, "val");
      const ac = new AbortController();
      ac.abort();

      const values = [];
      subscribe(
        host,
        ctx,
        (value) => {
          values.push(value);
        },
        { signal: ac.signal },
      );
      assert.deepEqual(values, [], "should not deliver when already aborted");
    });
  });
});
