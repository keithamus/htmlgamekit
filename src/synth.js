// iOS maps audio session type to AVAudioSession category. Default "ambient"
// is muted by the silent switch while "playback" is not.
if ("audioSession" in navigator) navigator.audioSession.type = "playback";

// Prefix fallback for older Safari/WebKit.
const AudioCtor = window.AudioContext ?? window.webkitAudioContext;
let sharedCtx = null;

export function getAudioCtx() {
  if (!sharedCtx) sharedCtx = new AudioCtor();
  if (sharedCtx.state === "suspended") sharedCtx.resume();
  return sharedCtx;
}

// iOS Safari suspends AudioContext until a synchronous user-gesture call.
// Pre-warm on first pointer interaction so audio is unlocked before the
// first game sound fires (which arrives via async signal propagation).
function _unlock() {
  const ctx = getAudioCtx();
  ctx.resume();
  // Silent 1-sample buffer: the classic iOS AudioContext unlock trick.
  const buf = ctx.createBuffer(1, 1, ctx.sampleRate);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  src.connect(ctx.destination);
  src.start(0);
}

for (const type of ["touchstart", "pointerdown", "mousemove"]) {
  document.addEventListener(type, _unlock, {
    once: true,
    capture: true,
    passive: true,
  });
}

export function synthMarimba(ctx, freq, when, gain, duration = 0.5) {
  const t = ctx.currentTime + when;
  const partials = [
    { mult: 1, gain },
    { mult: 2, gain: gain * 0.25 },
    { mult: 4, gain: gain * 0.12 },
  ];
  for (const p of partials) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.connect(env);
    env.connect(ctx.destination);
    osc.type = "sine";
    osc.frequency.value = freq * p.mult;
    env.gain.setValueAtTime(0, t);
    env.gain.linearRampToValueAtTime(p.gain, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.02);
  }
}

export function synthBeep(ctx, freq, when, gain, duration = 0.08) {
  const t = ctx.currentTime + when;
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.connect(env);
  env.connect(ctx.destination);
  osc.type = "square";
  osc.frequency.value = freq;
  env.gain.setValueAtTime(gain, t);
  env.gain.exponentialRampToValueAtTime(0.001, t + duration);
  osc.start(t);
  osc.stop(t + duration + 0.01);
}

export function synthNoise(ctx, when, gain, duration = 0.02) {
  const t = ctx.currentTime + when;
  const buf = ctx.createBuffer(1, ctx.sampleRate * duration, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
  }
  const src = ctx.createBufferSource();
  const env = ctx.createGain();
  src.buffer = buf;
  src.connect(env);
  env.connect(ctx.destination);
  env.gain.setValueAtTime(gain, t);
  src.start(t);
}

export const SYNTHS = {
  marimba: synthMarimba,
  beep: synthBeep,
  noise: synthNoise,
};

export function noteFreq(root, semitone) {
  return root * Math.pow(2, semitone / 12);
}
