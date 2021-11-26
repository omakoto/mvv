'use strict';

// 2D game with canvas example: https://github.com/end3r/Gamedev-Canvas-workshop/blob/gh-pages/lesson10.html
// Get screen size: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
// and window.screen.{width,height{


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
    let r, g, b, i, f, p, q, t;
    if (arguments.length === 1) {
        s = h.s, v = h.v, h = h.h;
    }
    i = Math.floor(h * 6);
    f = h * 6 - i;
    p = v * (1 - s);
    q = v * (1 - f * s);
    t = v * (1 - (1 - f) * s);
    switch (i % 6) {
        case 0: r = v, g = t, b = p; break;
        case 1: r = q, g = v, b = p; break;
        case 2: r = p, g = v, b = t; break;
        case 3: r = p, g = q, b = v; break;
        case 4: r = t, g = p, b = v; break;
        case 5: r = v, g = p, b = q; break;
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
    } else {
        $(selector).hide();
    }
}

// Logic

class Renderer {
    #BAR_SUB_LINE_WIDTH = s(2);
    #BAR_BASE_LINE_COLOR = [200, 255, 200];
    #ROLL_SCROLL_AMOUNT = s(2);

    #W; // Width in canvas pixels
    #H; // Height in canvas pixels
    #BAR_H;
    #ROLL_H;
    #MIN_NOTE = 21;
    #MAX_NOTE = 108;

    #cbar;
    #bar;
    #croll;
    #roll;

    #cbar2;
    #bar2;
    #croll2;
    #roll2;

    #frameCount = 0;

    constructor() {
        // Adjust CSS with the constants.
        $("body").css("padding", (MARGIN * 100) + "%");
        $("#canvases").css("width", (100 - MARGIN * 200) + "%");
        $("#bar2").css("height", (BAR_RATIO * 100) + "%");
        $("#roll2").css("height", (100 - BAR_RATIO * 100) + "%");

        this.#W = s(screen.width * (1 - MARGIN * 2));
        this.#H = s(screen.height * (1 - MARGIN * 2));
        this.#BAR_H = int(this.#H * BAR_RATIO);
        this.#ROLL_H = this.#H - this.#BAR_H;

        const colorSpace = "srgb"; // "display-p3";
        let options = { colorSpace: colorSpace};

        this.#cbar = document.getElementById("bar");
        this.#bar = this.#cbar.getContext("2d", options);

        this.#croll = document.getElementById("roll");
        this.#roll = this.#croll.getContext("2d", options);

        this.#cbar2 = document.getElementById("bar2");
        this.#bar2 = this.#cbar2.getContext("2d", options);

        this.#croll2 = document.getElementById("roll2");
        this.#roll2 = this.#croll2.getContext("2d", options);

        this.#cbar.width = this.#W;
        this.#cbar.height = this.#BAR_H;
        this.#cbar2.width = this.#W;
        this.#cbar2.height = this.#BAR_H;

        this.#croll.width = this.#W;
        this.#croll.height = this.#ROLL_H;
        this.#croll2.width = this.#W;
        this.#croll2.height = this.#ROLL_H;
    }

    getBarColor(velocity) {
        let MAX_H = 0.4
        let h = MAX_H - (MAX_H * velocity / 127)
        let s = 0.9;
        let l = 1;
        return hsvToRgb(h, s, l)
    }

    getOnColor(count) {
        let h = Math.max(0, 0.2 - count * 0.03)
        let s = Math.min(1, 0.3 + 0.2 * count)
        let l = Math.min(1, 0.4 + 0.2 * count)
        return hsvToRgb(h, s, l)
    }

    getPedalColor(value) {
        if (value <= 0) {
            return RGB_BLACK;
        }
        let h = 0.65 - (0.2 * value / 127);
        let s = 0.7;
        let l = 0.2;
        return hsvToRgb(h, s, l)
    }


    drawSubLine(percent) {
        this.#bar.fillStyle = rgbToStr(this.getBarColor(127 * (1 - percent)));
        this.#bar.fillRect(0, this.#BAR_H * percent, this.#W, this.#BAR_SUB_LINE_WIDTH)
    }

    onDraw(now) {
        this.#frameCount++;

        // Scroll the roll.
        this.#roll.drawImage(this.#croll, 0, this.#ROLL_SCROLL_AMOUNT);
        this.#roll.fillStyle = rgbToStr(this.getPedalColor(midiRenderingStatus.pedal));
        this.#roll.fillRect(0, 0, this.#W, this.#ROLL_SCROLL_AMOUNT);

        // Clear the bar area.
        this.#bar.fillStyle = 'black';
        this.#bar.fillRect(0, 0, this.#W, this.#H);

        // Individual bar width
        let bw = this.#W / (this.#MAX_NOTE - this.#MIN_NOTE + 1) - 1;

        // "On" line
        if (midiRenderingStatus.onNoteCount > 0) {
            this.#roll.fillStyle = rgbToStr(this.getOnColor(midiRenderingStatus.onNoteCount));
            this.#roll.fillRect(0, this.#ROLL_SCROLL_AMOUNT - s(2), this.#W, s(2));
        }

        // Sub lines.
        this.drawSubLine(0.25);
        this.drawSubLine(0.5);
        this.drawSubLine(0.7);

        for (let i = this.#MIN_NOTE; i <= this.#MAX_NOTE; i++) {
            let note = midiRenderingStatus.getNote(i);
            if (!note[0]) {
                continue;
            }
            let color = this.getBarColor(note[1])
            let colorStr = rgbToStr(color);

            // bar left
            let bl = this.#W * (i - this.#MIN_NOTE) / (this.#MAX_NOTE - this.#MIN_NOTE + 1)

            // bar height
            let bh = this.#BAR_H * note[1] / 127;

            this.#bar.fillStyle = colorStr;
            this.#bar.fillRect(bl, this.#BAR_H, bw, -bh);

            this.#roll.fillStyle = colorStr;
            this.#roll.fillRect(bl, 0, bw, this.#ROLL_SCROLL_AMOUNT);
        }

        // Base line.
        this.#bar.fillStyle = rgbToStr(this.#BAR_BASE_LINE_COLOR);
        this.#bar.fillRect(0, this.#BAR_H, this.#W, -this.#BAR_SUB_LINE_WIDTH)
    }

    flip() {
        this.#bar2.drawImage(this.#cbar, 0, 0);
        this.#roll2.drawImage(this.#croll, 0, 0);
    }

    toggleMute() {
        $('#canvases').toggle();
    }

    show() {
        $('#canvases').show();
    }
}

const renderer = new Renderer();

class MidiRenderingStatus {
    #notes;
    #pedal = 0;
    #onNoteCount = 0;

    constructor() {
        this.reset();
    }

    onMidiMessage(ev) {
        let d = ev.data;

        if (d[0] == 144 && d[2] > 0) { // Note on
            this.#onNoteCount++;
            this.#notes[d[1]][0] = true;
            this.#notes[d[1]][1] = d[2];
        } else if ((d[0] == 128) || (d[0] == 144 && d[2] == 0)) { // Note off
            this.#notes[d[1]][0] = false;
        } else if (d[0] == 176 && d[1] == 64) { // Pedal
            this.#pedal = d[2];
        }
    }

    reset() {
        this.#notes = [];
        for (let i = 0; i < NOTES_COUNT; i++) {
            this.#notes[i] = [false, 0]; // note on/off, velocity
        }
        this.#pedal = 0;
        this.#onNoteCount = 0;
    }

    afterDraw(now) {
        this.#onNoteCount = 0;
    }

    get onNoteCount() {
        return this.#onNoteCount;
    }

    get pedal() {
        return this.#pedal;
    }

    getNote(note) {
        return this.#notes[note];
    }
}

const midiRenderingStatus = new MidiRenderingStatus();

class MidiOutputManager {
    #device = null;
    constructor() {
    }

    setMidiOut(device) {
        console.log("MIDI output device set:", device);
        this.#device = device;
        midiOutputManager.reset();
    }

    reset() {
        if (!this.#device) {
            return;
        }
        if (this.#device.clear) {
            this.#device.clear(); // Chrome doesn't support it yet.
        }
        this.#device.send([176, 123, 0], 0); // All notes off
        this.#device.send([176, 121, 0], 0); // Reset all controllers
        this.#device.send([255], 0); // All reset
        // console.log("MIDI reset");
    }

    sendEvent(data, timestamp) {
        if (!this.#device) {
            return;
        }
        this.#device.send(data, timestamp);
    }
}

const midiOutputManager = new MidiOutputManager();

const RecorderState = {
    Idle: 'Idle',
    Playing: 'Playing',
    Pausing: 'Pausing',
    Recording: 'Recording',
}

class Recorder {
    #events = [];
    #state = RecorderState.Idle;

    #recordingStartTimestamp = 0;
    #playbackStartTimestamp = 0;
    #playbackTimeAdjustment = 0;
    #pauseStartTimestamp = 0;
    #nextPlaybackIndex = 0;

    constructor() {
    }

    startRecording() {
        if (this.isRecording) {
            return false;
        }
        this.stopPlaying();
        this.#startRecording();
    }

    stopRecording() {
        if (!this.isRecording) {
            return false;
        }
        this.#stopRecording();
        return true;
    }

    startPlaying() {
        if (!this.isIdle) {
            return false;
        }
        this.#startPlaying();
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
        this.#pauseStartTimestamp = performance.now();
        this.#state = RecorderState.Pausing;
        coordinator.onRecorderStatusChanged();
        return true;
    }

    unpause() {
        if (!this.isPausing) {
            return false;
        }
        // Shift the start timestamp by paused duration.
        const pausedDuration = this.#getPausingDuration();
        this.#playbackStartTimestamp += pausedDuration;
        this.#state = RecorderState.Playing;
        coordinator.onRecorderStatusChanged();
        return true;
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

    get isAfterLast() {
        return this.#events.length <= this.#nextPlaybackIndex;
    }

    get currentPlaybackTimestamp() {
        return this.#getCurrentPlaybackTimestamp();
    }

    #startRecording() {
        info("Recording started");
        this.#state = RecorderState.Recording;
        this.#events = [];

        coordinator.onRecorderStatusChanged();
    }

    #stopRecording() {
        info("Recording stopped");
        this.#state = RecorderState.Idle;

        coordinator.onRecorderStatusChanged();
    }

    #startPlaying() {
        info("Playback started");
        this.#state = RecorderState.Playing;
        this.#playbackStartTimestamp = window.performance.now();
        this.#playbackTimeAdjustment = 0;
        this.#nextPlaybackIndex = 0;

        coordinator.onRecorderStatusChanged();
    }

    #stopPlaying() {
        info("Playback stopped");
        this.#state = RecorderState.Idle;

        coordinator.onRecorderStatusChanged();
        coordinator.resetMidi();
    }

    recordEvent(ev) {
        if (!this.isRecording) {
            return false;
        }

        // Only record certain events.
        switch (ev.data[0]) {
            case 144: // Note on
            case 128: // Note off
            case 176: // Control
                break;
            default:
                return false;
        }

        if (this.#events.length == 0) {
            // First event, remember the timestamp.
            this.#recordingStartTimestamp = ev.timeStamp;
        }
        this.#events.push(ev.withTimestamp(ev.timeStamp - this.#recordingStartTimestamp));

        return true;
    }

    moveToStart() {
        this.adjustPlaybackPosition(-9999999999);
    }

    // Fast-forward or rewind.
    adjustPlaybackPosition(milliseconds) {
        this.#playbackTimeAdjustment += milliseconds;
        let ts = this.#getCurrentPlaybackTimestamp();
        // If rewound beyond the starting point, just reset the
        if (ts <= 0) {
            this.#playbackStartTimestamp = window.performance.now();
            this.#playbackTimeAdjustment = 0;
            ts = -1; // Special case: Move before the first note.
        }
        // info("New playback timestamp: " + (ts < 0 ? 0 : int(ts / 1000)));

        // Find the next play event index.
        this.#nextPlaybackIndex = 0;
        this.#moveUpToTimestamp(ts, null);
        return ts >= 0;
    }

    #getPausingDuration() {
        return this.isPausing ? (performance.now() - this.#pauseStartTimestamp) : 0;
    }

    #getCurrentPlaybackTimestamp() {
        return (window.performance.now() - this.#playbackStartTimestamp) +
                this.#playbackTimeAdjustment - this.#getPausingDuration();
    }

    playbackUpToNow() {
        if (!this.isPlaying) {
            return false;
        }

        // Current timestamp
        let ts = this.#getCurrentPlaybackTimestamp();

        return this.#moveUpToTimestamp(ts, (ev) => {
            midiRenderingStatus.onMidiMessage(ev);
            midiOutputManager.sendEvent(ev.data, 0)
        });
    }

    #moveUpToTimestamp(timestamp, callback) {
        for (;;) {
            if (this.isAfterLast) {
                // No more events.

                // But do not auto-stop; otherwise it'd be hard to listen to the last part.
                // this.isPlaying = false;
                // coordinator.onRecorderStatusChanged();
                // return false;
                return true;
            }
            let ev = this.#events[this.#nextPlaybackIndex];
            if (ev.timeStamp > timestamp) {
                return true;
            }
            this.#nextPlaybackIndex++;

            if (callback) {
                callback(ev);
            }
        }
    }

    download(filename) {
        if (this.#events.length == 0) {
            info("Nothing recorded yet");
            return;
        }
        console.log("Converting to the SMF format...");

        let wr = new SmfWriter();
        let lastTimestamp = this.#events[0].timeStamp;

        this.#events.forEach((ev) => {
            debug(ev.timeStamp, ev.data);
            let delta = ev.timeStamp - lastTimestamp;
            wr.writeMessage(delta, ev.data);
            lastTimestamp = ev.timeStamp;
        });
        wr.download(filename);
    }

    setEvents(events) {
        this.stopPlaying();
        this.stopRecording();
        this.#events = events;

        if (events.length == 0) {
            info("File contains no events.");
            return;
        }

        const lastEvent = events[events.length - 1];

        let message = "Load completed: " + int(lastEvent.timeStamp / 1000) + " seconds, " + events.length + " events";
        info(message);
    }
}

const recorder = new Recorder();

class Coordinator {
    #now = 0;
    #nextSecond = 0;
    #frames = 0;
    #flips = 0;
    #playbackTicks = 0;
    #efps;
    #nextDrawTime;

    constructor() {
        this.#nextSecond = window.performance.now() + 1000;
        this.#efps = $("#fps");
    }

    onKeyDown(ev) {
        debug("onKeyDown", ev.timeStamp, ev.which, ev);

        // Don't respond if any modifier keys are pressed.
        if (ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) {
            return;
        }
        // Ignore key repeats.
        const isRepeat = ev.originalEvent.repeat;

        switch (ev.which) {
            case 112: // F1
                if (isRepeat) break;
                this.toggleVideoMute();
                break;
            case 70: // F
                if (isRepeat) break;
                this.#efps.toggle();
                break;
            case 82: // R
                if (isRepeat) break;
                this.toggleRecording();
                break;
            case 83: // S
                if (isRepeat) break;
                this.#open_download_box();
                break;
            case 76: // L
                if (isRepeat) break;
                $('#open_file').trigger('click');
                break;
            case 90: // Z
                if (isRepeat) break;
                if (recorder.isPlaying || recorder.isPausing) {
                    recorder.stopPlaying();
                }
                break;
            case 32: // Space
                if (isRepeat) break;
                this.togglePlayback();
                break;
            case 37: // Left
                this.#onRewindPressed(isRepeat);
                break;
            case 39: // Right
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
        } else {
            recorder.startRecording();
        }
        this.#updateRecorderStatus();
    }

    togglePlayback() {
        if (recorder.isPausing) {
            recorder.unpause();
        } else if (recorder.isPlaying) {
            recorder.pause();
        } else if (recorder.isIdle) {
            renderer.show();
            recorder.startPlaying();
        }
        this.#updateRecorderStatus();
    }

    onRecorderStatusChanged() {
        this.#updateRecorderStatus();
    }

    #updateRecorderStatus() {
        show('#playing', recorder.isPlaying);
        show('#recording', recorder.isRecording);
        show('#pausing', recorder.isPausing);
    }

    #ignoreRepeatedRewindKey = false;
    #lastRewindPressTime;

    #onRewindPressed(isRepeat) {
        if (!(recorder.isPlaying || recorder.isPausing)) {
            return;
        }
        // If non-repeat left is pressed twice within a timeout, move to start.
        if (!isRepeat) {
            const now = window.performance.now();
            if ((now - this.#lastRewindPressTime) <= 120) {
                recorder.moveToStart();
                return;
            }
            this.#lastRewindPressTime = now;
        }
        if (isRepeat && this.#ignoreRepeatedRewindKey) {
            return;
        }
        if (!isRepeat) {
            this.#ignoreRepeatedRewindKey = false;
        }
        this.resetMidi();
        if (!recorder.adjustPlaybackPosition(-1000)) {
            this.#ignoreRepeatedRewindKey = true;
        }
        return;
    }

    #normalizeMidiEvent(ev) {
        // Allow V25's leftmost knob to be used as the pedal.
        if (ev.device.startsWith("V25")) {
            let d = ev.data;
            if (d[0] == 176 && d[1] == 20) {
                d[1] = 64;
            }
        }
    }

    onMidiMessage(ev) {
        debug("onMidiMessage", ev.timeStamp, ev.data[0], ev.data[1], ev.data[2],  ev);
        this.#normalizeMidiEvent(ev);

        midiRenderingStatus.onMidiMessage(ev);
        if (recorder.isRecording) {
            recorder.recordEvent(ev);
        }
    }

    reset() {
        recorder.stopPlaying();
        recorder.stopRecording();
        this.#updateRecorderStatus();
        this.resetMidi();
    }

    resetMidi() {
        midiRenderingStatus.reset();
        midiOutputManager.reset();
    }

    #getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds = -1;
    #getHumanReadableCurrentPlaybackTimestamp_lastResult;

    getHumanReadableCurrentPlaybackTimestamp() {
        const totalSeconds = int(recorder.currentPlaybackTimestamp / 1000);
        if (totalSeconds == this.#getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds) {
            return this.#getHumanReadableCurrentPlaybackTimestamp_lastResult;
        }

        if (totalSeconds <= 0) {
            this.#getHumanReadableCurrentPlaybackTimestamp_lastResult = "0:00";
        } else {
            const minutes = int(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            this.#getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds = totalSeconds;
            this.#getHumanReadableCurrentPlaybackTimestamp_lastResult =
                minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
        }
        const isFinished = recorder.isAfterLast ? " (finished)" : "";
        this.#getHumanReadableCurrentPlaybackTimestamp_lastResult += isFinished;
        return this.#getHumanReadableCurrentPlaybackTimestamp_lastResult;
    }

    onDraw() {
        // Update FPS
        this.#frames++;
        let now = window.performance.now();
        if (now >= this.#nextSecond) {
            this.#efps.text(this.#flips + "/" + this.#frames + "/" + this.#playbackTicks);
            this.#flips = 0;
            this.#frames = 0;
            this.#playbackTicks = 0;
            this.#nextSecond += 1000;
        }

        this.#now = now;

        renderer.onDraw(this.#now);
        midiRenderingStatus.afterDraw(this.#now);
    }

    scheduleFlip() {
        requestAnimationFrame(() => {
            this.#flips++;
            renderer.flip();
            this.scheduleFlip();
        });
    }

    #onPlaybackTimer_lastShownPlaybackTimestamp;

    onPlaybackTimer() {
        this.#playbackTicks++;
        if (recorder.isPlaying) {
            recorder.playbackUpToNow();
        }
        if (recorder.isPlaying || recorder.isPausing) {
            // Update the time indicator
            const timestamp = this.getHumanReadableCurrentPlaybackTimestamp();
            if (timestamp != this.#onPlaybackTimer_lastShownPlaybackTimestamp) {
                infoRaw(timestamp);
                this.#onPlaybackTimer_lastShownPlaybackTimestamp = timestamp;
            }
        }
    }

    startDrawTimer() {
        this.#nextDrawTime = window.performance.now();
        this.#scheduleDraw();
    }

    #scheduleDraw() {
        this.#nextDrawTime += (1000.0 / FPS);
        const delay = (this.#nextDrawTime - window.performance.now());
        setTimeout(() => {
            this.onDraw(); // TODO Handle frame drop properly
            this.#scheduleDraw();
        }, delay);
    }

    startPlaybackTimer() {
        setInterval(() => coordinator.onPlaybackTimer(), 5);
    }

    #save_as_box;

    #open_download_box() {
        if (!recorder.isAnythingRecorded) {
            info("Nothing is recorded");
            return;
        }
        let filename = "mvv-" + getCurrentTime();
        $('#save_as_filename').val(filename);
        this.#save_as_box = new Popbox({
            blur: true,
            overlay: true,
        });

        this.#save_as_box.open('save_as_box');
        $('#save_as_filename').focus();
    }

    do_download() {
        this.#save_as_box.clear();
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

const coordinator = new Coordinator();

function onMIDISuccess(midiAccess) {
    console.log("onMIDISuccess");

    for (let input of midiAccess.inputs.values()) {
        console.log("Input: ", input);
        input.onmidimessage = (ev) => {
            coordinator.onMidiMessage(MidiEvent.fromNativeEvent(ev));
        }
    }
    for (let output of midiAccess.outputs.values()) {
        console.log("Output: ", output);
        if (!/midi through/i.test(output.name)) {
            midiOutputManager.setMidiOut(output);
        }
    }
}

function onMIDIFailure() {
    info('Could not access your MIDI devices.');
}

// coordinator.startPlaybackTimer();
// coordinator.startDrawTimer();
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
worker.postMessage({action: "setInterval", interval: 10, result: PLAYBACK_TIMER});
worker.postMessage({action: "setInterval", interval: 1000.0 / FPS, result: DRAW_TIMER});

navigator.requestMIDIAccess()
    .then(onMIDISuccess, onMIDIFailure);
$(window).keydown((ev) => coordinator.onKeyDown(ev));

$(window).on('beforeunload', () => 'Are you sure you want to leave?');
$(window).on('unload', () => {
    coordinator.close();
});

$("body").on("dragover", function(ev) {
    ev.preventDefault();
});

function loadMidiFile(file) {
    info("loading from: " + file.name);
    coordinator.reset();
    loadMidi(file).then((events) => {
        recorder.setEvents(events);
    }).catch((error) => {
        info("Failed loading from " + file.name + ": " + error);
        console.log(error);
    });
}

$("body").on("drop", function(ev) {
    ev.preventDefault();
    console.log("File dropped", ev.originalEvent.dataTransfer.files[0], ev.originalEvent.dataTransfer);
    loadMidiFile(ev.originalEvent.dataTransfer.files[0]);
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
    if (ev.which == 13) { // enter
        coordinator.do_download();
        ev.preventDefault();
    }
});

$("#save").on('click', (ev) => {
    coordinator.do_download();
});

$("#save_as_box").on('popbox_closing', (ev) => {
    $("#save_as_filename").blur(); // unfocus, so shortcut keys will start working again
});
