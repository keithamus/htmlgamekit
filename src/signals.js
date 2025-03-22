import { Signal } from "signal-polyfill";

let needsEnqueue = true;

const w = new Signal.subtle.Watcher(() => {
  if (needsEnqueue) {
    needsEnqueue = false;
    queueMicrotask(processPending);
  }
});

function processPending() {
  needsEnqueue = true;
  let pending;
  while ((pending = w.getPending()).length > 0) {
    for (const s of pending) {
      try { s.get(); } catch (e) { console.error(e); }
    }
  }
  w.watch();
}

export function effect(callback, { signal } = {}) {
  let cleanup;
  const computed = new Signal.Computed(() => {
    if (typeof cleanup === "function") cleanup();
    cleanup = callback();
  });
  w.watch(computed);
  computed.get();
  const dispose = () => {
    w.unwatch(computed);
    if (typeof cleanup === "function") cleanup();
    cleanup = undefined;
  };
  signal?.addEventListener("abort", dispose, { once: true });
  return dispose;
}

export { Signal };
