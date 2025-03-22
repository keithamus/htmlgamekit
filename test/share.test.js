import { assert } from "@open-wc/testing";
import "../src/auto.js";

const tick = () => new Promise((r) => setTimeout(r, 0));

describe("game-share", () => {
  afterEach(() => {
    document.body.innerHTML = "";
    localStorage.clear();
    sessionStorage.clear();
    history.replaceState(null, "", location.pathname);
  });
});
