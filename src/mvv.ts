'use strict';

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

const WAKE_LOCK_MILLIS = 5 * 60 * 1000; // 5 minutes
// const WAKE_LOCK_MILLIS = 3000; // for testing

// We set some styles in JS.
const BAR_RATIO = 0.3; // Bar : Roll height

const FPS = 60; // This is now only used for the FPS counter display, not for timing the loop.

// Common values
const RGB_BLACK: [number, number, number] = [0, 0, 0];

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

// Return the current time in "yyyy-mm-dd-hh-mm-ss.mmm" format, which is used for
// midi filenames.
function getCurrentTime(): string {
    const nowUtc = new Date();
    const nowLocal = new Date(nowUtc.getTime() - (nowUtc.getTimezoneOffset() * 60 * 1000));
    let ret = nowLocal.toISOString();
    return ret.replace("Z", "").replaceAll(/[:T]/g, "-").replace(/\..*$/, "");
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

    onDraw(): void {
        // Scroll the roll.
        this.#roll.drawImage(this.#croll, 0, this.#ROLL_SCROLL_AMOUNT);

        const sustainColor = this.getPedalColor(midiRenderingStatus.pedal);
        const sostenutoColor = this.getSostenutoPedalColor(midiRenderingStatus.sostenuto);
        const pedalColor = this.mixRgb(sustainColor, sostenutoColor);

        this.#roll.fillStyle = rgbToStr(pedalColor);
        this.#roll.fillRect(0, 0, this.#W, this.#ROLL_SCROLL_AMOUNT);

        // Clear the bar area.
        this.#bar.fillStyle = 'black';
        this.#bar.fillRect(0, 0, this.#W, this.#H);

        // Individual bar width
        let bw = this.#W / (this.#MAX_NOTE - this.#MIN_NOTE + 1) - 1;

        // "Off" line
        if (midiRenderingStatus.offNoteCount > 0) {
            // We don't highlight off lines. Always same color.
            // However, if we draw two off lines in a raw, it'll look brighter,
            // so avoid doing so.
            if (!this.#drewOffLine) {
                this.#roll.fillStyle = "#008040";
                this.#roll.fillRect(0, this.#ROLL_SCROLL_AMOUNT - s(2), this.#W, s(2));
            }

            this.#drewOffLine = true;
        } else {
            this.#drewOffLine = false;
        }
        
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
    }

    get isRollFrozen(): boolean {
        return this.#rollFrozen;
    }

    get isVideoMuted(): boolean {
        return $('#canvases').css('display') === 'none';
    }
}

const renderer = new Renderer();

class MidiRenderingStatus {
    #tick = 0;
    #notes: Array<[boolean, number, number]> = []; // note on/off, velocity, last on-tick
    #pedal = 0;
    #sostenuto = 0;
    #onNoteCount = 0;
    #offNoteCount = 0;

    constructor() {
        this.reset();
    }

    onMidiMessage(ev: MidiEvent): void {
        let status = ev.status;
        let data1 = ev.data1;
        let data2 = ev.data2;

        if (ev.isNoteOn) { // Note on
            this.#onNoteCount++;
            let ar = this.#notes[data1]!;
            ar[0] = true;
            ar[1] = data2;
            ar[2] = this.#tick;
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
            this.#notes[i] = [false, 0, -99999]; // note on/off, velocity, last note on tick
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
}

const midiRenderingStatus = new MidiRenderingStatus();

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

const midiOutputManager = new MidiOutputManager();

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
        this.#state = RecorderState.Playing;
        this.#playbackStartTimestamp = performance.now();
        this.#playbackTimeAdjustment = 0;
        this.#nextPlaybackIndex = 0;

        coordinator.onRecorderStatusChanged();
    }

    #stopPlaying(): void {
        info("Playback stopped");
        this.#state = RecorderState.Idle;

        coordinator.onRecorderStatusChanged();
        coordinator.resetMidi();
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
        this.adjustPlaybackPosition(-9999999999);
    }

    // Fast-forward or rewind.
    adjustPlaybackPosition(deltaMilliseconds: number): boolean {
        this.#playbackTimeAdjustment += deltaMilliseconds;
        let ts = this.#getCurrentPlaybackTimestamp();
        // If rewound beyond the starting point, reset the relevant values.
        if (ts <= 0) {
            this.#playbackStartTimestamp = performance.now();
            if (this.isPausing) {
                this.#pauseStartTimestamp = this.#playbackStartTimestamp;
            }
            this.#playbackTimeAdjustment = 0;
            ts = -1; // Special case: Move before the first note.
        }

        // Find the next play event index.
        this.#nextPlaybackIndex = 0;
        this.#moveUpToTimestamp(ts, null);

        return ts > 0;
    }

    #getPausingDuration(): number {
        return this.isPausing ? (performance.now() - this.#pauseStartTimestamp) : 0;
    }

    #getCurrentPlaybackTimestamp(): number {
        return (performance.now() - this.#playbackStartTimestamp) +
                this.#playbackTimeAdjustment - this.#getPausingDuration();
    }

    playbackUpToNow(): boolean {
        if (!this.isPlaying) {
            return false;
        }

        // Current timestamp
        let ts = this.#getCurrentPlaybackTimestamp();
        if (DEBUG) {
            debug(this.#playbackStartTimestamp, performance.now(), this.#playbackTimeAdjustment, this.#getPausingDuration());
        }

        return this.#moveUpToTimestamp(ts, (ev: MidiEvent) => {
            if (DEBUG) {
                debug("Playback: time=" + int(this.currentPlaybackTimestamp / 1000) +
                        " index=" + (this.#nextPlaybackIndex - 1), ev);
            }
            midiRenderingStatus.onMidiMessage(ev);
            midiOutputManager.sendEvent(ev.getDataAsArray(), 0)
        });
    }

    #moveUpToTimestamp(timeStamp: number, callback: null | ((a: MidiEvent) => void)): boolean {
        for (;;) {
            if (this.isAfterLast) {
                // No more events.

                // But do not auto-stop; otherwise it'd be hard to listen to the last part.
                // this.isPlaying = false;
                // coordinator.onRecorderStatusChanged();
                // return false;
                return true;
            }
            let ev = this.#events[this.#nextPlaybackIndex]!;
            if (ev.timeStamp > timeStamp) {
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
            return;
        }

        const lastEvent = events[events.length - 1]!;
        this.#lastEventTimestamp = lastEvent.timeStamp;

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
    #wakelock : WakeLockSentinel | null = null;
    #wakelockTimer : number | null = 0;
    #timestamp;
    #noteDisplay;
    #useSharp = true;

    constructor() {
        this.#nextSecond = performance.now() + 1000;
        this.#efps = $("#fps");
        this.#timestamp = $('#timestamp');
        this.#noteDisplay = $('#note_display');
    }

    onKeyDown(ev: KeyboardEvent) {
        debug("onKeyDown", ev.timeStamp, ev.code, ev);

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

    get isSharpMode(): boolean {
        return this.#useSharp;
    }

    setSharpMode(useSharp: boolean): void {
        info("Mode changed to " + (useSharp ? "sharp" : "flat"));
        this.#useSharp = useSharp
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
        if (recorder.isPlaying || recorder.isPausing) {
            this.resetMidi();
            recorder.moveToStart();
        }
        this.updateUi();
    }

    moveToPercent(percent: number): void {
        if (recorder.isRecording) {
            return;
        }
        const newTime = recorder.lastEventTimestamp * percent;

        this.resetMidi();
        recorder.moveToStart();
        recorder.adjustPlaybackPosition(newTime);

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
        if (!(recorder.isPlaying || recorder.isPausing)) {
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
        this.resetMidi();
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
        // const isFinished = recorder.isAfterLast ? " (finished)" : "";
        // this.#getHumanReadableCurrentPlaybackTimestamp_lastResult += isFinished;
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
        const pressedNotes = midiRenderingStatus.getPressedNotes();
        const noteNames = pressedNotes.map((note) => getNoteFullName(note, this.#useSharp)).join(' ');
        const chordName = analyzeChord(pressedNotes, this.#useSharp);
        
        const text = chordName ? `${noteNames}  [${chordName}]` : noteNames;

        if (text.length > 0) {
            this.#noteDisplay.text(text);
            this.#noteDisplay.stop(true, true).show();
        } else {
            this.#noteDisplay.fadeOut(800);
        }
    }
    
    // --- START: VSYNC-BASED ANIMATION LOOP ---
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

        const loop = () => {
            // #flips is for the FPS counter, representing screen updates.
            this.#flips++; 
            
            // Run a playback tick to process MIDI events.
            this.onPlaybackTimer();
            
            // Draw the current state to the off-screen canvas.
            // This also updates the #frames count for the FPS counter.
            this.onDraw();
            
            // Copy the off-screen canvas to the visible one.
            renderer.flip();
            
            // Request the next frame.
            this.#animationFrameId = requestAnimationFrame(loop);
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
        if (recorder.isPlaying || recorder.isPausing) {
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
            this.#timestamp.text("0.00");
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

const coordinator = new Coordinator();

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
    console.log("File dropped", oev.dataTransfer!.files[0], oev.dataTransfer);
    coordinator.withOverwriteConfirm(() => {
        loadMidiFile(oev.dataTransfer!.files[0]!);
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
