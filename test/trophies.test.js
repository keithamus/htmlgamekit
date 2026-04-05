import { assert } from "@open-wc/testing";
import gameTrophies, { noopTrophies } from "../src/trophies.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("trophies", () => {
  let originalFetch;

  beforeEach(() => {
    originalFetch = window.fetch;
  });

  afterEach(() => {
    window.fetch = originalFetch;
    localStorage.clear();
  });

  describe("noopTrophies", () => {
    it("playerId is null", () => {
      assert.isNull(noopTrophies.playerId);
    });

    it("fetchTrophies resolves to empty array", async () => {
      const result = await noopTrophies.fetchTrophies();
      assert.deepEqual(result, []);
    });

    it("unlockTrophy resolves to false", async () => {
      const result = await noopTrophies.unlockTrophy("foo");
      assert.isFalse(result);
    });
  });

  describe("gameTrophies()", () => {
    it("returns noopTrophies with empty gameId", () => {
      const service = gameTrophies("", { baseUrl: "https://example.com" });
      assert.isNull(service.playerId);
    });

    it("returns noopTrophies with empty baseUrl", () => {
      const service = gameTrophies("my-game", { baseUrl: "" });
      assert.isNull(service.playerId);
    });

    it("returns noopTrophies with no options", () => {
      const service = gameTrophies("my-game");
      assert.isNull(service.playerId);
    });

    it("returns an object with all expected methods", () => {
      const service = gameTrophies("my-game", {
        baseUrl: "https://example.com",
      });
      assert.isFunction(service.fetchTrophies);
      assert.isFunction(service.unlockTrophy);
    });

    it("playerId starts as null when no stored value", () => {
      const service = gameTrophies("my-game", {
        baseUrl: "https://example.com",
      });
      assert.isNull(service.playerId);
    });

    it("playerId picks up stored value from localStorage", () => {
      localStorage.setItem("my-game-player-id", "existing-uuid-1234");
      const service = gameTrophies("my-game", {
        baseUrl: "https://example.com",
      });
      assert.equal(service.playerId, "existing-uuid-1234");
    });
  });

  describe("fetchTrophies()", () => {
    it("sends GET to /t/{gameId} and returns trophy objects", async () => {
      let capturedUrl;
      let capturedOpts;
      window.fetch = (url, opts) => {
        capturedUrl = url;
        capturedOpts = opts;
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () =>
            Promise.resolve({
              player: "uuid-abc",
              game: "my-game",
              trophies: [
                { id: "gold", unlocked_at: "2026-04-05 12:00:00" },
              ],
            }),
        });
      };

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      const result = await service.fetchTrophies();

      assert.equal(capturedUrl, "https://trophies.example.com/t/my-game");
      assert.isUndefined(capturedOpts.method);
      assert.equal(result.length, 1);
      assert.equal(result[0].id, "gold");
      assert.equal(result[0].unlocked_at, "2026-04-05 12:00:00");
    });

    it("sends Authorization Bearer header when player id is known", async () => {
      localStorage.setItem("my-game-player-id", "known-uuid");
      let capturedHeaders;
      window.fetch = (url, opts) => {
        capturedHeaders = opts.headers;
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () =>
            Promise.resolve({
              player: "known-uuid",
              game: "my-game",
              trophies: [],
            }),
        });
      };

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      await service.fetchTrophies();

      assert.equal(capturedHeaders["Authorization"], "Bearer known-uuid");
    });

    it("does not send Authorization when no player id", async () => {
      let capturedHeaders;
      window.fetch = (url, opts) => {
        capturedHeaders = opts.headers;
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () =>
            Promise.resolve({
              player: "new-uuid",
              game: "my-game",
              trophies: [],
            }),
        });
      };

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      await service.fetchTrophies();

      assert.isUndefined(capturedHeaders["Authorization"]);
    });

    it("stores player id from response body", async () => {
      window.fetch = () =>
        Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () =>
            Promise.resolve({
              player: "server-uuid-123",
              game: "my-game",
              trophies: [],
            }),
        });

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      await service.fetchTrophies();

      assert.equal(service.playerId, "server-uuid-123");
      assert.equal(
        localStorage.getItem("my-game-player-id"),
        "server-uuid-123",
      );
    });

    it("returns empty array on non-ok response", async () => {
      window.fetch = () =>
        Promise.resolve({ ok: false, headers: new Headers() });

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      const result = await service.fetchTrophies();

      assert.deepEqual(result, []);
    });

    it("returns empty array on network error", async () => {
      window.fetch = () => Promise.reject(new Error("network failure"));

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      const result = await service.fetchTrophies();

      assert.deepEqual(result, []);
    });

    it("returns empty array when response has no trophies field", async () => {
      window.fetch = () =>
        Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ player: "uuid", game: "my-game" }),
        });

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      const result = await service.fetchTrophies();

      assert.deepEqual(result, []);
    });
  });

  describe("unlockTrophy()", () => {
    it("sends PUT to /t/{gameId}/{trophyId} with no body", async () => {
      let capturedUrl;
      let capturedOpts;
      window.fetch = async (url, opts) => {
        capturedUrl = url;
        capturedOpts = opts;
        return {
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ player: "test-uuid" }),
        };
      };

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      const result = await service.unlockTrophy("first-win");

      assert.equal(
        capturedUrl,
        "https://trophies.example.com/t/my-game/first-win",
      );
      assert.equal(capturedOpts.method, "PUT");
      assert.isUndefined(capturedOpts.body);
      assert.isTrue(result);
    });

    it("sends Authorization Bearer header when player id is known", async () => {
      localStorage.setItem("my-game-player-id", "my-uuid");
      let capturedHeaders;
      window.fetch = (url, opts) => {
        capturedHeaders = opts.headers;
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ player: "my-uuid" }),
        });
      };

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      await service.unlockTrophy("test");

      assert.equal(capturedHeaders["Authorization"], "Bearer my-uuid");
    });

    it("stores player id from response body after unlock", async () => {
      window.fetch = () =>
        Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ player: "assigned-uuid" }),
        });

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      await service.unlockTrophy("test");

      assert.equal(service.playerId, "assigned-uuid");
      assert.equal(
        localStorage.getItem("my-game-player-id"),
        "assigned-uuid",
      );
    });

    it("returns false on non-ok response", async () => {
      window.fetch = () =>
        Promise.resolve({ ok: false, headers: new Headers() });

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      const result = await service.unlockTrophy("test");

      assert.isFalse(result);
    });

    it("returns false on network error", async () => {
      window.fetch = () => Promise.reject(new Error("offline"));

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      const result = await service.unlockTrophy("test");

      assert.isFalse(result);
    });
  });

  describe("player id lifecycle", () => {
    it("fetchTrophies then unlockTrophy reuses the same player id", async () => {
      let callCount = 0;
      const capturedAuths = [];
      window.fetch = (url, opts) => {
        callCount++;
        capturedAuths.push(opts.headers["Authorization"]);
        if (callCount === 1) {
          return Promise.resolve({
            ok: true,
            headers: new Headers(),
            json: () =>
              Promise.resolve({
                player: "persistent-uuid",
                game: "my-game",
                trophies: [],
              }),
          });
        }
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ player: "persistent-uuid" }),
        });
      };

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      await service.fetchTrophies();
      await service.unlockTrophy("star");

      assert.equal(callCount, 2);
      assert.isUndefined(capturedAuths[0]);
      assert.equal(capturedAuths[1], "Bearer persistent-uuid");
    });

    it("player id persists across service instances via localStorage", async () => {
      localStorage.setItem("my-game-player-id", "cross-instance-uuid");

      let capturedAuth;
      window.fetch = (url, opts) => {
        capturedAuth = opts.headers["Authorization"];
        return Promise.resolve({
          ok: true,
          headers: new Headers(),
          json: () => Promise.resolve({ player: "cross-instance-uuid" }),
        });
      };

      const service = gameTrophies("my-game", {
        baseUrl: "https://trophies.example.com",
      });
      await service.unlockTrophy("test");

      assert.equal(capturedAuth, "Bearer cross-instance-uuid");
    });
  });
});
