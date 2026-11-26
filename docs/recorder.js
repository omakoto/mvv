/**
 * @file recorder.ts
 * @description Implements MIDI event filtering, the rolling always-recording buffer,
 * and the main Recorder state machine (recording, playback, seeking, section detection,
 * trimming, and SMF export).
 */
'use strict';
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
    #events = [];
    #now;
    #maxSeconds;
    #maxEvents;
    constructor(options = {}) {
        this.#now = options.now ?? (() => performance.now());
        this.#maxSeconds = options.maxSeconds ?? ALWAYS_RECORD_SECONDS;
        this.#maxEvents = options.maxEvents ?? ALWAYS_RECORD_MAX_EVENTS;
    }
    recordEvent(ev) {
        if (!recordFilter(ev)) {
            return;
        }
        // Add event with its original timestamp.
        this.#events.push(ev);
        // Prune old events outside the rolling time window.
        const cutoffTimestamp = this.#now() - (this.#maxSeconds * 1000);
        let i = 0;
        for (; i < this.#events.length; i++) {
            if (this.#events[i].timestamp >= cutoffTimestamp) {
                break;
            }
        }
        if (i > 0) {
            this.#events.splice(0, i);
        }
        // Trim oldest quarter if the event count cap is exceeded.
        if (this.#events.length > this.#maxEvents) {
            this.#events.splice(0, Math.floor(this.#maxEvents / 4));
            console.log("Always recording: trimmed down events to " + this.#events.length);
        }
    }
    clear() {
        this.#events = [];
    }
    getEvents() {
        return this.#events;
    }
    get isAvailable() {
        return this.#events.length > 0;
    }
}
export var RecorderState;
(function (RecorderState) {
    RecorderState[RecorderState["Idle"] = 0] = "Idle";
    RecorderState[RecorderState["Playing"] = 1] = "Playing";
    RecorderState[RecorderState["Pausing"] = 2] = "Pausing";
    RecorderState[RecorderState["Recording"] = 3] = "Recording";
})(RecorderState || (RecorderState = {}));
export class Recorder {
    #events = [];
    #state = RecorderState.Idle;
    #sections = [];
    #recordingStartTimestamp = 0;
    #currentPlaybackTimestamp = 0;
    #nextPlaybackIndex = 0;
    #lastEventTimestamp = 0;
    #isDirty = false;
    #timer = null;
    #callbacks;
    constructor(callbacks = {}) {
        this.#callbacks = { ...callbacks };
    }
    setCallbacks(callbacks) {
        this.#callbacks = { ...this.#callbacks, ...callbacks };
    }
    startRecording() {
        if (this.isRecording) {
            return false;
        }
        this.stopPlaying();
        this.#startRecording();
        return true;
    }
    stopRecording() {
        if (!this.isRecording) {
            return false;
        }
        this.#stopRecording();
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
        this.#startPlaying(pauseRightAway);
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
        this.#stopPlaying();
        return true;
    }
    pause() {
        if (!this.isPlaying) {
            return false;
        }
        this.#state = RecorderState.Pausing;
        this.#callbacks.onStatusChanged?.(this.#state);
        this.#stopTimer();
        return true;
    }
    unpause() {
        if (!this.isPausing) {
            return false;
        }
        this.#state = RecorderState.Playing;
        this.#callbacks.onStatusChanged?.(this.#state);
        this.#startTimer();
        return true;
    }
    get currentState() {
        return this.#state;
    }
    get isDirty() {
        return this.#isDirty && this.isAnythingRecorded;
    }
    get isIdle() {
        return this.#state === RecorderState.Idle;
    }
    get isRecording() {
        return this.#state === RecorderState.Recording;
    }
    get isPlaying() {
        return this.#state === RecorderState.Playing;
    }
    get isPausing() {
        return this.#state === RecorderState.Pausing;
    }
    get isAnythingRecorded() {
        return this.#events.length > 0;
    }
    get isBeginning() {
        return this.#nextPlaybackIndex === 0;
    }
    get isAfterLast() {
        return this.#events.length <= this.#nextPlaybackIndex;
    }
    get currentPlaybackTimestamp() {
        return !this.isAnythingRecorded ? 0 : this.#currentPlaybackTimestamp;
    }
    get lastEventTimestamp() {
        return !this.isAnythingRecorded ? 0 : this.#lastEventTimestamp;
    }
    get sections() {
        return this.#sections;
    }
    getEvents() {
        return this.#events;
    }
    #startRecording() {
        info("Recording started");
        this.#state = RecorderState.Recording;
        this.#events = [];
        this.#isDirty = true;
        this.#callbacks.onStatusChanged?.(this.#state);
    }
    #stopRecording() {
        info("Recording stopped (" + this.#events.length + " events recorded)");
        this.#state = RecorderState.Idle;
        this.#detectSections();
        this.#callbacks.onStatusChanged?.(this.#state);
    }
    #startPlaying(pauseRightAway = false) {
        info("Playback started");
        this.#state = RecorderState.Playing;
        this.#currentPlaybackTimestamp = 0;
        this.#nextPlaybackIndex = 0;
        if (!pauseRightAway) {
            this.#startTimer();
        }
        this.#callbacks.onStatusChanged?.(this.#state);
        this.#callbacks.onStartAnimationLoop?.();
    }
    #stopPlaying() {
        info("Playback stopped");
        this.#state = RecorderState.Idle;
        this.#currentPlaybackTimestamp = 0;
        this.#callbacks.onResetMidi?.();
        this.#stopTimer();
        this.#callbacks.onStatusChanged?.(this.#state);
    }
    #startTimer() {
        if (this.#timer === null) {
            const resolutionMs = this.#callbacks.playbackResolutionMs ?? (1000 / 120);
            this.#timer = setInterval(() => {
                this.#callbacks.onPlaybackTimer?.();
            }, resolutionMs);
            console.log("Timer started");
        }
    }
    #stopTimer() {
        if (this.#timer !== null) {
            console.log("Timer stopped");
            clearInterval(this.#timer);
            this.#timer = null;
        }
    }
    recordEvent(ev) {
        if (!this.isRecording) {
            return false;
        }
        if (!recordFilter(ev)) {
            return false;
        }
        if (this.#events.length === 0) {
            this.#recordingStartTimestamp = ev.timestamp;
        }
        const ts = ev.timestamp - this.#recordingStartTimestamp;
        this.#events.push(ev.withTimestamp(ts));
        this.#lastEventTimestamp = ts;
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
        if (this.isRecording) {
            return;
        }
        const wasPlaying = this.isPlaying;
        if (wasPlaying) {
            this.pause();
        }
        const oldTimestamp = this.currentPlaybackTimestamp;
        let newTimestamp = oldTimestamp + deltaMilliseconds;
        newTimestamp = Math.max(0, Math.min(newTimestamp, this.#lastEventTimestamp));
        this.#callbacks.onResetMidi?.();
        // Replay the latest non-note MIDI voice messages (0xAn..0xEn) up to the target time.
        // Key by (data0 << 8) | data1 for control changes (0xBn), or (data0 << 8) otherwise.
        const events = new Map();
        for (const ev of this.#events) {
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
            this.#callbacks.onPlaybackMidiEvent?.(ev);
        }
        this.#nextPlaybackIndex = 0;
        this.#moveUpToTimestamp(newTimestamp, null);
        if (wasPlaying) {
            this.unpause();
        }
    }
    playbackUpToNow(deltaMs) {
        if (!this.isPlaying) {
            return;
        }
        const ts = this.#currentPlaybackTimestamp + deltaMs;
        let noteChanged = false;
        const stillPlaying = this.#moveUpToTimestamp(ts, (ev) => {
            this.#callbacks.onPlaybackMidiEvent?.(ev);
            if (ev.isNoteOn || ev.isNoteOff) {
                noteChanged = true;
            }
        });
        if (noteChanged) {
            this.#callbacks.onNoteChanged?.();
        }
        if (!stillPlaying) {
            this.stopPlaying();
        }
    }
    #moveUpToTimestamp(timestamp, callback) {
        const limit = this.#lastEventTimestamp + 5000;
        for (;;) {
            if (this.isAfterLast) {
                if (timestamp > limit) {
                    this.#currentPlaybackTimestamp = limit;
                    return false;
                }
                // Continue briefly past the final event so trailing decay and scrubbing feel natural.
                this.#currentPlaybackTimestamp = timestamp;
                return true;
            }
            const ev = this.#events[this.#nextPlaybackIndex];
            if (ev.timestamp >= timestamp) {
                this.#currentPlaybackTimestamp = timestamp;
                return true;
            }
            this.#nextPlaybackIndex++;
            this.#currentPlaybackTimestamp = ev.timestamp;
            if (callback) {
                callback(ev);
            }
        }
    }
    buildSmf() {
        const wr = new SmfWriter();
        if (this.#events.length === 0) {
            return wr;
        }
        // Sort by timestamp and track rounded integer milliseconds to avoid cumulative
        // float truncation drift or negative deltas from multi-device timestamps.
        const sorted = [...this.#events].sort((a, b) => a.timestamp - b.timestamp);
        let prevMs = Math.max(0, Math.round(sorted[0].timestamp));
        sorted.forEach((ev) => {
            debug(ev.timestamp, ev.getDataAsArray());
            const targetMs = Math.max(prevMs, Math.round(ev.timestamp));
            const delta = targetMs - prevMs;
            wr.writeMessage(delta, ev.getDataAsArray());
            prevMs = targetMs;
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
        this.#isDirty = false;
    }
    setEvents(events) {
        this.stopPlaying();
        this.stopRecording();
        this.#events = events;
        this.#isDirty = false;
        if (events.length === 0) {
            info("File contains no events.");
            this.#lastEventTimestamp = 0;
            this.#sections = [];
            return;
        }
        const lastEvent = events[events.length - 1];
        this.#lastEventTimestamp = lastEvent.timestamp;
        this.#detectSections();
        const message = "Load completed: " + int(lastEvent.timestamp / 1000) + " seconds, " + events.length + " events";
        info(message);
        this.moveToStart();
    }
    #detectSections() {
        this.#sections = [];
        if (this.#events.length === 0) {
            return;
        }
        // A new section begins with a note-on after at least this duration of silence.
        const silenceThresholdMs = 1500;
        const notesOn = new Set();
        let lastNoteOffTime = 0;
        const firstNoteOn = this.#events.find(ev => ev.isNoteOn);
        if (firstNoteOn) {
            this.#sections.push(firstNoteOn.timestamp);
        }
        else {
            return;
        }
        for (const ev of this.#events) {
            if (ev.isNoteOn) {
                if (notesOn.size === 0) {
                    const silenceDuration = ev.timestamp - lastNoteOffTime;
                    if (silenceDuration > silenceThresholdMs) {
                        this.#sections.push(ev.timestamp);
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
        this.#sections = [...new Set(this.#sections)].sort((a, b) => a - b);
        console.log("Detected " + this.#sections.length + " sections: " + this.#sections.map(s => (s / 1000).toFixed(1)).join(', '));
    }
    jumpToNextSection() {
        if (this.#sections.length === 0) {
            return;
        }
        const currentTimestamp = this.currentPlaybackTimestamp;
        for (const sectionStart of this.#sections) {
            // Use a 1ms epsilon so sitting exactly on a section start advances to the next one.
            if (sectionStart > currentTimestamp + 1) {
                this.adjustPlaybackPosition(sectionStart - currentTimestamp);
                return;
            }
        }
    }
    jumpToPreviousSection() {
        if (this.#sections.length === 0) {
            return;
        }
        const currentTimestamp = this.currentPlaybackTimestamp;
        const threshold = 500;
        let currentSectionIndex = -1;
        for (let i = 0; i < this.#sections.length; i++) {
            if (this.#sections[i] <= currentTimestamp) {
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
        const currentSectionStart = this.#sections[currentSectionIndex];
        if ((currentTimestamp - currentSectionStart) < threshold && currentSectionIndex > 0) {
            const previousSectionStart = this.#sections[currentSectionIndex - 1];
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
        if (this.#events.length === 0 || this.#currentPlaybackTimestamp === 0) {
            info("Nothing to trim.");
            return;
        }
        const trimTimestamp = this.#currentPlaybackTimestamp;
        const firstEventIndex = this.#events.findIndex(ev => ev.timestamp >= trimTimestamp);
        if (firstEventIndex <= 0) {
            info("Nothing to trim before the current position.");
            return;
        }
        const trimmedEvents = this.#events.splice(0, firstEventIndex);
        info(`Trimmed ${trimmedEvents.length} events.`);
        if (this.#events.length === 0) {
            this.#lastEventTimestamp = 0;
            this.#sections = [];
            this.#isDirty = true;
            this.moveToStart();
            return;
        }
        const offset = this.#events[0].timestamp;
        for (const event of this.#events) {
            event.shiftTime(-offset);
        }
        this.#lastEventTimestamp -= offset;
        this.#isDirty = true;
        this.#detectSections();
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
        this.#isDirty = true;
        this.startPaused();
        this.adjustPlaybackPosition(this.lastEventTimestamp - 3000);
        info("" + newEvents.length + " events ready for replay.");
    }
}
//# sourceMappingURL=recorder.js.map