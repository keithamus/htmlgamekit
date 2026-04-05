export const noopTrophies = {
  fetchTrophies() {
    return Promise.resolve([]);
  },
  unlockTrophy() {
    return Promise.resolve(false);
  },
  get playerId() {
    return null;
  },
};

/**
 * Create a trophy persistence service for a game. Syncs trophy unlocks
 * with a remote server so they persist across devices and browsers.
 *
 * Players are identified by a UUID stored in localStorage and sent as
 * an `Authorization: Bearer {uuid}` header. On first contact with no
 * stored ID, the server generates one and returns it in the `player`
 * field of the JSON response body.
 *
 * @param {string} gameId - Unique identifier for this game
 * @param {object} [options]
 * @param {string} [options.baseUrl] - Trophy server base URL
 * @returns {object} Trophy service with fetchTrophies/unlockTrophy methods
 */
export default function gameTrophies(gameId, { baseUrl = "" } = {}) {
  if (!gameId || !baseUrl) return noopTrophies;

  const playerKey = `${gameId}-player-id`;
  let playerId = null;
  try {
    playerId = localStorage.getItem(playerKey);
  } catch {}

  function authHeaders() {
    const h = {};
    if (playerId) h["Authorization"] = `Bearer ${playerId}`;
    return h;
  }

  function savePlayer(id) {
    if (id && id !== playerId) {
      playerId = id;
      try {
        localStorage.setItem(playerKey, id);
      } catch {}
    }
  }

  /**
   * Fetch all unlocked trophies for the current player in this game.
   * Each entry is `{ id: string, unlocked_at: string }`.
   *
   * @returns {Promise<Array<{id: string, unlocked_at: string}>>} Unlocked trophies
   */
  async function fetchTrophies() {
    try {
      const res = await fetch(`${baseUrl}/t/${gameId}`, {
        headers: authHeaders(),
      });
      if (!res.ok) return [];
      const data = await res.json();
      savePlayer(data.player);
      return data.trophies || [];
    } catch {
      return [];
    }
  }

  /**
   * Record a trophy unlock on the server.
   *
   * @param {string} trophyId - The trophy ID to unlock
   * @returns {Promise<boolean>} true if the request succeeded
   */
  async function unlockTrophy(trophyId) {
    try {
      const res = await fetch(
        `${baseUrl}/t/${gameId}/${encodeURIComponent(trophyId)}`,
        { method: "PUT", headers: authHeaders() },
      );
      if (res.ok) {
        const data = await res.json();
        savePlayer(data.player);
      }
      return res.ok;
    } catch {
      return false;
    }
  }

  return {
    fetchTrophies,
    unlockTrophy,
    get playerId() {
      return playerId;
    },
  };
}
