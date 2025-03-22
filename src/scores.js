export const noopScores = {
  fetchToken() {},
  recordCheckin() {},
  submitScore() { return false; },
  fetchBest() { return null; },
  fetchWorst() { return null; },
  fetchHistogram() { return null; },
  setGroupId() {},
  createGroup() { return null; },
  get token() { return null; },
  get activeId() { return null; },
};

/**
 * Create a score service for a game. Handles token-based anti-cheat,
 * score submission, leaderboard fetching, and histogram data.
 *
 * @param {string} gameId - Unique identifier for this game
 * @param {object} [options]
 * @param {string} [options.baseUrl] - Score server base URL
 * @param {function} [options.formatScore] - Format a score entry for display
 * @param {string} [options.scoreLabel] - Column header for the score table
 */
export default function gameScores(gameId, {
  baseUrl = "",
} = {}) {
  if (!gameId || !baseUrl) return noopScores;

  let groupId = null;
  let token = null;
  let tokenTime = 0;
  let checkins = [];

  function id() { return groupId || gameId; }

  function setGroupId(gid) { groupId = gid || null; }

  async function createGroup(name, settings = {}) {
    try {
      const body = Object.assign({ name }, settings);
      const res = await fetch(`${baseUrl}/g`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) return null;
      const data = await res.json();
      groupId = data.id;
      return data;
    } catch {
      return null;
    }
  }

  async function fetchToken({ attempts = 5 } = {}) {
    for (let i = 1; i <= attempts; i++) {
      try {
        const res = await fetch(`${baseUrl}/g/${id()}/token`, { method: "POST" });
        if (res.ok) {
          const data = await res.json();
          token = data.token;
          tokenTime = Date.now() / 1000;
          checkins = [];
          return;
        }
      } catch {}
      if (i < attempts) await new Promise(r => setTimeout(r, 1000 * i));
    }
  }

  function recordCheckin() {
    if (!tokenTime) return;
    checkins.push(Math.floor(Date.now() / 1000 - tokenTime));
  }

  async function submitScore(name, score) {
    if (!token) return false;
    try {
      const body = new URLSearchParams({
        token,
        name,
        score: String(score),
      });
      if (checkins.length) body.set("checkins", JSON.stringify(checkins));
      const res = await fetch(`${baseUrl}/g/${id()}`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      token = null;
      return res.ok;
    } catch {
      return false;
    }
  }

  async function fetchBest(limit = 3) {
    try {
      const res = await fetch(`${baseUrl}/g/${id()}.json?limit=${limit}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function fetchWorst(limit = 3) {
    try {
      const res = await fetch(`${baseUrl}/g/${id()}/worst.json?limit=${limit}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  async function fetchHistogram(buckets = 80) {
    try {
      const res = await fetch(`${baseUrl}/g/${id()}/histogram.json?buckets=${buckets}`);
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  }

  return {
    fetchToken,
    recordCheckin,
    submitScore,
    fetchBest,
    fetchWorst,
    fetchHistogram,
    setGroupId,
    createGroup,
    get token() { return token; },
    get activeId() { return id(); },
  };
}
