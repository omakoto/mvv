import { describe, it, expect } from 'vitest';
import {
    RGB_BLACK,
    getBarColor,
    getOnColor,
    getPedalColor,
    getSostenutoPedalColor,
    hsvToRgb,
    mixRgb,
    rgbToInt,
    rgbToStr,
} from '../src/color.js';

describe('color', () => {
    describe('hsvToRgb', () => {
        it('converts primary and secondary hues across all 6 sectors', () => {
            expect(hsvToRgb(0 / 6, 1, 1)).toEqual([255, 0, 0]);     // Red
            expect(hsvToRgb(1 / 6, 1, 1)).toEqual([255, 255, 0]);   // Yellow
            expect(hsvToRgb(2 / 6, 1, 1)).toEqual([0, 255, 0]);     // Green
            expect(hsvToRgb(3 / 6, 1, 1)).toEqual([0, 255, 255]);   // Cyan
            expect(hsvToRgb(4 / 6, 1, 1)).toEqual([0, 0, 255]);     // Blue
            expect(hsvToRgb(5 / 6, 1, 1)).toEqual([255, 0, 255]);   // Magenta
        });

        it('handles zero saturation (grayscale) and zero value (black)', () => {
            expect(hsvToRgb(0.3, 0, 0.5)).toEqual([128, 128, 128]);
            expect(hsvToRgb(0.7, 1, 0)).toEqual([0, 0, 0]);
        });
    });

    describe('rgbToStr', () => {
        it('returns "black" shortcut for opaque black', () => {
            expect(rgbToStr([0, 0, 0])).toBe('black');
            expect(rgbToStr([0, 0, 0], 255)).toBe('black');
        });

        it('returns rgb() for opaque non-black colors', () => {
            expect(rgbToStr([10, 20, 30])).toBe('rgb(10,20,30)');
            expect(rgbToStr([255, 0, 128], 255)).toBe('rgb(255,0,128)');
        });

        it('returns rgba() when alpha is less than 255', () => {
            expect(rgbToStr([0, 0, 0], 0)).toBe('rgba(0,0,0,0)');
            expect(rgbToStr([100, 150, 200], 127.5)).toBe('rgba(100,150,200,0.5)');
        });
    });

    describe('rgbToInt', () => {
        it('packs RGB channels into a 24-bit integer', () => {
            expect(rgbToInt([0, 0, 0])).toBe(0x000000);
            expect(rgbToInt([255, 0, 0])).toBe(0xff0000);
            expect(rgbToInt([0, 255, 0])).toBe(0x00ff00);
            expect(rgbToInt([0, 0, 255])).toBe(0x0000ff);
            expect(rgbToInt([0x12, 0x34, 0x56])).toBe(0x123456);
        });
    });

    describe('MIDI color mappings', () => {
        it('maps max velocity (127) to red and zero velocity to green-cyan', () => {
            const loud = getBarColor(127);
            expect(loud[0]).toBe(255);
            expect(loud[1]).toBeLessThan(loud[0]);

            const soft = getBarColor(0);
            expect(soft[1]).toBe(255);
            expect(soft[0]).toBeLessThan(soft[1]);
        });

        it('shifts getOnColor brighter and warmer as simultaneous note count grows', () => {
            const one = getOnColor(1);
            const many = getOnColor(10);
            expect(many[0]).toBeGreaterThan(one[0]);
            // Clamps cleanly at high counts
            expect(getOnColor(100)).toEqual([255, 0, 0]);
        });

        it('returns RGB_BLACK for non-positive damper and sostenuto pedal values', () => {
            expect(getPedalColor(0)).toEqual(RGB_BLACK);
            expect(getPedalColor(-10)).toEqual(RGB_BLACK);
            expect(getSostenutoPedalColor(0)).toEqual(RGB_BLACK);
            expect(getSostenutoPedalColor(-1)).toEqual(RGB_BLACK);
        });

        it('returns distinct non-black colors for active pedals and scales sostenuto brightness', () => {
            const sustain = getPedalColor(127);
            expect(sustain).not.toEqual(RGB_BLACK);

            const sostLow = getSostenutoPedalColor(1);
            const sostHigh = getSostenutoPedalColor(127);
            expect(sostLow).not.toEqual(RGB_BLACK);
            expect(sostHigh[0]).toBeGreaterThan(sostLow[0]);
        });
    });

    describe('mixRgb', () => {
        it('returns black when both inputs are black', () => {
            expect(mixRgb([0, 0, 0], [0, 0, 0])).toEqual(RGB_BLACK);
        });

        it('returns the non-black color when only one input is active', () => {
            expect(mixRgb([0, 0, 0], [10, 20, 30])).toEqual([10, 20, 30]);
            expect(mixRgb([40, 50, 60], [0, 0, 0])).toEqual([40, 50, 60]);
        });

        it('averages channels with floor when both colors are non-black', () => {
            expect(mixRgb([100, 201, 50], [50, 100, 51])).toEqual([75, 150, 50]);
        });
    });
});
