import { describe, it, expect } from 'vitest';
import {
    DEFAULT_PLAY_SPEED_INDEX,
    PLAY_SPEEDS,
    ROLL_SCROLL_SPEED_COUNT,
    getCappedPlayIndex,
    getNextPlaySpeedIndex,
    getNextScrollSpeedIndex,
    getPlaySpeedFactor,
    getScrollSpeedPx,
    int,
    readRuntimeConfig,
    scaleValue,
} from '../src/config.js';

describe('config', () => {
    describe('int and scaleValue', () => {
        it('floors positive and negative numbers', () => {
            expect(int(3.9)).toBe(3);
            expect(int(0)).toBe(0);
            expect(int(-1.2)).toBe(-2);
        });

        it('scales values and floors the result', () => {
            expect(scaleValue(2, 1)).toBe(2);
            expect(scaleValue(2, 1.5)).toBe(3);
            expect(scaleValue(3, 1.25)).toBe(3);
        });
    });

    describe('readRuntimeConfig', () => {
        it('uses defaults when query string is empty', () => {
            const cfg = readRuntimeConfig('', 2);
            expect(cfg.lowPerfMode).toBe(false);
            expect(cfg.scale).toBe(2);
            expect(cfg.playbackResolutionMs).toBeCloseTo(1000 / 120);
        });

        it('enables low-perf mode and reduces default playback resolution to 60Hz', () => {
            const cfg = readRuntimeConfig('?lp=1', 1);
            expect(cfg.lowPerfMode).toBe(true);
            expect(cfg.playbackResolutionMs).toBeCloseTo(1000 / 60);
        });

        it('treats lp=0 as disabled', () => {
            const cfg = readRuntimeConfig('?lp=0', 1);
            expect(cfg.lowPerfMode).toBe(false);
            expect(cfg.playbackResolutionMs).toBeCloseTo(1000 / 120);
        });

        it('respects positive scale override and falls back on non-positive scale', () => {
            expect(readRuntimeConfig('?scale=2.5', 1).scale).toBe(2.5);
            expect(readRuntimeConfig('?scale=0', 2).scale).toBe(2);
            expect(readRuntimeConfig('?scale=-1', 2).scale).toBe(2);
        });

        it('respects positive pres override even in low-perf mode', () => {
            const cfg = readRuntimeConfig('?lp=1&pres=240', 1);
            expect(cfg.lowPerfMode).toBe(true);
            expect(cfg.playbackResolutionMs).toBeCloseTo(1000 / 240);
        });
    });

    describe('scroll speed helpers', () => {
        it('returns scaled speeds for normal/fast and fixed speeds for slowest/slow', () => {
            expect(getScrollSpeedPx(0, 2)).toBe(4);
            expect(getScrollSpeedPx(1, 2)).toBe(8);
            expect(getScrollSpeedPx(2, 2)).toBe(0.25);
            expect(getScrollSpeedPx(3, 2)).toBe(1);
        });

        it('wraps scroll speed index around ROLL_SCROLL_SPEED_COUNT', () => {
            expect(getNextScrollSpeedIndex(0)).toBe(1);
            expect(getNextScrollSpeedIndex(1)).toBe(2);
            expect(getNextScrollSpeedIndex(2)).toBe(3);
            expect(getNextScrollSpeedIndex(ROLL_SCROLL_SPEED_COUNT - 1)).toBe(0);
        });
    });

    describe('play speed helpers', () => {
        it('maps default play speed index to 1x', () => {
            expect(getPlaySpeedFactor(DEFAULT_PLAY_SPEED_INDEX)).toBe(1);
            expect(getPlaySpeedFactor(0)).toBe(0.125);
            expect(getPlaySpeedFactor(PLAY_SPEEDS.length - 1)).toBe(8);
        });

        it('wraps next play speed index', () => {
            expect(getNextPlaySpeedIndex(0)).toBe(1);
            expect(getNextPlaySpeedIndex(PLAY_SPEEDS.length - 1)).toBe(0);
        });

        it('clamps play speed index within valid range', () => {
            expect(getCappedPlayIndex(-5)).toBe(0);
            expect(getCappedPlayIndex(0)).toBe(0);
            expect(getCappedPlayIndex(3)).toBe(3);
            expect(getCappedPlayIndex(99)).toBe(PLAY_SPEEDS.length - 1);
        });
    });
});
