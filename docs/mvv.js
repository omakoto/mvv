'use strict';
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var _Renderer_instances, _Renderer_BAR_SUB_LINE_WIDTH, _Renderer_BAR_BASE_LINE_COLOR, _Renderer_W, _Renderer_H, _Renderer_BAR_H, _Renderer_ROLL_H, _Renderer_MIN_NOTE, _Renderer_MAX_NOTE, _Renderer_cbar, _Renderer_bar, _Renderer_croll, _Renderer_roll, _Renderer_cbar2, _Renderer_bar2, _Renderer_croll2, _Renderer_roll2, _Renderer_rollFrozen, _Renderer_drewOffLine, _Renderer_currentFrame, _Renderer_lastDrawFrame, _Renderer_subpixelScroll, _Renderer_lastDrawY, _Renderer_lastPedalColorInt, _Renderer_lastVlinesOn, _Renderer_lastNoteNameDrawFrame, _Renderer_needsAnimation, _Renderer_extraLineType, _Renderer_EXTRA_LINE_COLORS, _Renderer_EXTRA_LINE_HEIGHT, _Renderer_EXTRA_LINE_DASH, _Renderer_barAreaChanged, _MidiRenderingStatus_tick, _MidiRenderingStatus_notes, _MidiRenderingStatus_damperPedal, _MidiRenderingStatus_sostenuto, _MidiRenderingStatus_onNoteCountInTick, _MidiRenderingStatus_offNoteCountInTick, _MidiRenderingStatus_lastNoteOnTick, _MidiRenderingStatus_lastNoteOffTick, _MidiOutputManager_device, _a, _MidiOutputDeviceSelector_devices, _MidiOutputDeviceSelector_selectedDeviceName, _MidiOutputDeviceSelector_STORAGE_KEY_OUTPUT_DEVICE, _BpmManager_instances, _BpmManager_options, _BpmManager_bpm, _BpmManager_beats, _BpmManager_subBeats, _BpmManager_intervalSec, _BpmManager_cycle, _BpmManager_posInCycle, _BpmManager_mode, _BpmManager_currentBar, _BpmManager_lastChangedBar, _BpmManager_lastChangedTime, _BpmManager_updateInterval, _Metronome_instances, _Metronome_playing, _Metronome_bpmm, _Metronome_nextTime, _Metronome_synth, _Metronome_beat, _AlwaysRecorder_events, _Recorder_instances, _Recorder_events, _Recorder_state, _Recorder_sections, _Recorder_recordingStartTimestamp, _Recorder_currentPlaybackTimestamp, _Recorder_nextPlaybackIndex, _Recorder_lastEventTimestamp, _Recorder_isDirty, _Recorder_timer, _Recorder_startRecording, _Recorder_stopRecording, _Recorder_startPlaying, _Recorder_stopPlaying, _Recorder_startTimer, _Recorder_stopTimer, _Recorder_moveUpToTimestamp, _Recorder_detectSections, _AudioProcessor_audioContext, _AudioProcessor_workletNode, _Coordinator_instances, _b, _Coordinator_nextFpsMeasureSecond, _Coordinator_frames, _Coordinator_flips, _Coordinator_playbackTicks, _Coordinator_efps, _Coordinator_wakelock, _Coordinator_wakelockTimer, _Coordinator_notes, _Coordinator_chords, _Coordinator_useSharp, _Coordinator_showOctaveLines, _Coordinator_showNoteNames, _Coordinator_scrollSpeedIndex, _Coordinator_playSpeedIndex, _Coordinator_showNoteOffLins, _Coordinator_isHelpVisible, _Coordinator_metronomeOptions, _Coordinator_knownRecorderState, _Coordinator_playbackTimerLastNow, _Coordinator_STORAGE_KEY_USE_SHARP, _Coordinator_STORAGE_KEY_SHOW_VLINES, _Coordinator_STORAGE_KEY_SHOW_NOTE_NAMES, _Coordinator_STORAGE_KEY_SCROLL_SPEED, _Coordinator_STORAGE_KEY_PLAY_SPEED, _Coordinator_STORAGE_KEY_NOTE_OFF_LINES, _Coordinator_STORAGE_KEY_METRONOME_OPTIONS, _Coordinator_setPlaySpeedIndex, _Coordinator_ensureOutputDevice, _Coordinator_ignoreRepeatedRewindKey, _Coordinator_onRewindPressed, _Coordinator_onFastForwardPressed, _Coordinator_normalizeMidiEvent, _Coordinator_updateFps, _Coordinator_updateNoteInformationNoteNamesShown, _Coordinator_updateNoteInformationLastNotes, _Coordinator_arraySame, _Coordinator_animationFrameId;
import { info, debug, DEBUG, toggleDebug } from './util.js';
import { MidiEvent, SmfWriter, loadMidi } from './smf.js';
import { controls } from './controls.js';
import { saveAsBox, confirmBox, metronomeBox, midiOutputBox } from './dialogs.js';
import { getNoteFullName, analyzeChord } from './chords.js';
;
const LOW_PERF_MODE = parseInt("0" + (new URLSearchParams(window.location.search)).get("lp")) !== 0;
if (!LOW_PERF_MODE) {
    console.log(`Low-perf is disabled. Use ${location.origin}${location.pathname}?lp=1 to enable low-perf mode for slow devices`);
}
const SCALE_ARG = parseFloat("0" + (new URLSearchParams(window.location.search)).get("scale"));
const SCALE = SCALE_ARG > 0 ? SCALE_ARG : window.devicePixelRatio;
console.log("Scale: " + SCALE);
const PLAYBACK_RESOLUTION_ARG = parseInt("0" + (new URLSearchParams(window.location.search)).get("pres"));
const PLAYBACK_RESOLUTION_MS = 1000 / (PLAYBACK_RESOLUTION_ARG > 0 ? PLAYBACK_RESOLUTION_ARG : LOW_PERF_MODE ? 60 : 120);
const MAX_FPS = 100;
const FPS_TO_MILLIS = int(1000 / MAX_FPS);
const NOTES_COUNT = 128;
const NOTE_NAME_FRAME_THRESHOLD = 120;
const NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD = 20;
const ALPHA_DECAY_SEC = 0.3; // Notes fade out in 0.5 sec
const WAKE_LOCK_MILLIS = 5 * 60 * 1000; // 5 minutes
// const WAKE_LOCK_MILLIS = 3000; // for testing
// We set some styles in JS.
const BAR_RATIO = 0.15; // Bar : Roll height
// Common values
const RGB_BLACK = [0, 0, 0];
// Dark yellow color for octave lines
const RGB_OCTAVE_LINES = [100, 100, 0];
// Always recording capacity.
const ALWAYS_RECORD_SECONDS = 60 * 20;
const ALWAYS_RECORD_MAX_EVENTS = ALWAYS_RECORD_SECONDS * 100;
// If a note is released within this many ticks, we force its visibility on the UI
// to ensure it's drawn.
const SHORTEST_NOTE_LENGTH = 1;
// If true, simulate drum-style midi input devices, which can be used to
// debug the above SHORTEST_NOTE_LENGTH handling.
// It's not const, so we can flip it at runtime using the debugger.
var SIMULATE_ZERO_LENGTH_NOTES = false;
// Utility functions
function int(v) {
    return Math.floor(v);
}
function s(v) {
    return int(v * SCALE);
}
// Scroll speed.
const ROLL_SCROLL_PX = [s(2), s(4), 0.25, 1];
function getScrollSpeedPx(index) {
    return ROLL_SCROLL_PX[index];
}
function getNextScrollSpeedIndex(index) {
    return (index + 1) % ROLL_SCROLL_PX.length;
}
const PLAY_SPEEDS = [0.125, 0.25, 0.5, 1, 2, 4, 8];
export const DEFAULT_PLAY_SPEED_INDEX = 3;
function getPlaySpeedFactor(index) {
    return PLAY_SPEEDS[index];
}
function getNextPlaySpeedIndex(index) {
    return (index + 1) % PLAY_SPEEDS.length;
}
function getCappedPlayIndex(index) {
    return Math.max(0, Math.min(index, PLAY_SPEEDS.length - 1));
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
function rgbToStr(rgb, alpha = 255) {
    // special common cases
    if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0 && alpha === 255) {
        return "black";
    }
    if (alpha === 255) {
        return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
    }
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + (alpha / 255) + ')';
}
function rgbToInt(rgb) {
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}
// Logic
class Renderer {
    static getCanvas(name) {
        let canvas = document.getElementById(name);
        let context = canvas.getContext("2d");
        return [canvas, context];
    }
    constructor() {
        var _c, _d, _e, _f, _g, _h, _j, _k;
        _Renderer_instances.add(this);
        _Renderer_BAR_SUB_LINE_WIDTH.set(this, s(2));
        _Renderer_BAR_BASE_LINE_COLOR.set(this, [200, 255, 200]);
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
        // Current frame #
        _Renderer_currentFrame.set(this, -1);
        // Last frame # when anything was drawn
        _Renderer_lastDrawFrame.set(this, 0);
        // Keep track of subpixel scroll position.
        _Renderer_subpixelScroll.set(this, 0);
        // Last drawn element Y position.
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
        _Renderer_EXTRA_LINE_HEIGHT.set(this, s(3));
        _Renderer_EXTRA_LINE_DASH.set(this, [__classPrivateFieldGet(this, _Renderer_EXTRA_LINE_HEIGHT, "f") * 4, __classPrivateFieldGet(this, _Renderer_EXTRA_LINE_HEIGHT, "f") * 8]);
        // Adjust CSS with the constants.
        $("#bar2").css("height", (BAR_RATIO * 100) + "%");
        $("#roll2").css("height", (100 - BAR_RATIO * 100) + "%");
        __classPrivateFieldSet(this, _Renderer_W, s(screen.width), "f");
        __classPrivateFieldSet(this, _Renderer_H, s(screen.height), "f");
        __classPrivateFieldSet(this, _Renderer_BAR_H, int(__classPrivateFieldGet(this, _Renderer_H, "f") * BAR_RATIO), "f");
        __classPrivateFieldSet(this, _Renderer_ROLL_H, __classPrivateFieldGet(this, _Renderer_H, "f") - __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), "f");
        _c = this, _d = this, [({ set value(_l) { __classPrivateFieldSet(_c, _Renderer_cbar, _l, "f"); } }).value, ({ set value(_l) { __classPrivateFieldSet(_d, _Renderer_bar, _l, "f"); } }).value] = Renderer.getCanvas("bar");
        _e = this, _f = this, [({ set value(_l) { __classPrivateFieldSet(_e, _Renderer_cbar2, _l, "f"); } }).value, ({ set value(_l) { __classPrivateFieldSet(_f, _Renderer_bar2, _l, "f"); } }).value] = Renderer.getCanvas("bar2");
        _g = this, _h = this, [({ set value(_l) { __classPrivateFieldSet(_g, _Renderer_croll, _l, "f"); } }).value, ({ set value(_l) { __classPrivateFieldSet(_h, _Renderer_roll, _l, "f"); } }).value] = Renderer.getCanvas("roll");
        _j = this, _k = this, [({ set value(_l) { __classPrivateFieldSet(_j, _Renderer_croll2, _l, "f"); } }).value, ({ set value(_l) { __classPrivateFieldSet(_k, _Renderer_roll2, _l, "f"); } }).value] = Renderer.getCanvas("roll2");
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
    drawOctaveLines(drawHeight) {
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
                if (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f")) {
                    __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, drawHeight);
                }
                __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(x, 0, OCTAVE_LINE_WIDTH, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"));
            }
        }
    }
    needsAnimation() {
        return __classPrivateFieldGet(this, _Renderer_needsAnimation, "f") ||
            (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f") && __classPrivateFieldGet(this, _Renderer_lastDrawY, "f") <= (__classPrivateFieldGet(this, _Renderer_ROLL_H, "f") + 64)); // +64 for safety(?) margin
    }
    onDraw(time) {
        var _c;
        var _d;
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
        let bw = __classPrivateFieldGet(this, _Renderer_W, "f") / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1) - 1;
        var drawHeight = 0;
        var scrollPx = coordinator.scrollSpeedPx;
        var scrollFactor = coordinator.scrollSpeedFactor;
        if (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f")) {
            __classPrivateFieldSet(this, _Renderer_subpixelScroll, __classPrivateFieldGet(this, _Renderer_subpixelScroll, "f") + scrollPx, "f");
            const scrollAmount = int(__classPrivateFieldGet(this, _Renderer_subpixelScroll, "f"));
            __classPrivateFieldSet(this, _Renderer_subpixelScroll, __classPrivateFieldGet(this, _Renderer_subpixelScroll, "f") - scrollAmount, "f");
            const hlineHeight = s(2);
            drawHeight = Math.max(scrollAmount, hlineHeight);
            // Scroll the roll.
            if (scrollAmount >= 1) {
                __classPrivateFieldGet(this, _Renderer_roll, "f").drawImage(__classPrivateFieldGet(this, _Renderer_croll, "f"), 0, scrollAmount);
            }
            __classPrivateFieldSet(this, _Renderer_lastDrawY, __classPrivateFieldGet(this, _Renderer_lastDrawY, "f") + scrollAmount, "f");
            // Draw the pedals.
            const sustainColor = this.getPedalColor(midiRenderingStatus.damperPedal);
            const sostenutoColor = this.getSostenutoPedalColor(midiRenderingStatus.sostenuto);
            const pedalColor = this.mixRgb(sustainColor, sostenutoColor);
            const pedalColorInt = rgbToInt(pedalColor);
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(pedalColor);
            __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), drawHeight);
            if (pedalColorInt !== __classPrivateFieldGet(this, _Renderer_lastPedalColorInt, "f")) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldSet(this, _Renderer_lastPedalColorInt, pedalColorInt, "f");
            }
            // "Off" line
            if (midiRenderingStatus.offNoteCountInTick > 0 && coordinator.isShowingNoteOffLines) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                // We don't highlight off lines. Always same color.
                // However, if we draw two off lines in a raw, it'll look brighter,
                // so avoid doing so.
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
            if (midiRenderingStatus.onNoteCountInTick > 0) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(this.getOnColor(midiRenderingStatus.onNoteCountInTick));
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, Math.max(0, drawHeight - hlineHeight), __classPrivateFieldGet(this, _Renderer_W, "f"), hlineHeight);
            }
            // Extra (metronome) line
            if (__classPrivateFieldGet(this, _Renderer_extraLineType, "f") >= 0) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldGet(this, _Renderer_roll, "f").strokeStyle = __classPrivateFieldGet(this, _Renderer_EXTRA_LINE_COLORS, "f")[__classPrivateFieldGet(this, _Renderer_extraLineType, "f")];
                __classPrivateFieldGet(this, _Renderer_roll, "f").setLineDash(__classPrivateFieldGet(this, _Renderer_EXTRA_LINE_DASH, "f"));
                __classPrivateFieldGet(this, _Renderer_roll, "f").lineWidth = __classPrivateFieldGet(this, _Renderer_EXTRA_LINE_HEIGHT, "f");
                __classPrivateFieldGet(this, _Renderer_roll, "f").beginPath();
                __classPrivateFieldGet(this, _Renderer_roll, "f").moveTo(0, drawHeight - __classPrivateFieldGet(this, _Renderer_EXTRA_LINE_HEIGHT, "f"));
                __classPrivateFieldGet(this, _Renderer_roll, "f").lineTo(__classPrivateFieldGet(this, _Renderer_W, "f"), 0);
                __classPrivateFieldGet(this, _Renderer_roll, "f").stroke();
                __classPrivateFieldSet(this, _Renderer_extraLineType, -1, "f");
            }
        }
        const fontSize = bw * 0.9;
        for (let i = __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f"); i <= __classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f"); i++) {
            let n = midiRenderingStatus.getNote(i);
            const on = n.noteOn;
            const velocity = n.velocity;
            // const offDuration = now - ;
            let color = this.getBarColor(velocity);
            const alpha = on ? 255 :
                (255 - (255 * (((time - n.offTime) / 1000.0) / ALPHA_DECAY_SEC)));
            if (alpha <= 0) {
                continue;
            }
            if (!on) {
                // If there's an off-note that's still fading out, we still need animation.
                __classPrivateFieldSet(this, _Renderer_needsAnimation, true, "f");
            }
            let colorStr = rgbToStr(color, alpha);
            // bar left
            let bl = __classPrivateFieldGet(this, _Renderer_W, "f") * (i - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f")) / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1);
            // bar height
            let bh = __classPrivateFieldGet(this, _Renderer_BAR_H, "f") * n.velocity / 127;
            __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = colorStr;
            __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(bl, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), bw, -bh);
            if (!on) {
                continue;
            }
            if (!__classPrivateFieldGet(this, _Renderer_rollFrozen, "f")) {
                __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = colorStr;
                __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(bl, 0, bw, drawHeight);
                // Draw note names for notes that are just pressed.
                if (coordinator.isShowingNoteNames && midiRenderingStatus.isJustPressed(i)) {
                    // But make sure the last note off was old enough (noteOffAge)
                    // or, the last note drawn time (lastDraw) was old enough.
                    const noteOffAge = midiRenderingStatus.getLastNoteOffAgeTick(i);
                    const lastDraw = (_c = __classPrivateFieldGet(this, _Renderer_lastNoteNameDrawFrame, "f")[i]) !== null && _c !== void 0 ? _c : -9999;
                    const sinceLastDraw = __classPrivateFieldGet(this, _Renderer_currentFrame, "f") - lastDraw;
                    if ((noteOffAge > (NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD / scrollFactor))
                        || (sinceLastDraw > (NOTE_NAME_FRAME_THRESHOLD / scrollFactor))) {
                        __classPrivateFieldGet(this, _Renderer_lastNoteNameDrawFrame, "f")[i] = __classPrivateFieldGet(this, _Renderer_currentFrame, "f");
                        const noteName = Tonal.Midi.midiToNoteName(i, { sharps: coordinator.isSharpMode }).slice(0, -1);
                        __classPrivateFieldGet(this, _Renderer_roll, "f").font = '' + fontSize + 'px Roboto, sans-serif';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").textAlign = 'center';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").strokeStyle = 'rgba(0, 0, 0, 0.7)';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").lineWidth = s(5);
                        __classPrivateFieldGet(this, _Renderer_roll, "f").strokeText(noteName, bl + bw / 2, drawHeight + fontSize);
                        __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = '#ffff20';
                        __classPrivateFieldGet(this, _Renderer_roll, "f").fillText(noteName, bl + bw / 2, drawHeight + fontSize);
                    }
                }
            }
        }
        if (coordinator.isShowingOctaveLines) {
            // Draw octave lines.
            this.drawOctaveLines(drawHeight);
        }
        if (__classPrivateFieldGet(this, _Renderer_lastVlinesOn, "f") !== coordinator.isShowingOctaveLines) {
            __classPrivateFieldGet(this, _Renderer_instances, "m", _Renderer_barAreaChanged).call(this);
            __classPrivateFieldSet(this, _Renderer_lastVlinesOn, coordinator.isShowingOctaveLines, "f");
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
        __classPrivateFieldSet(this, _Renderer_extraLineType, Math.max(__classPrivateFieldGet(this, _Renderer_extraLineType, "f"), type), "f");
        __classPrivateFieldSet(this, _Renderer_needsAnimation, true, "f");
        coordinator.startAnimationLoop();
    }
}
_Renderer_BAR_SUB_LINE_WIDTH = new WeakMap(), _Renderer_BAR_BASE_LINE_COLOR = new WeakMap(), _Renderer_W = new WeakMap(), _Renderer_H = new WeakMap(), _Renderer_BAR_H = new WeakMap(), _Renderer_ROLL_H = new WeakMap(), _Renderer_MIN_NOTE = new WeakMap(), _Renderer_MAX_NOTE = new WeakMap(), _Renderer_cbar = new WeakMap(), _Renderer_bar = new WeakMap(), _Renderer_croll = new WeakMap(), _Renderer_roll = new WeakMap(), _Renderer_cbar2 = new WeakMap(), _Renderer_bar2 = new WeakMap(), _Renderer_croll2 = new WeakMap(), _Renderer_roll2 = new WeakMap(), _Renderer_rollFrozen = new WeakMap(), _Renderer_drewOffLine = new WeakMap(), _Renderer_currentFrame = new WeakMap(), _Renderer_lastDrawFrame = new WeakMap(), _Renderer_subpixelScroll = new WeakMap(), _Renderer_lastDrawY = new WeakMap(), _Renderer_lastPedalColorInt = new WeakMap(), _Renderer_lastVlinesOn = new WeakMap(), _Renderer_lastNoteNameDrawFrame = new WeakMap(), _Renderer_needsAnimation = new WeakMap(), _Renderer_extraLineType = new WeakMap(), _Renderer_EXTRA_LINE_COLORS = new WeakMap(), _Renderer_EXTRA_LINE_HEIGHT = new WeakMap(), _Renderer_EXTRA_LINE_DASH = new WeakMap(), _Renderer_instances = new WeakSet(), _Renderer_barAreaChanged = function _Renderer_barAreaChanged() {
    __classPrivateFieldSet(this, _Renderer_lastDrawFrame, __classPrivateFieldGet(this, _Renderer_currentFrame, "f"), "f");
    __classPrivateFieldSet(this, _Renderer_lastDrawY, 0, "f");
};
export const renderer = new Renderer();
class MidiRenderingNoteStatus {
    constructor() {
        this.onTick = 0;
        this.offTick = 0;
        // On timestamp as in MidiEvent.timestamp.
        this.onTime = 0;
        // On timestamp as in MidiEvent.timestamp.
        this.offTime = 0;
        this.reset();
    }
    reset() {
        this.noteOn = false;
        this.velocity = 0;
        this.onTick = -99999;
        this.offTick = -99999;
    }
    copy() {
        var copy = new MidiRenderingNoteStatus();
        Object.assign(copy, this);
        return copy;
    }
}
class MidiRenderingStatus {
    constructor() {
        _MidiRenderingStatus_tick.set(this, 0);
        _MidiRenderingStatus_notes.set(this, []); // on/off, velocity, last on-tick, press timestamp, last off-tick
        _MidiRenderingStatus_damperPedal.set(this, 0);
        _MidiRenderingStatus_sostenuto.set(this, 0);
        _MidiRenderingStatus_onNoteCountInTick.set(this, 0);
        _MidiRenderingStatus_offNoteCountInTick.set(this, 0);
        _MidiRenderingStatus_lastNoteOnTick.set(this, void 0);
        _MidiRenderingStatus_lastNoteOffTick.set(this, void 0);
        this.reset();
    }
    get currentTick() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
    }
    onMidiMessage(ev) {
        var _c, _d;
        let status = ev.status;
        let data1 = ev.data1;
        let data2 = ev.data2;
        if (ev.isNoteOn) {
            let n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1];
            if (n.noteOn) {
                return; // Already on
            }
            __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCountInTick, (_c = __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCountInTick, "f"), _c++, _c), "f");
            n.noteOn = true;
            n.velocity = data2;
            n.note = data1;
            n.onTick = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
            n.onTime = performance.now();
            __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOnTick, __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f"), "f");
        }
        else if (ev.isNoteOff) {
            let n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1];
            if (!n.noteOn) {
                return; // Already on
            }
            __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCountInTick, (_d = __classPrivateFieldGet(this, _MidiRenderingStatus_offNoteCountInTick, "f"), _d++, _d), "f");
            n.noteOn = false;
            n.offTick = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
            n.offTime = performance.now();
            __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOffTick, __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f"), "f");
        }
        else if (status === 176) { // Control Change
            switch (data1) {
                case 64: // Damper pedal (sustain)
                case 11: // Expression // For the digital sax -- show expression as a dumper
                    __classPrivateFieldSet(this, _MidiRenderingStatus_damperPedal, data2, "f");
                    break;
                case 66: // Sostenuto pedal
                    __classPrivateFieldSet(this, _MidiRenderingStatus_sostenuto, data2, "f");
                    break;
            }
        }
        coordinator.startAnimationLoop();
    }
    reset() {
        __classPrivateFieldSet(this, _MidiRenderingStatus_tick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_notes, new Array(NOTES_COUNT), "f");
        for (let i = 0; i < NOTES_COUNT; i++) {
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[i] = new MidiRenderingNoteStatus();
        }
        __classPrivateFieldSet(this, _MidiRenderingStatus_damperPedal, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_sostenuto, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCountInTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCountInTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOnTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOffTick, 0, "f");
    }
    afterDraw(time) {
        var _c;
        __classPrivateFieldSet(this, _MidiRenderingStatus_tick, (_c = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f"), _c++, _c), "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCountInTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCountInTick, 0, "f");
    }
    get onNoteCountInTick() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCountInTick, "f");
    }
    get offNoteCountInTick() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_offNoteCountInTick, "f");
    }
    get damperPedal() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_damperPedal, "f");
    }
    get sostenuto() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_sostenuto, "f");
    }
    getNote(noteIndex) {
        let n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
        if (n.noteOn) {
            // Note on
            return n;
        }
        else if ((__classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - n.onTick) <= SHORTEST_NOTE_LENGTH) {
            // If the note was recently pressed but already released, then
            // make it look like it's still pressed.
            //
            // NOTE: In this case, we don't adjust other properties --
            // namely, the offXxx properties are still newer than
            // the corresponding onXxx properties.
            let copy = n.copy();
            copy.noteOn = true;
            return copy;
        }
        else {
            // Note off
            return n;
        }
    }
    // If the last note-on or off was too close, then requrest redraw.
    needsAnimation() {
        return (__classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - __classPrivateFieldGet(this, _MidiRenderingStatus_lastNoteOnTick, "f")) <= SHORTEST_NOTE_LENGTH ||
            (__classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - __classPrivateFieldGet(this, _MidiRenderingStatus_lastNoteOffTick, "f")) <= SHORTEST_NOTE_LENGTH;
    }
    isJustPressed(noteIndex) {
        const n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
        // A note is "just pressed" if it's on and its on-tick is the current tick.
        // Even if it's already released in the same tick, we still consider it to be
        // "just pressed".
        return n.onTick === __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
    }
    /**
     * Returns info for all notes currently considered "on", including their press timestamp.
     */
    getPressedNotes() {
        const pressed = [];
        for (let i = 0; i < NOTES_COUNT; i++) {
            const n = this.getNote(i);
            if (n.noteOn) {
                pressed.push(n);
            }
        }
        return pressed;
    }
    getLastNoteOffAgeTick(noteIndex) {
        const n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
        return __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - n.offTick;
    }
}
_MidiRenderingStatus_tick = new WeakMap(), _MidiRenderingStatus_notes = new WeakMap(), _MidiRenderingStatus_damperPedal = new WeakMap(), _MidiRenderingStatus_sostenuto = new WeakMap(), _MidiRenderingStatus_onNoteCountInTick = new WeakMap(), _MidiRenderingStatus_offNoteCountInTick = new WeakMap(), _MidiRenderingStatus_lastNoteOnTick = new WeakMap(), _MidiRenderingStatus_lastNoteOffTick = new WeakMap();
export const midiRenderingStatus = new MidiRenderingStatus();
class MidiOutputManager {
    constructor() {
        _MidiOutputManager_device.set(this, null);
    }
    setMidiOut(device) {
        info("Output device set to " + device.name);
        console.log("MIDI output device set to: " + device.name, device);
        __classPrivateFieldSet(this, _MidiOutputManager_device, device, "f");
        midiOutputManager.reset();
    }
    getMidiOut() {
        return __classPrivateFieldGet(this, _MidiOutputManager_device, "f");
    }
    get anyDeviceSelected() {
        return __classPrivateFieldGet(this, _MidiOutputManager_device, "f") !== null;
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
export const midiOutputManager = new MidiOutputManager();
class MidiOutputDeviceSelector {
    constructor() {
        _MidiOutputDeviceSelector_devices.set(this, []);
        _MidiOutputDeviceSelector_selectedDeviceName.set(this, null);
        __classPrivateFieldSet(this, _MidiOutputDeviceSelector_selectedDeviceName, localStorage.getItem(__classPrivateFieldGet(_a, _a, "f", _MidiOutputDeviceSelector_STORAGE_KEY_OUTPUT_DEVICE)), "f");
    }
    setDevices(outputs) {
        __classPrivateFieldSet(this, _MidiOutputDeviceSelector_devices, outputs, "f");
        if (__classPrivateFieldGet(this, _MidiOutputDeviceSelector_selectedDeviceName, "f")) {
            const device = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f").find(d => d.name === __classPrivateFieldGet(this, _MidiOutputDeviceSelector_selectedDeviceName, "f"));
            if (device) {
                midiOutputManager.setMidiOut(device);
                return;
            }
        }
        // Fallback to the first non-"midi through" device
        const device = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f").find(output => { var _c; return !/midi through/i.test((_c = output.name) !== null && _c !== void 0 ? _c : ""); });
        if (device) {
            midiOutputManager.setMidiOut(device);
            return;
        }
        info("No MIDI output devices detected.");
    }
    getDevices() {
        return __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f");
    }
    selectDevice(deviceName) {
        const device = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f").find(d => d.name === deviceName);
        if (device) {
            __classPrivateFieldSet(this, _MidiOutputDeviceSelector_selectedDeviceName, deviceName, "f");
            localStorage.setItem(__classPrivateFieldGet(_a, _a, "f", _MidiOutputDeviceSelector_STORAGE_KEY_OUTPUT_DEVICE), deviceName);
            midiOutputManager.setMidiOut(device);
        }
    }
}
_a = MidiOutputDeviceSelector, _MidiOutputDeviceSelector_devices = new WeakMap(), _MidiOutputDeviceSelector_selectedDeviceName = new WeakMap();
_MidiOutputDeviceSelector_STORAGE_KEY_OUTPUT_DEVICE = { value: 'mvv_outputDevice' };
export const midiOutputDeviceSelector = new MidiOutputDeviceSelector();
export class MetronomeOptions {
    copy() {
        var copy = new MetronomeOptions();
        Object.assign(copy, this);
        return copy;
    }
    static fromJson(json) {
        const obj = JSON.parse(json);
        var copy = new MetronomeOptions();
        Object.assign(copy, obj);
        return copy;
    }
}
class BpmManager {
    constructor(opts) {
        _BpmManager_instances.add(this);
        _BpmManager_options.set(this, void 0);
        _BpmManager_bpm.set(this, 0);
        _BpmManager_beats.set(this, 0);
        _BpmManager_subBeats.set(this, 0);
        _BpmManager_intervalSec.set(this, 0);
        _BpmManager_cycle.set(this, 0);
        _BpmManager_posInCycle.set(this, 0);
        _BpmManager_mode.set(this, 0); // 0 == no increase/decrease, 1 == increasing, 2 == decreasing
        _BpmManager_currentBar.set(this, -1);
        _BpmManager_lastChangedBar.set(this, 0);
        _BpmManager_lastChangedTime.set(this, 0);
        __classPrivateFieldSet(this, _BpmManager_options, opts.copy(), "f");
        __classPrivateFieldSet(this, _BpmManager_bpm, Math.max(10, opts.bpm), "f");
        __classPrivateFieldSet(this, _BpmManager_beats, Math.max(1, opts.beats), "f");
        __classPrivateFieldSet(this, _BpmManager_subBeats, Math.max(1, opts.subBeats), "f");
        if (__classPrivateFieldGet(this, _BpmManager_beats, "f") === __classPrivateFieldGet(this, _BpmManager_subBeats, "f")) {
            __classPrivateFieldSet(this, _BpmManager_subBeats, 1, "f");
        }
        __classPrivateFieldSet(this, _BpmManager_cycle, __classPrivateFieldGet(this, _BpmManager_beats, "f") * __classPrivateFieldGet(this, _BpmManager_subBeats, "f"), "f");
        // Initialize the interval.
        __classPrivateFieldGet(this, _BpmManager_instances, "m", _BpmManager_updateInterval).call(this);
        // Initialize increase / decrease
        if (opts.automaticIncrease && __classPrivateFieldGet(this, _BpmManager_bpm, "f") < opts.increaseMaxBpm) {
            __classPrivateFieldSet(this, _BpmManager_mode, 1, "f");
        }
        else if (opts.automaticDecrease && __classPrivateFieldGet(this, _BpmManager_bpm, "f") > opts.decreaseMinBpm) {
            __classPrivateFieldSet(this, _BpmManager_mode, 2, "f");
        }
        __classPrivateFieldSet(this, _BpmManager_lastChangedTime, performance.now(), "f");
    }
    get options() {
        return __classPrivateFieldGet(this, _BpmManager_options, "f");
    }
    get bpm() {
        return __classPrivateFieldGet(this, _BpmManager_bpm, "f");
    }
    get beats() {
        return __classPrivateFieldGet(this, _BpmManager_beats, "f");
    }
    get subBeats() {
        return __classPrivateFieldGet(this, _BpmManager_subBeats, "f");
    }
    get intervalSec() {
        return __classPrivateFieldGet(this, _BpmManager_intervalSec, "f");
    }
    get cycle() {
        return __classPrivateFieldGet(this, _BpmManager_cycle, "f");
    }
    get posInCycle() {
        return __classPrivateFieldGet(this, _BpmManager_posInCycle, "f");
    }
    adjustTempo(increment) {
        if (increment == 0) {
            return;
        }
        __classPrivateFieldSet(this, _BpmManager_bpm, Math.min(500, Math.max(10, __classPrivateFieldGet(this, _BpmManager_bpm, "f") + increment)), "f");
        __classPrivateFieldGet(this, _BpmManager_instances, "m", _BpmManager_updateInterval).call(this);
        info("Tempo set to " + __classPrivateFieldGet(this, _BpmManager_bpm, "f"));
    }
    advance() {
        var _c, _d;
        var curPos = __classPrivateFieldGet(this, _BpmManager_posInCycle, "f");
        // This is going to be the "next" pos.
        __classPrivateFieldSet(this, _BpmManager_posInCycle, (_c = __classPrivateFieldGet(this, _BpmManager_posInCycle, "f"), _c++, _c), "f");
        if (__classPrivateFieldGet(this, _BpmManager_posInCycle, "f") >= __classPrivateFieldGet(this, _BpmManager_cycle, "f")) {
            __classPrivateFieldSet(this, _BpmManager_posInCycle, 0, "f");
        }
        if (__classPrivateFieldGet(this, _BpmManager_mode, "f") === 0) {
            return; // No increase or decreaes.
        }
        // Handle increase / decrease
        const increasing = __classPrivateFieldGet(this, _BpmManager_mode, "f") === 1;
        if (curPos == 0) {
            __classPrivateFieldSet(this, _BpmManager_currentBar, (_d = __classPrivateFieldGet(this, _BpmManager_currentBar, "f"), _d++, _d), "f");
            if (DEBUG) {
                console.log("Bar=" + __classPrivateFieldGet(this, _BpmManager_currentBar, "f"));
            }
        }
        const now = performance.now();
        const sinceLastChangeBar = __classPrivateFieldGet(this, _BpmManager_currentBar, "f") - __classPrivateFieldGet(this, _BpmManager_lastChangedBar, "f");
        const sinceLastChangeSec = Math.floor((now - __classPrivateFieldGet(this, _BpmManager_lastChangedTime, "f")) / 1000);
        var changed = false;
        if (DEBUG) {
            console.log("Metronome advance: bar=" + __classPrivateFieldGet(this, _BpmManager_currentBar, "f")
                + " posInCycle=" + __classPrivateFieldGet(this, _BpmManager_posInCycle, "f") + " mode=" + __classPrivateFieldGet(this, _BpmManager_mode, "f")
                + " delta bar=" + sinceLastChangeBar + " delta sec=" + sinceLastChangeSec);
        }
        if (increasing) {
            var doIncrease = false;
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterBars > 0 && sinceLastChangeBar >= __classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterBars) {
                doIncrease = true;
            }
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterSeconds > 0 && sinceLastChangeSec >= __classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterSeconds) {
                doIncrease = true;
            }
            if (doIncrease) {
                changed = true;
                __classPrivateFieldSet(this, _BpmManager_bpm, Math.min(__classPrivateFieldGet(this, _BpmManager_bpm, "f") + __classPrivateFieldGet(this, _BpmManager_options, "f").increaseBpm, __classPrivateFieldGet(this, _BpmManager_options, "f").increaseMaxBpm), "f");
                if (__classPrivateFieldGet(this, _BpmManager_bpm, "f") >= __classPrivateFieldGet(this, _BpmManager_options, "f").increaseMaxBpm) {
                    __classPrivateFieldSet(this, _BpmManager_mode, __classPrivateFieldGet(this, _BpmManager_options, "f").automaticDecrease ? 2 : 0, "f");
                }
            }
        }
        else {
            var doDecrease = false;
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterBars > 0 && sinceLastChangeBar >= __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterBars) {
                doDecrease = true;
            }
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterSeconds > 0 && sinceLastChangeSec >= __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterSeconds) {
                doDecrease = true;
            }
            if (doDecrease) {
                changed = true;
                __classPrivateFieldSet(this, _BpmManager_bpm, Math.max(__classPrivateFieldGet(this, _BpmManager_bpm, "f") - __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseBpm, __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseMinBpm), "f");
                if (__classPrivateFieldGet(this, _BpmManager_bpm, "f") <= __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseMinBpm) {
                    __classPrivateFieldSet(this, _BpmManager_mode, __classPrivateFieldGet(this, _BpmManager_options, "f").automaticIncrease ? 1 : 0, "f");
                }
            }
        }
        if (changed) {
            __classPrivateFieldSet(this, _BpmManager_lastChangedBar, __classPrivateFieldGet(this, _BpmManager_currentBar, "f"), "f");
            __classPrivateFieldSet(this, _BpmManager_lastChangedTime, now, "f");
            __classPrivateFieldGet(this, _BpmManager_instances, "m", _BpmManager_updateInterval).call(this);
            const msg = "Tempo changed to " + __classPrivateFieldGet(this, _BpmManager_bpm, "f") + " BPM";
            if (DEBUG) {
                console.log(msg + " mode=" + __classPrivateFieldGet(this, _BpmManager_mode, "f"));
            }
            info(msg);
        }
    }
}
_BpmManager_options = new WeakMap(), _BpmManager_bpm = new WeakMap(), _BpmManager_beats = new WeakMap(), _BpmManager_subBeats = new WeakMap(), _BpmManager_intervalSec = new WeakMap(), _BpmManager_cycle = new WeakMap(), _BpmManager_posInCycle = new WeakMap(), _BpmManager_mode = new WeakMap(), _BpmManager_currentBar = new WeakMap(), _BpmManager_lastChangedBar = new WeakMap(), _BpmManager_lastChangedTime = new WeakMap(), _BpmManager_instances = new WeakSet(), _BpmManager_updateInterval = function _BpmManager_updateInterval() {
    const measureMs = 60000 / (__classPrivateFieldGet(this, _BpmManager_bpm, "f") / __classPrivateFieldGet(this, _BpmManager_beats, "f"));
    __classPrivateFieldSet(this, _BpmManager_intervalSec, (measureMs / __classPrivateFieldGet(this, _BpmManager_cycle, "f")) / 1000.0, "f");
};
class Metronome {
    constructor() {
        _Metronome_instances.add(this);
        _Metronome_playing.set(this, false);
        _Metronome_bpmm.set(this, void 0);
        _Metronome_nextTime.set(this, 0);
        _Metronome_synth.set(this, new Tone.PolySynth(Tone.Synth).toDestination());
    }
    get isPlaying() {
        return __classPrivateFieldGet(this, _Metronome_playing, "f");
    }
    start(opts) {
        if (this.isPlaying) {
            return;
        }
        console.log("Metronome start: options=", opts);
        __classPrivateFieldSet(this, _Metronome_bpmm, new BpmManager(opts), "f");
        __classPrivateFieldSet(this, _Metronome_nextTime, 0, "f");
        Tone.start();
        Tone.Transport.cancel();
        Tone.Transport.seconds = 0;
        Tone.Transport.start();
        Tone.Transport.scheduleOnce((time) => __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_beat).call(this, time), "+0");
        __classPrivateFieldSet(this, _Metronome_playing, true, "f");
    }
    stop() {
        if (!this.isPlaying) {
            return;
        }
        __classPrivateFieldSet(this, _Metronome_playing, false, "f");
        Tone.Transport.stop();
        Tone.Transport.cancel();
    }
    adjustTempo(increment) {
        __classPrivateFieldGet(this, _Metronome_bpmm, "f").adjustTempo(increment);
    }
}
_Metronome_playing = new WeakMap(), _Metronome_bpmm = new WeakMap(), _Metronome_nextTime = new WeakMap(), _Metronome_synth = new WeakMap(), _Metronome_instances = new WeakSet(), _Metronome_beat = function _Metronome_beat(time) {
    // console.log("Beat:", time)
    const bpmm = __classPrivateFieldGet(this, _Metronome_bpmm, "f");
    const pos = bpmm.posInCycle;
    const accent = (pos === 0 && bpmm.beats > 1);
    var lineType = -1;
    if (bpmm.subBeats > 1 && ((pos % bpmm.beats) === 0)) {
        lineType = 2;
        // Use accent on first beat.
        const note = (pos === 0) ? "E6" : "E5";
        __classPrivateFieldGet(this, _Metronome_synth, "f").triggerAttackRelease(note, 0.05, time, 0.8);
    }
    if ((pos % bpmm.subBeats) === 0) {
        lineType = 1;
        // Use accent on first beat, but only if beats > 1.
        const note = accent ? "A5" : "A4";
        __classPrivateFieldGet(this, _Metronome_synth, "f").triggerAttackRelease(note, 0.05, time, 0.8);
    }
    if (accent) {
        lineType = 0; // Force accent color
    }
    if (lineType >= 0) {
        Tone.Draw.schedule(() => {
            renderer.drawExtraLine(lineType);
        }, time);
    }
    // this.#doIncreaseOrDecrease()
    // Schedule the next one.
    bpmm.advance();
    __classPrivateFieldSet(this, _Metronome_nextTime, __classPrivateFieldGet(this, _Metronome_nextTime, "f") + bpmm.intervalSec, "f");
    Tone.Transport.scheduleOnce((time) => __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_beat).call(this, time), __classPrivateFieldGet(this, _Metronome_nextTime, "f"));
};
export const metronome = new Metronome();
function recordFilter(ev) {
    switch (ev.status) {
        case 0x80: // Note off
        case 0x90: // Note on
        case 0xA0: // Poly-aftertouch
        case 0xB0: // Control
        // case 0xC0: // Program change
        case 0xD0: // Channel-aftertouch
        case 0xE0: // Pitch bend
            return true;
    }
    return false;
}
class AlwaysRecorder {
    constructor() {
        _AlwaysRecorder_events.set(this, []);
    }
    recordEvent(ev) {
        if (!recordFilter(ev)) {
            return;
        }
        // Add event with its original timestamp.
        __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").push(ev);
        // Prune old events.
        const cutoffTimestamp = performance.now() - (ALWAYS_RECORD_SECONDS * 1000);
        let i = 0;
        for (; i < __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").length; i++) {
            if (__classPrivateFieldGet(this, _AlwaysRecorder_events, "f")[i].timestamp >= cutoffTimestamp) {
                break;
            }
        }
        if (i > 0) {
            __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").splice(0, i);
        }
        // If we recorded too many events, trim down.
        if (__classPrivateFieldGet(this, _AlwaysRecorder_events, "f").length > ALWAYS_RECORD_MAX_EVENTS) {
            __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").splice(0, ALWAYS_RECORD_MAX_EVENTS / 4);
            console.log("Always recording: trimmed down events to " + __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").length);
        }
    }
    clear() {
        __classPrivateFieldSet(this, _AlwaysRecorder_events, [], "f");
    }
    getEvents() {
        return __classPrivateFieldGet(this, _AlwaysRecorder_events, "f");
    }
    get isAvailable() {
        return __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").length > 0;
    }
}
_AlwaysRecorder_events = new WeakMap();
export const alwaysRecorder = new AlwaysRecorder();
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
        _Recorder_sections.set(this, []);
        _Recorder_recordingStartTimestamp.set(this, 0);
        _Recorder_currentPlaybackTimestamp.set(this, 0);
        _Recorder_nextPlaybackIndex.set(this, 0);
        _Recorder_lastEventTimestamp.set(this, 0);
        _Recorder_isDirty.set(this, false);
        _Recorder_timer.set(this, 0);
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
    startPlaying(pauseRightAway = false) {
        if (!this.isIdle) {
            return false;
        }
        if (!this.isAnythingRecorded) {
            info("Nothing recorded yet");
            return false;
        }
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_startPlaying).call(this, pauseRightAway);
        if (pauseRightAway) {
            this.pause();
        }
        return true;
    }
    startPaused() {
        return this.startPlaying(true);
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
        __classPrivateFieldSet(this, _Recorder_state, RecorderState.Pausing, "f");
        coordinator.onRecorderStatusChanged(__classPrivateFieldGet(this, _Recorder_state, "f"));
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_stopTimer).call(this);
        return true;
    }
    unpause() {
        if (!this.isPausing) {
            return false;
        }
        __classPrivateFieldSet(this, _Recorder_state, RecorderState.Playing, "f");
        coordinator.onRecorderStatusChanged(__classPrivateFieldGet(this, _Recorder_state, "f"));
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_startTimer).call(this);
        return true;
    }
    get currentState() {
        return __classPrivateFieldGet(this, _Recorder_state, "f");
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
    get isBeginning() {
        return __classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f") === 0;
    }
    get isAfterLast() {
        return __classPrivateFieldGet(this, _Recorder_events, "f").length <= __classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f");
    }
    get currentPlaybackTimestamp() {
        return !this.isAnythingRecorded ? 0 : __classPrivateFieldGet(this, _Recorder_currentPlaybackTimestamp, "f");
    }
    get lastEventTimestamp() {
        return !this.isAnythingRecorded ? 0 : __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f");
    }
    get sections() {
        return __classPrivateFieldGet(this, _Recorder_sections, "f");
    }
    recordEvent(ev) {
        if (!this.isRecording) {
            return false;
        }
        // Only record certain events.
        if (!recordFilter(ev)) {
            return false;
        }
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0) {
            // First event, remember the timestamp.
            __classPrivateFieldSet(this, _Recorder_recordingStartTimestamp, ev.timestamp, "f");
        }
        const ts = ev.timestamp - __classPrivateFieldGet(this, _Recorder_recordingStartTimestamp, "f");
        __classPrivateFieldGet(this, _Recorder_events, "f").push(ev.withTimestamp(ts));
        __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, ts, "f");
        return true;
    }
    moveToStart() {
        if (this.isRecording) {
            return;
        }
        this.adjustPlaybackPosition(-999999999);
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
            return;
        }
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.pause(); // Pause playback to prevent race conditions during the seek.
        }
        const oldTimestamp = this.currentPlaybackTimestamp;
        let newTimestamp = oldTimestamp + deltaMilliseconds;
        // Clamp the new time to the valid bounds of the recording.
        newTimestamp = Math.max(0, Math.min(newTimestamp, __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f")));
        // Reset MIDI devices. This clears any hanging notes or stale controller states.
        midiOutputManager.reset();
        midiRenderingStatus.reset();
        // We replay MIDI voice messages except for note on/off (0b1010nnnn (0xAn) - 0b1110nnnn (0xEn)).
        // we store them in this map, where:
        // - key: (data0 << 8) | data1 for control change (e.g. 0b1011nnnn == 0xBn)
        // - key: (data0 << 8) for the other vents.
        const events = new Map();
        for (const ev of __classPrivateFieldGet(this, _Recorder_events, "f")) {
            if (ev.timestamp >= newTimestamp) {
                break; // Stop scanning once we've passed our target time.
            }
            // Skip note on/off, and system messages.
            if (ev.status < 0xA0 || ev.status >= 0xF0) {
                // if (DEBUG) {
                //     debug("Skipping: ", ev.data0, ev.data1, ev.data2);
                // }
                continue;
            }
            if (DEBUG) {
                debug("Storing: ", ev.data0, ev.data1, ev.data2);
            }
            const key = (ev.data0 << 8) | (ev.isCC ? ev.data1 : 0);
            events.set(key, ev);
        }
        // Then, we replay all of them.
        for (const ev of events.values()) {
            if (DEBUG) {
                debug("Replying: ", ev.data0, ev.data1, ev.data2);
            }
            midiRenderingStatus.onMidiMessage(ev); // Update visuals
            midiOutputManager.sendEvent(ev.getDataAsArray(), 0); // Send to MIDI device
        }
        __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, newTimestamp, null);
        // If playback was active before the seek, resume it.
        if (wasPlaying) {
            this.unpause();
        }
    }
    playbackUpToNow(deltaMs) {
        if (!this.isPlaying) {
            return;
        }
        // New timestamp
        let ts = __classPrivateFieldGet(this, _Recorder_currentPlaybackTimestamp, "f") + deltaMs;
        if (DEBUG) {
            // debug(this.#playbackStartTimestamp, performance.now(), this.#playbackTimeAdjustment, this.#getPausingDuration());
        }
        var noteChanged = false;
        const stillPlaying = __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, ts, (ev) => {
            if (DEBUG) {
                // debug("Playback: time=" + int(this.currentPlaybackTimestamp / 1000) +
                //         " index=" + (this.#nextPlaybackIndex - 1), ev);
            }
            midiRenderingStatus.onMidiMessage(ev);
            midiOutputManager.sendEvent(ev.getDataAsArray(), 0);
            if (ev.isNoteOn || ev.isNoteOn) {
                noteChanged = true;
            }
        });
        if (noteChanged) {
            coordinator.updateNoteInformation();
        }
        if (!stillPlaying) {
            this.stopPlaying();
        }
    }
    download(filename) {
        if (!this.isAnythingRecorded) {
            info("Nothing recorded yet");
            return;
        }
        console.log("Converting to the SMF format...");
        let wr = new SmfWriter();
        let lastTimestamp = __classPrivateFieldGet(this, _Recorder_events, "f")[0].timestamp;
        __classPrivateFieldGet(this, _Recorder_events, "f").forEach((ev) => {
            debug(ev.timestamp, ev.getDataAsArray());
            let delta = ev.timestamp - lastTimestamp;
            wr.writeMessage(delta, ev.getDataAsArray());
            lastTimestamp = ev.timestamp;
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
            __classPrivateFieldSet(this, _Recorder_sections, [], "f");
            return;
        }
        const lastEvent = events[events.length - 1];
        __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, lastEvent.timestamp, "f");
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_detectSections).call(this);
        let message = "Load completed: " + int(lastEvent.timestamp / 1000) + " seconds, " + events.length + " events";
        info(message);
        this.moveToStart();
    }
    jumpToNextSection() {
        if (__classPrivateFieldGet(this, _Recorder_sections, "f").length === 0) {
            return;
        }
        const currentTimestamp = this.currentPlaybackTimestamp;
        for (const sectionStart of __classPrivateFieldGet(this, _Recorder_sections, "f")) {
            // Find the first section that starts after the current time.
            // Add a small epsilon (1ms) to handle the case where we are exactly at a section start.
            if (sectionStart > currentTimestamp + 1) {
                this.adjustPlaybackPosition(sectionStart - currentTimestamp);
                return;
            }
        }
    }
    jumpToPreviousSection() {
        if (__classPrivateFieldGet(this, _Recorder_sections, "f").length === 0) {
            return;
        }
        const currentTimestamp = this.currentPlaybackTimestamp;
        const threshold = 500; // 0.5 second
        let currentSectionIndex = -1;
        for (let i = 0; i < __classPrivateFieldGet(this, _Recorder_sections, "f").length; i++) {
            if (__classPrivateFieldGet(this, _Recorder_sections, "f")[i] <= currentTimestamp) {
                currentSectionIndex = i;
            }
            else {
                break;
            }
        }
        if (currentSectionIndex === -1) {
            this.moveToStart();
            return;
        }
        const currentSectionStart = __classPrivateFieldGet(this, _Recorder_sections, "f")[currentSectionIndex];
        if ((currentTimestamp - currentSectionStart) < threshold && currentSectionIndex > 0) {
            // Close to the beginning of the current section, and it's not the first section.
            // Jump to the previous section.
            const previousSectionStart = __classPrivateFieldGet(this, _Recorder_sections, "f")[currentSectionIndex - 1];
            this.adjustPlaybackPosition(previousSectionStart - currentTimestamp);
        }
        else {
            // Jump to the beginning of the current section.
            this.adjustPlaybackPosition(currentSectionStart - currentTimestamp);
        }
    }
    trimBefore() {
        if (this.isRecording) {
            return;
        }
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0 || __classPrivateFieldGet(this, _Recorder_currentPlaybackTimestamp, "f") === 0) {
            info("Nothing to trim.");
            return;
        }
        const trimTimestamp = __classPrivateFieldGet(this, _Recorder_currentPlaybackTimestamp, "f");
        const firstEventIndex = __classPrivateFieldGet(this, _Recorder_events, "f").findIndex(ev => ev.timestamp >= trimTimestamp);
        if (firstEventIndex <= 0) { // -1 means not found, 0 means no events before it
            info("Nothing to trim before the current position.");
            return;
        }
        // Remove events before the trim timestamp
        const trimmedEvents = __classPrivateFieldGet(this, _Recorder_events, "f").splice(0, firstEventIndex);
        info(`Trimmed ${trimmedEvents.length} events.`);
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0) {
            __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, 0, "f");
            __classPrivateFieldSet(this, _Recorder_sections, [], "f");
            __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
            this.moveToStart();
            return;
        }
        // Adjust timestamps
        const offset = __classPrivateFieldGet(this, _Recorder_events, "f")[0].timestamp;
        for (const event of __classPrivateFieldGet(this, _Recorder_events, "f")) {
            event.shiftTime(-offset);
        }
        __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f") - offset, "f");
        __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_detectSections).call(this);
        this.moveToStart(); // Reset playback position
    }
    copyFromAlwaysRecorder(alwaysRecorder) {
        const eventsToCopy = alwaysRecorder.getEvents();
        if (eventsToCopy.length === 0) {
            info("No events in the buffer to copy.");
            return;
        }
        this.stopPlaying();
        this.stopRecording();
        // Normalize timestamps to start from 0
        const firstTimestamp = eventsToCopy[0].timestamp;
        const newEvents = eventsToCopy.map(ev => ev.withTimestamp(ev.timestamp - firstTimestamp));
        this.setEvents(newEvents);
        // Mark as dirty so the user can save it.
        __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
        // Start but paused, so we can move the position.
        this.startPaused();
        // Move to the [last - 3 second] position. 
        this.adjustPlaybackPosition(this.lastEventTimestamp - 3000);
        info("" + newEvents.length + " events ready for replay.");
    }
}
_Recorder_events = new WeakMap(), _Recorder_state = new WeakMap(), _Recorder_sections = new WeakMap(), _Recorder_recordingStartTimestamp = new WeakMap(), _Recorder_currentPlaybackTimestamp = new WeakMap(), _Recorder_nextPlaybackIndex = new WeakMap(), _Recorder_lastEventTimestamp = new WeakMap(), _Recorder_isDirty = new WeakMap(), _Recorder_timer = new WeakMap(), _Recorder_instances = new WeakSet(), _Recorder_startRecording = function _Recorder_startRecording() {
    info("Recording started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Recording, "f");
    __classPrivateFieldSet(this, _Recorder_events, [], "f");
    __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
    coordinator.onRecorderStatusChanged(__classPrivateFieldGet(this, _Recorder_state, "f"));
}, _Recorder_stopRecording = function _Recorder_stopRecording() {
    info("Recording stopped (" + __classPrivateFieldGet(this, _Recorder_events, "f").length + " events recorded)");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_detectSections).call(this);
    coordinator.onRecorderStatusChanged(__classPrivateFieldGet(this, _Recorder_state, "f"));
}, _Recorder_startPlaying = function _Recorder_startPlaying(pauseRightAway = false) {
    info("Playback started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Playing, "f");
    __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, 0, "f"); // Reset position to start.
    __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
    if (!pauseRightAway) {
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_startTimer).call(this);
    }
    coordinator.onRecorderStatusChanged(__classPrivateFieldGet(this, _Recorder_state, "f"));
    coordinator.startAnimationLoop();
}, _Recorder_stopPlaying = function _Recorder_stopPlaying() {
    info("Playback stopped");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, 0, "f"); // Reset position to start.
    coordinator.resetMidi();
    __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_stopTimer).call(this);
    coordinator.onRecorderStatusChanged(__classPrivateFieldGet(this, _Recorder_state, "f"));
}, _Recorder_startTimer = function _Recorder_startTimer() {
    if (__classPrivateFieldGet(this, _Recorder_timer, "f") === 0) {
        __classPrivateFieldSet(this, _Recorder_timer, setInterval(() => {
            coordinator.onPlaybackTimer();
        }, PLAYBACK_RESOLUTION_MS), "f");
        console.log("Timer started");
    }
}, _Recorder_stopTimer = function _Recorder_stopTimer() {
    if (__classPrivateFieldGet(this, _Recorder_timer, "f") !== 0) {
        console.log("Timer stopped");
        clearInterval(__classPrivateFieldGet(this, _Recorder_timer, "f"));
        __classPrivateFieldSet(this, _Recorder_timer, 0, "f");
    }
}, _Recorder_moveUpToTimestamp = function _Recorder_moveUpToTimestamp(timestamp, callback) {
    var _c;
    const limit = __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f") + 5000;
    for (;;) {
        if (this.isAfterLast) {
            if (timestamp > limit) {
                // It's been a while since the last event. Let's stop playing.
                __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, limit, "f");
                return false;
            }
            // Continue playing for a bit, which makes it easier to listen to the last part again.
            __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, timestamp, "f");
            return true;
        }
        let ev = __classPrivateFieldGet(this, _Recorder_events, "f")[__classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f")];
        if (ev.timestamp >= timestamp) {
            __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, timestamp, "f");
            return true;
        }
        __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, (_c = __classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f"), _c++, _c), "f");
        __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, ev.timestamp, "f");
        if (callback) {
            callback(ev);
        }
    }
}, _Recorder_detectSections = function _Recorder_detectSections() {
    __classPrivateFieldSet(this, _Recorder_sections, [], "f");
    if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0) {
        return;
    }
    // A section starts with a note-on after this duration.
    const silenceThresholdMs = 1500;
    const notesOn = new Set();
    let lastNoteOffTime = 0;
    // Find the first note-on event to start the first section.
    const firstNoteOn = __classPrivateFieldGet(this, _Recorder_events, "f").find(ev => ev.isNoteOn);
    if (firstNoteOn) {
        __classPrivateFieldGet(this, _Recorder_sections, "f").push(firstNoteOn.timestamp);
    }
    else {
        // No note-on events, so no sections.
        return;
    }
    for (const ev of __classPrivateFieldGet(this, _Recorder_events, "f")) {
        if (ev.isNoteOn) {
            if (notesOn.size === 0) { // First note on after silence
                const silenceDuration = ev.timestamp - lastNoteOffTime;
                if (silenceDuration > silenceThresholdMs) {
                    __classPrivateFieldGet(this, _Recorder_sections, "f").push(ev.timestamp);
                }
            }
            notesOn.add(ev.data1);
        }
        else if (ev.isNoteOff) {
            notesOn.delete(ev.data1);
            if (notesOn.size === 0) {
                lastNoteOffTime = ev.timestamp;
            }
        }
    }
    // Make sure sections are unique and sorted.
    __classPrivateFieldSet(this, _Recorder_sections, [...new Set(__classPrivateFieldGet(this, _Recorder_sections, "f"))].sort((a, b) => a - b), "f");
    console.log("Detected " + __classPrivateFieldGet(this, _Recorder_sections, "f").length + " sections: " + __classPrivateFieldGet(this, _Recorder_sections, "f").map(s => (s / 1000).toFixed(1)).join(', '));
};
export const recorder = new Recorder();
class AudioProcessor {
    constructor() {
        _AudioProcessor_audioContext.set(this, null);
        _AudioProcessor_workletNode.set(this, null);
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f")) {
                info("Audio processor already running.");
                return;
            }
            try {
                const stream = yield navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                __classPrivateFieldSet(this, _AudioProcessor_audioContext, new (window.AudioContext || window.webkitAudioContext)(), "f");
                yield __classPrivateFieldGet(this, _AudioProcessor_audioContext, "f").audioWorklet.addModule('attack-processor.js');
                __classPrivateFieldSet(this, _AudioProcessor_workletNode, new AudioWorkletNode(__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f"), 'attack-processor'), "f");
                __classPrivateFieldGet(this, _AudioProcessor_workletNode, "f").port.onmessage = (event) => {
                    if (event.data.type === 'attack') {
                        renderer.drawExtraLine(3);
                    }
                };
                const source = __classPrivateFieldGet(this, _AudioProcessor_audioContext, "f").createMediaStreamSource(stream);
                source.connect(__classPrivateFieldGet(this, _AudioProcessor_workletNode, "f"));
                __classPrivateFieldGet(this, _AudioProcessor_workletNode, "f").connect(__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f").destination);
                info("Audio recording and analysis started. Press 'i' again to stop.");
            }
            catch (err) {
                console.error("Error starting audio processor:", err);
                info("Could not start audio recording. Please grant microphone permission.");
            }
        });
    }
    stop() {
        if (__classPrivateFieldGet(this, _AudioProcessor_workletNode, "f")) {
            __classPrivateFieldGet(this, _AudioProcessor_workletNode, "f").port.onmessage = null;
            __classPrivateFieldGet(this, _AudioProcessor_workletNode, "f").disconnect();
            __classPrivateFieldSet(this, _AudioProcessor_workletNode, null, "f");
        }
        if (__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f")) {
            __classPrivateFieldGet(this, _AudioProcessor_audioContext, "f").close().then(() => {
                __classPrivateFieldSet(this, _AudioProcessor_audioContext, null, "f");
                info("Audio recording and analysis stopped.");
            });
        }
    }
    toggle() {
        if (__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f")) {
            this.stop();
        }
        else {
            this.start();
        }
    }
}
_AudioProcessor_audioContext = new WeakMap(), _AudioProcessor_workletNode = new WeakMap();
export const audioProcessor = new AudioProcessor();
class Coordinator {
    constructor() {
        _Coordinator_instances.add(this);
        _Coordinator_nextFpsMeasureSecond.set(this, 0);
        _Coordinator_frames.set(this, 0);
        _Coordinator_flips.set(this, 0);
        _Coordinator_playbackTicks.set(this, 0);
        _Coordinator_efps.set(this, void 0);
        _Coordinator_wakelock.set(this, null);
        _Coordinator_wakelockTimer.set(this, 0);
        _Coordinator_notes.set(this, void 0);
        _Coordinator_chords.set(this, void 0);
        _Coordinator_useSharp.set(this, void 0);
        _Coordinator_showOctaveLines.set(this, void 0);
        _Coordinator_showNoteNames.set(this, void 0);
        _Coordinator_scrollSpeedIndex.set(this, void 0);
        _Coordinator_playSpeedIndex.set(this, void 0);
        _Coordinator_showNoteOffLins.set(this, false);
        _Coordinator_isHelpVisible.set(this, false);
        _Coordinator_metronomeOptions.set(this, void 0);
        _Coordinator_knownRecorderState.set(this, recorder.currentState);
        _Coordinator_playbackTimerLastNow.set(this, void 0);
        _Coordinator_ignoreRepeatedRewindKey.set(this, false);
        _Coordinator_updateNoteInformationNoteNamesShown.set(this, false);
        _Coordinator_updateNoteInformationLastNotes.set(this, []);
        _Coordinator_animationFrameId.set(this, null);
        __classPrivateFieldSet(this, _Coordinator_nextFpsMeasureSecond, performance.now() + 1000, "f");
        __classPrivateFieldSet(this, _Coordinator_efps, $("#fps"), "f");
        __classPrivateFieldSet(this, _Coordinator_notes, $('#notes'), "f");
        __classPrivateFieldSet(this, _Coordinator_chords, $('#chords'), "f");
        // Load settings from localStorage
        const storedSharp = localStorage.getItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_USE_SHARP));
        __classPrivateFieldSet(this, _Coordinator_useSharp, storedSharp === null ? true : storedSharp === 'true', "f");
        const storedVlines = localStorage.getItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_SHOW_VLINES));
        __classPrivateFieldSet(this, _Coordinator_showOctaveLines, storedVlines === null ? true : storedVlines === 'true', "f");
        const storedNoteNames = localStorage.getItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_SHOW_NOTE_NAMES));
        __classPrivateFieldSet(this, _Coordinator_showNoteNames, storedNoteNames === null ? true : storedNoteNames === 'true', "f");
        const storedSpeed = localStorage.getItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_SCROLL_SPEED));
        __classPrivateFieldSet(this, _Coordinator_scrollSpeedIndex, storedSpeed ? parseInt(storedSpeed) : 0, "f");
        const storedPlaySpeed = localStorage.getItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_PLAY_SPEED));
        __classPrivateFieldSet(this, _Coordinator_playSpeedIndex, storedPlaySpeed ? parseInt(storedPlaySpeed) : DEFAULT_PLAY_SPEED_INDEX, "f");
        const noteOffLines = localStorage.getItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_NOTE_OFF_LINES));
        __classPrivateFieldSet(this, _Coordinator_showNoteOffLins, noteOffLines === null ? true : noteOffLines === 'true', "f");
        const storedMetronomeOptions = localStorage.getItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_METRONOME_OPTIONS));
        if (storedMetronomeOptions) {
            let opts = MetronomeOptions.fromJson(storedMetronomeOptions);
            __classPrivateFieldSet(this, _Coordinator_metronomeOptions, opts, "f");
        }
        else {
            let opts = new MetronomeOptions();
            opts.bpm = 120;
            opts.beats = 4;
            opts.subBeats = 1;
            __classPrivateFieldSet(this, _Coordinator_metronomeOptions, opts, "f");
        }
    }
    onKeyDown(ev) {
        debug("onKeyDown", ev.timeStamp, ev.code, ev);
        // Always allow '?' and 'Escape' to control the help screen.
        if (ev.key === '?') { // '?' key
            if (ev.repeat)
                return;
            this.toggleHelpScreen();
            ev.preventDefault();
            return;
        }
        if (ev.code === 'Escape') {
            if (__classPrivateFieldGet(this, _Coordinator_isHelpVisible, "f")) {
                this.toggleHelpScreen();
                ev.preventDefault();
                return;
            }
        }
        // If help is visible, block all other shortcuts.
        if (__classPrivateFieldGet(this, _Coordinator_isHelpVisible, "f")) {
            return;
        }
        this.extendWakelock();
        if (ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) {
            return;
        }
        const isRepeat = ev.repeat;
        switch (ev.code) {
            case 'Digit1':
            case 'F1':
                if (isRepeat)
                    break;
                this.toggleNoteNames();
                this.updateUi();
                break;
            case 'Digit2':
            case 'F2':
                if (isRepeat)
                    break;
                this.setSharpMode(!this.isSharpMode);
                this.updateUi();
                break;
            case 'Digit3':
            case 'F3':
                if (isRepeat)
                    break;
                this.setShowingOctaveLines(!this.isShowingOctaveLines);
                this.updateUi();
                break;
            case 'Digit4':
            case 'F4':
                if (isRepeat)
                    break;
                this.rotateScrollSpeed();
                this.updateUi();
                break;
            case 'Digit5':
            case 'F5':
                if (isRepeat)
                    break;
                this.toggleNoteOffLines();
                this.updateUi();
                break;
            case 'Digit6':
            case 'F6':
                if (isRepeat)
                    break;
                this.toggleVideoMute();
                break;
            case 'Digit7':
            case 'Enter':
            case 'F7':
                if (isRepeat)
                    break;
                this.toggleRollFrozen();
                break;
            case 'Digit9':
            case 'F9':
                if (isRepeat)
                    break;
                __classPrivateFieldGet(this, _Coordinator_efps, "f").toggle();
                this.updateUi();
                break;
            case 'KeyF':
                if (isRepeat)
                    break;
                this.toggleFullScreen();
                break;
            case 'KeyM':
                if (isRepeat)
                    break;
                this.toggleMetronome();
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
            case 'KeyB':
                if (isRepeat)
                    break;
                this.replayFromAlwaysRecordingBuffer();
                break;
            case 'KeyP':
                if (isRepeat)
                    break;
                recorder.jumpToPreviousSection();
                this.updateUi();
                break;
            case 'KeyN':
                if (isRepeat)
                    break;
                recorder.jumpToNextSection();
                this.updateUi();
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
            case 'KeyA':
            case 'Home':
                if (isRepeat)
                    break;
                this.moveToStart();
                break;
            case 'ArrowLeft':
                __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_onRewindPressed).call(this, isRepeat);
                break;
            case 'ArrowRight':
                __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_onFastForwardPressed).call(this, isRepeat);
                break;
            case 'ArrowUp':
                this.shiftPlaySpeed(1);
                break;
            case 'ArrowDown':
                this.shiftPlaySpeed(-1);
                break;
            case 'Digit0':
                this.resetPlaySpeed();
                break;
            case 'KeyV':
                toggleDebug();
                break;
            case 'KeyC':
                alwaysRecorder.clear();
                this.updateUi();
                info("Always recording buffer cleared");
                break;
            case 'KeyX':
                if (isRepeat)
                    break;
                this.trimBefore();
                break;
            case 'KeyD':
                if (isRepeat)
                    break;
                this.showOutputSelector();
                break;
            case 'KeyI':
                if (isRepeat)
                    break;
                audioProcessor.toggle();
                break;
            case 'Equal':
            case 'NumpadAdd':
                // if (isRepeat) break; // allow repeats
                metronome.adjustTempo(5);
                break;
            case 'Minus':
            case 'NumpadMinus':
                // if (isRepeat) break; // allow repeats
                metronome.adjustTempo(-5);
                break;
            default:
                return; // Don't prevent the default behavior.
        }
        ev.preventDefault();
    }
    showOutputSelector() {
        midiOutputBox.open();
    }
    toggleMetronome() {
        if (metronome.isPlaying) {
            metronome.stop();
        }
        else {
            metronomeBox.show(__classPrivateFieldGet(this, _Coordinator_metronomeOptions, "f"), (opts) => {
                __classPrivateFieldSet(this, _Coordinator_metronomeOptions, opts, "f");
                localStorage.setItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_METRONOME_OPTIONS), JSON.stringify(opts));
                metronome.start(opts);
                this.updateUi();
            });
        }
        this.updateUi();
    }
    get isSharpMode() {
        return __classPrivateFieldGet(this, _Coordinator_useSharp, "f");
    }
    setSharpMode(useSharp) {
        info("Mode changed to " + (useSharp ? "sharp" : "flat"));
        __classPrivateFieldSet(this, _Coordinator_useSharp, useSharp, "f");
        localStorage.setItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_USE_SHARP), String(useSharp));
    }
    get isShowingOctaveLines() {
        return __classPrivateFieldGet(this, _Coordinator_showOctaveLines, "f");
    }
    setShowingOctaveLines(show) {
        __classPrivateFieldSet(this, _Coordinator_showOctaveLines, show, "f");
        localStorage.setItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_SHOW_VLINES), String(show));
        this.startAnimationLoop();
    }
    get isShowingNoteNames() {
        return __classPrivateFieldGet(this, _Coordinator_showNoteNames, "f");
    }
    toggleNoteNames() {
        __classPrivateFieldSet(this, _Coordinator_showNoteNames, !__classPrivateFieldGet(this, _Coordinator_showNoteNames, "f"), "f");
        localStorage.setItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_SHOW_NOTE_NAMES), String(__classPrivateFieldGet(this, _Coordinator_showNoteNames, "f")));
        this.startAnimationLoop();
    }
    get scrollSpeedPx() {
        return getScrollSpeedPx(this.scrollSpeedIndex);
    }
    get scrollSpeedFactor() {
        return this.scrollSpeedPx / getScrollSpeedPx(0);
    }
    get scrollSpeedIndex() {
        return __classPrivateFieldGet(this, _Coordinator_scrollSpeedIndex, "f");
    }
    setScrollSpeedIndex(index) {
        __classPrivateFieldSet(this, _Coordinator_scrollSpeedIndex, index, "f");
        localStorage.setItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_SCROLL_SPEED), String(index));
    }
    rotateScrollSpeed() {
        this.setScrollSpeedIndex(getNextScrollSpeedIndex(this.scrollSpeedIndex));
    }
    get playSpeedIndex() {
        return __classPrivateFieldGet(this, _Coordinator_playSpeedIndex, "f");
    }
    get playSpeedFactor() {
        return getPlaySpeedFactor(this.playSpeedIndex);
    }
    rotatePlaySpeed() {
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_setPlaySpeedIndex).call(this, getNextPlaySpeedIndex(this.playSpeedIndex));
    }
    resetPlaySpeed() {
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_setPlaySpeedIndex).call(this, DEFAULT_PLAY_SPEED_INDEX);
    }
    shiftPlaySpeed(increment) {
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_setPlaySpeedIndex).call(this, getCappedPlayIndex(this.playSpeedIndex + increment));
    }
    toggleHelpScreen() {
        __classPrivateFieldSet(this, _Coordinator_isHelpVisible, !__classPrivateFieldGet(this, _Coordinator_isHelpVisible, "f"), "f");
        if (__classPrivateFieldGet(this, _Coordinator_isHelpVisible, "f")) {
            $('#help_overlay').fadeIn('fast');
            $('#help_box').fadeIn('fast');
        }
        else {
            $('#help_overlay').fadeOut('fast');
            $('#help_box').fadeOut('fast');
        }
    }
    get isShowingNoteOffLines() {
        return __classPrivateFieldGet(this, _Coordinator_showNoteOffLins, "f");
    }
    toggleNoteOffLines() {
        info("Toggle note-off lines");
        __classPrivateFieldSet(this, _Coordinator_showNoteOffLins, !__classPrivateFieldGet(this, _Coordinator_showNoteOffLins, "f"), "f");
        localStorage.setItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_NOTE_OFF_LINES), String(__classPrivateFieldGet(this, _Coordinator_showNoteOffLins, "f")));
        this.updateUi();
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
            this.withOverwriteConfirm("Start new recording.", () => recorder.startRecording());
        }
        this.updateUi();
    }
    togglePlayback() {
        if (!__classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_ensureOutputDevice).call(this)) {
            return;
        }
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
        if (!__classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_ensureOutputDevice).call(this)) {
            return;
        }
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
    trimBefore() {
        if (recorder.isRecording || !recorder.isAnythingRecorded || recorder.isBeginning) {
            return;
        }
        // Always shows the confirm box, even if it's saved.
        confirmBox.show("Trim recording before current position?", () => {
            recorder.trimBefore();
            this.updateUi();
        });
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
        const newTime = recorder.lastEventTimestamp * percent;
        // const delta = newTime - recorder.currentPlaybackTimestamp;
        this.moveToTime(newTime);
    }
    moveToTime(newTime) {
        if (recorder.isRecording) {
            return;
        }
        // Allow scrubbing from idle, paused, or playing states.
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
    onRecorderStatusChanged(newState) {
        const lastState = __classPrivateFieldGet(this, _Coordinator_knownRecorderState, "f");
        __classPrivateFieldSet(this, _Coordinator_knownRecorderState, newState, "f");
        this.updateUi();
        if (lastState != RecorderState.Playing && newState == RecorderState.Playing) {
            __classPrivateFieldSet(this, _Coordinator_playbackTimerLastNow, performance.now(), "f");
        }
    }
    replayFromAlwaysRecordingBuffer() {
        this.withOverwriteConfirm("Restoring recent play as recording.", () => {
            recorder.copyFromAlwaysRecorder(alwaysRecorder);
            this.updateUi();
        });
    }
    get isReplayAvailable() {
        return alwaysRecorder.isAvailable;
    }
    updateUi() {
        controls.update();
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
        this.updateNoteInformation();
    }
    onMidiMessage(ev) {
        // debug("onMidiMessage", ev.timeStamp, ev.data0, ev.data1, ev.data2,  ev);
        if (DEBUG) {
            debug("onMidiMessage: " + ev.toString());
        }
        // Ignore "Active Sensing" and "Timing clock"
        if (ev.data0 == 254 || ev.data0 == 248) {
            return;
        }
        this.extendWakelock();
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_normalizeMidiEvent).call(this, ev);
        midiRenderingStatus.onMidiMessage(ev);
        if (recorder.isRecording) {
            recorder.recordEvent(ev);
        }
        if (ev.isNoteOn || ev.isNoteOff) {
            this.updateNoteInformation();
        }
        // Always record it. If it's the first recorded event, update the UI
        // to enable the button.
        const ar = alwaysRecorder.isAvailable;
        alwaysRecorder.recordEvent(ev);
        if (alwaysRecorder.isAvailable != ar) {
            this.updateUi();
        }
        // Simulate zero-length note on.
        if (SIMULATE_ZERO_LENGTH_NOTES && ev.isNoteOn) {
            let clone = ev.clone();
            clone.replaceData(0, 0x80 + ev.channel); // note-off
            clone.replaceData(2, 0); // velocity
            this.onMidiMessage(clone);
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
    onDraw(time) {
        renderer.onDraw(time);
        midiRenderingStatus.afterDraw(time);
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
    }
    updateNoteInformation() {
        const time = performance.now();
        if (!this.isShowingNoteNames) {
            if (__classPrivateFieldGet(this, _Coordinator_updateNoteInformationNoteNamesShown, "f")) {
                __classPrivateFieldGet(this, _Coordinator_notes, "f").fadeOut(800);
                __classPrivateFieldGet(this, _Coordinator_chords, "f").fadeOut(800);
                __classPrivateFieldSet(this, _Coordinator_updateNoteInformationNoteNamesShown, false, "f");
            }
            return;
        }
        __classPrivateFieldSet(this, _Coordinator_updateNoteInformationNoteNamesShown, true, "f");
        // Build note names.
        const notes = midiRenderingStatus.getPressedNotes();
        // If notes haven't changed, just return.
        const nowNotes = notes.map((n) => n.note);
        if (__classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_arraySame).call(this, nowNotes, __classPrivateFieldGet(this, _Coordinator_updateNoteInformationLastNotes, "f"))) {
            return;
        }
        __classPrivateFieldSet(this, _Coordinator_updateNoteInformationLastNotes, nowNotes, "f");
        let lastOctave = -1;
        const noteSpans = notes.map((n) => {
            const noteName = getNoteFullName(n.note, __classPrivateFieldGet(this, _Coordinator_useSharp, "f"));
            // Add extra space between octaves.
            const octave = int(n.note / 12);
            const spacing = (lastOctave < 0 || octave === lastOctave) ? "" : "&nbsp;&nbsp;";
            lastOctave = octave;
            // Check if the note was pressed recently.
            const isRecent = (time - n.onTime) <= 50; // 50 ms
            if (isRecent) {
                return `${spacing}<span class="notes_highlight">${noteName}</span>`;
            }
            else {
                return `${spacing}<span>${noteName}</span>`;
            }
        });
        const noteNamesHtml = noteSpans.join(' ');
        // Build chord names.
        // We need just the note numbers for chord analysis.
        const pressedNoteNumbers = notes.map(n => n.note);
        let index = -1;
        const chordNamesHtml = analyzeChord(pressedNoteNumbers, __classPrivateFieldGet(this, _Coordinator_useSharp, "f")).map((chord) => {
            index++;
            if (index == 0) {
                return `<span class="notes_highlight">${chord}</span>`;
            }
            else {
                return `<span>${chord}</span>`;
            }
        }).join(", ");
        if (noteNamesHtml.length > 0) {
            __classPrivateFieldGet(this, _Coordinator_notes, "f").html(noteNamesHtml);
            __classPrivateFieldGet(this, _Coordinator_notes, "f").stop(true, true).show();
        }
        else {
            __classPrivateFieldGet(this, _Coordinator_notes, "f").fadeOut(800);
        }
        if (chordNamesHtml) {
            __classPrivateFieldGet(this, _Coordinator_chords, "f").html(chordNamesHtml);
            __classPrivateFieldGet(this, _Coordinator_chords, "f").stop(true, true).show();
        }
        else {
            __classPrivateFieldGet(this, _Coordinator_chords, "f").fadeOut(800);
        }
    }
    get isAnimating() {
        return __classPrivateFieldGet(this, _Coordinator_animationFrameId, "f") !== null;
    }
    /**
     * Starts the main animation loop, which is synchronized with the browser's
     * rendering cycle for smooth visuals.
     */
    startAnimationLoop() {
        if (this.isAnimating) {
            // Loop is already running.
            return;
        }
        console.log("Animation started");
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
        var nextFlip = -1;
        const loop = (time, forceRequest) => {
            var _c, _d;
            __classPrivateFieldSet(this, _Coordinator_frames, (_c = __classPrivateFieldGet(this, _Coordinator_frames, "f"), _c++, _c), "f");
            var requestNext = false;
            if (time < nextFlip) {
                requestNext = true;
            }
            else {
                nextFlip = time + FPS_TO_MILLIS;
                // #flips is for the FPS counter, representing screen updates.
                __classPrivateFieldSet(this, _Coordinator_flips, (_d = __classPrivateFieldGet(this, _Coordinator_flips, "f"), _d++, _d), "f");
                // Draw the current state to the off-screen canvas.
                // This also updates the #frames t for the FPS counter.
                this.onDraw(time);
                // Copy the off-screen canvas to the visible one.
                renderer.flip();
                // Because of the SHORTEST_NOTE_LENGTH compensation, we may not
                // know the exact note-off timing as per MidiRenderingStatus.
                // So we call it every frame. Bit this method internally does caching,
                // so it shouldn't normally be expensive.
                this.updateNoteInformation();
                // Request the next frame.
                // const needsAnimation = (Date.now() - this.#lastAnimationRequestTimestamp) < ANIMATION_TIMEOUT_MS;
                const needsAnimation = renderer.needsAnimation() ||
                    recorder.isPlaying || midiRenderingStatus.needsAnimation();
                if (forceRequest || needsAnimation) {
                    requestNext = true;
                }
            }
            if (requestNext) {
                __classPrivateFieldSet(this, _Coordinator_animationFrameId, requestAnimationFrame((time) => loop(time, false)), "f");
            }
            else {
                this.stopAnimationLoop();
            }
        };
        // Start the loop.
        loop(performance.now(), true);
    }
    /**
     * Stops the main animation loop.
     */
    stopAnimationLoop() {
        if (this.isAnimating) {
            cancelAnimationFrame(__classPrivateFieldGet(this, _Coordinator_animationFrameId, "f"));
            __classPrivateFieldSet(this, _Coordinator_animationFrameId, null, "f");
            console.log("Animation stopped");
            __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
        }
    }
    onPlaybackTimer() {
        var _c;
        __classPrivateFieldSet(this, _Coordinator_playbackTicks, (_c = __classPrivateFieldGet(this, _Coordinator_playbackTicks, "f"), _c++, _c), "f");
        if (recorder.isPlaying) {
            const now = performance.now();
            recorder.playbackUpToNow((now - __classPrivateFieldGet(this, _Coordinator_playbackTimerLastNow, "f")) * this.playSpeedFactor);
            __classPrivateFieldSet(this, _Coordinator_playbackTimerLastNow, now, "f");
            controls.updateTimestamp();
        }
    }
    downloadRequested() {
        saveAsBox.open();
    }
    uploadRequested() {
        coordinator.withOverwriteConfirm("Uploading a MIDI file.", () => {
            $('#open_file').trigger('click');
        });
    }
    withOverwriteConfirm(message, callback) {
        if (recorder.isDirty) {
            confirmBox.show(message + " Discard current recording?", () => callback());
        }
        else {
            callback();
        }
    }
    extendWakelock() {
        return __awaiter(this, void 0, void 0, function* () {
            // Got the wake lock type definition from:
            // https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/dom-screen-wake-lock
            // npm i @types/dom-screen-wake-lock
            if (__classPrivateFieldGet(this, _Coordinator_wakelock, "f") === null) {
                try {
                    __classPrivateFieldSet(this, _Coordinator_wakelock, yield navigator.wakeLock.request('screen'), "f");
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
        });
    }
    close() {
        this.stopAnimationLoop();
        recorder.stopPlaying();
        this.resetMidi();
    }
}
_b = Coordinator, _Coordinator_nextFpsMeasureSecond = new WeakMap(), _Coordinator_frames = new WeakMap(), _Coordinator_flips = new WeakMap(), _Coordinator_playbackTicks = new WeakMap(), _Coordinator_efps = new WeakMap(), _Coordinator_wakelock = new WeakMap(), _Coordinator_wakelockTimer = new WeakMap(), _Coordinator_notes = new WeakMap(), _Coordinator_chords = new WeakMap(), _Coordinator_useSharp = new WeakMap(), _Coordinator_showOctaveLines = new WeakMap(), _Coordinator_showNoteNames = new WeakMap(), _Coordinator_scrollSpeedIndex = new WeakMap(), _Coordinator_playSpeedIndex = new WeakMap(), _Coordinator_showNoteOffLins = new WeakMap(), _Coordinator_isHelpVisible = new WeakMap(), _Coordinator_metronomeOptions = new WeakMap(), _Coordinator_knownRecorderState = new WeakMap(), _Coordinator_playbackTimerLastNow = new WeakMap(), _Coordinator_ignoreRepeatedRewindKey = new WeakMap(), _Coordinator_updateNoteInformationNoteNamesShown = new WeakMap(), _Coordinator_updateNoteInformationLastNotes = new WeakMap(), _Coordinator_animationFrameId = new WeakMap(), _Coordinator_instances = new WeakSet(), _Coordinator_setPlaySpeedIndex = function _Coordinator_setPlaySpeedIndex(index) {
    __classPrivateFieldSet(this, _Coordinator_playSpeedIndex, index, "f");
    localStorage.setItem(__classPrivateFieldGet(_b, _b, "f", _Coordinator_STORAGE_KEY_PLAY_SPEED), String(index));
    this.updateUi();
    console.log("Speed changed", index, this.playSpeedFactor);
}, _Coordinator_ensureOutputDevice = function _Coordinator_ensureOutputDevice() {
    if (!midiOutputManager.anyDeviceSelected) {
        info("No MIDI output device selected");
        return false;
    }
    return true;
}, _Coordinator_onRewindPressed = function _Coordinator_onRewindPressed(isRepeat) {
    if (recorder.isRecording) {
        return;
    }
    if (isRepeat && __classPrivateFieldGet(this, _Coordinator_ignoreRepeatedRewindKey, "f")) {
        return;
    }
    if (!isRepeat) {
        __classPrivateFieldSet(this, _Coordinator_ignoreRepeatedRewindKey, false, "f");
    }
    recorder.adjustPlaybackPosition(-1000);
    if (recorder.isBeginning) {
        // If we hit the beginning, stop accepting repeated key presses.
        __classPrivateFieldSet(this, _Coordinator_ignoreRepeatedRewindKey, true, "f");
    }
    this.updateUi();
}, _Coordinator_onFastForwardPressed = function _Coordinator_onFastForwardPressed(isRepeat) {
    if (recorder.isRecording || recorder.isAfterLast) {
        return;
    }
    recorder.adjustPlaybackPosition(1000);
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
}, _Coordinator_updateFps = function _Coordinator_updateFps() {
    if (!this.isAnimating) {
        __classPrivateFieldGet(this, _Coordinator_efps, "f").text("Animation stopped");
        __classPrivateFieldSet(this, _Coordinator_nextFpsMeasureSecond, 0, "f");
        return;
    }
    let now = performance.now();
    if (now >= __classPrivateFieldGet(this, _Coordinator_nextFpsMeasureSecond, "f")) {
        __classPrivateFieldGet(this, _Coordinator_efps, "f").text(`${__classPrivateFieldGet(this, _Coordinator_flips, "f")}/${__classPrivateFieldGet(this, _Coordinator_frames, "f")} - ${__classPrivateFieldGet(this, _Coordinator_playbackTicks, "f")}`);
        __classPrivateFieldSet(this, _Coordinator_flips, 0, "f");
        __classPrivateFieldSet(this, _Coordinator_frames, 0, "f");
        __classPrivateFieldSet(this, _Coordinator_playbackTicks, 0, "f");
        __classPrivateFieldSet(this, _Coordinator_nextFpsMeasureSecond, __classPrivateFieldGet(this, _Coordinator_nextFpsMeasureSecond, "f") + 1000, "f");
        if (__classPrivateFieldGet(this, _Coordinator_nextFpsMeasureSecond, "f") < now) {
            __classPrivateFieldSet(this, _Coordinator_nextFpsMeasureSecond, now + 1000, "f");
        }
    }
}, _Coordinator_arraySame = function _Coordinator_arraySame(a1, a2) {
    if (a1.length !== a2.length) {
        return false;
    }
    for (let i = 0; i < a1.length; i++) {
        if (a1[i] !== a2[i]) {
            return false;
        }
    }
    return true;
};
// LocalStorage keys
_Coordinator_STORAGE_KEY_USE_SHARP = { value: 'mvv_useSharp' };
_Coordinator_STORAGE_KEY_SHOW_VLINES = { value: 'mvv_showVlines' };
_Coordinator_STORAGE_KEY_SHOW_NOTE_NAMES = { value: 'mvv_showNoteNames' };
_Coordinator_STORAGE_KEY_SCROLL_SPEED = { value: 'mvv_scrollSpeed' };
_Coordinator_STORAGE_KEY_PLAY_SPEED = { value: 'mvv_playSpeed' };
_Coordinator_STORAGE_KEY_NOTE_OFF_LINES = { value: 'note_off_lines' };
// static readonly #STORAGE_KEY_METRONOME_BPM = 'mvv_metronomeBpm';
// static readonly #STORAGE_KEY_METRONOME_MAIN_BEATS = 'mvv_metronomeMainBeats';
// static readonly #STORAGE_KEY_METRONOME_SUB_BEATS = 'mvv_metronomeSubBeats';
_Coordinator_STORAGE_KEY_METRONOME_OPTIONS = { value: 'mvv_metronomeOptions' };
export const coordinator = new Coordinator();
function onMIDISuccess(midiAccess) {
    console.log("onMIDISuccess: looking for MIDI devices...");
    for (let input of midiAccess.inputs.values()) {
        console.log("Discovered input device: " + input.name, input);
        input.onmidimessage = (ev) => {
            coordinator.onMidiMessage(MidiEvent.fromNativeEvent(ev));
        };
    }
    const outputs = Array.from(midiAccess.outputs.values());
    for (var output of outputs) {
        console.log("Discovered output device: " + output.name, output);
    }
    midiOutputDeviceSelector.setDevices(outputs);
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
    info("Loading from: " + file.name);
    console.log("Loading from: ", file);
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
    const file = oev.dataTransfer.files[0];
    console.log("File dropped", file, oev.dataTransfer);
    coordinator.withOverwriteConfirm("Uploading a MIDI file.", () => {
        loadMidiFile(file);
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
$('#help_close, #help_overlay').on('click', (_ev) => {
    coordinator.toggleHelpScreen();
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
//# sourceMappingURL=mvv.js.map