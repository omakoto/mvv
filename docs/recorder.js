/**
 * @file recorder.ts
 * @description Implements MIDI event filtering, the rolling always-recording buffer,
 * and the main Recorder state machine (recording, playback, seeking, section detection,
 * trimming, and SMF export).
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
var _AlwaysRecorder_events, _AlwaysRecorder_now, _AlwaysRecorder_maxSeconds, _AlwaysRecorder_maxEvents, _Recorder_instances, _Recorder_events, _Recorder_state, _Recorder_sections, _Recorder_recordingStartTimestamp, _Recorder_currentPlaybackTimestamp, _Recorder_nextPlaybackIndex, _Recorder_lastEventTimestamp, _Recorder_isDirty, _Recorder_timer, _Recorder_callbacks, _Recorder_startRecording, _Recorder_stopRecording, _Recorder_startPlaying, _Recorder_stopPlaying, _Recorder_startTimer, _Recorder_stopTimer, _Recorder_moveUpToTimestamp, _Recorder_detectSections;
import { ALWAYS_RECORD_MAX_EVENTS, ALWAYS_RECORD_SECONDS, int } from './config.js';
import { SmfWriter } from './smf.js';
import { DEBUG, debug, info } from './util.js';
export function recordFilter(ev) {
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
export class AlwaysRecorder {
    constructor(options = {}) {
        var _a, _b, _c;
        _AlwaysRecorder_events.set(this, []);
        _AlwaysRecorder_now.set(this, void 0);
        _AlwaysRecorder_maxSeconds.set(this, void 0);
        _AlwaysRecorder_maxEvents.set(this, void 0);
        __classPrivateFieldSet(this, _AlwaysRecorder_now, (_a = options.now) !== null && _a !== void 0 ? _a : (() => performance.now()), "f");
        __classPrivateFieldSet(this, _AlwaysRecorder_maxSeconds, (_b = options.maxSeconds) !== null && _b !== void 0 ? _b : ALWAYS_RECORD_SECONDS, "f");
        __classPrivateFieldSet(this, _AlwaysRecorder_maxEvents, (_c = options.maxEvents) !== null && _c !== void 0 ? _c : ALWAYS_RECORD_MAX_EVENTS, "f");
    }
    recordEvent(ev) {
        if (!recordFilter(ev)) {
            return;
        }
        // Add event with its original timestamp.
        __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").push(ev);
        // Prune old events outside the rolling time window.
        const cutoffTimestamp = __classPrivateFieldGet(this, _AlwaysRecorder_now, "f").call(this) - (__classPrivateFieldGet(this, _AlwaysRecorder_maxSeconds, "f") * 1000);
        let i = 0;
        for (; i < __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").length; i++) {
            if (__classPrivateFieldGet(this, _AlwaysRecorder_events, "f")[i].timestamp >= cutoffTimestamp) {
                break;
            }
        }
        if (i > 0) {
            __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").splice(0, i);
        }
        // Trim oldest quarter if the event count cap is exceeded.
        if (__classPrivateFieldGet(this, _AlwaysRecorder_events, "f").length > __classPrivateFieldGet(this, _AlwaysRecorder_maxEvents, "f")) {
            __classPrivateFieldGet(this, _AlwaysRecorder_events, "f").splice(0, Math.floor(__classPrivateFieldGet(this, _AlwaysRecorder_maxEvents, "f") / 4));
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
_AlwaysRecorder_events = new WeakMap(), _AlwaysRecorder_now = new WeakMap(), _AlwaysRecorder_maxSeconds = new WeakMap(), _AlwaysRecorder_maxEvents = new WeakMap();
export var RecorderState;
(function (RecorderState) {
    RecorderState[RecorderState["Idle"] = 0] = "Idle";
    RecorderState[RecorderState["Playing"] = 1] = "Playing";
    RecorderState[RecorderState["Pausing"] = 2] = "Pausing";
    RecorderState[RecorderState["Recording"] = 3] = "Recording";
})(RecorderState || (RecorderState = {}));
export class Recorder {
    constructor(callbacks = {}) {
        _Recorder_instances.add(this);
        _Recorder_events.set(this, []);
        _Recorder_state.set(this, RecorderState.Idle);
        _Recorder_sections.set(this, []);
        _Recorder_recordingStartTimestamp.set(this, 0);
        _Recorder_currentPlaybackTimestamp.set(this, 0);
        _Recorder_nextPlaybackIndex.set(this, 0);
        _Recorder_lastEventTimestamp.set(this, 0);
        _Recorder_isDirty.set(this, false);
        _Recorder_timer.set(this, null);
        _Recorder_callbacks.set(this, void 0);
        __classPrivateFieldSet(this, _Recorder_callbacks, Object.assign({}, callbacks), "f");
    }
    setCallbacks(callbacks) {
        __classPrivateFieldSet(this, _Recorder_callbacks, Object.assign(Object.assign({}, __classPrivateFieldGet(this, _Recorder_callbacks, "f")), callbacks), "f");
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
        var _a, _b;
        if (!this.isPlaying) {
            return false;
        }
        __classPrivateFieldSet(this, _Recorder_state, RecorderState.Pausing, "f");
        (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onStatusChanged) === null || _b === void 0 ? void 0 : _b.call(_a, __classPrivateFieldGet(this, _Recorder_state, "f"));
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_stopTimer).call(this);
        return true;
    }
    unpause() {
        var _a, _b;
        if (!this.isPausing) {
            return false;
        }
        __classPrivateFieldSet(this, _Recorder_state, RecorderState.Playing, "f");
        (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onStatusChanged) === null || _b === void 0 ? void 0 : _b.call(_a, __classPrivateFieldGet(this, _Recorder_state, "f"));
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
    getEvents() {
        return __classPrivateFieldGet(this, _Recorder_events, "f");
    }
    recordEvent(ev) {
        if (!this.isRecording) {
            return false;
        }
        if (!recordFilter(ev)) {
            return false;
        }
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0) {
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
     * Core seeking method for fast-forward, rewind, and scrubbing.
     * Re-establishes the state of all MIDI controllers at the destination.
     */
    adjustPlaybackPosition(deltaMilliseconds) {
        var _a, _b, _c, _d;
        if (this.isRecording) {
            return;
        }
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.pause();
        }
        const oldTimestamp = this.currentPlaybackTimestamp;
        let newTimestamp = oldTimestamp + deltaMilliseconds;
        newTimestamp = Math.max(0, Math.min(newTimestamp, __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f")));
        (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onResetMidi) === null || _b === void 0 ? void 0 : _b.call(_a);
        // Replay the latest non-note MIDI voice messages (0xAn..0xEn) up to the target time.
        // Key by (data0 << 8) | data1 for control changes (0xBn), or (data0 << 8) otherwise.
        const events = new Map();
        for (const ev of __classPrivateFieldGet(this, _Recorder_events, "f")) {
            if (ev.timestamp >= newTimestamp) {
                break;
            }
            if (ev.status < 0xA0 || ev.status >= 0xF0) {
                continue;
            }
            if (DEBUG) {
                debug("Storing: ", ev.data0, ev.data1, ev.data2);
            }
            const key = (ev.data0 << 8) | (ev.isCC ? ev.data1 : 0);
            events.set(key, ev);
        }
        for (const ev of events.values()) {
            if (DEBUG) {
                debug("Replying: ", ev.data0, ev.data1, ev.data2);
            }
            (_d = (_c = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onPlaybackMidiEvent) === null || _d === void 0 ? void 0 : _d.call(_c, ev);
        }
        __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, newTimestamp, null);
        if (wasPlaying) {
            this.unpause();
        }
    }
    playbackUpToNow(deltaMs) {
        var _a, _b;
        if (!this.isPlaying) {
            return;
        }
        const ts = __classPrivateFieldGet(this, _Recorder_currentPlaybackTimestamp, "f") + deltaMs;
        let noteChanged = false;
        const stillPlaying = __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_moveUpToTimestamp).call(this, ts, (ev) => {
            var _a, _b;
            (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onPlaybackMidiEvent) === null || _b === void 0 ? void 0 : _b.call(_a, ev);
            if (ev.isNoteOn || ev.isNoteOff) {
                noteChanged = true;
            }
        });
        if (noteChanged) {
            (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onNoteChanged) === null || _b === void 0 ? void 0 : _b.call(_a);
        }
        if (!stillPlaying) {
            this.stopPlaying();
        }
    }
    buildSmf() {
        const wr = new SmfWriter();
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0) {
            return wr;
        }
        let lastTimestamp = __classPrivateFieldGet(this, _Recorder_events, "f")[0].timestamp;
        __classPrivateFieldGet(this, _Recorder_events, "f").forEach((ev) => {
            debug(ev.timestamp, ev.getDataAsArray());
            const delta = ev.timestamp - lastTimestamp;
            wr.writeMessage(delta, ev.getDataAsArray());
            lastTimestamp = ev.timestamp;
        });
        return wr;
    }
    download(filename) {
        if (!this.isAnythingRecorded) {
            info("Nothing recorded yet");
            return;
        }
        console.log("Converting to the SMF format...");
        const wr = this.buildSmf();
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
        const message = "Load completed: " + int(lastEvent.timestamp / 1000) + " seconds, " + events.length + " events";
        info(message);
        this.moveToStart();
    }
    jumpToNextSection() {
        if (__classPrivateFieldGet(this, _Recorder_sections, "f").length === 0) {
            return;
        }
        const currentTimestamp = this.currentPlaybackTimestamp;
        for (const sectionStart of __classPrivateFieldGet(this, _Recorder_sections, "f")) {
            // Use a 1ms epsilon so sitting exactly on a section start advances to the next one.
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
        const threshold = 500;
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
            const previousSectionStart = __classPrivateFieldGet(this, _Recorder_sections, "f")[currentSectionIndex - 1];
            this.adjustPlaybackPosition(previousSectionStart - currentTimestamp);
        }
        else {
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
        if (firstEventIndex <= 0) {
            info("Nothing to trim before the current position.");
            return;
        }
        const trimmedEvents = __classPrivateFieldGet(this, _Recorder_events, "f").splice(0, firstEventIndex);
        info(`Trimmed ${trimmedEvents.length} events.`);
        if (__classPrivateFieldGet(this, _Recorder_events, "f").length === 0) {
            __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, 0, "f");
            __classPrivateFieldSet(this, _Recorder_sections, [], "f");
            __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
            this.moveToStart();
            return;
        }
        const offset = __classPrivateFieldGet(this, _Recorder_events, "f")[0].timestamp;
        for (const event of __classPrivateFieldGet(this, _Recorder_events, "f")) {
            event.shiftTime(-offset);
        }
        __classPrivateFieldSet(this, _Recorder_lastEventTimestamp, __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f") - offset, "f");
        __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_detectSections).call(this);
        this.moveToStart();
    }
    copyFromAlwaysRecorder(alwaysRecorder) {
        const eventsToCopy = alwaysRecorder.getEvents();
        if (eventsToCopy.length === 0) {
            info("No events in the buffer to copy.");
            return;
        }
        this.stopPlaying();
        this.stopRecording();
        // Normalize timestamps to start from 0.
        const firstTimestamp = eventsToCopy[0].timestamp;
        const newEvents = eventsToCopy.map(ev => ev.withTimestamp(ev.timestamp - firstTimestamp));
        this.setEvents(newEvents);
        __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
        this.startPaused();
        this.adjustPlaybackPosition(this.lastEventTimestamp - 3000);
        info("" + newEvents.length + " events ready for replay.");
    }
}
_Recorder_events = new WeakMap(), _Recorder_state = new WeakMap(), _Recorder_sections = new WeakMap(), _Recorder_recordingStartTimestamp = new WeakMap(), _Recorder_currentPlaybackTimestamp = new WeakMap(), _Recorder_nextPlaybackIndex = new WeakMap(), _Recorder_lastEventTimestamp = new WeakMap(), _Recorder_isDirty = new WeakMap(), _Recorder_timer = new WeakMap(), _Recorder_callbacks = new WeakMap(), _Recorder_instances = new WeakSet(), _Recorder_startRecording = function _Recorder_startRecording() {
    var _a, _b;
    info("Recording started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Recording, "f");
    __classPrivateFieldSet(this, _Recorder_events, [], "f");
    __classPrivateFieldSet(this, _Recorder_isDirty, true, "f");
    (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onStatusChanged) === null || _b === void 0 ? void 0 : _b.call(_a, __classPrivateFieldGet(this, _Recorder_state, "f"));
}, _Recorder_stopRecording = function _Recorder_stopRecording() {
    var _a, _b;
    info("Recording stopped (" + __classPrivateFieldGet(this, _Recorder_events, "f").length + " events recorded)");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_detectSections).call(this);
    (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onStatusChanged) === null || _b === void 0 ? void 0 : _b.call(_a, __classPrivateFieldGet(this, _Recorder_state, "f"));
}, _Recorder_startPlaying = function _Recorder_startPlaying(pauseRightAway = false) {
    var _a, _b, _c, _d;
    info("Playback started");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Playing, "f");
    __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, 0, "f");
    __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, 0, "f");
    if (!pauseRightAway) {
        __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_startTimer).call(this);
    }
    (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onStatusChanged) === null || _b === void 0 ? void 0 : _b.call(_a, __classPrivateFieldGet(this, _Recorder_state, "f"));
    (_d = (_c = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onStartAnimationLoop) === null || _d === void 0 ? void 0 : _d.call(_c);
}, _Recorder_stopPlaying = function _Recorder_stopPlaying() {
    var _a, _b, _c, _d;
    info("Playback stopped");
    __classPrivateFieldSet(this, _Recorder_state, RecorderState.Idle, "f");
    __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, 0, "f");
    (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onResetMidi) === null || _b === void 0 ? void 0 : _b.call(_a);
    __classPrivateFieldGet(this, _Recorder_instances, "m", _Recorder_stopTimer).call(this);
    (_d = (_c = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onStatusChanged) === null || _d === void 0 ? void 0 : _d.call(_c, __classPrivateFieldGet(this, _Recorder_state, "f"));
}, _Recorder_startTimer = function _Recorder_startTimer() {
    var _a;
    if (__classPrivateFieldGet(this, _Recorder_timer, "f") === null) {
        const resolutionMs = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f").playbackResolutionMs) !== null && _a !== void 0 ? _a : (1000 / 120);
        __classPrivateFieldSet(this, _Recorder_timer, setInterval(() => {
            var _a, _b;
            (_b = (_a = __classPrivateFieldGet(this, _Recorder_callbacks, "f")).onPlaybackTimer) === null || _b === void 0 ? void 0 : _b.call(_a);
        }, resolutionMs), "f");
        console.log("Timer started");
    }
}, _Recorder_stopTimer = function _Recorder_stopTimer() {
    if (__classPrivateFieldGet(this, _Recorder_timer, "f") !== null) {
        console.log("Timer stopped");
        clearInterval(__classPrivateFieldGet(this, _Recorder_timer, "f"));
        __classPrivateFieldSet(this, _Recorder_timer, null, "f");
    }
}, _Recorder_moveUpToTimestamp = function _Recorder_moveUpToTimestamp(timestamp, callback) {
    var _a;
    const limit = __classPrivateFieldGet(this, _Recorder_lastEventTimestamp, "f") + 5000;
    for (;;) {
        if (this.isAfterLast) {
            if (timestamp > limit) {
                __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, limit, "f");
                return false;
            }
            // Continue briefly past the final event so trailing decay and scrubbing feel natural.
            __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, timestamp, "f");
            return true;
        }
        const ev = __classPrivateFieldGet(this, _Recorder_events, "f")[__classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f")];
        if (ev.timestamp >= timestamp) {
            __classPrivateFieldSet(this, _Recorder_currentPlaybackTimestamp, timestamp, "f");
            return true;
        }
        __classPrivateFieldSet(this, _Recorder_nextPlaybackIndex, (_a = __classPrivateFieldGet(this, _Recorder_nextPlaybackIndex, "f"), _a++, _a), "f");
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
    // A new section begins with a note-on after at least this duration of silence.
    const silenceThresholdMs = 1500;
    const notesOn = new Set();
    let lastNoteOffTime = 0;
    const firstNoteOn = __classPrivateFieldGet(this, _Recorder_events, "f").find(ev => ev.isNoteOn);
    if (firstNoteOn) {
        __classPrivateFieldGet(this, _Recorder_sections, "f").push(firstNoteOn.timestamp);
    }
    else {
        return;
    }
    for (const ev of __classPrivateFieldGet(this, _Recorder_events, "f")) {
        if (ev.isNoteOn) {
            if (notesOn.size === 0) {
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
    __classPrivateFieldSet(this, _Recorder_sections, [...new Set(__classPrivateFieldGet(this, _Recorder_sections, "f"))].sort((a, b) => a - b), "f");
    console.log("Detected " + __classPrivateFieldGet(this, _Recorder_sections, "f").length + " sections: " + __classPrivateFieldGet(this, _Recorder_sections, "f").map(s => (s / 1000).toFixed(1)).join(', '));
};
//# sourceMappingURL=recorder.js.map