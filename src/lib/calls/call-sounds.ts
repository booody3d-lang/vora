"use client";

type ToneKind = "ringback" | "incoming" | "end";

let audioCtx: AudioContext | null = null;
let activeNodes: Array<AudioNode | OscillatorNode> = [];
let loopTimer: ReturnType<typeof setInterval> | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!audioCtx) audioCtx = new Ctx();
  if (audioCtx.state === "suspended") void audioCtx.resume();
  return audioCtx;
}

function stopAll() {
  if (loopTimer) {
    clearInterval(loopTimer);
    loopTimer = null;
  }
  for (const node of activeNodes) {
    try {
      if ("stop" in node && typeof node.stop === "function") node.stop();
      node.disconnect();
    } catch {
      // already stopped
    }
  }
  activeNodes = [];
}

function beep(
  ctx: AudioContext,
  freq: number,
  startAt: number,
  duration: number,
  gainValue = 0.08
) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.setValueAtTime(0.0001, startAt);
  gain.gain.exponentialRampToValueAtTime(gainValue, startAt + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(startAt);
  osc.stop(startAt + duration + 0.02);
  activeNodes.push(osc, gain);
}

function playRingbackOnce(ctx: AudioContext) {
  const now = ctx.currentTime;
  // Classic dual-tone ringback pattern
  beep(ctx, 440, now, 0.4);
  beep(ctx, 480, now, 0.4, 0.06);
  beep(ctx, 440, now + 0.5, 0.4);
  beep(ctx, 480, now + 0.5, 0.4, 0.06);
}

function playIncomingOnce(ctx: AudioContext) {
  const now = ctx.currentTime;
  beep(ctx, 520, now, 0.18, 0.1);
  beep(ctx, 660, now + 0.2, 0.18, 0.1);
  beep(ctx, 520, now + 0.4, 0.18, 0.1);
  beep(ctx, 780, now + 0.6, 0.28, 0.12);
}

function playEndOnce(ctx: AudioContext) {
  const now = ctx.currentTime;
  beep(ctx, 480, now, 0.15, 0.07);
  beep(ctx, 360, now + 0.18, 0.25, 0.07);
}

export function stopCallSounds() {
  stopAll();
}

export function playCallTone(kind: ToneKind) {
  const ctx = getCtx();
  if (!ctx) return;
  stopAll();

  if (kind === "end") {
    playEndOnce(ctx);
    return;
  }

  const play = () => {
    if (kind === "ringback") playRingbackOnce(ctx);
    else playIncomingOnce(ctx);
  };

  play();
  loopTimer = setInterval(play, kind === "ringback" ? 3000 : 2200);
}
