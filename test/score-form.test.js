import { assert } from "@open-wc/testing";
import "../src/auto.js";
import gameScores, { noopScores } from "../src/scores.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("game-score-form", () => {
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

  it("submit button starts disabled until a score token is available", () => {
    const el = document.createElement("game-score-form");
    assert.isTrue(el.shadowRoot.querySelector("button").disabled);
  });

  describe("without score-url (noop scores)", () => {
    it("noopScores.fetchToken() returns a Promise", () => {
      assert.instanceOf(noopScores.fetchToken(), Promise);
    });

    it("result scene does not throw when no score-url is configured", async () => {
      document.body.innerHTML = `
        <game-shell between-delay="0" rounds="1">
          <game-score-form></game-score-form>
          <div when-some-scene="playing"><div id="t"></div></div>
        </game-shell>`;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.start();
      await tick();

      let threw = false;
      try {
        shell.scene.set("result");
        await tick();
      } catch {
        threw = true;
      }
      assert.isFalse(threw);
    });

    it("submit button stays disabled when there is no score token", async () => {
      document.body.innerHTML = `
        <game-shell between-delay="0" rounds="1">
          <game-score-form></game-score-form>
          <div when-some-scene="playing"><div id="t"></div></div>
        </game-shell>`;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.start();
      await tick();
      shell.scene.set("result");
      await tick();

      const btn = document
        .querySelector("game-score-form")
        .shadowRoot.querySelector("button");
      assert.isTrue(btn.disabled);
    });
  });

  describe("retry after failed submission", () => {
    it("token is preserved after a failed submission so retry can proceed", async () => {
      let submitCount = 0;
      globalThis.fetch = async (url) => {
        if (url.includes("/token")) {
          return { ok: true, json: async () => ({ token: "tok-001" }) };
        }
        submitCount++;
        return submitCount === 1 ? { ok: false, status: 503 } : { ok: true };
      };

      const service = gameScores("my-game", { baseUrl: "https://scores.test" });
      await service.fetchToken();
      assert.equal(service.token, "tok-001");

      const result1 = await service.submitScore("PLAYER", 100);
      assert.isFalse(result1);
      assert.equal(service.token, "tok-001");

      const result2 = await service.submitScore("PLAYER", 100);
      assert.isTrue(result2);
      assert.isNull(service.token);
    });

    it("submit button shows Retry when the server returns an error", async () => {
      globalThis.fetch = async (url) => {
        if (url.includes("/token")) {
          return { ok: true, json: async () => ({ token: "tok-002" }) };
        }
        return { ok: false, status: 500 };
      };

      document.body.innerHTML = `
        <game-shell between-delay="0" rounds="1" score-url="https://scores.test" game-id="test">
          <game-score-form></game-score-form>
        </game-shell>`;
      await tick();
      const shell = document.querySelector("game-shell");
      shell.start();
      await tick();
      shell.scene.set("result");
      await tick();
      await tick();
      await tick();

      const form = document.querySelector("game-score-form");
      const btn = form.shadowRoot.querySelector("button");
      const input = form.shadowRoot.querySelector("input");

      assert.isFalse(btn.disabled);

      input.value = "PLAYER";
      form.shadowRoot
        .querySelector("form")
        .dispatchEvent(
          new Event("submit", { bubbles: false, cancelable: true }),
        );
      await tick();
      await tick();

      assert.equal(btn.textContent, "Retry");
      assert.isFalse(btn.disabled);
    });
  });
});
