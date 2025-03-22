export function createContext(key) {
  return key;
}

export class ContextRequestEvent extends Event {
  constructor(context, callback, subscribe = false) {
    super("context-request", { bubbles: true, composed: true });
    this.context = context;
    this.callback = callback;
    this.subscribe = subscribe;
  }
}

export class ContextProvider {
  #host;
  #context;
  #value;
  #subscriptions = new Set();

  constructor(host, context, initialValue) {
    this.#host = host;
    this.#context = context;
    this.#value = initialValue;
    this.#host.addEventListener("context-request", (e) => {
      if (e.context !== this.#context) return;
      e.stopImmediatePropagation();
      if (e.subscribe) {
        const ref = new WeakRef(e.callback);
        this.#subscriptions.add(ref);
        const unsubscribe = () => this.#subscriptions.delete(ref);
        e.callback(this.#value, unsubscribe);
      } else {
        e.callback(this.#value);
      }
    });
  }

  get value() {
    return this.#value;
  }

  setValue(value) {
    if (value === this.#value) return;
    this.#value = value;
    for (const ref of this.#subscriptions) {
      const cb = ref.deref();
      if (cb) {
        cb(value);
      } else {
        this.#subscriptions.delete(ref);
      }
    }
  }
}

export function subscribe(host, context, callback, { signal } = {}) {
  let unsubscribe;
  const wrapper = (value, unsub) => {
    if (unsub !== undefined) unsubscribe = unsub;
    if (!signal?.aborted) callback(value);
  };
  _prevent_gc(signal, wrapper);
  host.dispatchEvent(new ContextRequestEvent(context, wrapper, true));
  signal?.addEventListener(
    "abort",
    () => {
      unsubscribe?.();
    },
    { once: true },
  );
}

const _prevent_gc_refs = new Map();
function _prevent_gc(signal, ref) {
  if (!signal) return;
  let set = _prevent_gc_refs.get(signal);
  if (!set) {
    set = new Set();
    _prevent_gc_refs.set(signal, set);
    signal.addEventListener(
      "abort",
      () => {
        _prevent_gc_refs.delete(signal);
      },
      { once: true },
    );
  }
  set.add(ref);
}
