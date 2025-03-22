import { assert } from "@open-wc/testing";
import gameScores, { noopScores } from "../src/scores.js";

const tick = () => new Promise((r) => setTimeout(r, 0));
const microtask = () => new Promise((r) => queueMicrotask(r));

describe("scores", () => {
  describe("noopScores", () => {
    it("token is null", () => {
      assert.isNull(noopScores.token);
    });

    it("fetchToken is a no-op function", () => {
      assert.isFunction(noopScores.fetchToken);
      noopScores.fetchToken();
    });

    it("submitScore returns false", async () => {
      const result = noopScores.submitScore("test", 100);
      assert.isFalse(result);
    });
  });

  describe("gameScores()", () => {
    it("returns noopScores with empty gameId", () => {
      const service = gameScores("", { baseUrl: "https://example.com" });
      assert.isNull(service.token);
      assert.isNull(service.activeId);
    });

    it("returns noopScores with empty baseUrl", () => {
      const service = gameScores("my-game", { baseUrl: "" });
      assert.isNull(service.token);
      assert.isNull(service.activeId);
    });

    it("returns an object with all expected methods", () => {
      const service = gameScores("my-game", { baseUrl: "https://example.com" });
      assert.isFunction(service.fetchToken);
      assert.isFunction(service.recordCheckin);
      assert.isFunction(service.submitScore);
      assert.isFunction(service.fetchBest);
      assert.isFunction(service.fetchWorst);
      assert.isFunction(service.fetchHistogram);
      assert.isFunction(service.setGroupId);
      assert.isFunction(service.createGroup);
    });

    it("token starts as null", () => {
      const service = gameScores("my-game", { baseUrl: "https://example.com" });
      assert.isNull(service.token);
    });

    it("activeId returns gameId", () => {
      const service = gameScores("my-game", { baseUrl: "https://example.com" });
      assert.equal(service.activeId, "my-game");
    });

    it("setGroupId changes activeId", () => {
      const service = gameScores("my-game", { baseUrl: "https://example.com" });
      assert.equal(service.activeId, "my-game");
      service.setGroupId("group-123");
      assert.equal(service.activeId, "group-123");
    });

    it("recordCheckin without fetchToken first is a no-op", () => {
      const service = gameScores("my-game", { baseUrl: "https://example.com" });
      service.recordCheckin();
    });
  });
});
