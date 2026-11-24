/**
 * @file color.ts
 * @description Pure color conversion, blending, and MIDI velocity/pedal color mapping utilities.
 */
'use strict';
import { int } from './config.js';
export const RGB_BLACK = [0, 0, 0];
// Dark yellow color for octave lines
export const RGB_OCTAVE_LINES = [100, 100, 0];
export function hsvToRgb(h, s, v) {
    let r = 0, g = 0, b = 0;
    const i = Math.floor(h * 6);
    const f = h * 6 - i;
    const p = v * (1 - s);
    const q = v * (1 - f * s);
    const t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            r = v;
            g = t;
            b = p;
            break;
        case 1:
            r = q;
            g = v;
            b = p;
            break;
        case 2:
            r = p;
            g = v;
            b = t;
            break;
        case 3:
            r = p;
            g = q;
            b = v;
            break;
        case 4:
            r = t;
            g = p;
            b = v;
            break;
        case 5:
            r = v;
            g = p;
            b = q;
            break;
    }
    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}
export function rgbToStr(rgb, alpha = 255) {
    // Fast-path common opaque black case
    if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0 && alpha === 255) {
        return "black";
    }
    if (alpha === 255) {
        return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    }
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (alpha / 255) + ')';
}
export function rgbToInt(rgb) {
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}
export function getBarColor(velocity) {
    const MAX_H = 0.4;
    const h = MAX_H - (MAX_H * velocity / 127);
    const s = 0.9;
    const l = 1;
    return hsvToRgb(h, s, l);
}
export function getOnColor(count) {
    const h = Math.max(0, 0.2 - count * 0.03);
    const s = Math.min(1, 0.3 + 0.2 * count);
    const l = Math.min(1, 0.4 + 0.2 * count);
    return hsvToRgb(h, s, l);
}
export function getPedalColor(value) {
    if (value <= 0) {
        return RGB_BLACK;
    }
    const h = 0.65 - (0.2 * value / 127);
    const s = 0.7;
    const l = 0.2;
    return hsvToRgb(h, s, l);
}
export function getSostenutoPedalColor(value) {
    if (value <= 0) {
        return RGB_BLACK;
    }
    // Vary brightness based on the pedal depth.
    const h = 0.16;
    const s = 0.96;
    const v = 0.15 + (0.25 * value / 127); // from 0.15 to 0.4
    return hsvToRgb(h, s, v);
}
export function mixRgb(rgb1, rgb2) {
    const isBlack1 = rgb1[0] === 0 && rgb1[1] === 0 && rgb1[2] === 0;
    const isBlack2 = rgb2[0] === 0 && rgb2[1] === 0 && rgb2[2] === 0;
    if (isBlack1 && isBlack2)
        return RGB_BLACK;
    if (isBlack1)
        return rgb2;
    if (isBlack2)
        return rgb1;
    // Average the colors for a mixed effect.
    return [
        int((rgb1[0] + rgb2[0]) / 2),
        int((rgb1[1] + rgb2[1]) / 2),
        int((rgb1[2] + rgb2[2]) / 2),
    ];
}
//# sourceMappingURL=color.js.map