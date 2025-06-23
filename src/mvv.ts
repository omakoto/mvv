'use strict';

import { info, debug, DEBUG } from './util.js';
import { MidiEvent, SmfWriter, loadMidi } from './smf.js';
import { controls } from './controls.js';
import { saveAsBox, confirmBox } from './dialogs.js';
import { getNoteFullName, analyzeChord } from './chords.js';


// 2D game with canvas example: https://github.com/end3r/Gamedev-Canvas-workshop/blob/gh-pages/lesson10.html
// Get screen size: https://developer.mozilla.org/en-US/docs/Web/API/Window/devicePixelRatio
// and window.screen.{width,height{

declare class Popbox {
    constructor(args: any);
    clear(): void;
    open(tag: string): void;
};


const LOW_PERF_MODE = parseInt("0" + (new URLSearchParams(window.location.search)).get("lp")) != 0;
if (!LOW_PERF_MODE) {
    console.log("Low-perf is disabled. Use https://omakoto.github.io/mvv/?lp=1 to enable low-perf mode for slow devices")
}

const SCALE_ARG = parseFloat("0" + (new URLSearchParams(window.location.search)).get("scale"));
const SCALE = SCALE_ARG > 0 ? SCALE_ARG : window.devicePixelRatio;
console.log("Scale: " + SCALE);

const PLAYBACK_RESOLUTION_ARG = parseInt("0" + (new URLSearchParams(window.location.search)).get("pres"));
const PLAYBACK_RESOLUTION = PLAYBACK_RESOLUTION_ARG > 0 ? PLAYBACK_RESOLUTION_ARG : LOW_PERF_MODE ? 60 : 120;


const NOTES_COUNT = 128;

// Time in milliseconds to highlight a recently pressed note.
const RECENT_NOTE_THRESHOLD_MS = 60;

const WAKE_LOCK_MILLIS = 5 * 60 * 1000; // 5 minutes
// const WAKE_LOCK_MILLIS = 3000; // for testing

// We set some styles in JS.
const BAR_RATIO = 0.3; // Bar : Roll height

// To save power, we'll stop animation after this much time since the last midi event.
const ANIMATION_TIMEOUT_MS = 30_000;

// Common values
const RGB_BLACK: [number, number, number] = [0, 0, 0];
// Dark yellow color for octave lines
const RGB_OCTAVE_LINES: [number, number, number] = [50, 50, 0];

const PLAYBACK_TIMER_MS = 20;

// Utility functions

function int(v: number): number {
    return Math.floor(v);
}

function s(v: number): number {
    return int(v * SCALE);
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
    let r = 0, g = 0, b = 0, i, f, p, q, t;
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

function rgbToStr(rgb: [number, number, number]): string {
    // special common cases
    if (rgb[0] === 0 && rgb[1] === 0 && rgb[2] === 0) {
        return "black";
    }
    return 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')';
}

function rgbToInt(rgb: [number, number, number]): number {
    return (rgb[0] << 16) | (rgb[1] << 8) | rgb[2];
}

// Logic

class Renderer {
    #BAR_SUB_LINE_WIDTH = s(2);
    #BAR_BASE_LINE_COLOR: [number, number, number] = [200, 255, 200];
    #ROLL_SCROLL_AMOUNT = s(2);

    #W; // Width in canvas pixels
    #H; // Height in canvas pixels
    #BAR_H;
    #ROLL_H;
    #MIN_NOTE = 21;
    #MAX_NOTE = 108;

    #cbar: HTMLCanvasElement;
    #bar: CanvasRenderingContext2D;
    #croll: HTMLCanvasElement;
    #roll: CanvasRenderingContext2D;

    #cbar2: HTMLCanvasElement;
    #bar2: CanvasRenderingContext2D;
    #croll2: HTMLCanvasElement;
    #roll2: CanvasRenderingContext2D;

    #rollFrozen = false;

    #drewOffLine = false;

    // Current frame #
    #currentFrame = -1;

    // Last frame # when anything was drawn
    #lastDrawFrame = 0;

    // Last drawn element Y position.
    #lastDrawY = 0;

    #lastPedalColorInt = -1;
    #lastVlinesOn = false;


    static getCanvas(name: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
        let canvas = <HTMLCanvasElement>document.getElementById(name);
        let context = <CanvasRenderingContext2D>canvas.getContext("2d");
        return [canvas, context];
    }

    constructor() {
        // Adjust CSS with the constants.
        $("#bar2").css("height", (BAR_RATIO * 100) + "%");
        $("#roll2").css("height", (100 - BAR_RATIO * 100) + "%");

        this.#W = s(screen.width);
        this.#H = s(screen.height);
        this.#BAR_H = int(this.#H * BAR_RATIO);
        this.#ROLL_H = this.#H - this.#BAR_H;

        [this.#cbar, this.#bar] = Renderer.getCanvas("bar");
        [this.#cbar2, this.#bar2] = Renderer.getCanvas("bar2");
        [this.#croll, this.#roll] = Renderer.getCanvas("roll");
        [this.#croll2, this.#roll2] = Renderer.getCanvas("roll2");

        this.#bar.imageSmoothingEnabled = false;
        this.#bar2.imageSmoothingEnabled = false;
        this.#roll.imageSmoothingEnabled = false;
        this.#roll2.imageSmoothingEnabled = false;

        this.#cbar.width = this.#W;
        this.#cbar.height = this.#BAR_H;
        this.#cbar2.width = this.#W;
        this.#cbar2.height = this.#BAR_H;

        this.#croll.width = this.#W;
        this.#croll.height = this.#ROLL_H;
        this.#croll2.width = this.#W;
        this.#croll2.height = this.#ROLL_H;
    }

    getBarColor(velocity: number): [number, number, number] {
        let MAX_H = 0.4
        let h = MAX_H - (MAX_H * velocity / 127)
        let s = 0.9;
        let l = 1;
        return hsvToRgb(h, s, l)
    }

    getOnColor(count: number): [number, number, number] {
        let h = Math.max(0, 0.2 - count * 0.03)
        let s = Math.min(1, 0.3 + 0.2 * count)
        let l = Math.min(1, 0.4 + 0.2 * count)
        return hsvToRgb(h, s, l)
    }

    getPedalColor(value: number): [number, number, number] {
        if (value <= 0) {
            return RGB_BLACK;
        }
        let h = 0.65 - (0.2 * value / 127);
        let s = 0.7;
        let l = 0.2;
        return hsvToRgb(h, s, l)
    }

    getSostenutoPedalColor(value: number): [number, number, number] {
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

    mixRgb(rgb1: [number, number, number], rgb2: [number, number, number]): [number, number, number] {
        const isBlack1 = rgb1[0] === 0 && rgb1[1] === 0 && rgb1[2] === 0;
        const isBlack2 = rgb2[0] === 0 && rgb2[1] === 0 && rgb2[2] === 0;

        if (isBlack1 && isBlack2) return RGB_BLACK;
        if (isBlack1) return rgb2;
        if (isBlack2) return rgb1;

        // Average the colors for a mixed effect.
        return [
            int((rgb1[0] + rgb2[0]) / 2),
            int((rgb1[1] + rgb2[1]) / 2),
            int((rgb1[2] + rgb2[2]) / 2),
        ];
    }

    drawSubLine(percent: number): void {
        this.#bar.fillStyle = rgbToStr(this.getBarColor(127 * (1 - percent)));
        this.#bar.fillRect(0, this.#BAR_H * percent, this.#W, this.#BAR_SUB_LINE_WIDTH)
    }

    // Draws vertical lines between octaves (B to C).
    drawOctaveLines(): void {
        this.#roll.fillStyle = rgbToStr(RGB_OCTAVE_LINES);
        this.#bar.fillStyle = this.#roll.fillStyle
        const OCTAVE_LINE_WIDTH = 2; // Width of the octave line

        // Iterate through notes to find octave boundaries (B notes)
        // MIDI notes 0-127. C0 is MIDI 12, B0 is MIDI 23, C1 is MIDI 24 etc.
        // We want to draw a line *before* each C note (which means after each B note)
        // So, we draw at note indices 11, 23, 35, ..., 107
        for (let i = this.#MIN_NOTE; i <= this.#MAX_NOTE; i++) {
            // Check if the current note is a B note (MIDI % 12 === 11)
            // Or more precisely, the line should appear after the B and before the C of the next octave.
            // So, for each C note (MIDI % 12 === 0), draw a line just before it.
            if (i % 12 === 0 && i > this.#MIN_NOTE) { // Only for C notes, and not the very first note
                // Calculate the x position for the line.
                // This will be at the left edge of the C note's visual block.
                const x = this.#W * (i - this.#MIN_NOTE) / (this.#MAX_NOTE - this.#MIN_NOTE + 1);
                
                // Draw the vertical line
                this.#roll.fillRect(x, 0, OCTAVE_LINE_WIDTH, this.#ROLL_H);

                // Hack -- draw the lines three times in #bar.
                // Without this, the lines in #roll would look thicker because
                // when we scroll it, we just draw itself on top of it with a slight
                // offset, which would accumulate the subpixel artifacts.
                // (or something like that.)
                this.#bar.fillRect(x, 0, OCTAVE_LINE_WIDTH, this.#BAR_H);
                this.#bar.fillRect(x, 0, OCTAVE_LINE_WIDTH, this.#BAR_H);
                this.#bar.fillRect(x, 0, OCTAVE_LINE_WIDTH, this.#BAR_H);
            }
        }
    }

    #anythingDrawn() {
        this.#lastDrawFrame = this.#currentFrame;
        this.#lastDrawY = 0;
    }

    isAnythingOnScreen(): boolean {
        return this.#lastDrawY <= (this.#ROLL_H + 64); // +64 for safety(?) margin
    }

    onDraw(): void {
        this.#currentFrame++;

        const scrollAmount = this.#ROLL_SCROLL_AMOUNT * coordinator.scrollSpeedFactor;
        // Scroll the roll.
        this.#roll.drawImage(this.#croll, 0, scrollAmount);

        this.#lastDrawY += int(scrollAmount);

        // Draw the pedals.
        const sustainColor = this.getPedalColor(midiRenderingStatus.pedal);
        const sostenutoColor = this.getSostenutoPedalColor(midiRenderingStatus.sostenuto);
        const pedalColor = this.mixRgb(sustainColor, sostenutoColor);
        const pedalColorInt = rgbToInt(pedalColor);


        this.#roll.fillStyle = rgbToStr(pedalColor);
        this.#roll.fillRect(0, 0, this.#W, scrollAmount);
        if (pedalColorInt !== this.#lastPedalColorInt) {
            this.#anythingDrawn();
            this.#lastPedalColorInt = pedalColorInt;
        }

        // Clear the bar area.
        this.#bar.fillStyle = 'black';
        this.#bar.fillRect(0, 0, this.#W, this.#H);

        // Individual bar width
        let bw = this.#W / (this.#MAX_NOTE - this.#MIN_NOTE + 1) - 1;

        // "Off" line
        if (midiRenderingStatus.offNoteCount > 0) {
            this.#anythingDrawn();

            // We don't highlight off lines. Always same color.
            // However, if we draw two off lines in a raw, it'll look brighter,
            // so avoid doing so.
            if (!this.#drewOffLine) {
                this.#roll.fillStyle = "#008040";
                this.#roll.fillRect(0, scrollAmount - s(2), this.#W, s(2));
            }

            this.#drewOffLine = true;
        } else {
            this.#drewOffLine = false;
        }
        
        // "On" line
        if (midiRenderingStatus.onNoteCount > 0) {
            this.#anythingDrawn();

            this.#roll.fillStyle = rgbToStr(this.getOnColor(midiRenderingStatus.onNoteCount));
            this.#roll.fillRect(0, scrollAmount - s(2), this.#W, s(2));
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
            this.#roll.fillRect(bl, 0, bw, scrollAmount);
        }

        if (coordinator.isShowingVlines) {
            // Draw octave lines.
            this.drawOctaveLines();
        }
        if (this.#lastVlinesOn !== coordinator.isShowingVlines) {
            this.#anythingDrawn();
            this.#lastVlinesOn = coordinator.isShowingVlines;
        }

        // Base line.
        this.#bar.fillStyle = rgbToStr(this.#BAR_BASE_LINE_COLOR);
        this.#bar.fillRect(0, this.#BAR_H, this.#W, -this.#BAR_SUB_LINE_WIDTH)
    }


    flip(): void {
        this.#bar2.drawImage(this.#cbar, 0, 0);
        if (!this.#rollFrozen) {
            this.#roll2.drawImage(this.#croll, 0, 0);
        }
    }

    toggleMute(): void {
        $('#canvases').toggle();
    }

    show(): void {
        $('#canvases').show();
    }

    toggleRollFrozen(): void {
        this.#rollFrozen = !this.#rollFrozen;
        this.flip();
    }

    get isRollFrozen(): boolean {
        return this.#rollFrozen;
    }

    get isVideoMuted(): boolean {
        return $('#canvases').css('display') === 'none';
    }
}

export const renderer = new Renderer();

class MidiRenderingStatus {
    #tick = 0;
    #notes: Array<[boolean, number, number, number]> = []; // on/off, velocity, last on-tick, press timestamp
    #pedal = 0;
    #sostenuto = 0;
    #onNoteCount = 0;
    #offNoteCount = 0;

    constructor() {
        this.reset();
    }

    onMidiMessage(ev: MidiEvent): void {
        coordinator.startAnimationLoop();

        let status = ev.status;
        let data1 = ev.data1;
        let data2 = ev.data2;

        if (ev.isNoteOn) { // Note on
            this.#onNoteCount++;
            let ar = this.#notes[data1]!;
            ar[0] = true;
            ar[1] = data2;
            ar[2] = this.#tick;
            ar[3] = performance.now(); // Store press timestamp
        } else if ((status === 128) || (status === 144 && data2 === 0)) { // Note off
            this.#offNoteCount++;
            this.#notes[data1]![0] = false;
        } else if (status === 176) { // Control Change
             switch (data1) {
                case 64: // Damper pedal (sustain)
                case 11: // Expression
                    this.#pedal = data2;
                    break;
                case 66: // Sostenuto pedal
                    this.#sostenuto = data2;
                    break;
            }
        }
    }

    reset(): void {
        this.#tick = 0;
        this.#notes = [];
        for (let i = 0; i < NOTES_COUNT; i++) {
            this.#notes[i] = [false, 0, -99999, 0]; // on/off, velocity, last on-tick, press timestamp
        }
        this.#pedal = 0;
        this.#sostenuto = 0;
        this.#onNoteCount = 0;
        this.#offNoteCount = 0;
    }

    afterDraw(_now: number): void {
        this.#tick++;
        this.#onNoteCount = 0;
        this.#offNoteCount = 0;
    }

    get onNoteCount(): number {
        return this.#onNoteCount;
    }

    get offNoteCount(): number {
        return this.#offNoteCount;
    }

    get pedal(): number {
        return this.#pedal;
    }
    
    get sostenuto(): number {
        return this.#sostenuto;
    }

    getNote(noteIndex: number): [boolean, number] {
        let ar = this.#notes[noteIndex]!
        if (ar[0]) {
            // Note on
            return [true, ar[1]];
        } else if ((this.#tick - ar[2]) < 2) {
            // Recently turned off, still treat it as on
            return [true, ar[1]];
        } else {
            return [false, 0];
        }
    }
    
    /**
     * Returns an array of MIDI note numbers for all notes currently considered "on".
     */
    getPressedNotes(): number[] {
        const pressed: number[] = [];
        for (let i = 0; i < NOTES_COUNT; i++) {
            const note = this.getNote(i);
            if (note[0]) { // is on
                pressed.push(i);
            }
        }
        return pressed;
    }

    /**
     * Returns info for all notes currently considered "on", including their press timestamp.
     */
    getPressedNotesInfo(): { note: number, timestamp: number }[] {
        const pressed: { note: number, timestamp: number }[] = [];
        for (let i = 0; i < NOTES_COUNT; i++) {
            const noteInfo = this.#notes[i]!;
            // A note is considered "on" if its on-flag is true, or if it was turned off
            // very recently (within 2 ticks), to make visuals linger a bit.
            const isVisuallyOn = noteInfo[0] || (this.#tick - noteInfo[2]) < 2;
            if (isVisuallyOn) {
                pressed.push({ note: i, timestamp: noteInfo[3] });
            }
        }
        return pressed;
    }
}

export const midiRenderingStatus = new MidiRenderingStatus();

class MidiOutputManager {
    #device: WebMidi.MIDIOutput | null = null;
    constructor() {
    }

    setMidiOut(device: WebMidi.MIDIOutput): void {
        console.log("MIDI output dev: WebMidi.MIDIOutput set:", device);
        this.#device = device;
        midiOutputManager.reset();
    }

    reset(): void {
        if (!this.#device) {
            return;
        }
        if (this.#device.clear) {
            this.#device.clear(); // Chrome doesn't support it yet.
        }
        for (let i = 0; i <= 15; i++) {
            this.#device.send([176 + i, 123, 0], 0); // All notes off
            this.#device.send([176 + i, 121, 0], 0); // Reset all controllers
        }
        this.#device.send([255], 0); // All reset
        // console.log("MIDI reset");
    }

    sendEvent(data: Array<number> | Uint8Array, timeStamp: number): void {
        if (!this.#device) {
            return;
        }
        this.#device.send(data, timeStamp);
    }
}

export const midiOutputManager = new MidiOutputManager();

enum RecorderState {
    Idle,
    Playing,
    Pausing,
    Recording,
}

class Recorder {
    #events: Array<MidiEvent> = [];
    #state = RecorderState.Idle;

    #recordingStartTimestamp = 0;
    #playbackStartTimestamp = 0;
    #playbackTimeAdjustment = 0;
    #pauseStartTimestamp = 0;
    #nextPlaybackIndex = 0;
    #lastEventTimestamp = 0;

    #isDirty = false;

    #timer: number = 0;

    constructor() {
    }

    startRecording(): boolean {
        if (this.isRecording) {
            return false;
        }
        this.stopPlaying();
        this.#startRecording();
        return true;
    }

    stopRecording(): boolean {
        if (!this.isRecording) {
            return false;
        }
        this.#stopRecording();
        return true;
    }

    startPlaying(): boolean {
        if (!this.isIdle) {
            return false;
        }
        if (!this.isAnythingRecorded) {
            info("Nothing recorded yet");
            return false;
        }
        this.#startPlaying();
        return true;
    }

    stopPlaying(): boolean {
        if (!(this.isPlaying || this.isPausing)) {
            return false;
        }
        this.#stopPlaying();
        return true;
    }

    pause(): boolean {
        if (!this.isPlaying) {
            return false;
        }
        this.#pauseStartTimestamp = performance.now();
        this.#state = RecorderState.Pausing;
        coordinator.onRecorderStatusChanged();

        this.#stopTimer();

        return true;
    }

    unpause(): boolean {
        if (!this.isPausing) {
            return false;
        }
        // Shift the start timestamp by paused duration.
        const pausedDuration = this.#getPausingDuration();
        this.#playbackStartTimestamp += pausedDuration;
        this.#state = RecorderState.Playing;
        coordinator.onRecorderStatusChanged();

        this.#startTimer();

        return true;
    }

    get isDirty(): boolean {
        return this.#isDirty && this.isAnythingRecorded;
    }

    get isIdle(): boolean {
        return this.#state === RecorderState.Idle;
    }

    get isRecording(): boolean {
        return this.#state === RecorderState.Recording;
    }

    get isPlaying(): boolean {
        return this.#state === RecorderState.Playing;
    }

    get isPausing(): boolean {
        return this.#state === RecorderState.Pausing;
    }

    get isAnythingRecorded(): boolean {
        return this.#events.length > 0;
    }

    get isAfterLast(): boolean {
        return this.#events.length <= this.#nextPlaybackIndex;
    }

    get currentPlaybackTimestamp(): number {
        return this.#getCurrentPlaybackTimestamp();
    }

    get lastEventTimestamp(): number {
        return this.#lastEventTimestamp;
    }

    #startRecording(): void {
        info("Recording started");

        this.#state = RecorderState.Recording;
        this.#events = [];
        this.#isDirty = true;

        coordinator.onRecorderStatusChanged();
    }

    #stopRecording(): void {
        info("Recording stopped (" + this.#events.length + " events recorded)");
        this.#state = RecorderState.Idle;

        coordinator.onRecorderStatusChanged();
    }

    #startPlaying(): void {
        info("Playback started");
        coordinator.startAnimationLoop();

        this.#state = RecorderState.Playing;
        this.#playbackStartTimestamp = performance.now();
        // Do not reset playbackTimeAdjustment. It contains the start offset.
    
        // Find the next event from the current position
        this.#nextPlaybackIndex = 0;
        this.#moveUpToTimestamp(this.currentPlaybackTimestamp, null);
    
        coordinator.onRecorderStatusChanged();

        this.#startTimer();
    }

    #stopPlaying(): void {
        info("Playback stopped");

        this.#state = RecorderState.Idle;
        this.#playbackTimeAdjustment = 0; // Reset position to start.
    
        coordinator.onRecorderStatusChanged();
        coordinator.resetMidi();

        this.#stopTimer();
    }

    #startTimer(): void {
        if (this.#timer === 0) {
            this.#timer = setInterval(() => {
                coordinator.onPlaybackTimer();
            }, PLAYBACK_TIMER_MS);
            console.log("Timer started");
        }
    }

    #stopTimer(): void {
        if (this.#timer != 0) {
            console.log("Timer stopped");
            clearInterval(this.#timer);
            this.#timer = 0;
        }
    }

    recordEvent(ev: MidiEvent): boolean {
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

        if (this.#events.length === 0) {
            // First event, remember the timestamp.
            this.#recordingStartTimestamp = ev.timeStamp;
        }

        const ts = ev.timeStamp - this.#recordingStartTimestamp;
        this.#events.push(ev.withTimestamp(ts));
        this.#lastEventTimestamp = ts;

        return true;
    }

    moveToStart(): void {
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
    adjustPlaybackPosition(deltaMilliseconds: number): boolean {
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
        newTimestamp = Math.max(0, Math.min(newTimestamp, this.#lastEventTimestamp));

        // Update the internal timekeeping to reflect the jump.
        this.#playbackTimeAdjustment += (newTimestamp - oldTimestamp);

        // Reset MIDI devices. This clears any hanging notes or stale controller states.
        midiOutputManager.reset();
        midiRenderingStatus.reset();

        // We replay MIDI voice messages except for note on/off (0b1010nnnn (0xAn) - 0b1110nnnn (0xEn)).
        // we store them in this map, where:
        // - key: (data0 << 8) | data1 for control change (e.g. 0b1011nnnn == 0xBn)
        // - key: (data0 << 8) for the other vents.
        const events = new Map<number, MidiEvent>();

        for (const ev of this.#events) {
            if (ev.timeStamp >= newTimestamp) {
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
            const key = (ev.data0 << 8) | (ev.isCC ? ev.data1 : 0)
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

        this.#nextPlaybackIndex = 0;
        this.#moveUpToTimestamp(newTimestamp, null);
        
        // If playback was active before the seek, resume it.
        if (wasPlaying) {
            this.unpause();
        }

        return this.currentPlaybackTimestamp > 0;
    }

    #getPausingDuration(): number {
        return this.isPausing ? (performance.now() - this.#pauseStartTimestamp) : 0;
    }

    #getCurrentPlaybackTimestamp(): number {
        if (this.isRecording) return 0;
        if (this.isIdle) return this.#playbackTimeAdjustment;
    
        return (performance.now() - this.#playbackStartTimestamp) +
                this.#playbackTimeAdjustment - this.#getPausingDuration();
    }

    playbackUpToNow() {
        if (!this.isPlaying) {
            return;
        }

        // Current timestamp
        let ts = this.#getCurrentPlaybackTimestamp();
        if (DEBUG) {
            debug(this.#playbackStartTimestamp, performance.now(), this.#playbackTimeAdjustment, this.#getPausingDuration());
        }

        const stillPlaying = this.#moveUpToTimestamp(ts, (ev: MidiEvent) => {
            if (DEBUG) {
                debug("Playback: time=" + int(this.currentPlaybackTimestamp / 1000) +
                        " index=" + (this.#nextPlaybackIndex - 1), ev);
            }
            midiRenderingStatus.onMidiMessage(ev);
            midiOutputManager.sendEvent(ev.getDataAsArray(), 0)
        });
        if (!stillPlaying) {
            this.stopPlaying();
        }
    }

    #moveUpToTimestamp(timeStamp: number, callback: null | ((a: MidiEvent) => void)): boolean {
        for (;;) {
            if (this.isAfterLast) {
                if (timeStamp > this.#lastEventTimestamp + 5000) {
                    // It's been a while since the last event. Let's stop playing.
                    return false;
                }
                // Continue playing for a bit, which makes it easier to listen to the last part again.
                return true;
            }
            let ev = this.#events[this.#nextPlaybackIndex]!;
            if (ev.timeStamp >= timeStamp) {
                return true;
            }
            this.#nextPlaybackIndex++;

            if (callback) {
                callback(ev);
            }
        }
    }

    download(filename: string): void {
        if (!this.isAnythingRecorded) {
            info("Nothing recorded yet");
            return;
        }
        console.log("Converting to the SMF format...");

        let wr = new SmfWriter();
        let lastTimestamp = this.#events[0]!.timeStamp;

        this.#events.forEach((ev) => {
            debug(ev.timeStamp, ev.getDataAsArray());
            let delta = ev.timeStamp - lastTimestamp;
            wr.writeMessage(delta, ev.getDataAsArray());
            lastTimestamp = ev.timeStamp;
        });
        wr.download(filename);
        this.#isDirty = false;
    }

    setEvents(events: Array<MidiEvent>): void {
        this.stopPlaying();
        this.stopRecording();
        this.#events = events;
        this.#isDirty = false;

        if (events.length === 0) {
            info("File contains no events.");
            this.#lastEventTimestamp = 0;
            return;
        }

        const lastEvent = events[events.length - 1]!;
        this.#lastEventTimestamp = lastEvent.timeStamp;

        let message = "Load completed: " + int(lastEvent.timeStamp / 1000) + " seconds, " + events.length + " events";
        info(message);
        this.moveToStart();
    }
}

export const recorder = new Recorder();

class Coordinator {
    #now = 0;
    #nextSecond = 0;
    #frames = 0;
    #flips = 0;
    #playbackTicks = 0;
    #efps;
    #wakelock : WakeLockSentinel | null = null;
    #wakelockTimer : number | null = 0;
    #timestamp;
    #notes;
    #chords;
    #useSharp: boolean;
    #showVlines: boolean;
    #scrollSpeedFactor: number;
    #isHelpVisible = false;

    // LocalStorage keys
    static readonly #STORAGE_KEY_USE_SHARP = 'mvv_useSharp';
    static readonly #STORAGE_KEY_SHOW_VLINES = 'mvv_showVlines';
    static readonly #STORAGE_KEY_SCROLL_SPEED = 'mvv_scrollSpeed';

    constructor() {
        this.#nextSecond = performance.now() + 1000;
        this.#efps = $("#fps");
        this.#timestamp = $('#timestamp');
        this.#notes = $('#notes');
        this.#chords = $('#chords');

        // Load settings from localStorage
        const storedSharp = localStorage.getItem(Coordinator.#STORAGE_KEY_USE_SHARP);
        this.#useSharp = storedSharp === null ? true : storedSharp === 'true';

        const storedVlines = localStorage.getItem(Coordinator.#STORAGE_KEY_SHOW_VLINES);
        this.#showVlines = storedVlines === null ? true : storedVlines === 'true';

        const storedSpeed = localStorage.getItem(Coordinator.#STORAGE_KEY_SCROLL_SPEED);
        this.#scrollSpeedFactor = storedSpeed ? parseFloat(storedSpeed) : 1.0;
    }

    onKeyDown(ev: KeyboardEvent) {
        debug("onKeyDown", ev.timeStamp, ev.code, ev);

        // Always allow '?' and 'Escape' to control the help screen.
        if (ev.key === '?') { // '?' key
             if (ev.repeat) return;
             this.toggleHelpScreen();
             ev.preventDefault();
             return;
        }
        if (ev.code === 'Escape') {
            if (this.#isHelpVisible) {
                this.toggleHelpScreen();
                ev.preventDefault();
                return;
            }
        }

        // If help is visible, block all other shortcuts.
        if (this.#isHelpVisible) {
            return;
        }

        this.extendWakelock();

        if (ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) {
            return;
        }
        const isRepeat = ev.repeat;

        switch (ev.code) {
            case 'F1':
            case 'Digit1':
                if (isRepeat) break;
                this.toggleVideoMute();
                break;
            case 'F2':
            case 'Digit2':
                if (isRepeat) break;
                this.toggleRollFrozen();
                break;
            case 'KeyF':
                if (isRepeat) break;
                this.toggleFullScreen();
                break;
            case 'Digit3':
                if (isRepeat) break;
                this.#efps.toggle();
                break;
            case 'Digit4':
                if (isRepeat) break;
                this.setSharpMode(!this.isSharpMode);
                this.updateUi();
                break;
            case 'Digit5':
                if (isRepeat) break;
                this.setShowingVlines(!this.isShowingVlines);
                this.updateUi();
                break;
            case 'Digit6':
                if (isRepeat) break;
                this.toggleScrollSpeedFactor();
                this.updateUi();
                break;
            case 'KeyR':
                if (isRepeat) break;
                this.toggleRecording();
                break;
            case 'KeyS':
                if (isRepeat) break;
                this.downloadRequested();
                break;
            case 'KeyL':
                if (isRepeat) break;
                this.uploadRequested();
                break;
            case 'KeyZ':
                if (isRepeat) break;
                this.stop();
                break;
            case 'KeyT':
                if (isRepeat) break;
                this.moveToStart();
                break;
            case 'Space':
                if (isRepeat) break;
                this.togglePlayback();
                break;
            case 'ArrowLeft':
                this.#onRewindPressed(isRepeat);
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

    get isSharpMode(): boolean {
        return this.#useSharp;
    }

    setSharpMode(useSharp: boolean): void {
        info("Mode changed to " + (useSharp ? "sharp" : "flat"));
        this.#useSharp = useSharp
        localStorage.setItem(Coordinator.#STORAGE_KEY_USE_SHARP, String(useSharp));
    }

    get isShowingVlines(): boolean {
        return this.#showVlines;
    }

    setShowingVlines(show: boolean): void {
        this.#showVlines = show
        localStorage.setItem(Coordinator.#STORAGE_KEY_SHOW_VLINES, String(show));
        this.startAnimationLoop();
    }

    get scrollSpeedFactor(): number {
        return this.#scrollSpeedFactor;
    }

    setScrollSpeedFactor(factor: number): void {
        this.#scrollSpeedFactor = factor;
        localStorage.setItem(Coordinator.#STORAGE_KEY_SCROLL_SPEED, String(factor));
    }

    toggleScrollSpeedFactor(): void {
        this.setScrollSpeedFactor(3.0 - this.#scrollSpeedFactor);
    }

    toggleHelpScreen(): void {
        this.#isHelpVisible = !this.#isHelpVisible;
        if (this.#isHelpVisible) {
            $('#help_overlay').fadeIn('fast');
            $('#help_box').fadeIn('fast');
        } else {
            $('#help_overlay').fadeOut('fast');
            $('#help_box').fadeOut('fast');
        }
    }

    toggleVideoMute(): void {
        info("Toggle video mute");
        renderer.toggleMute();
        this.updateUi();
    }

    toggleRollFrozen(): void {
        renderer.toggleRollFrozen();
        if (renderer.isRollFrozen) {
            info("Roll frozen");
        }
        this.updateUi();
    }

    toggleRecording(): void {
        if (recorder.isRecording) {
            recorder.stopRecording();
        } else {
            this.startRecording();
        }
        this.updateUi();
    }

    startRecording(): void {
        if (!recorder.isRecording) {
            this.withOverwriteConfirm(() => recorder.startRecording());
        }
        this.updateUi();
    }

    togglePlayback(): void {
        if (recorder.isPausing) {
            recorder.unpause();
        } else if (recorder.isPlaying) {
            recorder.pause();
        } else if (recorder.isIdle) {
            this.startPlayback();
        }
        this.updateUi();
    }

    startPlayback(): void {
        renderer.show();
        if (recorder.isIdle) {
            recorder.startPlaying();
        } else if (recorder.isPausing) {
            recorder.unpause();
        }
        this.updateUi();
    }

    pause(): void {
        if (recorder.isPlaying) {
            recorder.pause();
        } else if (recorder.isPausing) {
            recorder.unpause();
        }
        this.updateUi();
    }

    stop(): void {
        if (recorder.isRecording) {
            recorder.stopRecording();
        } else if (recorder.isPlaying || recorder.isPausing) {
            recorder.stopPlaying();
        }
        this.updateUi();
    }

    moveToStart(): void {
        if (recorder.isRecording) {
            return;
        }
        recorder.moveToStart();
        this.updateUi();
    }

    moveToPercent(percent: number): void {
        if (recorder.isRecording) {
            return;
        }
        // Allow scrubbing from idle, paused, or playing states.
        const newTime = recorder.lastEventTimestamp * percent;
        const delta = newTime - recorder.currentPlaybackTimestamp;
        recorder.adjustPlaybackPosition(delta);
        this.updateUi();
    }

    toggleFullScreen(): void {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen();
        } else {
            document.exitFullscreen();
        }
    }

    onRecorderStatusChanged(): void {
        this.updateUi();
    }

    updateUi(): void {
        this.#updateTimestamp();
        controls.update();
    }

    #ignoreRepeatedRewindKey = false;
    #lastRewindPressTime = 0;

    #onRewindPressed(isRepeat: boolean): void {
        if (recorder.isRecording) {
            return;
        }
        // If non-repeat left is pressed twice within a timeout, move to start.
        if (!isRepeat) {
            const now = performance.now();
            if ((now - this.#lastRewindPressTime) <= 150) {
                this.moveToStart();
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
        if (!recorder.adjustPlaybackPosition(-1000)) {
            this.#ignoreRepeatedRewindKey = true;
        }
        this.updateUi();
    }

    #normalizeMidiEvent(ev: MidiEvent): void {
        // Allow V25's leftmost knob to be used as the pedal.
        if (ev.device.startsWith("V25")) {
            if (ev.data0 === 176 && ev.data1 === 20) {
                ev.replaceData(1, 64);
            } else if (ev.data0 === 176 && ev.data1 === 21) {
                ev.replaceData(1, 66); // sostenuto
            }
        }
    }

    onMidiMessage(ev: MidiEvent): void {
        debug("onMidiMessage", ev.timeStamp, ev.data0, ev.data1, ev.data2,  ev);

        // Ignore "Active Sensing" and "Timing clock"
        if (ev.data0 == 254 || ev.data0 == 248) {
            return;
        }

        this.extendWakelock();

        this.#normalizeMidiEvent(ev);

        midiRenderingStatus.onMidiMessage(ev);
        if (recorder.isRecording) {
            recorder.recordEvent(ev);
        }
        if (ev.status === 144 || ev.status === 128) {
            this.updateNoteInformation();
        }
    }

    reset(): void {
        recorder.stopPlaying();
        recorder.stopRecording();
        this.updateUi();
        this.resetMidi();
    }

    resetMidi(): void {
        midiRenderingStatus.reset();
        midiOutputManager.reset();
    }

    #getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds = -1;
    #getHumanReadableCurrentPlaybackTimestamp_lastResult = "";

    getHumanReadableCurrentPlaybackTimestamp(): string {
        const totalSeconds = int(recorder.currentPlaybackTimestamp / 1000);
        if (totalSeconds === this.#getHumanReadableCurrentPlaybackTimestamp_lastTotalSeconds) {
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
        return this.#getHumanReadableCurrentPlaybackTimestamp_lastResult;
    }

    onDraw(): void {
        // Update FPS counter
        this.#frames++;
        let now = performance.now();
        if (now >= this.#nextSecond) {
            this.#efps.text(this.#flips + "/" + this.#frames + "/" + this.#playbackTicks);
            this.#flips = 0;
            this.#frames = 0;
            this.#playbackTicks = 0;
            this.#nextSecond += 1000;
            if (this.#nextSecond < now) {
                this.#nextSecond = now + 1000;
            }
        }

        this.#now = now;

        renderer.onDraw();
        midiRenderingStatus.afterDraw(this.#now);
    }

    updateNoteInformation(): void {
        const now = performance.now();
        const pressedNotesInfo = midiRenderingStatus.getPressedNotesInfo();

        const noteSpans = pressedNotesInfo.map(({ note, timestamp }) => {
            const noteName = getNoteFullName(note, this.#useSharp);
            // Check if the note was pressed recently.
            const isRecent = (now - timestamp) < RECENT_NOTE_THRESHOLD_MS;
            if (isRecent) {
                return `<span class="notes_recent">${noteName}</span>`;
            } else {
                return `<span>${noteName}</span>`;
            }
        });
        const noteNamesHtml = noteSpans.join(' ');

        // We need just the note numbers for chord analysis.
        const pressedNoteNumbers = pressedNotesInfo.map(info => info.note);
        const chordName = analyzeChord(pressedNoteNumbers, this.#useSharp);
        
        if (noteNamesHtml.length > 0) {
            this.#notes.html(noteNamesHtml);
            this.#notes.stop(true, true).show();
        } else {
            this.#notes.fadeOut(800);
        }
        if (chordName != null) {
            this.#chords.text(chordName);
            this.#chords.stop(true, true).show();
        } else {
            this.#chords.fadeOut(800);
        }
    }
    
    #animationFrameId: number | null = null;

    /**
     * Starts the main animation loop, which is synchronized with the browser's
     * rendering cycle for smooth visuals.
     */
    startAnimationLoop(): void {
        if (this.#animationFrameId !== null) {
            // Loop is already running.
            return;
        }
        console.log("Animation started")

        const loop = () => {
            // #flips is for the FPS counter, representing screen updates.
            this.#flips++; 
            
            // Draw the current state to the off-screen canvas.
            // This also updates the #frames count for the FPS counter.
            this.onDraw();
            
            // Copy the off-screen canvas to the visible one.
            renderer.flip();
            
            // Request the next frame.
            // const needsAnimation = (Date.now() - this.#lastAnimationRequestTimestamp) < ANIMATION_TIMEOUT_MS;
            const needsAnimation = renderer.isAnythingOnScreen() || recorder.isPlaying;
            if (needsAnimation) {
                this.#animationFrameId = requestAnimationFrame(loop);
            } else {
                this.stopAnimationLoop();
            }
        };
        
        // Start the loop.
        loop();
    }

    /**
     * Stops the main animation loop.
     */
    stopAnimationLoop(): void {
        if (this.#animationFrameId !== null) {
            cancelAnimationFrame(this.#animationFrameId);
            this.#animationFrameId = null;
            console.log("Animation stopped")
        }
    }

    onPlaybackTimer(): void {
        this.#playbackTicks++;
        if (recorder.isPlaying) {
            recorder.playbackUpToNow();
        }
        this.#updateTimestamp();
    }

    #updateTimestamp(): void {
        if (recorder.isPlaying || recorder.isPausing || (recorder.isIdle && recorder.isAnythingRecorded)) {
            // Update the time indicator
            const timeStamp = this.getHumanReadableCurrentPlaybackTimestamp();
            if (timeStamp != this.#onPlaybackTimer_lastShownPlaybackTimestamp) {
                this.#timestamp.text(timeStamp);
                this.#onPlaybackTimer_lastShownPlaybackTimestamp = timeStamp;
            }
            controls.setCurrentPosition(recorder.currentPlaybackTimestamp, recorder.lastEventTimestamp);
        } else if (recorder.isRecording) {
            this.#timestamp.text("-");
            controls.setCurrentPosition(0, 0);
        } else {
            this.#timestamp.text("0:00");
            controls.setCurrentPosition(0, 0);
        }
    }
    
    #onPlaybackTimer_lastShownPlaybackTimestamp = "";

    downloadRequested(): void {
        saveAsBox.open();
    }

    uploadRequested(): void {
        coordinator.withOverwriteConfirm(() => {
            $('#open_file').trigger('click');
        });
    }

    withOverwriteConfirm(callback: ()=> void): void {
        if (recorder.isDirty) {
            confirmBox.show("Discard recording?", () => callback());
        } else {
            callback();
        }
    }

    async extendWakelock(): Promise<void> {
        // Got the wake lock type definition from:
        // https://github.com/DefinitelyTyped/DefinitelyTyped/tree/master/types/dom-screen-wake-lock
        // npm i @types/dom-screen-wake-lock
        if (this.#wakelock === null) {
            try {
                this.#wakelock = await navigator.wakeLock.request('screen');
                this.#wakelock.addEventListener('release', () => {
                    this.#wakelock = null;
                    console.log("Wake lock released by system");
                });
                console.log("Wake lock acquired");
            } catch (err) {
                console.log("Failed to acquire wake lock", err);
            }
        }
        if (this.#wakelockTimer !== null) {
            clearTimeout(this.#wakelockTimer);
        }
        this.#wakelockTimer = setTimeout(() => {
            if (this.#wakelock !== null) {
                this.#wakelock.release();
                this.#wakelock = null;
                console.log("Wake lock released");
            }
        }, WAKE_LOCK_MILLIS);
    }

    close(): void {
        this.stopAnimationLoop();
        recorder.stopPlaying();
        this.resetMidi();
    }
}

export const coordinator = new Coordinator();

function onMIDISuccess(midiAccess: WebMidi.MIDIAccess): void {
    console.log("onMIDISuccess");

    for (let input of midiAccess.inputs.values()) {
        console.log("Input: ", input);
        input.onmidimessage = (ev) => {
            coordinator.onMidiMessage(MidiEvent.fromNativeEvent(ev));
        }
    }
    for (let output of midiAccess.outputs.values()) {
        console.log("Output: ", output);
        if (!/midi through/i.test(output.name ?? "")) {
            midiOutputManager.setMidiOut(output);
        }
    }
}

function onMIDIFailure(): void {
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
} else {
    alert("Your browser doesn't support WebMIDI. (Try Chrome instead.)");
}

const ebody = $('body');

$(window).on('keydown', (ev) => coordinator.onKeyDown(ev.originalEvent!));


$("body").on("dragover", function(ev) {
    ev.preventDefault();
});

function loadMidiFile(file: File) {
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

let clearCursorTimeout: number | null = null;

$("body").on("mousemove", function(_ev) {
    if (clearCursorTimeout !== null) {
        clearTimeout(clearCursorTimeout);
    }
    ebody.css('cursor', 'default');
    clearCursorTimeout = setTimeout(() => {
        ebody.css('cursor', 'none');
    }, 3000);

    coordinator.extendWakelock();
});

$("body").on("drop", function(ev) {
    ev.preventDefault();
    let oev = <DragEvent>ev.originalEvent;
    const file = oev.dataTransfer!.files[0]!;
    console.log("File dropped", file, oev.dataTransfer);
    coordinator.withOverwriteConfirm(() => {
        loadMidiFile(file);
    });
});

$("#open_file").on("change", (ev) => {
    const file = (<HTMLInputElement>ev.target).files![0];
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
        open: function(_event, ui) {
            // The problem on touchscreens is that a "tap" triggers a 'mouseover' event
            // which shows the tooltip, but no 'mouseout' event follows to hide it.
            // This leaves the tooltip "stuck" on the screen.

            // Our solution is to check if a touch event happened very recently.
            // If it did, we assume the tooltip was triggered by a tap, and we
            // set a timer to automatically hide it.
            if (Date.now() - lastTouchTime < 500) { // 500ms is a reasonable threshold
                setTimeout(function() {
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
