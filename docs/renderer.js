/**
 * @file renderer.ts
 * @description Implements the double-buffered 2D canvas Renderer for the velocity bar graph
 * and scrolling piano roll, including pedals, octave lines, note-off markers, and note names.
 */
'use strict';
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _Renderer_instances, _Renderer_scale, _Renderer_BAR_SUB_LINE_WIDTH, _Renderer_BAR_BASE_LINE_COLOR, _Renderer_W, _Renderer_H, _Renderer_BAR_H, _Renderer_ROLL_H, _Renderer_MIN_NOTE, _Renderer_MAX_NOTE, _Renderer_cbar, _Renderer_bar, _Renderer_croll, _Renderer_roll, _Renderer_cbar2, _Renderer_bar2, _Renderer_croll2, _Renderer_roll2, _Renderer_rollFrozen, _Renderer_drewOffLine, _Renderer_currentFrame, _Renderer_lastDrawFrame, _Renderer_subpixelScroll, _Renderer_lastDrawY, _Renderer_lastPedalColorInt, _Renderer_lastVlinesOn, _Renderer_lastNoteNameDrawFrame, _Renderer_needsAnimation, _Renderer_extraLineType, _Renderer_EXTRA_LINE_COLORS, _Renderer_EXTRA_LINE_HEIGHT, _Renderer_EXTRA_LINE_DASH, _Renderer_status, _Renderer_getSettings, _Renderer_onRequestAnimation, _Renderer_tonalOverride, _Renderer_barAreaChanged;
import { ALPHA_DECAY_SEC, BAR_RATIO, NOTES_COUNT, NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD, NOTE_NAME_FRAME_THRESHOLD, int, scaleValue, } from './config.js';
import { RGB_OCTAVE_LINES, getBarColor, getOnColor, getPedalColor, getSostenutoPedalColor, mixRgb, rgbToInt, rgbToStr, } from './color.js';
const DEFAULT_SETTINGS = {
    scrollSpeedPx: 2,
    scrollSpeedFactor: 1,
    isShowingNoteOffLines: true,
    isShowingNoteNames: true,
    isShowingOctaveLines: true,
    isSharpMode: true,
};
export class Renderer {
    static getCanvas(name) {
        const canvas = document.getElementById(name);
        const context = canvas.getContext("2d");
        return [canvas, context];
    }
    constructor(deps) {
        var _a, _b, _c, _d;
        var _e, _f, _g, _h, _j, _k, _l, _m;
        _Renderer_instances.add(this);
        _Renderer_scale.set(this, void 0);
        _Renderer_BAR_SUB_LINE_WIDTH.set(this, void 0);
        _Renderer_BAR_BASE_LINE_COLOR.set(this, [200, 255, 200]);
        _Renderer_W.set(this, void 0);
        _Renderer_H.set(this, void 0);
        _Renderer_BAR_H.set(this, void 0);
        _Renderer_ROLL_H.set(this, void 0);
        _Renderer_MIN_NOTE.set(this, 21);
        _Renderer_MAX_NOTE.set(this, 108);
        _Renderer_cbar.set(this, void 0);
        _Renderer_bar.set(this, void 0);
        _Renderer_croll.set(this, void 0);
        _Renderer_roll.set(this, void 0);
        _Renderer_cbar2.set(this, void 0);
        _Renderer_bar2.set(this, void 0);
        _Renderer_croll2.set(this, void 0);
        _Renderer_roll2.set(this, void 0);
        _Renderer_rollFrozen.set(this, false);
        _Renderer_drewOffLine.set(this, false);
        _Renderer_currentFrame.set(this, -1);
        _Renderer_lastDrawFrame.set(this, 0);
        _Renderer_subpixelScroll.set(this, 0);
        _Renderer_lastDrawY.set(this, 0);
        _Renderer_lastPedalColorInt.set(this, -1);
        _Renderer_lastVlinesOn.set(this, false);
        _Renderer_lastNoteNameDrawFrame.set(this, []);
        _Renderer_needsAnimation.set(this, false);
        _Renderer_extraLineType.set(this, -1);
        _Renderer_EXTRA_LINE_COLORS.set(this, [
            "#FF9090",
            "#FFC0FF",
            "#C0C0FF",
            "#FFFFC0",
            "#C0FFFF",
        ]);
        _Renderer_EXTRA_LINE_HEIGHT.set(this, void 0);
        _Renderer_EXTRA_LINE_DASH.set(this, void 0);
        _Renderer_status.set(this, void 0);
        _Renderer_getSettings.set(this, void 0);
        _Renderer_onRequestAnimation.set(this, void 0);
        _Renderer_tonalOverride.set(this, void 0);
        __classPrivateFieldSet(this, _Renderer_status, deps.status, "f");
        __classPrivateFieldSet(this, _Renderer_getSettings, (_a = deps.getSettings) !== null && _a !== void 0 ? _a : (() => DEFAULT_SETTINGS), "f");
        __classPrivateFieldSet(this, _Renderer_onRequestAnimation, deps.onRequestAnimation, "f");
        __classPrivateFieldSet(this, _Renderer_tonalOverride, deps.tonal, "f");
        __classPrivateFieldSet(this, _Renderer_scale, (_b = deps.scale) !== null && _b !== void 0 ? _b : 1, "f");
        __classPrivateFieldSet(this, _Renderer_BAR_SUB_LINE_WIDTH, scaleValue(2, __classPrivateFieldGet(this, _Renderer_scale, "f")), "f");
        __classPrivateFieldSet(this, _Renderer_EXTRA_LINE_HEIGHT, scaleValue(3, __classPrivateFieldGet(this, _Renderer_scale, "f")), "f");
        __classPrivateFieldSet(this, _Renderer_EXTRA_LINE_DASH, [__classPrivateFieldGet(this, _Renderer_EXTRA_LINE_HEIGHT, "f") * 4, __classPrivateFieldGet(this, _Renderer_EXTRA_LINE_HEIGHT, "f") * 8], "f");
        // Adjust canvas container heights to match BAR_RATIO.
        $("#bar2").css("height", (BAR_RATIO * 100) + "%");
        $("#roll2").css("height", (100 - BAR_RATIO * 100) + "%");
        const screenW = (_c = deps.screenWidth) !== null && _c !== void 0 ? _c : screen.width;
        const screenH = (_d = deps.screenHeight) !== null && _d !== void 0 ? _d : screen.height;
        __classPrivateFieldSet(this, _Renderer_W, scaleValue(screenW, __classPrivateFieldGet(this, _Renderer_scale, "f")), "f");
        __classPrivateFieldSet(this, _Renderer_H, scaleValue(screenH, __classPrivateFieldGet(this, _Renderer_scale, "f")), "f");
        __classPrivateFieldSet(this, _Renderer_BAR_H, int(__classPrivateFieldGet(this, _Renderer_H, "f") * BAR_RATIO), "f");
        __classPrivateFieldSet(this, _Renderer_ROLL_H, __classPrivateFieldGet(this, _Renderer_H, "f") - __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), "f");
        _e = this, _f = this, [({ set value(_a) { __classPrivateFieldSet(_e, _Renderer_cbar, _a, "f"); } }).value, ({ set value(_a) { __classPrivateFieldSet(_f, _Renderer_bar, _a, "f"); } }).value] = Renderer.getCanvas("bar");
        _g = this, _h = this, [({ set value(_a) { __classPrivateFieldSet(_g, _Renderer_cbar2, _a, "f"); } }).value, ({ set value(_a) { __classPrivateFieldSet(_h, _Renderer_bar2, _a, "f"); } }).value] = Renderer.getCanvas("bar2");
        _j = this, _k = this, [({ set value(_a) { __classPrivateFieldSet(_j, _Renderer_croll, _a, "f"); } }).value, ({ set value(_a) { __classPrivateFieldSet(_k, _Renderer_roll, _a, "f"); } }).value] = Renderer.getCanvas("roll");
        _l = this, _m = this, [({ set value(_a) { __classPrivateFieldSet(_l, _Renderer_croll2, _a, "f"); } }).value, ({ set value(_a) { __classPrivateFieldSet(_m, _Renderer_roll2, _a, "f"); } }).value] = Renderer.getCanvas("roll2");
        __classPrivateFieldGet(this, _Renderer_bar, "f").imageSmoothingEnabled = false;
        __classPrivateFieldGet(this, _Renderer_bar2, "f").imageSmoothingEnabled = false;
        __classPrivateFieldGet(this, _Renderer_roll, "f").imageSmoothingEnabled = false;
        __classPrivateFieldGet(this, _Renderer_roll2, "f").imageSmoothingEnabled = false;
        __classPrivateFieldGet(this, _Renderer_cbar, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_cbar, "f").height = __classPrivateFieldGet(this, _Renderer_BAR_H, "f");
        __classPrivateFieldGet(this, _Renderer_cbar2, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_cbar2, "f").height = __classPrivateFieldGet(this, _Renderer_BAR_H, "f");
        __classPrivateFieldGet(this, _Renderer_croll, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_croll, "f").height = __classPrivateFieldGet(this, _Renderer_ROLL_H, "f");
        __classPrivateFieldGet(this, _Renderer_croll2, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_croll2, "f").height = __classPrivateFieldGet(this, _Renderer_ROLL_H, "f");
        for (let i = 0; i < NOTES_COUNT; i++) {
            __classPrivateFieldGet(this, _Renderer_lastNoteNameDrawFrame, "f")[i] = -99999;
        }
    }
    setGetSettings(getSettings) {
        __classPrivateFieldSet(this, _Renderer_getSettings, getSettings, "f");
    }
    setOnRequestAnimation(callback) {
        __classPrivateFieldSet(this, _Renderer_onRequestAnimation, callback, "f");
    }
    getBarColor(velocity) {
        return getBarColor(velocity);
    }
    getOnColor(count) {
        return getOnColor(count);
    }
    getPedalColor(value) {
        return getPedalColor(value);
    }
    getSostenutoPedalColor(value) {
        return getSostenutoPedalColor(value);
    }
    mixRgb(rgb1, rgb2) {
        return mixRgb(rgb1, rgb2);
    }
    drawSubLine(percent) {
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = rgbToStr(this.getBarColor(127 * (1 - percent)));
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, __classPrivateFieldGet(this, _Renderer_BAR_H, "f") * percent, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_BAR_SUB_LINE_WIDTH, "f"));
    }
    // Draws vertical lines between octaves (between B and C).
    drawOctaveLines(drawHeight) {
        __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(RGB_OCTAVE_LINES);
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle;
        const OCTAVE_LINE_WIDTH = 2;
        for (let i = __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f"); i <= __classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f"); i++) {
            if (i % 12 === 0 && i > __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f")) {
                const x = __classPrivateFieldGet(this, _Renderer_W, "f") * (i - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f")) / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1);
                if (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f")) {
                    __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, drawHeight);
                }
                __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"));
            }
        }
    }
    needsAnimation() {
        return __classPrivateFieldGet(this, _Renderer_needsAnimation, "f") ||
            (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f") && __classPrivateFieldGet(this, _Renderer_lastDrawY, "f") <= (__classPrivateFieldGet(this, _Renderer_ROLL_H, "f") + 64));
    }
    onDraw(time) {
        var _a, _b, _c;
        var _d;
        const settings = __classPrivateFieldGet(this, _Renderer_getSettings, "f").call(this);
        const tonalLib = (_a = __classPrivateFieldGet(this, _Renderer_tonalOverride, "f")) !== null && _a !== void 0 ? _a : (typeof Tonal !== 'undefined' ? Tonal : null);
        __classPrivateFieldSet(this, _Renderer_currentFrame, (_d = __classPrivateFieldGet(this, _Renderer_currentFrame, "f"), _d++, _d), "f");
        __classPrivateFieldSet(this, _Renderer_needsAnimation, false, "f");
        // Clear the bar area.
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = 'black';
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_H, "f"));
        // Sub bar lines.
        this.drawSubLine(0.25);
        this.drawSubLine(0.5);
        this.drawSubLine(0.7);
        // Individual bar width
        const bw = __classPrivateFieldGet(this, _Renderer_W, "f") / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1) - 1;
        let drawHeight = 0;
        const scrollPx = settings.scrollSpeedPx;
        const scrollFactor = settings.scrollSpeedFactor;
        if (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f")) {
            __classPrivateFieldSet(this, _Renderer_subpixelScroll, __classPrivateFieldGet(this, _Renderer_subpixelScroll, "f") + scrollPx, "f");
            const scrollAmount = int(__classPrivateFieldGet(this, _Renderer_subpixelScroll, "f"));
            __classPrivateFieldSet(this, _Renderer_subpixelScroll, __classPrivateFieldGet(this, _Renderer_subpixelScroll, "f") - scrollAmount, "f");
            const hlineHeight = scaleValue(2, __classPrivateFieldGet(this, _Renderer_scale, "f"));
            drawHeight = Math.max(scrollAmount, hlineHeight);
            if (scrollAmount >= 1) {
                __classPrivateFieldGet(this, _Renderer_roll, "f").drawImage(__classPrivateFieldGet(this, _Renderer_croll, "f"), 0, scrollAmount);
            }
            __classPrivateFieldSet(this, _Renderer_lastDrawY, __classPrivateFieldGet(this, _Renderer_lastDrawY, "f") + scrollAmount, "f");
            // Draw the pedals.
            const sustainColor = this.getPedalColor(__classPrivateFieldGet(this, _Renderer_status, "f").damperPedal);
            const sostenutoColor = this.getSostenutoPedalColor(__classPrivateFieldGet(this, _Renderer_status, "f").sostenuto);
            const pedalColor = this.mixRgb(sustainColor, sostenutoColor);
            const pedalColorInt = rgbToInt(pedalColor);
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(pedalColor);
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), drawHeight);
            if (pedalColorInt !== __classPrivateFieldGet(this, _Renderer_lastPedalColorInt, "f")) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldSet(this, _Renderer_lastPedalColorInt, pedalColorInt, "f");
            }
            // "Off" line
            if (__classPrivateFieldGet(this, _Renderer_status, "f").offNoteCountInTick > 0 && settings.isShowingNoteOffLines) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                // Avoid drawing consecutive off-lines directly adjacent, which looks overly bright.
                if (!__classPrivateFieldGet(this, _Renderer_drewOffLine, "f")) {
                    __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = "#008040";
                    __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, Math.max(0, drawHeight - hlineHeight), __classPrivateFieldGet(this, _Renderer_W, "f"), hlineHeight);
                }
                __classPrivateFieldSet(this, _Renderer_drewOffLine, true, "f");
            }
            else {
                __classPrivateFieldSet(this, _Renderer_drewOffLine, false, "f");
            }
            // "On" line
            if (__classPrivateFieldGet(this, _Renderer_status, "f").onNoteCountInTick > 0) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(this.getOnColor(__classPrivateFieldGet(this, _Renderer_status, "f").onNoteCountInTick));
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, Math.max(0, drawHeight - hlineHeight), __classPrivateFieldGet(this, _Renderer_W, "f"), hlineHeight);
            }
            // Extra (metronome / audio attack) line
            if (__classPrivateFieldGet(this, _Renderer_extraLineType, "f") >= 0) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldGet(this, _Renderer_roll, "f").strokeStyle = __classPrivateFieldGet(this, _Renderer_EXTRA_LINE_COLORS, "f")[__classPrivateFieldGet(this, _Renderer_extraLineType, "f")];
                __classPrivateFieldGet(this, _Renderer_roll, "f").setLineDash(__classPrivateFieldGet(this, _Renderer_EXTRA_LINE_DASH, "f"));
                __classPrivateFieldGet(this, _Renderer_roll, "f").lineWidth = __classPrivateFieldGet(this, _Renderer_EXTRA_LINE_HEIGHT, "f");
                __classPrivateFieldGet(this, _Renderer_roll, "f").beginPath();
                __classPrivateFieldGet(this, _Renderer_roll, "f").rect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), drawHeight);
                __classPrivateFieldGet(this, _Renderer_roll, "f").stroke();
                __classPrivateFieldSet(this, _Renderer_extraLineType, -1, "f");
            }
        }
        const fontSize = bw * 0.9;
        for (let i = __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f"); i <= __classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f"); i++) {
            const n = __classPrivateFieldGet(this, _Renderer_status, "f").getNote(i);
            const on = n.noteOn;
            const velocity = n.velocity;
            const color = this.getBarColor(velocity);
            const alpha = on ? 255 :
                (255 - (255 * (((time - n.offTime) / 1000.0) / ALPHA_DECAY_SEC)));
            if (alpha <= 0) {
                continue;
            }
            if (!on) {
                __classPrivateFieldSet(this, _Renderer_needsAnimation, true, "f");
            }
            const colorStr = rgbToStr(color, alpha);
            const bl = __classPrivateFieldGet(this, _Renderer_W, "f") * (i - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f")) / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1);
            const bh = __classPrivateFieldGet(this, _Renderer_BAR_H, "f") * n.velocity / 127;
            __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = colorStr;
            __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(bl, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), bw, -bh);
            if (!on) {
                continue;
            }
            if (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f")) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = colorStr;
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(bl, 0, bw, drawHeight);
                if (settings.isShowingNoteNames && __classPrivateFieldGet(this, _Renderer_status, "f").isJustPressed(i) && ((_b = tonalLib === null || tonalLib === void 0 ? void 0 : tonalLib.Midi) === null || _b === void 0 ? void 0 : _b.midiToNoteName)) {
                    const noteOffAge = __classPrivateFieldGet(this, _Renderer_status, "f").getLastNoteOffAgeTick(i);
                    const lastDraw = (_c = __classPrivateFieldGet(this, _Renderer_lastNoteNameDrawFrame, "f")[i]) !== null && _c !== void 0 ? _c : -9999;
                    const sinceLastDraw = __classPrivateFieldGet(this, _Renderer_currentFrame, "f") - lastDraw;
                    if ((noteOffAge > (NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD / scrollFactor))
                        || (sinceLastDraw > (NOTE_NAME_FRAME_THRESHOLD / scrollFactor))) {
                        __classPrivateFieldGet(this, _Renderer_lastNoteNameDrawFrame, "f")[i] = __classPrivateFieldGet(this, _Renderer_currentFrame, "f");
                        const noteName = tonalLib.Midi.midiToNoteName(i, { sharps: settings.isSharpMode }).replace(/-?\d+$/, '');
                        __classPrivateFieldGet(this, _Renderer_roll, "f").font = '' + fontSize + 'px Roboto, sans-serif';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").textAlign = 'center';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").strokeStyle = 'rgba(0, 0, 0, 0.7)';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").lineWidth = scaleValue(5, __classPrivateFieldGet(this, _Renderer_scale, "f"));
                        __classPrivateFieldGet(this, _Renderer_roll, "f").strokeText(noteName, bl + bw / 2, drawHeight + fontSize);
                        __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = '#ffff20';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").fillText(noteName, bl + bw / 2, drawHeight + fontSize);
                    }
                }
            }
        }
        if (settings.isShowingOctaveLines) {
            this.drawOctaveLines(drawHeight);
        }
        if (__classPrivateFieldGet(this, _Renderer_lastVlinesOn, "f") !== settings.isShowingOctaveLines) {
            __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
            __classPrivateFieldSet(this, _Renderer_lastVlinesOn, settings.isShowingOctaveLines, "f");
        }
        // Base line.
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = rgbToStr(__classPrivateFieldGet(this, _Renderer_BAR_BASE_LINE_COLOR, "f"));
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), __classPrivateFieldGet(this, _Renderer_W, "f"), -__classPrivateFieldGet(this, _Renderer_BAR_SUB_LINE_WIDTH, "f"));
    }
    flip() {
        __classPrivateFieldGet(this, _Renderer_bar2, "f").drawImage(__classPrivateFieldGet(this, _Renderer_cbar, "f"), 0, 0);
        if (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f")) {
            __classPrivateFieldGet(this, _Renderer_roll2, "f").drawImage(__classPrivateFieldGet(this, _Renderer_croll, "f"), 0, 0);
        }
    }
    toggleMute() {
        $('#canvases').toggle();
    }
    show() {
        $('#canvases').show();
    }
    toggleRollFrozen() {
        __classPrivateFieldSet(this, _Renderer_rollFrozen, !__classPrivateFieldGet(this, _Renderer_rollFrozen, "f"), "f");
        this.flip();
    }
    get isRollFrozen() {
        return __classPrivateFieldGet(this, _Renderer_rollFrozen, "f");
    }
    get isVideoMuted() {
        return $('#canvases').css('display') === 'none';
    }
    drawExtraLine(type) {
        var _a;
        __classPrivateFieldSet(this, _Renderer_extraLineType, Math.max(__classPrivateFieldGet(this, _Renderer_extraLineType, "f"), type), "f");
        __classPrivateFieldSet(this, _Renderer_needsAnimation, true, "f");
        (_a = __classPrivateFieldGet(this, _Renderer_onRequestAnimation, "f")) === null || _a === void 0 ? void 0 : _a.call(this);
    }
}
_Renderer_scale = new WeakMap(), _Renderer_BAR_SUB_LINE_WIDTH = new WeakMap(), _Renderer_BAR_BASE_LINE_COLOR = new WeakMap(), _Renderer_W = new WeakMap(), _Renderer_H = new WeakMap(), _Renderer_BAR_H = new WeakMap(), _Renderer_ROLL_H = new WeakMap(), _Renderer_MIN_NOTE = new WeakMap(), _Renderer_MAX_NOTE = new WeakMap(), _Renderer_cbar = new WeakMap(), _Renderer_bar = new WeakMap(), _Renderer_croll = new WeakMap(), _Renderer_roll = new WeakMap(), _Renderer_cbar2 = new WeakMap(), _Renderer_bar2 = new WeakMap(), _Renderer_croll2 = new WeakMap(), _Renderer_roll2 = new WeakMap(), _Renderer_rollFrozen = new WeakMap(), _Renderer_drewOffLine = new WeakMap(), _Renderer_currentFrame = new WeakMap(), _Renderer_lastDrawFrame = new WeakMap(), _Renderer_subpixelScroll = new WeakMap(), _Renderer_lastDrawY = new WeakMap(), _Renderer_lastPedalColorInt = new WeakMap(), _Renderer_lastVlinesOn = new WeakMap(), _Renderer_lastNoteNameDrawFrame = new WeakMap(), _Renderer_needsAnimation = new WeakMap(), _Renderer_extraLineType = new WeakMap(), _Renderer_EXTRA_LINE_COLORS = new WeakMap(), _Renderer_EXTRA_LINE_HEIGHT = new WeakMap(), _Renderer_EXTRA_LINE_DASH = new WeakMap(), _Renderer_status = new WeakMap(), _Renderer_getSettings = new WeakMap(), _Renderer_onRequestAnimation = new WeakMap(), _Renderer_tonalOverride = new WeakMap(), _Renderer_instances = new WeakSet(), _Renderer_barAreaChanged = function _Renderer_barAreaChanged() {
    __classPrivateFieldSet(this, _Renderer_lastDrawFrame, __classPrivateFieldGet(this, _Renderer_currentFrame, "f"), "f");
    __classPrivateFieldSet(this, _Renderer_lastDrawY, 0, "f");
};
//# sourceMappingURL=renderer.js.map