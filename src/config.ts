/**
 * @file config.ts
 * @description Centralizes application constants, runtime URL parameter parsing,
 * and speed/scaling calculation helpers.
 */

'use strict';

export const MAX_FPS = 100;
export const FPS_TO_MILLIS = Math.floor(1000 / MAX_FPS);

export const NOTES_COUNT = 128;

export const NOTE_NAME_FRAME_THRESHOLD = 120;
export const NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD = 20;

export const ALPHA_DECAY_SEC = 0.3;

export const WAKE_LOCK_MILLIS = 5 * 60 * 1000; // 5 minutes

export const BAR_RATIO = 0.15; // Bar : Roll height

// Always recording capacity.
export const ALWAYS_RECORD_SECONDS = 60 * 20;
export const ALWAYS_RECORD_MAX_EVENTS = ALWAYS_RECORD_SECONDS * 100;

// If a note is released within this many ticks, force its visibility on the UI
// to ensure short triggers (e.g. drum pads) are still drawn.
export const SHORTEST_NOTE_LENGTH = 1;

export const ROLL_SCROLL_SPEED_COUNT = 4;

export const PLAY_SPEEDS: readonly number[] = [0.125, 0.25, 0.5, 1, 2, 4, 8];
export const DEFAULT_PLAY_SPEED_INDEX = 3;

export interface RuntimeConfig {
    lowPerfMode: boolean;
    scale: number;
    playbackResolutionMs: number;
}

export function int(v: number): number {
    return Math.floor(v);
}

export function scaleValue(v: number, scale: number): number {
    return int(v * scale);
}

export function readRuntimeConfig(search: string, devicePixelRatio: number): RuntimeConfig {
    const params = new URLSearchParams(search);
    const lowPerfMode = parseInt("0" + params.get("lp"), 10) !== 0;

    const scaleArg = parseFloat("0" + params.get("scale"));
    const scale = scaleArg > 0 ? scaleArg : devicePixelRatio;

    const playbackResolutionArg = parseInt("0" + params.get("pres"), 10);
    const playbackResolutionMs = 1000 / (playbackResolutionArg > 0 ? playbackResolutionArg : lowPerfMode ? 60 : 120);

    return { lowPerfMode, scale, playbackResolutionMs };
}

export function getScrollSpeedPx(index: number, scale: number): number {
    const speeds = [scaleValue(2, scale), scaleValue(4, scale), 0.25, 1];
    return speeds[index]!;
}

export function getNextScrollSpeedIndex(index: number): number {
    return (index + 1) % ROLL_SCROLL_SPEED_COUNT;
}

export function getPlaySpeedFactor(index: number): number {
    return PLAY_SPEEDS[index]!;
}

export function getNextPlaySpeedIndex(index: number): number {
    return (index + 1) % PLAY_SPEEDS.length;
}

export function getCappedPlayIndex(index: number): number {
    return Math.max(0, Math.min(index, PLAY_SPEEDS.length - 1));
}
