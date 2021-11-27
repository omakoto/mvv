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
var _Renderer_BAR_SUB_LINE_WIDTH, _Renderer_BAR_BASE_LINE_COLOR, _Renderer_ROLL_SCROLL_AMOUNT, _Renderer_W, _Renderer_H, _Renderer_BAR_H, _Renderer_ROLL_H, _Renderer_MIN_NOTE, _Renderer_MAX_NOTE, _Renderer_cbar, _Renderer_bar, _Renderer_croll, _Renderer_roll, _Renderer_cbar2, _Renderer_bar2, _Renderer_croll2, _Renderer_roll2, _MidiRenderingStatus_notes, _MidiRenderingStatus_pedal, _MidiRenderingStatus_onNoteCount, _MidiOutputManager_device, _Recorder_instances, _Recorder_events, _Recorder_state, _Recorder_recordingStartTimestamp, _Recorder_playbackStartTimestamp, _Recorder_playbackTimeAdjustment, _Recorder_pauseStartTimestamp, _Recorder_nextPlaybackIndex, _Recorder_startRecording, _Recorder_stopRecording, _Recorder_startPlaying, _Recorder_stopPlaying, _Recorder_getPausingDuration, _Recorder_getCurrentPlaybackTimestamp, _Recorder_moveUpToTimestamp, _Coordinator_instances, _Coordinator_now, _Coordinator_nextSecond, _Coordinator_frames, _Coordinator_flips, _Coordinator_playbackTicks, _Coordinator_efps, _Coordinator_nextDrawTime, _Coordinator_updateRecorderStatus, _Coordinator_ignoreRepeatedRewindKey, _Coordinator_lastRewindPressTime, _Coordinator_onRewindPressed, _Coordinator_normalizeMidiEvent, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp, _Coordinator_scheduleDraw, _Coordinator_save_as_box, _Coordinator_open_download_box;
;
const SCALE_ARG = parseFloat("0" + (new URLSearchParams(window.location.search)).get("scale"));
const SCALE = SCALE_ARG > 0 ? SCALE_ARG : window.devicePixelRatio;
console.log("Scale: " + SCALE);
const NOTES_COUNT = 128;
// We set some styles in JS.
const BAR_RATIO = 0.3; // Bar : Roll height
const MARGIN = 0.005; // Margin at each side
const FPS = 60;
// Common values
const RGB_BLACK = [0, 0, 0];
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
    if (rgb[0] == 0 && rgb[1] == 0 && rgb[2] == 0) {
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
function show(selector, show) {
    if (show) {
        $(selector).show();
    }
    else {
        $(selector).hide();
    }
}
// Logic
class Renderer {
    constructor() {
        var _a, _b, _c, _d, _e, _f, _g, _h;
        _Renderer_BAR_SUB_LINE_WIDTH.set(this, s(2));
        _Renderer_BAR_BASE_LINE_COLOR.set(this, [200, 255, 200]);
        _Renderer_ROLL_SCROLL_AMOUNT.set(this, s(2));
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
        // Adjust CSS with the constants.
        $("body").css("padding", (MARGIN * 100) + "%");
        $("#canvases").css("width", (100 - MARGIN * 200) + "%");
        $("#bar2").css("height", (BAR_RATIO * 100) + "%");
        $("#roll2").css("height", (100 - BAR_RATIO * 100) + "%");
        __classPrivateFieldSet(this, _Renderer_W, s(screen.width * (1 - MARGIN * 2)), "f");
        __classPrivateFieldSet(this, _Renderer_H, s(screen.height * (1 - MARGIN * 2)), "f");
        __classPrivateFieldSet(this, _Renderer_BAR_H, int(__classPrivateFieldGet(this, _Renderer_H, "f") * BAR_RATIO), "f");
        __classPrivateFieldSet(this, _Renderer_ROLL_H, __classPrivateFieldGet(this, _Renderer_H, "f") - __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), "f");
        _a = this, _b = this, [({ set value(_j) { __classPrivateFieldSet(_a, _Renderer_cbar, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_b, _Renderer_bar, _j, "f"); } }).value] = Renderer.getCanvas("bar");
        _c = this, _d = this, [({ set value(_j) { __classPrivateFieldSet(_c, _Renderer_cbar2, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_d, _Renderer_bar2, _j, "f"); } }).value] = Renderer.getCanvas("bar2");
        _e = this, _f = this, [({ set value(_j) { __classPrivateFieldSet(_e, _Renderer_croll, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_f, _Renderer_roll, _j, "f"); } }).value] = Renderer.getCanvas("roll");
        _g = this, _h = this, [({ set value(_j) { __classPrivateFieldSet(_g, _Renderer_croll2, _j, "f"); } }).value, ({ set value(_j) { __classPrivateFieldSet(_h, _Renderer_roll2, _j, "f"); } }).value] = Renderer.getCanvas("roll2");
        __classPrivateFieldGet(this, _Renderer_cbar, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_cbar, "f").height = __classPrivateFieldGet(this, _Renderer_BAR_H, "f");
        __classPrivateFieldGet(this, _Renderer_cbar2, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_cbar2, "f").height = __classPrivateFieldGet(this, _Renderer_BAR_H, "f");
        __classPrivateFieldGet(this, _Renderer_croll, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_croll, "f").height = __classPrivateFieldGet(this, _Renderer_ROLL_H, "f");
        __classPrivateFieldGet(this, _Renderer_croll2, "f").width = __classPrivateFieldGet(this, _Renderer_W, "f");
        __classPrivateFieldGet(this, _Renderer_croll2, "f").height = __classPrivateFieldGet(this, _Renderer_ROLL_H, "f");
    }
    static getCanvas(name) {
        // TODO: Doew it need an explicit 'srgb' color space? (It used to have it.)
        let canvas = document.getElementById(name);
        let context = canvas.getContext("2d");
        return [canvas, context];
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
    drawSubLine(percent) {
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = rgbToStr(this.getBarColor(127 * (1 - percent)));
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, __classPrivateFieldGet(this, _Renderer_BAR_H, "f") * percent, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_BAR_SUB_LINE_WIDTH, "f"));
    }
    onDraw() {
        // Scroll the roll.
        __classPrivateFieldGet(this, _Renderer_roll, "f").drawImage(__classPrivateFieldGet(this, _Renderer_croll, "f"), 0, __classPrivateFieldGet(this, _Renderer_ROLL_SCROLL_AMOUNT, "f"));
        __classPrivateFieldGet(this, _Renderer_roll, "f").fillStyle = rgbToStr(this.getPedalColor(midiRenderingStatus.pedal));
        __classPrivateFieldGet(this, _Renderer_roll, "f").fillRect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_ROLL_SCROLL_AMOUNT, "f"));
        // Clear the bar area.
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = 'black';
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, 0, __classPrivateFieldGet(this, _Renderer_W, "f"), __classPrivateFieldGet(this, _Renderer_H, "f"));
        // Individual bar width
        let bw = __classPrivateFieldGet(this, _Renderer_W, "f") / (__classPrivateFieldGet(this, _Renderer_MAX_NOTE, "f") - __classPrivateFieldGet(this, _Renderer_MIN_NOTE, "f") + 1) - 1;
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
        // Base line.
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillStyle = rgbToStr(__classPrivateFieldGet(this, _Renderer_BAR_BASE_LINE_COLOR, "f"));
        __classPrivateFieldGet(this, _Renderer_bar, "f").fillRect(0, __classPrivateFieldGet(this, _Renderer_BAR_H, "f"), __classPrivateFieldGet(this, _Renderer_W, "f"), -__classPrivateFieldGet(this, _Renderer_BAR_SUB_LINE_WIDTH, "f"));
    }
    flip() {
        __classPrivateFieldGet(this, _Renderer_bar2, "f").drawImage(__classPrivateFieldGet(this, _Renderer_cbar, "f"), 0, 0);
        __classPrivateFieldGet(this, _Renderer_roll2, "f").drawImage(__classPrivateFieldGet(this, _Renderer_croll, "f"), 0, 0);
    }
    toggleMute() {
        $('#canvases').toggle();
    }
    show() {
        $('#canvases').show();
    }
}
_Renderer_BAR_SUB_LINE_WIDTH = new WeakMap(), _Renderer_BAR_BASE_LINE_COLOR = new WeakMap(), _Renderer_ROLL_SCROLL_AMOUNT = new WeakMap(), _Renderer_W = new WeakMap(), _Renderer_H = new WeakMap(), _Renderer_BAR_H = new WeakMap(), _Renderer_ROLL_H = new WeakMap(), _Renderer_MIN_NOTE = new WeakMap(), _Renderer_MAX_NOTE = new WeakMap(), _Renderer_cbar = new WeakMap(), _Renderer_bar = new WeakMap(), _Renderer_croll = new WeakMap(), _Renderer_roll = new WeakMap(), _Renderer_cbar2 = new WeakMap(), _Renderer_bar2 = new WeakMap(), _Renderer_croll2 = new WeakMap(), _Renderer_roll2 = new WeakMap();
const renderer = new Renderer();
class MidiRenderingStatus {
    constructor() {
        _MidiRenderingStatus_notes.set(this, []); // note on/off, velocity
        _MidiRenderingStatus_pedal.set(this, 0);
        _MidiRenderingStatus_onNoteCount.set(this, 0);
        this.reset();
    }
    onMidiMessage(ev) {
        var _a;
        let data0 = ev.data0;
        let data1 = ev.data1;
        let data2 = ev.data2;
        if (data0 == 144 && data2 > 0) { // Note on
            __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCount, // Note on
            (_a = __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCount, "f"), _a++, _a), "f");
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1][0] = true;
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1][1] = data2;
        }
        else if ((data0 == 128) || (data0 == 144 && data2 == 0)) { // Note off
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1][0] = false;
        }
        else if (data0 == 176 && data1 == 64) { // Pedal
            __classPrivateFieldSet(this, _MidiRenderingStatus_pedal, data2, "f");
        }
    }
    reset() {
        __classPrivateFieldSet(this, _MidiRenderingStatus_notes, [], "f");
        for (let i = 0; i < NOTES_COUNT; i++) {
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[i] = [false, 0]; // note on/off, velocity
        }
        __classPrivateFieldSet(this, _MidiRenderingStatus_pedal, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCount, 0, "f");
    }
    afterDraw(_now) {
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCount, 0, "f");
    }
    get onNoteCount() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCount, "f");
    }
    get pedal() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_pedal, "f");
    }
    getNote(noteIndex) {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
    }
}
_MidiRenderingStatus_notes = new WeakMap(), _MidiRenderingStatus_pedal = new WeakMap(), _MidiRenderingStatus_onNoteCount = new WeakMap();
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
        __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([176, 123, 0], 0); // All notes off
        __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([176, 121, 0], 0); // Reset all controllers
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
    recordEvent(ev) {
        if (!this.isRecording) {
            return false;
        }
        // Only record certain events.
        switch (ev.data0) {
            case 144: // Note on
            case 128: // Note off
            case 176: // Control
                break;
            default:
                return false;
        }
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length == 0) {
            // First event, remember the timestamp.
            __classPrivateFieldSet(this, _Recorder_recordingStartTimestamp, ev.timeStamp, "f");
        }
        __classPrivateFieldGet(this, _Recorder_events, "f").push(ev.withTimestamp(ev.timeStamp - __classPrivateFieldGet(this, _Recorder_recordingStartTimestamp, "f")));
        return true;
    }
    moveToStart() {
        this.adjustPlaybackPosition(-9999999999);
    }
    // Fast-forward or rewind.
    adjustPlaybackPosition(milliseconds) {
        __classPrivateFieldSet(this, _Recorder_playbackTimeAdjustment, __classPrivateFieldGet(this, _Recorder_playbackTimeAdjustment, "f") + milliseconds, "f");
        let ts = __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_getCurrentPlaybackTimestamp).call(this);
        // If rewound beyond the starting point, just reset the
        if (ts <= 0) {
            __classPrivateFieldSet(this, _Recorder_playbackStartTimestamp, window.performance.now(), "f");
            __classPrivateFieldSet(this, _Recorder_playbackTimeAdjustment, 0, "f");
            ts = -1; // Special case: Move before the first note.
        }
        // info("New playback timestamp: " + (ts < 0 ? 0 : int(ts / 1000)));
        // Find the next play event index.
        __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, ts, null);
        return ts > 0;
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
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length == 0) {
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
    }
    setEvents(events) {
        this.stopPlaying();
        this.stopRecording();
        __classPrivateFieldSet(this, _Recorder_events, events, "f");
        if (events.length == 0) {
            info("File contains no events.");
            return;
        }
        const lastEvent = events[events.length - 1];
        let message = "Load completed: " + int(lastEvent.timeStamp / 1000) + " seconds, " + events.length + " events";
        info(message);
    }
}
_Recorder_events = new WeakMap(), _Recorder_state = new WeakMap(), _Recorder_recordingStartTimestamp = new WeakMap(), _Recorder_playbackStartTimestamp = new WeakMap(), _Recorder_playbackTimeAdjustment = new WeakMap(), _Recorder_pauseStartTimestamp = new WeakMap(), _Recorder_nextPlaybackIndex = new WeakMap(), _Recorder_instances = new WeakSet(), _Recorder_startRecording = function _Recorder_startRecording() {
    info("Recording started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Recording, "f");
    __classPrivateFieldSet(this, _Recorder_events, [], "f");
    coordinator.onRecorderStatusChanged();
}, _Recorder_stopRecording = function _Recorder_stopRecording() {
    info("Recording stopped");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    coordinator.onRecorderStatusChanged();
}, _Recorder_startPlaying = function _Recorder_startPlaying() {
    info("Playback started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Playing, "f");
    __classPrivateFieldSet(this, _Recorder_playbackStartTimestamp, window.performance.now(), "f");
    __classPrivateFieldSet(this, _Recorder_playbackTimeAdjustment, 0, "f");
    __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
    coordinator.onRecorderStatusChanged();
}, _Recorder_stopPlaying = function _Recorder_stopPlaying() {
    info("Playback stopped");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    coordinator.onRecorderStatusChanged();
    coordinator.resetMidi();
}, _Recorder_getPausingDuration = function _Recorder_getPausingDuration() {
    return this.isPausing ? (performance.now() - __classPrivateFieldGet(this, _Recorder_pauseStartTimestamp, "f")) : 0;
}, _Recorder_getCurrentPlaybackTimestamp = function _Recorder_getCurrentPlaybackTimestamp() {
    return (performance.now() - __classPrivateFieldGet(this, _Recorder_playbackStartTimestamp, "f")) +
        __classPrivateFieldGet(this, _Recorder_playbackTimeAdjustment, "f") - __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_getPausingDuration).call(this);
}, _Recorder_moveUpToTimestamp = function _Recorder_moveUpToTimestamp(timeStamp, callback) {
    var _a;
    for (;;) {
        if (this.isAfterLast) {
            // No more events.
            // But do not auto-stop; otherwise it'd be hard to listen to the last part.
            // this.isPlaying = false;
            // coordinator.onRecorderStatusChanged();
            // return false;
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
        _Coordinator_nextDrawTime.set(this, 0);
        _Coordinator_ignoreRepeatedRewindKey.set(this, false);
        _Coordinator_lastRewindPressTime.set(this, 0);
        _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds.set(this, -1);
        _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult.set(this, "");
        _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp.set(this, "");
        _Coordinator_save_as_box.set(this, null);
        __classPrivateFieldSet(this, _Coordinator_nextSecond, window.performance.now() + 1000, "f");
        __classPrivateFieldSet(this, _Coordinator_efps, $("#fps"), "f");
    }
    onKeyDown(ev) {
        debug("onKeyDown", ev.timeStamp, ev.code, ev);
        // Don't respond if any modifier keys are pressed.
        if (ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) {
            return;
        }
        // Ignore key repeats.
        const isRepeat = ev.repeat;
        switch (ev.code) {
            case 'F1':
                if (isRepeat)
                    break;
                this.toggleVideoMute();
                break;
            case 'KeyF':
                if (isRepeat)
                    break;
                __classPrivateFieldGet(this, _Coordinator_efps, "f").toggle();
                break;
            case 'KeyR':
                if (isRepeat)
                    break;
                this.toggleRecording();
                break;
            case 'KeyS':
                if (isRepeat)
                    break;
                __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_open_download_box).call(this);
                break;
            case 'KeyL':
                if (isRepeat)
                    break;
                $('#open_file').trigger('click');
                break;
            case 'KeyZ':
                if (isRepeat)
                    break;
                if (recorder.isPlaying || recorder.isPausing) {
                    recorder.stopPlaying();
                }
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
                if (recorder.isPlaying || recorder.isPausing) {
                    this.resetMidi();
                    recorder.adjustPlaybackPosition(1000);
                }
                break;
            default:
                return; // Don't prevent the default behavior.
        }
        ev.preventDefault();
    }
    toggleVideoMute() {
        info("Toggle video mute");
        renderer.toggleMute();
    }
    toggleRecording() {
        if (recorder.isRecording) {
            recorder.stopRecording();
        }
        else {
            recorder.startRecording();
        }
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateRecorderStatus).call(this);
    }
    togglePlayback() {
        if (recorder.isPausing) {
            recorder.unpause();
        }
        else if (recorder.isPlaying) {
            recorder.pause();
        }
        else if (recorder.isIdle) {
            renderer.show();
            recorder.startPlaying();
        }
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateRecorderStatus).call(this);
    }
    onRecorderStatusChanged() {
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateRecorderStatus).call(this);
    }
    onMidiMessage(ev) {
        debug("onMidiMessage", ev.timeStamp, ev.data0, ev.data1, ev.data2, ev);
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_normalizeMidiEvent).call(this, ev);
        midiRenderingStatus.onMidiMessage(ev);
        if (recorder.isRecording) {
            recorder.recordEvent(ev);
        }
    }
    reset() {
        recorder.stopPlaying();
        recorder.stopRecording();
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateRecorderStatus).call(this);
        this.resetMidi();
    }
    resetMidi() {
        midiRenderingStatus.reset();
        midiOutputManager.reset();
    }
    getHumanReadableCurrentPlaybackTimestamp() {
        const totalSeconds = int(recorder.currentPlaybackTimestamp / 1000);
        if (totalSeconds == __classPrivateFieldGet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds, "f")) {
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
        const isFinished = recorder.isAfterLast ? " (finished)" : "";
        __classPrivateFieldSet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, __classPrivateFieldGet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, "f") + isFinished, "f");
        return __classPrivateFieldGet(this, _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult, "f");
    }
    onDraw() {
        var _a;
        // Update FPS
        __classPrivateFieldSet(this, _Coordinator_frames, (_a = __classPrivateFieldGet(this, _Coordinator_frames, "f"), _a++, _a), "f");
        let now = window.performance.now();
        if (now >= __classPrivateFieldGet(this, _Coordinator_nextSecond, "f")) {
            __classPrivateFieldGet(this, _Coordinator_efps, "f").text(__classPrivateFieldGet(this, _Coordinator_flips, "f") + "/" + __classPrivateFieldGet(this, _Coordinator_frames, "f") + "/" + __classPrivateFieldGet(this, _Coordinator_playbackTicks, "f"));
            __classPrivateFieldSet(this, _Coordinator_flips, 0, "f");
            __classPrivateFieldSet(this, _Coordinator_frames, 0, "f");
            __classPrivateFieldSet(this, _Coordinator_playbackTicks, 0, "f");
            __classPrivateFieldSet(this, _Coordinator_nextSecond, __classPrivateFieldGet(this, _Coordinator_nextSecond, "f") + 1000, "f");
        }
        __classPrivateFieldSet(this, _Coordinator_now, now, "f");
        renderer.onDraw();
        midiRenderingStatus.afterDraw(__classPrivateFieldGet(this, _Coordinator_now, "f"));
    }
    scheduleFlip() {
        requestAnimationFrame(() => {
            var _a;
            __classPrivateFieldSet(this, _Coordinator_flips, (_a = __classPrivateFieldGet(this, _Coordinator_flips, "f"), _a++, _a), "f");
            renderer.flip();
            this.scheduleFlip();
        });
    }
    onPlaybackTimer() {
        var _a;
        __classPrivateFieldSet(this, _Coordinator_playbackTicks, (_a = __classPrivateFieldGet(this, _Coordinator_playbackTicks, "f"), _a++, _a), "f");
        if (recorder.isPlaying) {
            recorder.playbackUpToNow();
        }
        if (recorder.isPlaying || recorder.isPausing) {
            // Update the time indicator
            const timeStamp = this.getHumanReadableCurrentPlaybackTimestamp();
            if (timeStamp != __classPrivateFieldGet(this, _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp, "f")) {
                infoRaw(timeStamp);
                __classPrivateFieldSet(this, _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp, timeStamp, "f");
            }
        }
    }
    startDrawTimer() {
        __classPrivateFieldSet(this, _Coordinator_nextDrawTime, window.performance.now(), "f");
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_scheduleDraw).call(this);
    }
    startPlaybackTimer() {
        setInterval(() => coordinator.onPlaybackTimer(), 5);
    }
    do_download() {
        if (!__classPrivateFieldGet(this, _Coordinator_save_as_box, "f")) {
            return; // Shouldn't happen
        }
        __classPrivateFieldGet(this, _Coordinator_save_as_box, "f").clear();
        let filename = $('#save_as_filename').val();
        if (!filename) {
            info("Empty filename");
            return;
        }
        filename += ".mid";
        recorder.download(filename);
        info("Saved as " + filename);
    }
    close() {
        recorder.stopPlaying();
        this.resetMidi();
    }
}
_Coordinator_now = new WeakMap(), _Coordinator_nextSecond = new WeakMap(), _Coordinator_frames = new WeakMap(), _Coordinator_flips = new WeakMap(), _Coordinator_playbackTicks = new WeakMap(), _Coordinator_efps = new WeakMap(), _Coordinator_nextDrawTime = new WeakMap(), _Coordinator_ignoreRepeatedRewindKey = new WeakMap(), _Coordinator_lastRewindPressTime = new WeakMap(), _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds = new WeakMap(), _Coordinator_getHumanReadableCurrentPlaybackTimestamp_lastResult = new WeakMap(), _Coordinator_onPlaybackTimer_lastShownPlaybackTimestamp = new WeakMap(), _Coordinator_save_as_box = new WeakMap(), _Coordinator_instances = new WeakSet(), _Coordinator_updateRecorderStatus = function _Coordinator_updateRecorderStatus() {
    show('#playing', recorder.isPlaying);
    show('#recording', recorder.isRecording);
    show('#pausing', recorder.isPausing);
}, _Coordinator_onRewindPressed = function _Coordinator_onRewindPressed(isRepeat) {
    if (!(recorder.isPlaying || recorder.isPausing)) {
        return;
    }
    // If non-repeat left is pressed twice within a timeout, move to start.
    if (!isRepeat) {
        const now = window.performance.now();
        if ((now - __classPrivateFieldGet(this, _Coordinator_lastRewindPressTime, "f")) <= 150) {
            recorder.moveToStart();
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
    this.resetMidi();
    if (!recorder.adjustPlaybackPosition(-1000)) {
        __classPrivateFieldSet(this, _Coordinator_ignoreRepeatedRewindKey, true, "f");
    }
    return;
}, _Coordinator_normalizeMidiEvent = function _Coordinator_normalizeMidiEvent(ev) {
    // Allow V25's leftmost knob to be used as the pedal.
    if (ev.device.startsWith("V25")) {
        if (ev.data0 == 176 && ev.data1 == 20) {
            ev.replaceData(1, 64);
        }
    }
}, _Coordinator_scheduleDraw = function _Coordinator_scheduleDraw() {
    __classPrivateFieldSet(this, _Coordinator_nextDrawTime, __classPrivateFieldGet(this, _Coordinator_nextDrawTime, "f") + (1000.0 / FPS), "f");
    const delay = (__classPrivateFieldGet(this, _Coordinator_nextDrawTime, "f") - window.performance.now());
    setTimeout(() => {
        this.onDraw(); // TODO Handle frame drop properly
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_scheduleDraw).call(this);
    }, delay);
}, _Coordinator_open_download_box = function _Coordinator_open_download_box() {
    if (!recorder.isAnythingRecorded) {
        info("Nothing is recorded");
        return;
    }
    let filename = "mvv-" + getCurrentTime();
    $('#save_as_filename').val(filename);
    __classPrivateFieldSet(this, _Coordinator_save_as_box, new Popbox({
        blur: true,
        overlay: true,
    }), "f");
    __classPrivateFieldGet(this, _Coordinator_save_as_box, "f").open('save_as_box');
    $('#save_as_filename').focus();
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
    info('Could not access your MIDI devices.');
}
coordinator.scheduleFlip();
const PLAYBACK_TIMER = "playbackTimer";
const DRAW_TIMER = "drawTimer";
const worker = new Worker("timer-worker.js");
worker.onmessage = (e) => {
    const data = e.data;
    if (data == PLAYBACK_TIMER) {
        coordinator.onPlaybackTimer();
        return;
    }
    if (data == DRAW_TIMER) {
        coordinator.onDraw();
        return;
    }
};
worker.postMessage({ action: "setInterval", interval: 10, result: PLAYBACK_TIMER });
worker.postMessage({ action: "setInterval", interval: 1000.0 / FPS, result: DRAW_TIMER });
navigator.requestMIDIAccess()
    .then(onMIDISuccess, onMIDIFailure);
$(window).on('keydown', (ev) => coordinator.onKeyDown(ev.originalEvent));
$(window).on('beforeunload', () => 'Are you sure you want to leave?');
$(window).on('unload', () => {
    coordinator.close();
});
$("body").on("dragover", function (ev) {
    ev.preventDefault();
});
function loadMidiFile(file) {
    info("loading from: " + file.name);
    coordinator.reset();
    loadMidi(file).then((events) => {
        debug("File loaded", events);
        recorder.setEvents(events);
    }).catch((error) => {
        info("Failed loading from " + file.name + ": " + error);
        console.log(error);
    });
}
$("body").on("drop", function (ev) {
    ev.preventDefault();
    let oev = ev.originalEvent;
    console.log("File dropped", oev.dataTransfer.files[0], oev.dataTransfer);
    loadMidiFile(oev.dataTransfer.files[0]);
});
$("#open_file").on("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) {
        return; // canceled
    }
    console.log("File selected", ev);
    loadMidiFile(file);
});
$("#save_as_filename").keydown((ev) => {
    console.log(ev);
    ev.stopPropagation();
    if (ev.code == 'Enter') { // enter
        coordinator.do_download();
        ev.preventDefault();
    }
});
$("#save").on('click', (_ev) => {
    coordinator.do_download();
});
$("#save_as_box").on('popbox_closing', (_ev) => {
    $("#save_as_filename").trigger('blur'); // unfocus, so shortcut keys will start working again
});
