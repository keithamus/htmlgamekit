import { assert } from "@open-wc/testing";
import "../src/auto.js";
import { GameRoundPassEvent, GameTileSubmitEvent } from "../src/events.js";
import { gameWordContext } from "../src/index.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

function mockFetch(handler) {
  globalThis.fetch = handler;
}

function wordFetch(word) {
  return async () => ({
    ok: true,
    json: async () => ({ word, day: 1, pool: 100 }),
  });
}

function lookupFetch(found) {
  return async (url) => {
    if (url.includes("/lookup/")) {
      return found
        ? { ok: true, json: async () => ({ themes: ["general"] }) }
        : { ok: false, status: 404, json: async () => ({}) };
    }
    return {
      ok: true,
      json: async () => ({ word: "crane", day: 1, pool: 100 }),
    };
  };
}

describe("game-word-source", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = globalThis.fetch;
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });

  it("word getter starts as empty string", () => {
    const el = document.createElement("game-word-source");
    assert.equal(el.word, "");
  });

  it("length defaults to 5", () => {
    assert.equal(document.createElement("game-word-source").length, 5);
  });

  it("mode defaults to daily", () => {
    assert.equal(document.createElement("game-word-source").mode, "daily");
  });

  it("invalid mode falls back to daily", () => {
    const el = document.createElement("game-word-source");
    el.setAttribute("mode", "bogus");
    assert.equal(el.mode, "daily");
  });

  it("theme defaults to null", () => {
    assert.isNull(document.createElement("game-word-source").theme);
  });

  it("validate defaults to false", () => {
    assert.isFalse(document.createElement("game-word-source").validate);
  });

  it("reflects length attribute", () => {
    const el = document.createElement("game-word-source");
    el.setAttribute("length", "6");
    assert.equal(el.length, 6);
  });

  it("reflects mode attribute", () => {
    const el = document.createElement("game-word-source");
    el.setAttribute("mode", "random");
    assert.equal(el.mode, "random");
  });

  it("reflects theme attribute", () => {
    const el = document.createElement("game-word-source");
    el.setAttribute("theme", "animal");
    assert.equal(el.theme, "animal");
  });

  it("reflects validate attribute", () => {
    const el = document.createElement("game-word-source");
    el.setAttribute("validate", "");
    assert.isTrue(el.validate);
  });

  it("random mode uses ?random param", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "crane", pool: 100 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isTrue(urls.some((u) => u.includes("random")));
    assert.isFalse(urls.some((u) => u.includes("day")));
  });

  it("daily mode uses ?day param", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "frost", pool: 400 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="daily"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isTrue(urls.some((u) => u.includes("day")));
    assert.isFalse(urls.some((u) => u.includes("random")));
  });

  it("daily mode includes game-id as seed param", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "frost", pool: 400 }) };
    });

    document.body.innerHTML = `
      <game-shell game-id="my-game" between-delay="0">
        <game-word-source words-url="https://words.test" mode="daily"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isTrue(urls.some((u) => u.includes("seed=my-game")));
  });

  it("daily mode without game-id omits seed param", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "frost", pool: 400 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="daily"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isFalse(urls.some((u) => u.includes("seed=")));
  });

  it("includes length param in fetch URL", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "planet", pool: 200 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" length="6" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isTrue(urls.some((u) => u.includes("length=6")));
  });

  it("includes theme param when set", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "mouse", pool: 80 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" theme="animal" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isTrue(urls.some((u) => u.includes("theme=animal")));
  });

  it("omits theme param when unset", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "crane", pool: 400 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isFalse(urls.some((u) => u.includes("theme")));
  });

  it("does not fetch when words-url is missing", async () => {
    let fetched = false;
    mockFetch(async () => {
      fetched = true;
      return { ok: true, json: async () => ({}) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.isFalse(fetched);
  });

  it("exposes fetched word via .word getter", async () => {
    mockFetch(wordFetch("crane"));

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    document.querySelector("game-shell").start();
    await tick();

    assert.equal(document.querySelector("game-word-source").word, "crane");
  });

  it("distributes word via gameWordContext", async () => {
    mockFetch(wordFetch("blaze"));

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");
    const src = document.querySelector("game-word-source");

    let received = "";
    src.subscribe(gameWordContext, (w) => {
      received = w;
    });

    shell.start();
    await tick();

    assert.equal(received, "blaze");
  });

  it("daily mode reuses same word across rounds without re-fetching", async () => {
    let fetchCount = 0;
    mockFetch(async () => {
      fetchCount++;
      return {
        ok: true,
        json: async () => ({ word: "pearl", day: 1, pool: 400 }),
      };
    });

    document.body.innerHTML = `
      <game-shell rounds="2" between-delay="0">
        <game-word-source words-url="https://words.test" mode="daily"></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");
    const src = document.querySelector("game-word-source");

    shell.start();
    await tick();
    assert.equal(src.word, "pearl");
    assert.equal(fetchCount, 1);

    shell.dispatchEvent(new GameRoundPassEvent(1));
    await tick();
    await tick();

    assert.equal(src.word, "pearl");
    assert.equal(fetchCount, 1, "should not re-fetch for daily mode");
  });

  it("random mode resets word on new game start, fetches again", async () => {
    let fetchCount = 0;
    mockFetch(async () => {
      fetchCount++;
      return { ok: true, json: async () => ({ word: "crane", pool: 100 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");

    shell.start();
    await tick();
    assert.equal(fetchCount, 1);

    shell.start();
    await tick();
    assert.equal(fetchCount, 2);
  });

  it("per-round mode fetches on every new round", async () => {
    let fetchCount = 0;
    mockFetch(async () => {
      fetchCount++;
      return { ok: true, json: async () => ({ word: "globe", pool: 100 }) };
    });

    document.body.innerHTML = `
      <game-shell rounds="2" between-delay="0">
        <game-word-source words-url="https://words.test" mode="per-round"></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");

    shell.start();
    await tick();
    assert.equal(fetchCount, 1);

    shell.dispatchEvent(new GameRoundPassEvent(1));
    await tick();
    await tick();

    assert.equal(fetchCount, 2);
  });

  it("fires PendingTaskEvent wrapping the fetch promise", async () => {
    mockFetch(wordFetch("globe"));

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");

    let pendingTask = null;
    shell.addEventListener(
      "pending-task",
      (e) => {
        pendingTask = e;
      },
      { once: true },
    );

    shell.start();
    await tick();

    assert.isNotNull(pendingTask, "should have fired pending-task");
    assert.instanceOf(pendingTask.complete, Promise);
    await pendingTask.complete;
  });

  it("with validate: forwards game-tile-submit when word is in lookup", async () => {
    mockFetch(lookupFetch(true));

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random" validate></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");
    shell.start();
    await tick();

    let received = null;
    shell.addEventListener("game-tile-submit", (e) => {
      received = e.value;
    });

    shell.dispatchEvent(new GameTileSubmitEvent("crane"));
    await tick();

    assert.equal(received, "crane");
  });

  it("with validate: blocks game-tile-submit when word not in lookup", async () => {
    mockFetch(lookupFetch(false));

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random" validate></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");
    shell.start();
    await tick();

    let received = null;
    shell.addEventListener("game-tile-submit", (e) => {
      received = e.value;
    });

    shell.dispatchEvent(new GameTileSubmitEvent("xzxzx"));
    await tick();

    assert.isNull(received, "invalid word should not be forwarded");
  });

  it("without validate: forwards game-tile-submit without a lookup call", async () => {
    const urls = [];
    mockFetch(async (url) => {
      urls.push(url);
      return { ok: true, json: async () => ({ word: "crane", pool: 100 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random"></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");
    shell.start();
    await tick();

    const callsBefore = urls.length;
    let received = null;
    shell.addEventListener("game-tile-submit", (e) => {
      received = e.value;
    });
    shell.dispatchEvent(new GameTileSubmitEvent("crane"));
    await tick();

    assert.equal(received, "crane");
    assert.equal(urls.length, callsBefore, "no extra fetch for lookup");
  });

  it("with validate: blocks game-tile-submit at an intermediate ancestor listener", async () => {
    mockFetch(lookupFetch(false));

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <div id="ancestor">
          <game-word-source words-url="https://words.test" mode="random" validate></game-word-source>
        </div>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");
    shell.start();
    await tick();

    let ancestorReceived = null;
    document
      .querySelector("#ancestor")
      .addEventListener("game-tile-submit", (e) => {
        ancestorReceived = e.value;
      });

    shell.dispatchEvent(new GameTileSubmitEvent("xzxzx"));
    await tick();

    assert.isNull(
      ancestorReceived,
      "intermediate ancestor should not receive invalid game-tile-submit",
    );
  });

  it("with validate: lets guess through on network error", async () => {
    mockFetch(async (url) => {
      if (url.includes("/lookup/")) throw new Error("network down");
      return { ok: true, json: async () => ({ word: "crane", pool: 100 }) };
    });

    document.body.innerHTML = `
      <game-shell between-delay="0">
        <game-word-source words-url="https://words.test" mode="random" validate></game-word-source>
      </game-shell>`;
    await tick();
    const shell = document.querySelector("game-shell");
    shell.start();
    await tick();

    let received = null;
    shell.addEventListener("game-tile-submit", (e) => {
      received = e.value;
    });
    shell.dispatchEvent(new GameTileSubmitEvent("crane"));
    await tick();

    assert.equal(received, "crane", "should forward on network error");
  });
});
