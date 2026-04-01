export { default as GameShell } from "./shell.js";
export { GameRoundCounter, GameStat } from "./hud.js";
export { default as GameTimer } from "./timer.js";
export { default as GameShare } from "./share.js";
export { default as GameScoreForm } from "./score-form.js";
export { default as GameLeaderboard } from "./leaderboard.js";
export { default as GameScoreHistogram } from "./histogram.js";
export { default as GameChallenge } from "./challenge.js";
export { default as GameResultStat } from "./result-stat.js";
export { default as GameQuiz } from "./quiz.js";
export { default as GameResultMessage } from "./result-message.js";
export { default as GameFlash } from "./flash.js";
export { default as GameBetween } from "./between.js";
export { default as GameSignal } from "./game-signal.js";
export { default as GameIcon } from "./icon.js";
export { default as GameAudio, GameSample } from "./audio.js";
export { default as GameSequencer } from "./sequencer.js";
export { default as GameTileInput } from "./tile-input.js";
export { default as GameToast } from "./toast.js";
export { default as GameTrophy, GameTrophyUnlockEvent } from "./trophy.js";
export {
  default as GamePreferences,
  GamePreference,
  GamePreferenceChangeEvent,
} from "./preferences.js";
export { default as GameWordSource, gameWordContext } from "./words.js";
export { default as GameDebug } from "./debug.js";
export { default as GamePassage } from "./passage.js";
export { default as FixedProgression } from "./progressions/fixed.js";
export { default as StaircaseProgression } from "./progressions/staircase.js";
export { default as TierProgression } from "./progressions/tier.js";

export {
  GameRoundPassEvent,
  GameRoundFailEvent,
  GameTimerTickEvent,
  GameTimerExpiredEvent,
  GameTimerCountdownEvent,
  GameStatUpdateEvent,
  GameLifecycleEvent,
  GameStartRequestEvent,
  GameRestartRequestEvent,
  GameCompleteEvent,
  GamePauseRequestEvent,
  GameResumeRequestEvent,
  GameNextRoundEvent,
  GamePracticeStartEvent,
  GameTileInputEvent,
  GameTileSubmitEvent,
  GameCollectionAddEvent,
  GameCollectionRemoveEvent,
} from "./events.js";

export { PendingTaskEvent } from "./pending-task.js";

export { default as GameComponent, css, initAttrs } from "./component.js";
export { formatValue } from "./format.js";

export {
  createContext,
  ContextProvider,
  subscribe,
  ContextRequestEvent,
} from "./context.js";

export { Signal, effect } from "./signals.js";

export { matchesConditions } from "./conditions.js";

export { STATE_TRIGGERS, DOM_TRIGGERS } from "./triggers.js";

export { default as gameScores, noopScores } from "./scores.js";
export { groupParam, appendGroupParam } from "./shell.js";

import GameShell from "./shell.js";
import { GameRoundCounter, GameStat } from "./hud.js";
import GameTimer from "./timer.js";
import GameShare from "./share.js";
import GameScoreForm from "./score-form.js";
import GameLeaderboard from "./leaderboard.js";
import GameScoreHistogram from "./histogram.js";
import GameChallenge from "./challenge.js";
import GameResultStat from "./result-stat.js";
import GameQuiz from "./quiz.js";
import GameResultMessage from "./result-message.js";
import GameFlash from "./flash.js";
import GameBetween from "./between.js";
import GameSignal from "./game-signal.js";
import GameIcon from "./icon.js";
import GameAudio, { GameSample } from "./audio.js";
import GameSequencer from "./sequencer.js";
import GameTileInput from "./tile-input.js";
import GameToast from "./toast.js";
import GameTrophy from "./trophy.js";
import GamePreferences, { GamePreference } from "./preferences.js";
import GameWordSource from "./words.js";
import GameDebug from "./debug.js";
import GamePassage from "./passage.js";

export function defineAll(registry = customElements) {
  GameShell.define("game-shell", registry);
  GameRoundCounter.define("game-round-counter", registry);
  GameStat.define("game-stat", registry);
  GameTimer.define("game-timer", registry);
  GameShare.define("game-share", registry);
  GameScoreForm.define("game-score-form", registry);
  GameLeaderboard.define("game-leaderboard", registry);
  GameScoreHistogram.define("game-score-histogram", registry);
  GameChallenge.define("game-challenge", registry);
  GameResultStat.define("game-result-stat", registry);
  GameQuiz.define("game-quiz", registry);
  GameResultMessage.define("game-result-message", registry);
  GameFlash.define("game-flash", registry);
  GameBetween.define("game-between", registry);
  GameSignal.define("game-signal", registry);
  GameIcon.define("game-icon", registry);
  GameAudio.define("game-audio", registry);
  GameSample.define("game-sample", registry);
  GameSequencer.define("game-sequencer", registry);
  GameTileInput.define("game-tile-input", registry);
  GameToast.define("game-toast", registry);
  GameTrophy.define("game-trophy", registry);
  GamePreferences.define("game-preferences", registry);
  GamePreference.define("game-preference", registry);
  GameWordSource.define("game-word-source", registry);
  GameDebug.define("game-debug", registry);
  GamePassage.define("game-passage", registry);
}
