/**
 * @file coordinator.ts
 * @description Coordinates application state, user settings persistence, keyboard shortcuts,
 * animation loop lifecycle, MIDI message routing, note/chord display, and wake lock management.
 */
'use strict';
var _a;
import { DEFAULT_PLAY_SPEED_INDEX, FPS_TO_MILLIS, ROLL_SCROLL_SPEED_COUNT, WAKE_LOCK_MILLIS, getCappedPlayIndex, getNextPlaySpeedIndex, getNextScrollSpeedIndex, getPlaySpeedFactor, getScrollSpeedPx, int, } from './config.js';
import { getNoteFullName, analyzeChord } from './chords.js';
import { DEBUG, debug, info, toggleDebug } from './util.js';
import { MetronomeOptions } from './metronome.js';
import { RecorderState } from './recorder.js';
function createDefaultMetronomeOptions() {
    const opts = new MetronomeOptions();
    opts.bpm = 120;
    opts.beats = 4;
    opts.subBeats = 1;
    return opts;
}
export class Coordinator {
    #renderer;
    #midiRenderingStatus;
    #midiOutputManager;
    #metronome;
    #alwaysRecorder;
    #recorder;
    #audioProcessor;
    #controls;
    #saveAsBox;
    #confirmBox;
    #metronomeBox;
    #midiOutputBox;
    #scale;
    #storage;
    #now;
    #simulateZeroLengthNotes;
    #nextFpsMeasureSecond = 0;
    #frames = 0;
    #flips = 0;
    #playbackTicks = 0;
    #efps;
    #wakelock = null;
    #wakelockRequesting = false;
    #wakelockTimer = null;
    #closed = false;
    #notes;
    #chords;
    #useSharp;
    #showOctaveLines;
    #showNoteNames;
    #scrollSpeedIndex;
    #playSpeedIndex;
    #showNoteOffLines = false;
    #isHelpVisible = false;
    #metronomeOptions;
    #knownRecorderState;
    #playbackTimerLastNow = 0;
    static STORAGE_KEY_USE_SHARP = 'mvv_useSharp';
    static STORAGE_KEY_SHOW_VLINES = 'mvv_showVlines';
    static STORAGE_KEY_SHOW_NOTE_NAMES = 'mvv_showNoteNames';
    static STORAGE_KEY_SCROLL_SPEED = 'mvv_scrollSpeed';
    static STORAGE_KEY_PLAY_SPEED = 'mvv_playSpeed';
    static STORAGE_KEY_NOTE_OFF_LINES = 'note_off_lines';
    static STORAGE_KEY_METRONOME_OPTIONS = 'mvv_metronomeOptions';
    constructor(deps) {
        this.#renderer = deps.renderer;
        this.#midiRenderingStatus = deps.midiRenderingStatus;
        this.#midiOutputManager = deps.midiOutputManager;
        this.#metronome = deps.metronome;
        this.#alwaysRecorder = deps.alwaysRecorder;
        this.#recorder = deps.recorder;
        this.#audioProcessor = deps.audioProcessor;
        this.#controls = deps.controls;
        this.#saveAsBox = deps.saveAsBox;
        this.#confirmBox = deps.confirmBox;
        this.#metronomeBox = deps.metronomeBox;
        this.#midiOutputBox = deps.midiOutputBox;
        this.#scale = deps.scale ?? 1;
        this.#storage = deps.storage !== undefined
            ? deps.storage
            : (typeof localStorage !== 'undefined' ? localStorage : null);
        this.#now = deps.now ?? (() => performance.now());
        this.#simulateZeroLengthNotes = deps.simulateZeroLengthNotes ?? false;
        this.#knownRecorderState = this.#recorder.currentState;
        this.#nextFpsMeasureSecond = this.#now() + 1000;
        this.#efps = $("#fps");
        this.#notes = $('#notes');
        this.#chords = $('#chords');
        // Load and validate persisted settings from storage
        const storedSharp = this.#getStorageItem(_a.STORAGE_KEY_USE_SHARP);
        this.#useSharp = storedSharp === null ? true : storedSharp === 'true';
        const storedVlines = this.#getStorageItem(_a.STORAGE_KEY_SHOW_VLINES);
        this.#showOctaveLines = storedVlines === null ? true : storedVlines === 'true';
        const storedNoteNames = this.#getStorageItem(_a.STORAGE_KEY_SHOW_NOTE_NAMES);
        this.#showNoteNames = storedNoteNames === null ? true : storedNoteNames === 'true';
        const storedSpeed = this.#getStorageItem(_a.STORAGE_KEY_SCROLL_SPEED);
        const parsedSpeed = storedSpeed !== null ? parseInt(storedSpeed, 10) : NaN;
        this.#scrollSpeedIndex = Number.isInteger(parsedSpeed) && parsedSpeed >= 0 && parsedSpeed < ROLL_SCROLL_SPEED_COUNT
            ? parsedSpeed
            : 0;
        const storedPlaySpeed = this.#getStorageItem(_a.STORAGE_KEY_PLAY_SPEED);
        const parsedPlaySpeed = storedPlaySpeed !== null ? parseInt(storedPlaySpeed, 10) : NaN;
        this.#playSpeedIndex = Number.isInteger(parsedPlaySpeed)
            ? getCappedPlayIndex(parsedPlaySpeed)
            : DEFAULT_PLAY_SPEED_INDEX;
        const noteOffLines = this.#getStorageItem(_a.STORAGE_KEY_NOTE_OFF_LINES);
        this.#showNoteOffLines = noteOffLines === null ? true : noteOffLines === 'true';
        const storedMetronomeOptions = this.#getStorageItem(_a.STORAGE_KEY_METRONOME_OPTIONS);
        if (storedMetronomeOptions) {
            try {
                this.#metronomeOptions = MetronomeOptions.fromJson(storedMetronomeOptions);
            }
            catch {
                this.#metronomeOptions = createDefaultMetronomeOptions();
            }
        }
        else {
            this.#metronomeOptions = createDefaultMetronomeOptions();
        }
    }
    #getStorageItem(key) {
        try {
            return this.#storage?.getItem(key) ?? null;
        }
        catch {
            return null;
        }
    }
    #setStorageItem(key, value) {
        try {
            this.#storage?.setItem(key, value);
        }
        catch {
            // Ignore storage security/quota errors.
        }
    }
    setUiComponents(ui) {
        if (ui.controls !== undefined)
            this.#controls = ui.controls;
        if (ui.saveAsBox !== undefined)
            this.#saveAsBox = ui.saveAsBox;
        if (ui.confirmBox !== undefined)
            this.#confirmBox = ui.confirmBox;
        if (ui.metronomeBox !== undefined)
            this.#metronomeBox = ui.metronomeBox;
        if (ui.midiOutputBox !== undefined)
            this.#midiOutputBox = ui.midiOutputBox;
    }
    setSimulateZeroLengthNotes(enabled) {
        this.#simulateZeroLengthNotes = enabled;
    }
    get isHelpVisible() {
        return this.#isHelpVisible;
    }
    onKeyDown(ev) {
        debug("onKeyDown", ev.timeStamp, ev.code, ev);
        // Always allow '?' and 'Escape' to control the help screen.
        if (ev.key === '?') {
            if (ev.repeat)
                return;
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
        // Allow '+' (which requires Shift on standard keyboards) before rejecting Shift-modified keys.
        if (ev.key === '+' && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
            this.#metronome.adjustTempo(5);
            ev.preventDefault();
            return;
        }
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
                this.#efps.toggle();
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
                this.#recorder.jumpToPreviousSection();
                this.updateUi();
                break;
            case 'KeyN':
                if (isRepeat)
                    break;
                this.#recorder.jumpToNextSection();
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
                this.#onRewindPressed(isRepeat);
                break;
            case 'ArrowRight':
                this.#onFastForwardPressed(isRepeat);
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
                this.#alwaysRecorder.clear();
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
                this.#audioProcessor.toggle();
                break;
            case 'Equal':
            case 'NumpadAdd':
                this.#metronome.adjustTempo(5);
                break;
            case 'Minus':
            case 'NumpadMinus':
                this.#metronome.adjustTempo(-5);
                break;
            default:
                return;
        }
        ev.preventDefault();
    }
    showOutputSelector() {
        this.#midiOutputBox?.open();
    }
    toggleMetronome() {
        if (this.#metronome.isPlaying) {
            this.#metronome.stop();
        }
        else {
            this.#metronomeBox?.show(this.#metronomeOptions, (opts) => {
                this.#metronomeOptions = opts;
                this.#setStorageItem(_a.STORAGE_KEY_METRONOME_OPTIONS, JSON.stringify(opts));
                this.#metronome.start(opts);
                this.updateUi();
            });
        }
        this.updateUi();
    }
    get isSharpMode() {
        return this.#useSharp;
    }
    setSharpMode(useSharp) {
        info("Mode changed to " + (useSharp ? "sharp" : "flat"));
        this.#useSharp = useSharp;
        this.#setStorageItem(_a.STORAGE_KEY_USE_SHARP, String(useSharp));
    }
    get isShowingOctaveLines() {
        return this.#showOctaveLines;
    }
    setShowingOctaveLines(show) {
        this.#showOctaveLines = show;
        this.#setStorageItem(_a.STORAGE_KEY_SHOW_VLINES, String(show));
        this.startAnimationLoop();
    }
    get isShowingNoteNames() {
        return this.#showNoteNames;
    }
    toggleNoteNames() {
        this.#showNoteNames = !this.#showNoteNames;
        this.#setStorageItem(_a.STORAGE_KEY_SHOW_NOTE_NAMES, String(this.#showNoteNames));
        this.startAnimationLoop();
    }
    get scrollSpeedPx() {
        return getScrollSpeedPx(this.scrollSpeedIndex, this.#scale);
    }
    get scrollSpeedFactor() {
        const base = getScrollSpeedPx(0, this.#scale);
        return base > 0 ? this.scrollSpeedPx / base : 1;
    }
    get scrollSpeedIndex() {
        return this.#scrollSpeedIndex;
    }
    setScrollSpeedIndex(index) {
        this.#scrollSpeedIndex = index;
        this.#setStorageItem(_a.STORAGE_KEY_SCROLL_SPEED, String(index));
    }
    rotateScrollSpeed() {
        this.setScrollSpeedIndex(getNextScrollSpeedIndex(this.scrollSpeedIndex));
    }
    get playSpeedIndex() {
        return this.#playSpeedIndex;
    }
    get playSpeedFactor() {
        return getPlaySpeedFactor(this.playSpeedIndex);
    }
    #setPlaySpeedIndex(index) {
        this.#playSpeedIndex = index;
        this.#setStorageItem(_a.STORAGE_KEY_PLAY_SPEED, String(index));
        this.updateUi();
        console.log("Speed changed", index, this.playSpeedFactor);
    }
    rotatePlaySpeed() {
        this.#setPlaySpeedIndex(getNextPlaySpeedIndex(this.playSpeedIndex));
    }
    resetPlaySpeed() {
        this.#setPlaySpeedIndex(DEFAULT_PLAY_SPEED_INDEX);
    }
    shiftPlaySpeed(increment) {
        this.#setPlaySpeedIndex(getCappedPlayIndex(this.playSpeedIndex + increment));
    }
    toggleHelpScreen() {
        this.#isHelpVisible = !this.#isHelpVisible;
        if (this.#isHelpVisible) {
            $('#help_overlay').fadeIn('fast');
            $('#help_box').fadeIn('fast');
        }
        else {
            $('#help_overlay').fadeOut('fast');
            $('#help_box').fadeOut('fast');
        }
    }
    get isShowingNoteOffLines() {
        return this.#showNoteOffLines;
    }
    toggleNoteOffLines() {
        info("Toggle note-off lines");
        this.#showNoteOffLines = !this.#showNoteOffLines;
        this.#setStorageItem(_a.STORAGE_KEY_NOTE_OFF_LINES, String(this.#showNoteOffLines));
        this.updateUi();
    }
    toggleVideoMute() {
        info("Toggle video mute");
        this.#renderer.toggleMute();
        this.updateUi();
    }
    toggleRollFrozen() {
        this.#renderer.toggleRollFrozen();
        if (this.#renderer.isRollFrozen) {
            info("Roll frozen");
        }
        this.updateUi();
    }
    toggleRecording() {
        if (this.#recorder.isRecording) {
            this.#recorder.stopRecording();
        }
        else {
            this.startRecording();
        }
        this.updateUi();
    }
    startRecording() {
        if (!this.#recorder.isRecording) {
            this.withOverwriteConfirm("Start new recording.", () => this.#recorder.startRecording());
        }
        this.updateUi();
    }
    #ensureOutputDevice() {
        if (!this.#midiOutputManager.anyDeviceSelected) {
            info("No MIDI output device selected");
            return false;
        }
        return true;
    }
    togglePlayback() {
        if (this.#recorder.isPlaying) {
            this.#recorder.pause();
            this.updateUi();
            return;
        }
        if (!this.#ensureOutputDevice()) {
            return;
        }
        if (this.#recorder.isPausing) {
            this.#recorder.unpause();
        }
        else if (this.#recorder.isIdle) {
            this.startPlayback();
        }
        this.updateUi();
    }
    startPlayback() {
        if (!this.#ensureOutputDevice()) {
            return;
        }
        if (this.#recorder.isIdle) {
            this.#recorder.startPlaying();
        }
        else if (this.#recorder.isPausing) {
            this.#recorder.unpause();
        }
        this.updateUi();
    }
    pause() {
        if (this.#recorder.isPlaying) {
            this.#recorder.pause();
        }
        else if (this.#recorder.isPausing) {
            if (!this.#ensureOutputDevice()) {
                return;
            }
            this.#recorder.unpause();
        }
        this.updateUi();
    }
    trimBefore() {
        if (this.#recorder.isRecording || !this.#recorder.isAnythingRecorded || this.#recorder.isBeginning) {
            return;
        }
        // Always confirm before discarding events.
        this.#confirmBox?.show("Trim recording before current position?", () => {
            this.#recorder.trimBefore();
            this.updateUi();
        });
    }
    stop() {
        if (this.#recorder.isRecording) {
            this.#recorder.stopRecording();
        }
        else if (this.#recorder.isPlaying || this.#recorder.isPausing) {
            this.#recorder.stopPlaying();
        }
        this.updateUi();
    }
    moveToStart() {
        if (this.#recorder.isRecording) {
            return;
        }
        this.#recorder.moveToStart();
        this.updateUi();
    }
    moveToPercent(percent) {
        if (this.#recorder.isRecording) {
            return;
        }
        const newTime = this.#recorder.lastEventTimestamp * percent;
        this.moveToTime(newTime);
    }
    moveToTime(newTime) {
        if (this.#recorder.isRecording) {
            return;
        }
        const delta = newTime - this.#recorder.currentPlaybackTimestamp;
        this.#recorder.adjustPlaybackPosition(delta);
        this.updateUi();
    }
    toggleFullScreen() {
        if (!document.fullscreenElement) {
            Promise.resolve(document.documentElement.requestFullscreen()).catch(() => { });
        }
        else {
            Promise.resolve(document.exitFullscreen()).catch(() => { });
        }
    }
    onRecorderStatusChanged(newState) {
        const lastState = this.#knownRecorderState;
        this.#knownRecorderState = newState;
        this.updateUi();
        if (lastState != RecorderState.Playing && newState == RecorderState.Playing) {
            this.#playbackTimerLastNow = this.#now();
        }
    }
    replayFromAlwaysRecordingBuffer() {
        this.withOverwriteConfirm("Restoring recent play as recording.", () => {
            this.#recorder.copyFromAlwaysRecorder(this.#alwaysRecorder);
            this.updateUi();
        });
    }
    get isReplayAvailable() {
        return this.#alwaysRecorder.isAvailable;
    }
    updateUi() {
        this.#controls?.update();
        this.#updateFps();
        this.updateNoteInformation();
    }
    #ignoreRepeatedRewindKey = false;
    #onRewindPressed(isRepeat) {
        if (this.#recorder.isRecording) {
            return;
        }
        if (isRepeat && this.#ignoreRepeatedRewindKey) {
            return;
        }
        if (!isRepeat) {
            this.#ignoreRepeatedRewindKey = false;
        }
        this.#recorder.adjustPlaybackPosition(-1000);
        if (this.#recorder.isBeginning) {
            // Stop accepting repeated rewind keys once we hit the beginning.
            this.#ignoreRepeatedRewindKey = true;
        }
        this.updateUi();
    }
    #onFastForwardPressed(_isRepeat) {
        if (this.#recorder.isRecording || this.#recorder.isAfterLast) {
            return;
        }
        this.#recorder.adjustPlaybackPosition(1000);
        this.updateUi();
    }
    #normalizeMidiEvent(ev) {
        // Allow V25's leftmost knobs to act as damper and sostenuto pedals.
        if (ev.device.startsWith("V25")) {
            if (ev.data0 === 176 && ev.data1 === 20) {
                ev.replaceData(1, 64);
            }
            else if (ev.data0 === 176 && ev.data1 === 21) {
                ev.replaceData(1, 66);
            }
        }
    }
    onMidiMessage(ev) {
        if (DEBUG) {
            debug("onMidiMessage: " + ev.toString());
        }
        // Ignore Active Sensing (0xFE) and Timing Clock (0xF8).
        if (ev.data0 == 254 || ev.data0 == 248) {
            return;
        }
        this.extendWakelock();
        this.#normalizeMidiEvent(ev);
        this.#midiRenderingStatus.onMidiMessage(ev);
        if (this.#recorder.isRecording) {
            this.#recorder.recordEvent(ev);
        }
        if (ev.isNoteOn || ev.isNoteOff) {
            this.updateNoteInformation();
        }
        // Always record it. If it's the first recorded event, update UI to enable replay.
        const ar = this.#alwaysRecorder.isAvailable;
        this.#alwaysRecorder.recordEvent(ev);
        if (this.#alwaysRecorder.isAvailable != ar) {
            this.updateUi();
        }
        // Optionally simulate zero-length drum-style triggers for debugging.
        if (this.#simulateZeroLengthNotes && ev.isNoteOn) {
            const clone = ev.clone();
            clone.replaceData(0, 0x80 + ev.channel);
            clone.replaceData(2, 0);
            this.onMidiMessage(clone);
        }
    }
    reset() {
        this.#recorder.stopPlaying();
        this.#recorder.stopRecording();
        this.updateUi();
        this.resetMidi();
    }
    resetMidi() {
        this.#midiRenderingStatus.reset();
        this.#midiOutputManager.reset();
    }
    #updateFps() {
        if (!this.isAnimating) {
            this.#efps.text("Animation stopped");
            this.#nextFpsMeasureSecond = 0;
            return;
        }
        const now = this.#now();
        if (now >= this.#nextFpsMeasureSecond) {
            this.#efps.text(`${this.#flips}/${this.#frames} - ${this.#playbackTicks}`);
            this.#flips = 0;
            this.#frames = 0;
            this.#playbackTicks = 0;
            this.#nextFpsMeasureSecond += 1000;
            if (this.#nextFpsMeasureSecond < now) {
                this.#nextFpsMeasureSecond = now + 1000;
            }
        }
    }
    onDraw(time) {
        this.#renderer.onDraw(time);
        this.#midiRenderingStatus.afterDraw(time);
        this.#updateFps();
    }
    #updateNoteInformationNoteNamesShown = false;
    #updateNoteInformationCacheKey = null;
    updateNoteInformation() {
        const time = this.#now();
        if (!this.isShowingNoteNames) {
            if (this.#updateNoteInformationNoteNamesShown) {
                this.#notes.fadeOut(800);
                this.#chords.fadeOut(800);
                this.#updateNoteInformationNoteNamesShown = false;
                this.#updateNoteInformationCacheKey = null;
            }
            return;
        }
        this.#updateNoteInformationNoteNamesShown = true;
        const notes = this.#midiRenderingStatus.getPressedNotes();
        // Include sharp/flat mode and recent-highlight state in the cache key so toggling
        // notation or expiring the 50ms highlight refreshes held notes immediately.
        const cacheKey = `${this.#useSharp ? 1 : 0}|` + notes
            .map((n) => `${n.note}:${(time - n.onTime) <= 50 ? 1 : 0}`)
            .join(',');
        if (cacheKey === this.#updateNoteInformationCacheKey) {
            return;
        }
        this.#updateNoteInformationCacheKey = cacheKey;
        let lastOctave = -1;
        const noteSpans = notes.map((n) => {
            const noteName = getNoteFullName(n.note, this.#useSharp);
            // Add extra space between octaves.
            const octave = int(n.note / 12);
            const spacing = (lastOctave < 0 || octave === lastOctave) ? "" : "&nbsp;&nbsp;";
            lastOctave = octave;
            const isRecent = (time - n.onTime) <= 50; // 50 ms
            if (isRecent) {
                return `${spacing}<span class="notes_highlight">${noteName}</span>`;
            }
            else {
                return `${spacing}<span>${noteName}</span>`;
            }
        });
        const noteNamesHtml = noteSpans.join(' ');
        const pressedNoteNumbers = notes.map(n => n.note);
        let index = -1;
        const chordNamesHtml = analyzeChord(pressedNoteNumbers, this.#useSharp).map((chord) => {
            index++;
            if (index == 0) {
                return `<span class="notes_highlight">${chord}</span>`;
            }
            else {
                return `<span>${chord}</span>`;
            }
        }).join(", ");
        if (noteNamesHtml.length > 0) {
            this.#notes.html(noteNamesHtml);
            this.#notes.stop(true, true).show();
        }
        else {
            this.#notes.fadeOut(800);
        }
        if (chordNamesHtml) {
            this.#chords.html(chordNamesHtml);
            this.#chords.stop(true, true).show();
        }
        else {
            this.#chords.fadeOut(800);
        }
    }
    #animating = false;
    #animationFrameId = null;
    get isAnimating() {
        return this.#animating;
    }
    /**
     * Starts the main animation loop, synchronized with the browser's vsync cycle.
     */
    startAnimationLoop() {
        if (this.isAnimating) {
            return;
        }
        console.log("Animation started");
        this.#animating = true;
        this.#nextFpsMeasureSecond = this.#now() + 1000;
        this.#updateFps();
        let nextFlip = -1;
        const loop = (time, forceRequest) => {
            this.#frames++;
            let requestNext = false;
            if (time < nextFlip) {
                requestNext = true;
            }
            else {
                nextFlip = time + FPS_TO_MILLIS;
                this.#flips++;
                this.onDraw(time);
                this.#renderer.flip();
                // Update note info every frame because SHORTEST_NOTE_LENGTH compensation
                // can expire on a later draw tick; internal caching keeps steady frames cheap.
                this.updateNoteInformation();
                const needsAnimation = this.#renderer.needsAnimation() ||
                    this.#recorder.isPlaying || this.#midiRenderingStatus.needsAnimation();
                if (forceRequest || needsAnimation) {
                    requestNext = true;
                }
            }
            if (requestNext) {
                this.#animationFrameId = requestAnimationFrame((t) => loop(t, false));
            }
            else {
                this.stopAnimationLoop();
            }
        };
        loop(this.#now(), true);
    }
    stopAnimationLoop() {
        if (this.#animating) {
            if (this.#animationFrameId !== null) {
                cancelAnimationFrame(this.#animationFrameId);
                this.#animationFrameId = null;
            }
            this.#animating = false;
            console.log("Animation stopped");
            this.#updateFps();
        }
    }
    onPlaybackTimer() {
        this.#playbackTicks++;
        if (this.#recorder.isPlaying) {
            const now = this.#now();
            this.#recorder.playbackUpToNow((now - this.#playbackTimerLastNow) * this.playSpeedFactor);
            this.#playbackTimerLastNow = now;
            this.#controls?.updateTimestamp();
        }
    }
    downloadRequested() {
        this.#saveAsBox?.open();
    }
    uploadRequested() {
        this.withOverwriteConfirm("Uploading a MIDI file.", () => {
            $('#open_file').trigger('click');
        });
    }
    withOverwriteConfirm(message, callback) {
        if (this.#recorder.isDirty) {
            this.#confirmBox?.show(message + " Discard current recording?", () => callback());
        }
        else {
            callback();
        }
    }
    #scheduleWakelockRelease() {
        if (this.#wakelockTimer !== null) {
            clearTimeout(this.#wakelockTimer);
        }
        this.#wakelockTimer = setTimeout(() => {
            this.#wakelockTimer = null;
            if (this.#wakelock !== null) {
                Promise.resolve(this.#wakelock.release()).catch(() => { });
                this.#wakelock = null;
                console.log("Wake lock released");
            }
        }, WAKE_LOCK_MILLIS);
    }
    async extendWakelock() {
        if (this.#closed) {
            return;
        }
        this.#scheduleWakelockRelease();
        if (this.#wakelock === null && !this.#wakelockRequesting && typeof navigator !== 'undefined' && navigator.wakeLock) {
            this.#wakelockRequesting = true;
            try {
                const sentinel = await navigator.wakeLock.request('screen');
                if (this.#closed) {
                    Promise.resolve(sentinel.release()).catch(() => { });
                    return;
                }
                this.#wakelock = sentinel;
                sentinel.addEventListener('release', () => {
                    if (this.#wakelock === sentinel) {
                        this.#wakelock = null;
                    }
                    console.log("Wake lock released by system");
                });
                if (this.#wakelockTimer === null) {
                    this.#scheduleWakelockRelease();
                }
                console.log("Wake lock acquired");
            }
            catch (err) {
                console.log("Failed to acquire wake lock", err);
            }
            finally {
                this.#wakelockRequesting = false;
            }
        }
    }
    close() {
        this.#closed = true;
        this.stopAnimationLoop();
        this.#metronome.stop();
        this.#audioProcessor.stop();
        this.#recorder.stopPlaying();
        this.#recorder.stopRecording();
        this.resetMidi();
        if (this.#wakelockTimer !== null) {
            clearTimeout(this.#wakelockTimer);
            this.#wakelockTimer = null;
        }
        if (this.#wakelock !== null) {
            Promise.resolve(this.#wakelock.release()).catch(() => { });
            this.#wakelock = null;
        }
    }
}
_a = Coordinator;
//# sourceMappingURL=coordinator.js.map