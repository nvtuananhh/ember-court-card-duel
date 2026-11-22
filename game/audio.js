// audio.js — all sound is WebAudio oscillators, generated in code. No audio
// files, no network. The context is created on the first user gesture.
let context = null;
let muted = false;

export function isMuted() {
  return muted;
}

export function toggleMute() {
  muted = !muted;
  return muted;
}

function ensureContext() {
  if (context) {
    if (context.state === 'suspended') void context.resume();
    return context;
  }
  const AudioContextClass =
    window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;
  context = new AudioContextClass();
  return context;
}

export function unlockAudio() {
  ensureContext();
}

function tone(frequency, duration, type, volume, delay) {
  if (muted) return;
  const ctx = ensureContext();
  if (!ctx) return;
  const start = ctx.currentTime + (delay ?? 0);
  const oscillator = ctx.createOscillator();
  const gain = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.015);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain);
  gain.connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

export function playSelect() {
  tone(660, 0.09, 'triangle', 0.12);
}

export function playDeal() {
  tone(392, 0.1, 'triangle', 0.1);
  tone(523, 0.12, 'triangle', 0.1, 0.07);
}

export function playFlip() {
  tone(220, 0.14, 'sawtooth', 0.06);
  tone(440, 0.16, 'triangle', 0.1, 0.05);
}

export function playDamage() {
  tone(160, 0.22, 'sawtooth', 0.14);
  tone(110, 0.26, 'square', 0.08, 0.06);
}

export function playWin() {
  tone(523, 0.16, 'triangle', 0.14);
  tone(659, 0.16, 'triangle', 0.14, 0.12);
  tone(784, 0.22, 'triangle', 0.14, 0.24);
  tone(1047, 0.34, 'triangle', 0.14, 0.36);
}

export function playLose() {
  tone(392, 0.2, 'triangle', 0.12);
  tone(330, 0.2, 'triangle', 0.12, 0.16);
  tone(262, 0.34, 'triangle', 0.12, 0.32);
}

export function playTie() {
  tone(440, 0.14, 'sine', 0.1);
  tone(440, 0.14, 'sine', 0.1, 0.16);
}
