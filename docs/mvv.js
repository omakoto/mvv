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
var _Renderer_BAR_SUB_LINE_WIDTH, _Renderer_BAR_BASE_LINE_COLOR, _Renderer_ROLL_SCROLL_AMOUNT, _Renderer_W, _Renderer_H, _Renderer_BAR_H, _Renderer_ROLL_H, _Renderer_MIN_NOTE, _Renderer_MAX_NOTE, _Renderer_cbar, _Renderer_bar, _Renderer_croll, _Renderer_roll, _Renderer_cbar2, _Renderer_bar2, _Renderer_croll2, _Renderer_roll2, _Renderer_rollFrozen, _Renderer_drewOffLine, _MidiRenderingStatus_tick, _MidiRenderingStatus_notes, _MidiRenderingStatus_pedal, _MidiRenderingStatus_sostenuto, _MidiRenderingStatus_onNoteCount, _MidiRenderingStatus_offNoteCount, _MidiOutputManager_device, _Recorder_instances, _Recorder_events, _Recorder_state, _Recorder_recordingStartTimestamp, _Recorder_playbackStartTimestamp, _Recorder_playbackTimeAdjustment, _Recorder_pauseStartTimestamp, _Recorder_nextPlaybackIndex, _Recorder_lastEventTimestamp, _Recorder_isDirty, _Recorder_startRecording, _Recorder_stopRecording, _Recorder_startPlaying, _Recorder_stopPlaying, _Recorder_getPausingDuration, _Recorder_getCurrentPlaybackTimestamp, _Recorder_moveUpToTimestamp, _Coordinator_instances, _Coordinator_now, _Coordinator_nextSecond, _Coordinator_frames, _Coordinator_flips, _Coordinator_playbackTicks, _Coordinator_efps, _Coordinator_wakelock, _Coordinator_wakelockTimer, _Coordinator_timestamp, _Coordinator_noteDisplay, _Coordinator_useSharp, _Coordinator_showVines, _Coordinator_ignoreRepeatedRewindKey, _Coordinator_lastRewindPressTime, _Coordinator_onRewindPressed, _Coordinator_normalizeMidiEvent, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, _Coordinator_animationFrameId, _Coordinator_updateTimestamp, _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp;
;
const LOW_PERF_MODE = parseInt("0" + (new URLSearchParams(window.location.search)).get("lp")) != 0;
if (!LOW_PERF_MODE) {
    console.log("Low-perf is disabled. Use https://omakoto.github.io/mvv/?lp=1 to enable low-perf mode for slow devices");
}
const SCALE_ARG = parseFloat("0" + (new URLSearchParams(window.location.search)).get("scale"));
const SCALE = SCALE_ARG > 0 ? SCALE_ARG : window.devicePixelRatio;
console.log("Scale: " + SCALE);
const PLAYBACK_RESOLUTION_ARG = parseInt("0" + (new URLSearchParams(window.location.search)).get("pres"));
const PLAYBACK_RESOLUTION = PLAYBACK_RESOLUTION_ARG > 0 ? PLAYBACK_RESOLUTION_ARG : LOW_PERF_MODE ? 60 : 120;
const NOTES_COUNT = 128;
const WAKE_LOCK_MILLIS = 5 * 60 * 1000; // 5 minutes
// const WAKE_LOCK_MILLIS = 3000; // for testing
// We set some styles in JS.
const BAR_RATIO = 0.3; // Bar : Roll height
const FPS = 60; // This is now only used for the FPS counter display, not for timing the loop.
// Common values
const RGB_BLACK = [0, 0, 0];
// Dark yellow color for octave lines
const RGB_OCTAVE_LINES = [50, 50, 0];
// Utility functions
function int(v) {
    return Math.floor(v);
}
function s(v) {
    return int(v * SCALE);
}
function hsvToRgb(h, s, v) {
    let r = 0, g = 0, b = 0, i, f, p, q, t;
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0:
            r = v, g = t, b = p;
            break;
        case 1:
            r = q, g = v, b = p;
            break;
        case 2:
            r = p, g = v, b = t;
            break;
        case 3:
            r = p, g = q, b = v;
            break;
        case 4:
            r = t, g = p, b = v;
            break;
        case 5:
            r = v, g = p, b = q;
            break;
    }
    return [
        Math.round(r * 255),
        Math.round(g * 255),
        Math.round(b * 255)
    ];
}
function rgbToStr(rgb) {
    // special common cases
    if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) {
        return "black";
    }
    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
}
// Return the current time in "yyyy-mm-dd-hh-mm-ss.mmm" format, which is used for
// midi filenames.
function getCurrentTime() {
    const nowUtc = new Date();
    const nowLocal = new Date(nowUtc.getTime() - (nowUtc.getTimezoneOffset() * 60 * 1000));
    let ret = nowLocal.toISOString();
    return ret.replace("Z", "").replaceAll(/[:T]/g, "-").replace(/\..*$/, "");
}
// Logic
class Renderer {
    static getCanvas(name) {
        let canvas = document.getElementById(name);
        let context = canvas.getContext("2d");
        return [canvas, context];
    }
    constructor() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        _Renderer_BAR_SUB_LINE_WIDTH.set(this, s(2));
        _Renderer_BAR_BASE_LINE_COLOR.set(this, [200, 255, 200]);
        _Renderer_ROLL_SCROLL_AMOUNT.set(this, s(4));
        _Renderer_W.set(this, void 0); // Width in canvas pixels
        _Renderer_H.set(this, void 0); // Height in canvas pixels
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
        // Adjust CSS with the constants.
        $("#bar2").css("height", (BAR_RATIO * 100) + "%");
        $("#roll2").css("height", (100 - BAR_RATIO * 100) + "%");
        __classPrivateFieldSet(this, _Renderer_W, s(screen.width), "f");
        __classPrivateFieldSet(this, _Renderer_H, s(screen.height), "f");
        __classPrivateFieldSet(this, _Renderer_BAR_H, int(__classPrivateFieldGet(this, _Renderer_H, "f") * BAR_RATIO), "f");
        __classPrivateFieldSet(this, _Renderer_ROLL_H, __classPrivateFieldGet(this, _Renderer_H, "f") - __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), "f");
        _a = this, _b = this, [({ set value(_j) { __classPrivateFieldSet(_a, _Renderer_cbar, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_b, _Renderer_bar, _j, "f"); } }).value] = Renderer.getCanvas("bar");
        _c = this, _d = this, [({ set value(_j) { __classPrivateFieldSet(_c, _Renderer_cbar2, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_d, _Renderer_bar2, _j, "f"); } }).value] = Renderer.getCanvas("bar2");
        _e = this, _f = this, [({ set value(_j) { __classPrivateFieldSet(_e, _Renderer_croll, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_f, _Renderer_roll, _j, "f"); } }).value] = Renderer.getCanvas("roll");
        _g = this, _h = this, [({ set value(_j) { __classPrivateFieldSet(_g, _Renderer_croll2, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_h, _Renderer_roll2, _j, "f"); } }).value] = Renderer.getCanvas("roll2");
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
    }
    getBarColor(velocity) {
        let MAX_H = 0.4;
        let h = MAX_H - (MAX_H * velocity / 127);
        let s = 0.9;
        let l = 1;
        return hsvToRgb(h, s, l);
    }
    getOnColor(count) {
        let h = Math.max(0, 0.2 - count * 0.03);
        let s = Math.min(1, 0.3 + 0.2 * count);
        let l = Math.min(1, 0.4 + 0.2 * count);
        return hsvToRgb(h, s, l);
    }
    getPedalColor(value) {
        if (value <= 0) {
            return RGB_BLACK;
        }
        let h = 0.65 - (0.2 * value / 127);
        let s = 0.7;
        let l = 0.2;
        return hsvToRgb(h, s, l);
    }
    getSostenutoPedalColor(value) {
        if (value <= 0) {
            return RGB_BLACK;
        }
        // Dark Brown: H=~30deg (0.08), S=~0.66, V=~0.4
        // We will vary the value (brightness) based on the pedal depth.
        const h = 0.16;
        const s = 0.96;
        const v = 0.15 + (0.25 * value / 127); // from 0.15 to 0.4
        return hsvToRgb(h, s, v);
    }
    mixRgb(rgb1, rgb2) {
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
    drawSubLine(percent) {
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = rgbToStr(this.getBarColor(127 * (1 - percent)));
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, __classPrivateFieldGet(this, _Renderer_BAR_H, "f") * percent, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_BAR_SUB_LINE_WIDTH, "f"));
    }
    // Draws vertical lines between octaves (B to C).
    drawOctaveLines() {
        __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(RGB_OCTAVE_LINES);
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle;
        const OCTAVE_LINE_WIDTH = 2; // Width of the octave line
        // Iterate through notes to find octave boundaries (B notes)
        // MIDI notes 0-127. C0 is MIDI 12, B0 is MIDI 23, C1 is MIDI 24 etc.
        // We want to draw a line *before* each C note (which means after each B note)
        // So, we draw at note indices 11, 23, 35, ..., 107
        for (let i = __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f"); i <= __classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f"); i++) {
            // Check if the current note is a B note (MIDI % 12 === 11)
            // Or more precisely, the line should appear after the B and before the C of the next octave.
            // So, for each C note (MIDI % 12 === 0), draw a line just before it.
            if (i % 12 === 0 && i > __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f")) { // Only for C notes, and not the very first note
                // Calculate the x position for the line.
                // This will be at the left edge of the C note's visual block.
                const x = __classPrivateFieldGet(this, _Renderer_W, "f") * (i - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f")) / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1);
                // Draw the vertical line
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, __classPrivateFieldGet(this, _Renderer_ROLL_H, "f"));
                // Hack -- draw the lines three times in #bar.
                // Without this, the lines in #roll would look thicker because
                // when we scroll it, we just draw itself on top of it with a slight
                // offset, which would accumulate the subpixel artifacts.
                // (or something like that.)
                __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"));
                __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"));
                __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"));
            }
        }
    }
    onDraw() {
        // Scroll the roll.
        __classPrivateFieldGet(this, _Renderer_roll, "f").drawImage(__classPrivateFieldGet(this, _Renderer_croll, "f"), 0, __classPrivateFieldGet(this, _Renderer_ROLL_SCROLL_AMOUNT, "f"));
        const sustainColor = this.getPedalColor(midiRenderingStatus.pedal);
        const sostenutoColor = this.getSostenutoPedalColor(midiRenderingStatus.sostenuto);
        const pedalColor = this.mixRgb(sustainColor, sostenutoColor);
        __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(pedalColor);
        __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_ROLL_SCROLL_AMOUNT, "f"));
        // Clear the bar area.
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = 'black';
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_H, "f"));
        // Individual bar width
        let bw = __classPrivateFieldGet(this, _Renderer_W, "f") / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1) - 1;
        // "Off" line
        if (midiRenderingStatus.offNoteCount > 0) {
            // We don't highlight off lines. Always same color.
            // However, if we draw two off lines in a raw, it'll look brighter,
            // so avoid doing so.
            if (!__classPrivateFieldGet(this, _Renderer_drewOffLine, "f")) {
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = "#008040";
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, __classPrivateFieldGet(this, _Renderer_ROLL_SCROLL_AMOUNT, "f") - s(2), __classPrivateFieldGet(this, _Renderer_W, "f"), s(2));
            }
            __classPrivateFieldSet(this, _Renderer_drewOffLine, true, "f");
        }
        else {
            __classPrivateFieldSet(this, _Renderer_drewOffLine, false, "f");
        }
        // "On" line
        if (midiRenderingStatus.onNoteCount > 0) {
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(this.getOnColor(midiRenderingStatus.onNoteCount));
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, __classPrivateFieldGet(this, _Renderer_ROLL_SCROLL_AMOUNT, "f") - s(2), __classPrivateFieldGet(this, _Renderer_W, "f"), s(2));
        }
        // Sub lines.
        this.drawSubLine(0.25);
        this.drawSubLine(0.5);
        this.drawSubLine(0.7);
        for (let i = __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f"); i <= __classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f"); i++) {
            let note = midiRenderingStatus.getNote(i);
            if (!note[0]) {
                continue;
            }
            let color = this.getBarColor(note[1]);
            let colorStr = rgbToStr(color);
            // bar left
            let bl = __classPrivateFieldGet(this, _Renderer_W, "f") * (i - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f")) / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1);
            // bar height
            let bh = __classPrivateFieldGet(this, _Renderer_BAR_H, "f") * note[1] / 127;
            __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = colorStr;
            __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(bl, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), bw, -bh);
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = colorStr;
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(bl, 0, bw, __classPrivateFieldGet(this, _Renderer_ROLL_SCROLL_AMOUNT, "f"));
        }
        if (coordinator.isShowingVlines) {
            // Draw octave lines.
            this.drawOctaveLines();
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
    }
    get isRollFrozen() {
        return __classPrivateFieldGet(this, _Renderer_rollFrozen, "f");
    }
    get isVideoMuted() {
        return $('#canvases').css('display') === 'none';
    }
}
_Renderer_BAR_SUB_LINE_WIDTH = new WeakMap(), _Renderer_BAR_BASE_LINE_COLOR = new WeakMap(), _Renderer_ROLL_SCROLL_AMOUNT = new WeakMap(), _Renderer_W = new WeakMap(), _Renderer_H = new WeakMap(), _Renderer_BAR_H = new WeakMap(), _Renderer_ROLL_H = new WeakMap(), _Renderer_MIN_NOTE = new WeakMap(), _Renderer_MAX_NOTE = new WeakMap(), _Renderer_cbar = new WeakMap(), _Renderer_bar = new WeakMap(), _Renderer_croll = new WeakMap(), _Renderer_roll = new WeakMap(), _Renderer_cbar2 = new WeakMap(), _Renderer_bar2 = new WeakMap(), _Renderer_croll2 = new WeakMap(), _Renderer_roll2 = new WeakMap(), _Renderer_rollFrozen = new WeakMap(), _Renderer_drewOffLine = new WeakMap();
const renderer = new Renderer();
class MidiRenderingStatus {
    constructor() {
        _MidiRenderingStatus_tick.set(this, 0);
        _MidiRenderingStatus_notes.set(this, []); // note on/off, velocity, last on-tick
        _MidiRenderingStatus_pedal.set(this, 0);
        _MidiRenderingStatus_sostenuto.set(this, 0);
        _MidiRenderingStatus_onNoteCount.set(this, 0);
        _MidiRenderingStatus_offNoteCount.set(this, 0);
        this.reset();
    }
    onMidiMessage(ev) {
        var _a, _b;
        let status = ev.status;
        let data1 = ev.data1;
        let data2 = ev.data2;
        if (ev.isNoteOn) { // Note on
            __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCount, // Note on
            (_a = __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCount, "f"), _a++, _a), "f");
            let ar = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1];
            ar[0] = true;
            ar[1] = data2;
            ar[2] = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
        }
        else if ((status === 128) || (status === 144 && data2 === 0)) { // Note off
            __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCount, // Note off
            (_b = __classPrivateFieldGet(this, _MidiRenderingStatus_offNoteCount, "f"), _b++, _b), "f");
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1][0] = false;
        }
        else if (status === 176) { // Control Change
            switch (data1) {
                case 64: // Damper pedal (sustain)
                case 11: // Expression
                    __classPrivateFieldSet(this, _MidiRenderingStatus_pedal, data2, "f");
                    break;
                case 66: // Sostenuto pedal
                    __classPrivateFieldSet(this, _MidiRenderingStatus_sostenuto, data2, "f");
                    break;
            }
        }
    }
    reset() {
        __classPrivateFieldSet(this, _MidiRenderingStatus_tick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_notes, [], "f");
        for (let i = 0; i < NOTES_COUNT; i++) {
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[i] = [false, 0, -99999]; // note on/off, velocity, last note on tick
        }
        __classPrivateFieldSet(this, _MidiRenderingStatus_pedal, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_sostenuto, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCount, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCount, 0, "f");
    }
    afterDraw(_now) {
        var _a;
        __classPrivateFieldSet(this, _MidiRenderingStatus_tick, (_a = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f"), _a++, _a), "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCount, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCount, 0, "f");
    }
    get onNoteCount() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCount, "f");
    }
    get offNoteCount() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_offNoteCount, "f");
    }
    get pedal() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_pedal, "f");
    }
    get sostenuto() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_sostenuto, "f");
    }
    getNote(noteIndex) {
        let ar = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
        if (ar[0]) {
            // Note on
            return [true, ar[1]];
        }
        else if ((__classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - ar[2]) < 2) {
            // Recently turned off, still treat it as on
            return [true, ar[1]];
        }
        else {
            return [false, 0];
        }
    }
    /**
     * Returns an array of MIDI note numbers for all notes currently considered "on".
     */
    getPressedNotes() {
        const pressed = [];
        for (let i = 0; i < NOTES_COUNT; i++) {
            const note = this.getNote(i);
            if (note[0]) { // is on
                pressed.push(i);
            }
        }
        return pressed;
    }
}
_MidiRenderingStatus_tick = new WeakMap(), _MidiRenderingStatus_notes = new WeakMap(), _MidiRenderingStatus_pedal = new WeakMap(), _MidiRenderingStatus_sostenuto = new WeakMap(), _MidiRenderingStatus_onNoteCount = new WeakMap(), _MidiRenderingStatus_offNoteCount = new WeakMap();
const midiRenderingStatus = new MidiRenderingStatus();
class MidiOutputManager {
    constructor() {
        _MidiOutputManager_device.set(this, null);
    }
    setMidiOut(device) {
        console.log("MIDI output dev: WebMidi.MIDIOutput set:", device);
        __classPrivateFieldSet(this, _MidiOutputManager_device, device, "f");
        midiOutputManager.reset();
    }
    reset() {
        if (!__classPrivateFieldGet(this, _MidiOutputManager_device, "f")) {
            return;
        }
        if (__classPrivateFieldGet(this, _MidiOutputManager_device, "f").clear) {
            __classPrivateFieldGet(this, _MidiOutputManager_device, "f").clear(); // Chrome doesn't support it yet.
        }
        for (let i = 0; i <= 15; i++) {
            __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([176 + i, 123, 0], 0); // All notes off
            __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([176 + i, 121, 0], 0); // Reset all controllers
        }
        __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([255], 0); // All reset
        // console.log("MIDI reset");
    }
    sendEvent(data, timeStamp) {
        if (!__classPrivateFieldGet(this, _MidiOutputManager_device, "f")) {
            return;
        }
        __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send(data, timeStamp);
    }
}
_MidiOutputManager_device = new WeakMap();
const midiOutputManager = new MidiOutputManager();
var RecorderState;
(function (RecorderState) {
    RecorderState[RecorderState["Idle"] = 0] = "Idle";
    RecorderState[RecorderState["Playing"] = 1] = "Playing";
    RecorderState[RecorderState["Pausing"] = 2] = "Pausing";
    RecorderState[RecorderState["Recording"] = 3] = "Recording";
})(RecorderState || (RecorderState = {}));
class Recorder {
    constructor() {
        _Recorder_instances.add(this);
        _Recorder_events.set(this, []);
        _Recorder_state.set(this, RecorderState.Idle);
        _Recorder_recordingStartTimestamp.set(this, 0);
        _Recorder_playbackStartTimestamp.set(this, 0);
        _Recorder_playbackTimeAdjustment.set(this, 0);
        _Recorder_pauseStartTimestamp.set(this, 0);
        _Recorder_nextPlaybackIndex.set(this, 0);
        _Recorder_lastEventTimestamp.set(this, 0);
        _Recorder_isDirty.set(this, false);
    }
    startRecording() {
        if (this.isRecording) {
            return false;
        }
        this.stopPlaying();
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_startRecording).call(this);
        return true;
    }
    stopRecording() {
        if (!this.isRecording) {
            return false;
        }
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_stopRecording).call(this);
        return true;
    }
    startPlaying() {
        if (!this.isIdle) {
            return false;
        }
        if (!this.isAnythingRecorded) {
            info("Nothing recorded yet");
            return false;
        }
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_startPlaying).call(this);
        return true;
    }
    stopPlaying() {
        if (!(this.isPlaying || this.isPausing)) {
            return false;
        }
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_stopPlaying).call(this);
        return true;
    }
    pause() {
        if (!this.isPlaying) {
            return false;
        }
        __classPrivateFieldSet(this, _Recorder_pauseStartTimestamp, performance.now(), "f");
        __classPrivateFieldSet(this, _Recorder_state, RecorderState.Pausing, "f");
        coordinator.onRecorderStatusChanged();
        return true;
    }
    unpause() {
        if (!this.isPausing) {
            return false;
        }
        // Shift the start timestamp by paused duration.
        const pausedDuration = __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_getPausingDuration).call(this);
        __classPrivateFieldSet(this, _Recorder_playbackStartTimestamp, __classPrivateFieldGet(this, _Recorder_playbackStartTimestamp, "f") + pausedDuration, "f");
        __classPrivateFieldSet(this, _Recorder_state, RecorderState.Playing, "f");
        coordinator.onRecorderStatusChanged();
        return true;
    }
    get isDirty() {
        return __classPrivateFieldGet(this, _Recorder_isDirty, "f") && this.isAnythingRecorded;
    }
    get isIdle() {
        return __classPrivateFieldGet(this, _Recorder_state, "f") === RecorderState.Idle;
    }
    get isRecording() {
        return __classPrivateFieldGet(this, _Recorder_state, "f") === RecorderState.Recording;
    }
    get isPlaying() {
        return __classPrivateFieldGet(this, _Recorder_state, "f") === RecorderState.Playing;
    }
    get isPausing() {
        return __classPrivateFieldGet(this, _Recorder_state, "f") === RecorderState.Pausing;
    }
    get isAnythingRecorded() {
        return __classPrivateFieldGet(this, _Recorder_events, "f").length > 0;
    }
    get isAfterLast() {
        return __classPrivateFieldGet(this, _Recorder_events, "f").length <= __classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f");
    }
    get currentPlaybackTimestamp() {
        return __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_getCurrentPlaybackTimestamp).call(this);
    }
    get lastEventTimestamp() {
        return __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f");
    }
    recordEvent(ev) {
        if (!this.isRecording) {
            return false;
        }
        // Only record certain events.
        switch (ev.status) {
            case 144: // Note on
            case 128: // Note off
            case 176: // Control
                break;
            default:
                return false;
        }
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0) {
            // First event, remember the timestamp.
            __classPrivateFieldSet(this, _Recorder_recordingStartTimestamp, ev.timeStamp, "f");
        }
        const ts = ev.timeStamp - __classPrivateFieldGet(this, _Recorder_recordingStartTimestamp, "f");
        __classPrivateFieldGet(this, _Recorder_events, "f").push(ev.withTimestamp(ts));
        __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, ts, "f");
        return true;
    }
    moveToStart() {
        if (this.isRecording) {
            return;
        }
        // Jump from the current time back to time 0.
        this.adjustPlaybackPosition(-this.currentPlaybackTimestamp);
    }
    /**
     * This is the core seeking method for fast-forward, rewind, and scrubbing.
     * It correctly establishes the state of all MIDI controllers at the destination.
     * @param deltaMilliseconds The amount of time to jump, relative to the current position.
     * @returns `true` if the new position is valid.
     */
    adjustPlaybackPosition(deltaMilliseconds) {
        // This method should not be used when recording.
        if (this.isRecording) {
            return false;
        }
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.pause(); // Pause playback to prevent race conditions during the seek.
        }
        const oldTimestamp = this.currentPlaybackTimestamp;
        let newTimestamp = oldTimestamp + deltaMilliseconds;
        // Clamp the new time to the valid bounds of the recording.
        newTimestamp = Math.max(0, Math.min(newTimestamp, __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f")));
        // Update the internal timekeeping to reflect the jump.
        __classPrivateFieldSet(this, _Recorder_playbackTimeAdjustment, __classPrivateFieldGet(this, _Recorder_playbackTimeAdjustment, "f") + (newTimestamp - oldTimestamp), "f");
        // 1. Reset MIDI devices. This clears any hanging notes or stale controller states.
        midiOutputManager.reset();
        midiRenderingStatus.reset();
        // 2. Calculate the definitive state of all controllers at the new timestamp.
        // To do this, we iterate from the beginning of the recording and store the
        // last seen value for each controller number.
        const controllerState = new Map(); // Map<controller_number, value>
        for (const ev of __classPrivateFieldGet(this, _Recorder_events, "f")) {
            if (ev.timeStamp > newTimestamp) {
                break; // Stop scanning once we've passed our target time.
            }
            if (ev.status === 176) { // It's a Control Change event.
                controllerState.set(ev.data1, ev.data2);
            }
        }
        // 3. Apply the final controller states by sending MIDI CC messages.
        controllerState.forEach((value, controller) => {
            const ccEvent = new MidiEvent(newTimestamp, [176, controller, value]);
            midiRenderingStatus.onMidiMessage(ccEvent); // Update visuals
            midiOutputManager.sendEvent(ccEvent.getDataAsArray(), 0); // Send to MIDI device
        });
        // 4. Find the correct next event to play from the new position.
        // We use a null callback because we have already handled the controller state.
        __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, newTimestamp, null);
        // If playback was active before the seek, resume it.
        if (wasPlaying) {
            this.unpause();
        }
        return this.currentPlaybackTimestamp > 0;
    }
    playbackUpToNow() {
        if (!this.isPlaying) {
            return false;
        }
        // Current timestamp
        let ts = __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_getCurrentPlaybackTimestamp).call(this);
        if (DEBUG) {
            debug(__classPrivateFieldGet(this, _Recorder_playbackStartTimestamp, "f"), performance.now(), __classPrivateFieldGet(this, _Recorder_playbackTimeAdjustment, "f"), __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_getPausingDuration).call(this));
        }
        return __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, ts, (ev) => {
            if (DEBUG) {
                debug("Playback: time=" + int(this.currentPlaybackTimestamp / 1000) +
                    " index=" + (__classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f") - 1), ev);
            }
            midiRenderingStatus.onMidiMessage(ev);
            midiOutputManager.sendEvent(ev.getDataAsArray(), 0);
        });
    }
    download(filename) {
        if (!this.isAnythingRecorded) {
            info("Nothing recorded yet");
            return;
        }
        console.log("Converting to the SMF format...");
        let wr = new SmfWriter();
        let lastTimestamp = __classPrivateFieldGet(this, _Recorder_events, "f")[0].timeStamp;
        __classPrivateFieldGet(this, _Recorder_events, "f").forEach((ev) => {
            debug(ev.timeStamp, ev.getDataAsArray());
            let delta = ev.timeStamp - lastTimestamp;
            wr.writeMessage(delta, ev.getDataAsArray());
            lastTimestamp = ev.timeStamp;
        });
        wr.download(filename);
        __classPrivateFieldSet(this, _Recorder_isDirty, false, "f");
    }
    setEvents(events) {
        this.stopPlaying();
        this.stopRecording();
        __classPrivateFieldSet(this, _Recorder_events, events, "f");
        __classPrivateFieldSet(this, _Recorder_isDirty, false, "f");
        if (events.length === 0) {
            info("File contains no events.");
            __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, 0, "f");
            return;
        }
        const lastEvent = events[events.length - 1];
        __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, lastEvent.timeStamp, "f");
        let message = "Load completed: " + int(lastEvent.timeStamp / 1000) + " seconds, " + events.length + " events";
        info(message);
    }
}
_Recorder_events = new WeakMap(), _Recorder_state = new WeakMap(), _Recorder_recordingStartTimestamp = new WeakMap(), _Recorder_playbackStartTimestamp = new WeakMap(), _Recorder_playbackTimeAdjustment = new WeakMap(), _Recorder_pauseStartTimestamp = new WeakMap(), _Recorder_nextPlaybackIndex = new WeakMap(), _Recorder_lastEventTimestamp = new WeakMap(), _Recorder_isDirty = new WeakMap(), _Recorder_instances = new WeakSet(), _Recorder_startRecording = function _Recorder_startRecording() {
    info("Recording started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Recording, "f");
    __classPrivateFieldSet(this, _Recorder_events, [], "f");
    __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
    coordinator.onRecorderStatusChanged();
}, _Recorder_stopRecording = function _Recorder_stopRecording() {
    info("Recording stopped (" + __classPrivateFieldGet(this, _Recorder_events, "f").length + " events recorded)");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    coordinator.onRecorderStatusChanged();
}, _Recorder_startPlaying = function _Recorder_startPlaying() {
    info("Playback started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Playing, "f");
    __classPrivateFieldSet(this, _Recorder_playbackStartTimestamp, performance.now(), "f");
    // Do not reset playbackTimeAdjustment. It contains the start offset.
    // Find the next event from the current position
    __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
    __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, this.currentPlaybackTimestamp, null);
    coordinator.onRecorderStatusChanged();
}, _Recorder_stopPlaying = function _Recorder_stopPlaying() {
    info("Playback stopped");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    __classPrivateFieldSet(this, _Recorder_playbackTimeAdjustment, 0, "f"); // Reset position to start.
    coordinator.onRecorderStatusChanged();
    coordinator.resetMidi();
}, _Recorder_getPausingDuration = function _Recorder_getPausingDuration() {
    return this.isPausing ? (performance.now() - __classPrivateFieldGet(this, _Recorder_pauseStartTimestamp, "f")) : 0;
}, _Recorder_getCurrentPlaybackTimestamp = function _Recorder_getCurrentPlaybackTimestamp() {
    if (this.isRecording)
        return 0;
    if (this.isIdle)
        return __classPrivateFieldGet(this, _Recorder_playbackTimeAdjustment, "f");
    return (performance.now() - __classPrivateFieldGet(this, _Recorder_playbackStartTimestamp, "f")) +
        __classPrivateFieldGet(this, _Recorder_playbackTimeAdjustment, "f") - __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_getPausingDuration).call(this);
}, _Recorder_moveUpToTimestamp = function _Recorder_moveUpToTimestamp(timeStamp, callback) {
    var _a;
    for (;;) {
        if (this.isAfterLast) {
            // No more events.
            // But do not auto-stop; otherwise it'd be hard to listen to the last part.
            return true;
        }
        let ev = __classPrivateFieldGet(this, _Recorder_events, "f")[__classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f")];
        if (ev.timeStamp > timeStamp) {
            return true;
        }
        __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, (_a = __classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f"), _a++, _a), "f");
        if (callback) {
            callback(ev);
        }
    }
};
const recorder = new Recorder();
class Coordinator {
    constructor() {
        _Coordinator_instances.add(this);
        _Coordinator_now.set(this, 0);
        _Coordinator_nextSecond.set(this, 0);
        _Coordinator_frames.set(this, 0);
        _Coordinator_flips.set(this, 0);
        _Coordinator_playbackTicks.set(this, 0);
        _Coordinator_efps.set(this, void 0);
        _Coordinator_wakelock.set(this, null);
        _Coordinator_wakelockTimer.set(this, 0);
        _Coordinator_timestamp.set(this, void 0);
        _Coordinator_noteDisplay.set(this, void 0);
        _Coordinator_useSharp.set(this, true);
        _Coordinator_showVines.set(this, true);
        _Coordinator_ignoreRepeatedRewindKey.set(this, false);
        _Coordinator_lastRewindPressTime.set(this, 0);
        _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds.set(this, -1);
        _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult.set(this, "");
        // --- START: VSYNC-BASED ANIMATION LOOP ---
        _Coordinator_animationFrameId.set(this, null);
        _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp.set(this, "");
        __classPrivateFieldSet(this, _Coordinator_nextSecond, performance.now() + 1000, "f");
        __classPrivateFieldSet(this, _Coordinator_efps, $("#fps"), "f");
        __classPrivateFieldSet(this, _Coordinator_timestamp, $('#timestamp'), "f");
        __classPrivateFieldSet(this, _Coordinator_noteDisplay, $('#note_display'), "f");
    }
    onKeyDown(ev) {
        debug("onKeyDown", ev.timeStamp, ev.code, ev);
        this.extendWakelock();
        if (ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) {
            return;
        }
        const isRepeat = ev.repeat;
        switch (ev.code) {
            case 'F1':
            case 'Digit1':
                if (isRepeat)
                    break;
                this.toggleVideoMute();
                break;
            case 'F2':
            case 'Digit2':
                if (isRepeat)
                    break;
                this.toggleRollFrozen();
                break;
            case 'KeyF':
                if (isRepeat)
                    break;
                this.toggleFullScreen();
                break;
            case 'Digit3':
                if (isRepeat)
                    break;
                __classPrivateFieldGet(this, _Coordinator_efps, "f").toggle();
                break;
            case 'Digit4':
                if (isRepeat)
                    break;
                this.setSharpMode(!this.isSharpMode);
                this.updateUi();
                break;
            case 'Digit5':
                if (isRepeat)
                    break;
                this.setShowingVlines(!this.isShowingVlines);
                this.updateUi();
                break;
            case 'KeyR':
                if (isRepeat)
                    break;
                this.toggleRecording();
                break;
            case 'KeyS':
                if (isRepeat)
                    break;
                this.downloadRequested();
                break;
            case 'KeyL':
                if (isRepeat)
                    break;
                this.uploadRequested();
                break;
            case 'KeyZ':
                if (isRepeat)
                    break;
                this.stop();
                break;
            case 'KeyT':
                if (isRepeat)
                    break;
                this.moveToStart();
                break;
            case 'Space':
                if (isRepeat)
                    break;
                this.togglePlayback();
                break;
            case 'ArrowLeft':
                __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_onRewindPressed).call(this, isRepeat);
                break;
            case 'ArrowRight':
                if (!recorder.isRecording) {
                    recorder.adjustPlaybackPosition(1000);
                }
                break;
            default:
                return; // Don't prevent the default behavior.
        }
        ev.preventDefault();
    }
    get isSharpMode() {
        return __classPrivateFieldGet(this, _Coordinator_useSharp, "f");
    }
    setSharpMode(useSharp) {
        info("Mode changed to " + (useSharp ? "sharp" : "flat"));
        __classPrivateFieldSet(this, _Coordinator_useSharp, useSharp, "f");
    }
    get isShowingVlines() {
        return __classPrivateFieldGet(this, _Coordinator_showVines, "f");
    }
    setShowingVlines(show) {
        __classPrivateFieldSet(this, _Coordinator_showVines, show, "f");
    }
    toggleVideoMute() {
        info("Toggle video mute");
        renderer.toggleMute();
        this.updateUi();
    }
    toggleRollFrozen() {
        renderer.toggleRollFrozen();
        if (renderer.isRollFrozen) {
            info("Roll frozen");
        }
        this.updateUi();
    }
    toggleRecording() {
        if (recorder.isRecording) {
            recorder.stopRecording();
        }
        else {
            this.startRecording();
        }
        this.updateUi();
    }
    startRecording() {
        if (!recorder.isRecording) {
            this.withOverwriteConfirm(() => recorder.startRecording());
        }
        this.updateUi();
    }
    togglePlayback() {
        if (recorder.isPausing) {
            recorder.unpause();
        }
        else if (recorder.isPlaying) {
            recorder.pause();
        }
        else if (recorder.isIdle) {
            this.startPlayback();
        }
        this.updateUi();
    }
    startPlayback() {
        renderer.show();
        if (recorder.isIdle) {
            recorder.startPlaying();
        }
        else if (recorder.isPausing) {
            recorder.unpause();
        }
        this.updateUi();
    }
    pause() {
        if (recorder.isPlaying) {
            recorder.pause();
        }
        else if (recorder.isPausing) {
            recorder.unpause();
        }
        this.updateUi();
    }
    stop() {
        if (recorder.isRecording) {
            recorder.stopRecording();
        }
        else if (recorder.isPlaying || recorder.isPausing) {
            recorder.stopPlaying();
        }
        this.updateUi();
    }
    moveToStart() {
        if (recorder.isRecording) {
            return;
        }
        recorder.moveToStart();
        this.updateUi();
    }
    moveToPercent(percent) {
        if (recorder.isRecording) {
            return;
        }
        // Allow scrubbing from idle, paused, or playing states.
        const newTime = recorder.lastEventTimestamp * percent;
        const delta = newTime - recorder.currentPlaybackTimestamp;
        recorder.adjustPlaybackPosition(delta);
        this.updateUi();
    }
    toggleFullScreen() {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        }
        else {
            document.exitFullscreen();
        }
    }
    onRecorderStatusChanged() {
        this.updateUi();
    }
    updateUi() {
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateTimestamp).call(this);
        controls.update();
    }
    onMidiMessage(ev) {
        debug("onMidiMessage", ev.timeStamp, ev.data0, ev.data1, ev.data2, ev);
        this.extendWakelock();
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_normalizeMidiEvent).call(this, ev);
        midiRenderingStatus.onMidiMessage(ev);
        if (recorder.isRecording) {
            recorder.recordEvent(ev);
        }
        if (ev.status === 144 || ev.status === 128) {
            this.updateNoteInformation();
        }
    }
    reset() {
        recorder.stopPlaying();
        recorder.stopRecording();
        this.updateUi();
        this.resetMidi();
    }
    resetMidi() {
        midiRenderingStatus.reset();
        midiOutputManager.reset();
    }
    getHumanReadableCurrentPlaybackTimestamp() {
        const totalSeconds = int(recorder.currentPlaybackTimestamp / 1000);
        if (totalSeconds === __classPrivateFieldGet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds, "f")) {
            return __classPrivateFieldGet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, "f");
        }
        if (totalSeconds <= 0) {
            __classPrivateFieldSet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, "0:00", "f");
        }
        else {
            const minutes = int(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            __classPrivateFieldSet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds, totalSeconds, "f");
            __classPrivateFieldSet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, minutes + ":" + (seconds < 10 ? "0" + seconds : seconds), "f");
        }
        return __classPrivateFieldGet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, "f");
    }
    onDraw() {
        var _a;
        // Update FPS counter
        __classPrivateFieldSet(this, _Coordinator_frames, (_a = __classPrivateFieldGet(this, _Coordinator_frames, "f"), _a++, _a), "f");
        let now = performance.now();
        if (now >= __classPrivateFieldGet(this, _Coordinator_nextSecond, "f")) {
            __classPrivateFieldGet(this, _Coordinator_efps, "f").text(__classPrivateFieldGet(this, _Coordinator_flips, "f") + "/" + __classPrivateFieldGet(this, _Coordinator_frames, "f") + "/" + __classPrivateFieldGet(this, _Coordinator_playbackTicks, "f"));
            __classPrivateFieldSet(this, _Coordinator_flips, 0, "f");
            __classPrivateFieldSet(this, _Coordinator_frames, 0, "f");
            __classPrivateFieldSet(this, _Coordinator_playbackTicks, 0, "f");
            __classPrivateFieldSet(this, _Coordinator_nextSecond, __classPrivateFieldGet(this, _Coordinator_nextSecond, "f") + 1000, "f");
            if (__classPrivateFieldGet(this, _Coordinator_nextSecond, "f") < now) {
                __classPrivateFieldSet(this, _Coordinator_nextSecond, now + 1000, "f");
            }
        }
        __classPrivateFieldSet(this, _Coordinator_now, now, "f");
        renderer.onDraw();
        midiRenderingStatus.afterDraw(__classPrivateFieldGet(this, _Coordinator_now, "f"));
    }
    updateNoteInformation() {
        const pressedNotes = midiRenderingStatus.getPressedNotes();
        const noteNames = pressedNotes.map((note) => getNoteFullName(note, __classPrivateFieldGet(this, _Coordinator_useSharp, "f"))).join(' ');
        const chordName = analyzeChord(pressedNotes, __classPrivateFieldGet(this, _Coordinator_useSharp, "f"));
        const text = chordName ? `${noteNames}  [${chordName}]` : noteNames;
        if (text.length > 0) {
            __classPrivateFieldGet(this, _Coordinator_noteDisplay, "f").text(text);
            __classPrivateFieldGet(this, _Coordinator_noteDisplay, "f").stop(true, true).show();
        }
        else {
            __classPrivateFieldGet(this, _Coordinator_noteDisplay, "f").fadeOut(800);
        }
    }
    /**
     * Starts the main animation loop, which is synchronized with the browser's
     * rendering cycle for smooth visuals.
     */
    startAnimationLoop() {
        if (__classPrivateFieldGet(this, _Coordinator_animationFrameId, "f") !== null) {
            // Loop is already running.
            return;
        }
        const loop = () => {
            var _a;
            // #flips is for the FPS counter, representing screen updates.
            __classPrivateFieldSet(this, _Coordinator_flips, (_a = __classPrivateFieldGet(this, _Coordinator_flips, "f"), _a++, _a), "f");
            // Run a playback tick to process MIDI events.
            this.onPlaybackTimer();
            // Draw the current state to the off-screen canvas.
            // This also updates the #frames count for the FPS counter.
            this.onDraw();
            // Copy the off-screen canvas to the visible one.
            renderer.flip();
            // Request the next frame.
            __classPrivateFieldSet(this, _Coordinator_animationFrameId, requestAnimationFrame(loop), "f");
        };
        // Start the loop.
        loop();
    }
    /**
     * Stops the main animation loop.
     */
    stopAnimationLoop() {
        if (__classPrivateFieldGet(this, _Coordinator_animationFrameId, "f") !== null) {
            cancelAnimationFrame(__classPrivateFieldGet(this, _Coordinator_animationFrameId, "f"));
            __classPrivateFieldSet(this, _Coordinator_animationFrameId, null, "f");
        }
    }
    onPlaybackTimer() {
        var _a;
        __classPrivateFieldSet(this, _Coordinator_playbackTicks, (_a = __classPrivateFieldGet(this, _Coordinator_playbackTicks, "f"), _a++, _a), "f");
        if (recorder.isPlaying) {
            recorder.playbackUpToNow();
        }
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateTimestamp).call(this);
    }
    downloadRequested() {
        saveAsBox.open();
    }
    uploadRequested() {
        coordinator.withOverwriteConfirm(() => {
            $('#open_file').trigger('click');
        });
    }
    withOverwriteConfirm(callback) {
        if (recorder.isDirty) {
            confirmBox.show("Discard recording?", () => callback());
        }
        else {
            callback();
        }
    }
    async extendWakelock() {
        // Got the wake lock type definition from:
        // https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/dom-screen-wake-lock
        // npm i @types/dom-screen-wake-lock
        if (__classPrivateFieldGet(this, _Coordinator_wakelock, "f") === null) {
            try {
                __classPrivateFieldSet(this, _Coordinator_wakelock, await navigator.wakeLock.request('screen'), "f");
                __classPrivateFieldGet(this, _Coordinator_wakelock, "f").addEventListener('release', () => {
                    __classPrivateFieldSet(this, _Coordinator_wakelock, null, "f");
                    console.log("Wake lock released by system");
                });
                console.log("Wake lock acquired");
            }
            catch (err) {
                console.log("Failed to acquire wake lock", err);
            }
        }
        if (__classPrivateFieldGet(this, _Coordinator_wakelockTimer, "f") !== null) {
            clearTimeout(__classPrivateFieldGet(this, _Coordinator_wakelockTimer, "f"));
        }
        __classPrivateFieldSet(this, _Coordinator_wakelockTimer, setTimeout(() => {
            if (__classPrivateFieldGet(this, _Coordinator_wakelock, "f") !== null) {
                __classPrivateFieldGet(this, _Coordinator_wakelock, "f").release();
                __classPrivateFieldSet(this, _Coordinator_wakelock, null, "f");
                console.log("Wake lock released");
            }
        }, WAKE_LOCK_MILLIS), "f");
    }
    close() {
        this.stopAnimationLoop();
        recorder.stopPlaying();
        this.resetMidi();
    }
}
_Coordinator_now = new WeakMap(), _Coordinator_nextSecond = new WeakMap(), _Coordinator_frames = new WeakMap(), _Coordinator_flips = new WeakMap(), _Coordinator_playbackTicks = new WeakMap(), _Coordinator_efps = new WeakMap(), _Coordinator_wakelock = new WeakMap(), _Coordinator_wakelockTimer = new WeakMap(), _Coordinator_timestamp = new WeakMap(), _Coordinator_noteDisplay = new WeakMap(), _Coordinator_useSharp = new WeakMap(), _Coordinator_showVines = new WeakMap(), _Coordinator_ignoreRepeatedRewindKey = new WeakMap(), _Coordinator_lastRewindPressTime = new WeakMap(), _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds = new WeakMap(), _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult = new WeakMap(), _Coordinator_animationFrameId = new WeakMap(), _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp = new WeakMap(), _Coordinator_instances = new WeakSet(), _Coordinator_onRewindPressed = function _Coordinator_onRewindPressed(isRepeat) {
    if (recorder.isRecording) {
        return;
    }
    // If non-repeat left is pressed twice within a timeout, move to start.
    if (!isRepeat) {
        const now = performance.now();
        if ((now - __classPrivateFieldGet(this, _Coordinator_lastRewindPressTime, "f")) <= 150) {
            this.moveToStart();
            return;
        }
        __classPrivateFieldSet(this, _Coordinator_lastRewindPressTime, now, "f");
    }
    if (isRepeat && __classPrivateFieldGet(this, _Coordinator_ignoreRepeatedRewindKey, "f")) {
        return;
    }
    if (!isRepeat) {
        __classPrivateFieldSet(this, _Coordinator_ignoreRepeatedRewindKey, false, "f");
    }
    if (!recorder.adjustPlaybackPosition(-1000)) {
        __classPrivateFieldSet(this, _Coordinator_ignoreRepeatedRewindKey, true, "f");
    }
    this.updateUi();
}, _Coordinator_normalizeMidiEvent = function _Coordinator_normalizeMidiEvent(ev) {
    // Allow V25's leftmost knob to be used as the pedal.
    if (ev.device.startsWith("V25")) {
        if (ev.data0 === 176 && ev.data1 === 20) {
            ev.replaceData(1, 64);
        }
        else if (ev.data0 === 176 && ev.data1 === 21) {
            ev.replaceData(1, 66); // sostenuto
        }
    }
}, _Coordinator_updateTimestamp = function _Coordinator_updateTimestamp() {
    if (recorder.isPlaying || recorder.isPausing || (recorder.isIdle && recorder.isAnythingRecorded)) {
        // Update the time indicator
        const timeStamp = this.getHumanReadableCurrentPlaybackTimestamp();
        if (timeStamp != __classPrivateFieldGet(this, _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp, "f")) {
            __classPrivateFieldGet(this, _Coordinator_timestamp, "f").text(timeStamp);
            __classPrivateFieldSet(this, _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp, timeStamp, "f");
        }
        controls.setCurrentPosition(recorder.currentPlaybackTimestamp, recorder.lastEventTimestamp);
    }
    else if (recorder.isRecording) {
        __classPrivateFieldGet(this, _Coordinator_timestamp, "f").text("-");
        controls.setCurrentPosition(0, 0);
    }
    else {
        __classPrivateFieldGet(this, _Coordinator_timestamp, "f").text("0:00");
        controls.setCurrentPosition(0, 0);
    }
};
const coordinator = new Coordinator();
function onMIDISuccess(midiAccess) {
    console.log("onMIDISuccess");
    for (let input of midiAccess.inputs.values()) {
        console.log("Input: ", input);
        input.onmidimessage = (ev) => {
            coordinator.onMidiMessage(MidiEvent.fromNativeEvent(ev));
        };
    }
    for (let output of midiAccess.outputs.values()) {
        console.log("Output: ", output);
        if (!/midi through/i.test(output.name ?? "")) {
            midiOutputManager.setMidiOut(output);
        }
    }
}
function onMIDIFailure() {
    alert('Could not access your MIDI devices.');
}
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
        .then((midiAccess) => {
        // Initial setup of MIDI devices
        onMIDISuccess(midiAccess);
        // Add a listener for when new devices are connected or existing ones are disconnected.
        midiAccess.onstatechange = (event) => {
            console.log("MIDI device state changed: ", event.port.name, event.port.state);
            // Re-run the success handler to refresh the device list.
            onMIDISuccess(midiAccess);
        };
    }, onMIDIFailure);
}
else {
    alert("Your browser doesn't support WebMIDI. (Try Chrome instead.)");
}
const ebody = $('body');
$(window).on('keydown', (ev) => coordinator.onKeyDown(ev.originalEvent));
$("body").on("dragover", function (ev) {
    ev.preventDefault();
});
function loadMidiFile(file) {
    info("loading from: " + file.name);
    coordinator.reset();
    loadMidi(file).then((events) => {
        debug("File loaded", events);
        recorder.setEvents(events);
        coordinator.updateUi();
    }).catch((error) => {
        info("Failed loading from " + file.name + ": " + error);
        console.log(error);
    });
}
let clearCursorTimeout = null;
$("body").on("mousemove", function (_ev) {
    if (clearCursorTimeout !== null) {
        clearTimeout(clearCursorTimeout);
    }
    ebody.css('cursor', 'default');
    clearCursorTimeout = setTimeout(() => {
        ebody.css('cursor', 'none');
    }, 3000);
    coordinator.extendWakelock();
});
$("body").on("drop", function (ev) {
    ev.preventDefault();
    let oev = ev.originalEvent;
    console.log("File dropped", oev.dataTransfer.files[0], oev.dataTransfer);
    coordinator.withOverwriteConfirm(() => {
        loadMidiFile(oev.dataTransfer.files[0]);
    });
});
$("#open_file").on("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) {
        return; // canceled
    }
    console.log("File selected", ev);
    loadMidiFile(file);
});
$('#fullscreen').on('click', (_ev) => {
    coordinator.toggleFullScreen();
});
$('#source').on('click', (_ev) => {
    window.open("https://github.com/omakoto/mvv", "source");
});
$(document).on('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        coordinator.extendWakelock();
    }
});
// By recording the timestamp of the last touch event, we can differentiate
// between a mouse hover and a touch interaction that triggers a hover event.
let lastTouchTime = 0;
document.addEventListener('touchstart', () => {
    lastTouchTime = Date.now();
}, true); // Use capture phase to ensure this listener runs before others.
$(window).on('beforeunload', () => 'Are you sure you want to leave?');
$(window).on('load', () => {
    $('.body').trigger('focus');
    // Initialize jQuery UI tooltips with a custom handler for touch interactions.
    $(document).tooltip({
        // The 'open' event fires just before a tooltip is shown.
        open: function (_event, ui) {
            // The problem on touchscreens is that a "tap" triggers a 'mouseover' event
            // which shows the tooltip, but no 'mouseout' event follows to hide it.
            // This leaves the tooltip "stuck" on the screen.
            // Our solution is to check if a touch event happened very recently.
            // If it did, we assume the tooltip was triggered by a tap, and we
            // set a timer to automatically hide it.
            if (Date.now() - lastTouchTime < 500) { // 500ms is a reasonable threshold
                setTimeout(function () {
                    // We use fadeOut() for a smooth visual effect.
                    // This hides the tooltip element. jQuery UI will create a new one
                    // for the next interaction.
                    $(ui.tooltip).fadeOut('fast');
                }, 1000); // The tooltip will be visible for 1 second.
            }
        },
        // The options below are for a slightly better visual effect and are not
        // essential for the fix itself.
        show: { effect: "fade", duration: 100 },
        hide: { effect: "fade", duration: 100 },
    });
    if (LOW_PERF_MODE) {
        $('#bottom_mask').css('display', 'none');
        $('#bottom_mask_opaque').css('display', 'block');
    }
});
$(window).on('unload', () => {
    coordinator.close();
});
// Start the new vsync-based animation loop.
coordinator.startAnimationLoop();
coordinator.updateUi();
