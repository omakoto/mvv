/**
 * @file coordinator.ts
 * @description Coordinates application state, user settings persistence, keyboard shortcuts,
 * animation loop lifecycle, MIDI message routing, note/chord display, and wake lock management.
 */
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
var _Coordinator_instances, _a, _Coordinator_renderer, _Coordinator_midiRenderingStatus, _Coordinator_midiOutputManager, _Coordinator_metronome, _Coordinator_alwaysRecorder, _Coordinator_recorder, _Coordinator_audioProcessor, _Coordinator_controls, _Coordinator_saveAsBox, _Coordinator_confirmBox, _Coordinator_metronomeBox, _Coordinator_midiOutputBox, _Coordinator_scale, _Coordinator_storage, _Coordinator_now, _Coordinator_simulateZeroLengthNotes, _Coordinator_nextFpsMeasureSecond, _Coordinator_frames, _Coordinator_flips, _Coordinator_playbackTicks, _Coordinator_efps, _Coordinator_wakelock, _Coordinator_wakelockTimer, _Coordinator_notes, _Coordinator_chords, _Coordinator_useSharp, _Coordinator_showOctaveLines, _Coordinator_showNoteNames, _Coordinator_scrollSpeedIndex, _Coordinator_playSpeedIndex, _Coordinator_showNoteOffLines, _Coordinator_isHelpVisible, _Coordinator_metronomeOptions, _Coordinator_knownRecorderState, _Coordinator_playbackTimerLastNow, _Coordinator_setPlaySpeedIndex, _Coordinator_ensureOutputDevice, _Coordinator_ignoreRepeatedRewindKey, _Coordinator_onRewindPressed, _Coordinator_onFastForwardPressed, _Coordinator_normalizeMidiEvent, _Coordinator_updateFps, _Coordinator_updateNoteInformationNoteNamesShown, _Coordinator_updateNoteInformationLastNotes, _Coordinator_arraySame, _Coordinator_animationFrameId;
import { DEFAULT_PLAY_SPEED_INDEX, FPS_TO_MILLIS, WAKE_LOCK_MILLIS, getCappedPlayIndex, getNextPlaySpeedIndex, getNextScrollSpeedIndex, getPlaySpeedFactor, getScrollSpeedPx, int, } from './config.js';
import { getNoteFullName, analyzeChord } from './chords.js';
import { DEBUG, debug, info, toggleDebug } from './util.js';
import { MetronomeOptions } from './metronome.js';
import { RecorderState } from './recorder.js';
export class Coordinator {
    constructor(deps) {
        var _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s, _t;
        _Coordinator_instances.add(this);
        _Coordinator_renderer.set(this, void 0);
        _Coordinator_midiRenderingStatus.set(this, void 0);
        _Coordinator_midiOutputManager.set(this, void 0);
        _Coordinator_metronome.set(this, void 0);
        _Coordinator_alwaysRecorder.set(this, void 0);
        _Coordinator_recorder.set(this, void 0);
        _Coordinator_audioProcessor.set(this, void 0);
        _Coordinator_controls.set(this, void 0);
        _Coordinator_saveAsBox.set(this, void 0);
        _Coordinator_confirmBox.set(this, void 0);
        _Coordinator_metronomeBox.set(this, void 0);
        _Coordinator_midiOutputBox.set(this, void 0);
        _Coordinator_scale.set(this, void 0);
        _Coordinator_storage.set(this, void 0);
        _Coordinator_now.set(this, void 0);
        _Coordinator_simulateZeroLengthNotes.set(this, void 0);
        _Coordinator_nextFpsMeasureSecond.set(this, 0);
        _Coordinator_frames.set(this, 0);
        _Coordinator_flips.set(this, 0);
        _Coordinator_playbackTicks.set(this, 0);
        _Coordinator_efps.set(this, void 0);
        _Coordinator_wakelock.set(this, null);
        _Coordinator_wakelockTimer.set(this, null);
        _Coordinator_notes.set(this, void 0);
        _Coordinator_chords.set(this, void 0);
        _Coordinator_useSharp.set(this, void 0);
        _Coordinator_showOctaveLines.set(this, void 0);
        _Coordinator_showNoteNames.set(this, void 0);
        _Coordinator_scrollSpeedIndex.set(this, void 0);
        _Coordinator_playSpeedIndex.set(this, void 0);
        _Coordinator_showNoteOffLines.set(this, false);
        _Coordinator_isHelpVisible.set(this, false);
        _Coordinator_metronomeOptions.set(this, void 0);
        _Coordinator_knownRecorderState.set(this, void 0);
        _Coordinator_playbackTimerLastNow.set(this, 0);
        _Coordinator_ignoreRepeatedRewindKey.set(this, false);
        _Coordinator_updateNoteInformationNoteNamesShown.set(this, false);
        _Coordinator_updateNoteInformationLastNotes.set(this, []);
        _Coordinator_animationFrameId.set(this, null);
        __classPrivateFieldSet(this, _Coordinator_renderer, deps.renderer, "f");
        __classPrivateFieldSet(this, _Coordinator_midiRenderingStatus, deps.midiRenderingStatus, "f");
        __classPrivateFieldSet(this, _Coordinator_midiOutputManager, deps.midiOutputManager, "f");
        __classPrivateFieldSet(this, _Coordinator_metronome, deps.metronome, "f");
        __classPrivateFieldSet(this, _Coordinator_alwaysRecorder, deps.alwaysRecorder, "f");
        __classPrivateFieldSet(this, _Coordinator_recorder, deps.recorder, "f");
        __classPrivateFieldSet(this, _Coordinator_audioProcessor, deps.audioProcessor, "f");
        __classPrivateFieldSet(this, _Coordinator_controls, deps.controls, "f");
        __classPrivateFieldSet(this, _Coordinator_saveAsBox, deps.saveAsBox, "f");
        __classPrivateFieldSet(this, _Coordinator_confirmBox, deps.confirmBox, "f");
        __classPrivateFieldSet(this, _Coordinator_metronomeBox, deps.metronomeBox, "f");
        __classPrivateFieldSet(this, _Coordinator_midiOutputBox, deps.midiOutputBox, "f");
        __classPrivateFieldSet(this, _Coordinator_scale, (_b = deps.scale) !== null && _b !== void 0 ? _b : 1, "f");
        __classPrivateFieldSet(this, _Coordinator_storage, deps.storage !== undefined
            ? deps.storage
            : (typeof localStorage !== 'undefined' ? localStorage : null), "f");
        __classPrivateFieldSet(this, _Coordinator_now, (_c = deps.now) !== null && _c !== void 0 ? _c : (() => performance.now()), "f");
        __classPrivateFieldSet(this, _Coordinator_simulateZeroLengthNotes, (_d = deps.simulateZeroLengthNotes) !== null && _d !== void 0 ? _d : false, "f");
        __classPrivateFieldSet(this, _Coordinator_knownRecorderState, __classPrivateFieldGet(this, _Coordinator_recorder, "f").currentState, "f");
        __classPrivateFieldSet(this, _Coordinator_nextFpsMeasureSecond, __classPrivateFieldGet(this, _Coordinator_now, "f").call(this) + 1000, "f");
        __classPrivateFieldSet(this, _Coordinator_efps, $("#fps"), "f");
        __classPrivateFieldSet(this, _Coordinator_notes, $('#notes'), "f");
        __classPrivateFieldSet(this, _Coordinator_chords, $('#chords'), "f");
        // Load settings from storage
        const storedSharp = (_f = (_e = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _e === void 0 ? void 0 : _e.getItem(_a.STORAGE_KEY_USE_SHARP)) !== null && _f !== void 0 ? _f : null;
        __classPrivateFieldSet(this, _Coordinator_useSharp, storedSharp === null ? true : storedSharp === 'true', "f");
        const storedVlines = (_h = (_g = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _g === void 0 ? void 0 : _g.getItem(_a.STORAGE_KEY_SHOW_VLINES)) !== null && _h !== void 0 ? _h : null;
        __classPrivateFieldSet(this, _Coordinator_showOctaveLines, storedVlines === null ? true : storedVlines === 'true', "f");
        const storedNoteNames = (_k = (_j = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _j === void 0 ? void 0 : _j.getItem(_a.STORAGE_KEY_SHOW_NOTE_NAMES)) !== null && _k !== void 0 ? _k : null;
        __classPrivateFieldSet(this, _Coordinator_showNoteNames, storedNoteNames === null ? true : storedNoteNames === 'true', "f");
        const storedSpeed = (_m = (_l = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _l === void 0 ? void 0 : _l.getItem(_a.STORAGE_KEY_SCROLL_SPEED)) !== null && _m !== void 0 ? _m : null;
        __classPrivateFieldSet(this, _Coordinator_scrollSpeedIndex, storedSpeed ? parseInt(storedSpeed, 10) : 0, "f");
        const storedPlaySpeed = (_p = (_o = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _o === void 0 ? void 0 : _o.getItem(_a.STORAGE_KEY_PLAY_SPEED)) !== null && _p !== void 0 ? _p : null;
        __classPrivateFieldSet(this, _Coordinator_playSpeedIndex, storedPlaySpeed ? parseInt(storedPlaySpeed, 10) : DEFAULT_PLAY_SPEED_INDEX, "f");
        const noteOffLines = (_r = (_q = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _q === void 0 ? void 0 : _q.getItem(_a.STORAGE_KEY_NOTE_OFF_LINES)) !== null && _r !== void 0 ? _r : null;
        __classPrivateFieldSet(this, _Coordinator_showNoteOffLines, noteOffLines === null ? true : noteOffLines === 'true', "f");
        const storedMetronomeOptions = (_t = (_s = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _s === void 0 ? void 0 : _s.getItem(_a.STORAGE_KEY_METRONOME_OPTIONS)) !== null && _t !== void 0 ? _t : null;
        if (storedMetronomeOptions) {
            __classPrivateFieldSet(this, _Coordinator_metronomeOptions, MetronomeOptions.fromJson(storedMetronomeOptions), "f");
        }
        else {
            const opts = new MetronomeOptions();
            opts.bpm = 120;
            opts.beats = 4;
            opts.subBeats = 1;
            __classPrivateFieldSet(this, _Coordinator_metronomeOptions, opts, "f");
        }
    }
    setUiComponents(ui) {
        if (ui.controls !== undefined)
            __classPrivateFieldSet(this, _Coordinator_controls, ui.controls, "f");
        if (ui.saveAsBox !== undefined)
            __classPrivateFieldSet(this, _Coordinator_saveAsBox, ui.saveAsBox, "f");
        if (ui.confirmBox !== undefined)
            __classPrivateFieldSet(this, _Coordinator_confirmBox, ui.confirmBox, "f");
        if (ui.metronomeBox !== undefined)
            __classPrivateFieldSet(this, _Coordinator_metronomeBox, ui.metronomeBox, "f");
        if (ui.midiOutputBox !== undefined)
            __classPrivateFieldSet(this, _Coordinator_midiOutputBox, ui.midiOutputBox, "f");
    }
    setSimulateZeroLengthNotes(enabled) {
        __classPrivateFieldSet(this, _Coordinator_simulateZeroLengthNotes, enabled, "f");
    }
    get isHelpVisible() {
        return __classPrivateFieldGet(this, _Coordinator_isHelpVisible, "f");
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
                __classPrivateFieldGet(this, _Coordinator_recorder, "f").jumpToPreviousSection();
                this.updateUi();
                break;
            case 'KeyN':
                if (isRepeat)
                    break;
                __classPrivateFieldGet(this, _Coordinator_recorder, "f").jumpToNextSection();
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
                __classPrivateFieldGet(this, _Coordinator_alwaysRecorder, "f").clear();
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
                __classPrivateFieldGet(this, _Coordinator_audioProcessor, "f").toggle();
                break;
            case 'Equal':
            case 'NumpadAdd':
                __classPrivateFieldGet(this, _Coordinator_metronome, "f").adjustTempo(5);
                break;
            case 'Minus':
            case 'NumpadMinus':
                __classPrivateFieldGet(this, _Coordinator_metronome, "f").adjustTempo(-5);
                break;
            default:
                return;
        }
        ev.preventDefault();
    }
    showOutputSelector() {
        var _b;
        (_b = __classPrivateFieldGet(this, _Coordinator_midiOutputBox, "f")) === null || _b === void 0 ? void 0 : _b.open();
    }
    toggleMetronome() {
        var _b;
        if (__classPrivateFieldGet(this, _Coordinator_metronome, "f").isPlaying) {
            __classPrivateFieldGet(this, _Coordinator_metronome, "f").stop();
        }
        else {
            (_b = __classPrivateFieldGet(this, _Coordinator_metronomeBox, "f")) === null || _b === void 0 ? void 0 : _b.show(__classPrivateFieldGet(this, _Coordinator_metronomeOptions, "f"), (opts) => {
                var _b;
                __classPrivateFieldSet(this, _Coordinator_metronomeOptions, opts, "f");
                (_b = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _b === void 0 ? void 0 : _b.setItem(_a.STORAGE_KEY_METRONOME_OPTIONS, JSON.stringify(opts));
                __classPrivateFieldGet(this, _Coordinator_metronome, "f").start(opts);
                this.updateUi();
            });
        }
        this.updateUi();
    }
    get isSharpMode() {
        return __classPrivateFieldGet(this, _Coordinator_useSharp, "f");
    }
    setSharpMode(useSharp) {
        var _b;
        info("Mode changed to " + (useSharp ? "sharp" : "flat"));
        __classPrivateFieldSet(this, _Coordinator_useSharp, useSharp, "f");
        (_b = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _b === void 0 ? void 0 : _b.setItem(_a.STORAGE_KEY_USE_SHARP, String(useSharp));
    }
    get isShowingOctaveLines() {
        return __classPrivateFieldGet(this, _Coordinator_showOctaveLines, "f");
    }
    setShowingOctaveLines(show) {
        var _b;
        __classPrivateFieldSet(this, _Coordinator_showOctaveLines, show, "f");
        (_b = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _b === void 0 ? void 0 : _b.setItem(_a.STORAGE_KEY_SHOW_VLINES, String(show));
        this.startAnimationLoop();
    }
    get isShowingNoteNames() {
        return __classPrivateFieldGet(this, _Coordinator_showNoteNames, "f");
    }
    toggleNoteNames() {
        var _b;
        __classPrivateFieldSet(this, _Coordinator_showNoteNames, !__classPrivateFieldGet(this, _Coordinator_showNoteNames, "f"), "f");
        (_b = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _b === void 0 ? void 0 : _b.setItem(_a.STORAGE_KEY_SHOW_NOTE_NAMES, String(__classPrivateFieldGet(this, _Coordinator_showNoteNames, "f")));
        this.startAnimationLoop();
    }
    get scrollSpeedPx() {
        return getScrollSpeedPx(this.scrollSpeedIndex, __classPrivateFieldGet(this, _Coordinator_scale, "f"));
    }
    get scrollSpeedFactor() {
        const base = getScrollSpeedPx(0, __classPrivateFieldGet(this, _Coordinator_scale, "f"));
        return base > 0 ? this.scrollSpeedPx / base : 1;
    }
    get scrollSpeedIndex() {
        return __classPrivateFieldGet(this, _Coordinator_scrollSpeedIndex, "f");
    }
    setScrollSpeedIndex(index) {
        var _b;
        __classPrivateFieldSet(this, _Coordinator_scrollSpeedIndex, index, "f");
        (_b = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _b === void 0 ? void 0 : _b.setItem(_a.STORAGE_KEY_SCROLL_SPEED, String(index));
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
        return __classPrivateFieldGet(this, _Coordinator_showNoteOffLines, "f");
    }
    toggleNoteOffLines() {
        var _b;
        info("Toggle note-off lines");
        __classPrivateFieldSet(this, _Coordinator_showNoteOffLines, !__classPrivateFieldGet(this, _Coordinator_showNoteOffLines, "f"), "f");
        (_b = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _b === void 0 ? void 0 : _b.setItem(_a.STORAGE_KEY_NOTE_OFF_LINES, String(__classPrivateFieldGet(this, _Coordinator_showNoteOffLines, "f")));
        this.updateUi();
    }
    toggleVideoMute() {
        info("Toggle video mute");
        __classPrivateFieldGet(this, _Coordinator_renderer, "f").toggleMute();
        this.updateUi();
    }
    toggleRollFrozen() {
        __classPrivateFieldGet(this, _Coordinator_renderer, "f").toggleRollFrozen();
        if (__classPrivateFieldGet(this, _Coordinator_renderer, "f").isRollFrozen) {
            info("Roll frozen");
        }
        this.updateUi();
    }
    toggleRecording() {
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").stopRecording();
        }
        else {
            this.startRecording();
        }
        this.updateUi();
    }
    startRecording() {
        if (!__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
            this.withOverwriteConfirm("Start new recording.", () => __classPrivateFieldGet(this, _Coordinator_recorder, "f").startRecording());
        }
        this.updateUi();
    }
    togglePlayback() {
        if (!__classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_ensureOutputDevice).call(this)) {
            return;
        }
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isPausing) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").unpause();
        }
        else if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isPlaying) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").pause();
        }
        else if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isIdle) {
            this.startPlayback();
        }
        this.updateUi();
    }
    startPlayback() {
        if (!__classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_ensureOutputDevice).call(this)) {
            return;
        }
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isIdle) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").startPlaying();
        }
        else if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isPausing) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").unpause();
        }
        this.updateUi();
    }
    pause() {
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isPlaying) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").pause();
        }
        else if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isPausing) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").unpause();
        }
        this.updateUi();
    }
    trimBefore() {
        var _b;
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording || !__classPrivateFieldGet(this, _Coordinator_recorder, "f").isAnythingRecorded || __classPrivateFieldGet(this, _Coordinator_recorder, "f").isBeginning) {
            return;
        }
        // Always confirm before discarding events.
        (_b = __classPrivateFieldGet(this, _Coordinator_confirmBox, "f")) === null || _b === void 0 ? void 0 : _b.show("Trim recording before current position?", () => {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").trimBefore();
            this.updateUi();
        });
    }
    stop() {
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").stopRecording();
        }
        else if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isPlaying || __classPrivateFieldGet(this, _Coordinator_recorder, "f").isPausing) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").stopPlaying();
        }
        this.updateUi();
    }
    moveToStart() {
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
            return;
        }
        __classPrivateFieldGet(this, _Coordinator_recorder, "f").moveToStart();
        this.updateUi();
    }
    moveToPercent(percent) {
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
            return;
        }
        const newTime = __classPrivateFieldGet(this, _Coordinator_recorder, "f").lastEventTimestamp * percent;
        this.moveToTime(newTime);
    }
    moveToTime(newTime) {
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
            return;
        }
        const delta = newTime - __classPrivateFieldGet(this, _Coordinator_recorder, "f").currentPlaybackTimestamp;
        __classPrivateFieldGet(this, _Coordinator_recorder, "f").adjustPlaybackPosition(delta);
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
            __classPrivateFieldSet(this, _Coordinator_playbackTimerLastNow, __classPrivateFieldGet(this, _Coordinator_now, "f").call(this), "f");
        }
    }
    replayFromAlwaysRecordingBuffer() {
        this.withOverwriteConfirm("Restoring recent play as recording.", () => {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").copyFromAlwaysRecorder(__classPrivateFieldGet(this, _Coordinator_alwaysRecorder, "f"));
            this.updateUi();
        });
    }
    get isReplayAvailable() {
        return __classPrivateFieldGet(this, _Coordinator_alwaysRecorder, "f").isAvailable;
    }
    updateUi() {
        var _b;
        (_b = __classPrivateFieldGet(this, _Coordinator_controls, "f")) === null || _b === void 0 ? void 0 : _b.update();
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
        this.updateNoteInformation();
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
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_normalizeMidiEvent).call(this, ev);
        __classPrivateFieldGet(this, _Coordinator_midiRenderingStatus, "f").onMidiMessage(ev);
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").recordEvent(ev);
        }
        if (ev.isNoteOn || ev.isNoteOff) {
            this.updateNoteInformation();
        }
        // Always record it. If it's the first recorded event, update UI to enable replay.
        const ar = __classPrivateFieldGet(this, _Coordinator_alwaysRecorder, "f").isAvailable;
        __classPrivateFieldGet(this, _Coordinator_alwaysRecorder, "f").recordEvent(ev);
        if (__classPrivateFieldGet(this, _Coordinator_alwaysRecorder, "f").isAvailable != ar) {
            this.updateUi();
        }
        // Optionally simulate zero-length drum-style triggers for debugging.
        if (__classPrivateFieldGet(this, _Coordinator_simulateZeroLengthNotes, "f") && ev.isNoteOn) {
            const clone = ev.clone();
            clone.replaceData(0, 0x80 + ev.channel);
            clone.replaceData(2, 0);
            this.onMidiMessage(clone);
        }
    }
    reset() {
        __classPrivateFieldGet(this, _Coordinator_recorder, "f").stopPlaying();
        __classPrivateFieldGet(this, _Coordinator_recorder, "f").stopRecording();
        this.updateUi();
        this.resetMidi();
    }
    resetMidi() {
        __classPrivateFieldGet(this, _Coordinator_midiRenderingStatus, "f").reset();
        __classPrivateFieldGet(this, _Coordinator_midiOutputManager, "f").reset();
    }
    onDraw(time) {
        __classPrivateFieldGet(this, _Coordinator_renderer, "f").onDraw(time);
        __classPrivateFieldGet(this, _Coordinator_midiRenderingStatus, "f").afterDraw(time);
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
    }
    updateNoteInformation() {
        const time = __classPrivateFieldGet(this, _Coordinator_now, "f").call(this);
        if (!this.isShowingNoteNames) {
            if (__classPrivateFieldGet(this, _Coordinator_updateNoteInformationNoteNamesShown, "f")) {
                __classPrivateFieldGet(this, _Coordinator_notes, "f").fadeOut(800);
                __classPrivateFieldGet(this, _Coordinator_chords, "f").fadeOut(800);
                __classPrivateFieldSet(this, _Coordinator_updateNoteInformationNoteNamesShown, false, "f");
            }
            return;
        }
        __classPrivateFieldSet(this, _Coordinator_updateNoteInformationNoteNamesShown, true, "f");
        const notes = __classPrivateFieldGet(this, _Coordinator_midiRenderingStatus, "f").getPressedNotes();
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
     * Starts the main animation loop, synchronized with the browser's vsync cycle.
     */
    startAnimationLoop() {
        if (this.isAnimating) {
            return;
        }
        console.log("Animation started");
        __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
        let nextFlip = -1;
        const loop = (time, forceRequest) => {
            var _b, _c;
            __classPrivateFieldSet(this, _Coordinator_frames, (_b = __classPrivateFieldGet(this, _Coordinator_frames, "f"), _b++, _b), "f");
            let requestNext = false;
            if (time < nextFlip) {
                requestNext = true;
            }
            else {
                nextFlip = time + FPS_TO_MILLIS;
                __classPrivateFieldSet(this, _Coordinator_flips, (_c = __classPrivateFieldGet(this, _Coordinator_flips, "f"), _c++, _c), "f");
                this.onDraw(time);
                __classPrivateFieldGet(this, _Coordinator_renderer, "f").flip();
                // Update note info every frame because SHORTEST_NOTE_LENGTH compensation
                // can expire on a later draw tick; internal caching keeps steady frames cheap.
                this.updateNoteInformation();
                const needsAnimation = __classPrivateFieldGet(this, _Coordinator_renderer, "f").needsAnimation() ||
                    __classPrivateFieldGet(this, _Coordinator_recorder, "f").isPlaying || __classPrivateFieldGet(this, _Coordinator_midiRenderingStatus, "f").needsAnimation();
                if (forceRequest || needsAnimation) {
                    requestNext = true;
                }
            }
            if (requestNext) {
                __classPrivateFieldSet(this, _Coordinator_animationFrameId, requestAnimationFrame((t) => loop(t, false)), "f");
            }
            else {
                this.stopAnimationLoop();
            }
        };
        loop(__classPrivateFieldGet(this, _Coordinator_now, "f").call(this), true);
    }
    stopAnimationLoop() {
        if (this.isAnimating) {
            cancelAnimationFrame(__classPrivateFieldGet(this, _Coordinator_animationFrameId, "f"));
            __classPrivateFieldSet(this, _Coordinator_animationFrameId, null, "f");
            console.log("Animation stopped");
            __classPrivateFieldGet(this, _Coordinator_instances, "m", _Coordinator_updateFps).call(this);
        }
    }
    onPlaybackTimer() {
        var _b;
        var _c;
        __classPrivateFieldSet(this, _Coordinator_playbackTicks, (_c = __classPrivateFieldGet(this, _Coordinator_playbackTicks, "f"), _c++, _c), "f");
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isPlaying) {
            const now = __classPrivateFieldGet(this, _Coordinator_now, "f").call(this);
            __classPrivateFieldGet(this, _Coordinator_recorder, "f").playbackUpToNow((now - __classPrivateFieldGet(this, _Coordinator_playbackTimerLastNow, "f")) * this.playSpeedFactor);
            __classPrivateFieldSet(this, _Coordinator_playbackTimerLastNow, now, "f");
            (_b = __classPrivateFieldGet(this, _Coordinator_controls, "f")) === null || _b === void 0 ? void 0 : _b.updateTimestamp();
        }
    }
    downloadRequested() {
        var _b;
        (_b = __classPrivateFieldGet(this, _Coordinator_saveAsBox, "f")) === null || _b === void 0 ? void 0 : _b.open();
    }
    uploadRequested() {
        this.withOverwriteConfirm("Uploading a MIDI file.", () => {
            $('#open_file').trigger('click');
        });
    }
    withOverwriteConfirm(message, callback) {
        var _b;
        if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isDirty) {
            (_b = __classPrivateFieldGet(this, _Coordinator_confirmBox, "f")) === null || _b === void 0 ? void 0 : _b.show(message + " Discard current recording?", () => callback());
        }
        else {
            callback();
        }
    }
    extendWakelock() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _Coordinator_wakelock, "f") === null && typeof navigator !== 'undefined' && navigator.wakeLock) {
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
        __classPrivateFieldGet(this, _Coordinator_recorder, "f").stopPlaying();
        this.resetMidi();
    }
}
_a = Coordinator, _Coordinator_renderer = new WeakMap(), _Coordinator_midiRenderingStatus = new WeakMap(), _Coordinator_midiOutputManager = new WeakMap(), _Coordinator_metronome = new WeakMap(), _Coordinator_alwaysRecorder = new WeakMap(), _Coordinator_recorder = new WeakMap(), _Coordinator_audioProcessor = new WeakMap(), _Coordinator_controls = new WeakMap(), _Coordinator_saveAsBox = new WeakMap(), _Coordinator_confirmBox = new WeakMap(), _Coordinator_metronomeBox = new WeakMap(), _Coordinator_midiOutputBox = new WeakMap(), _Coordinator_scale = new WeakMap(), _Coordinator_storage = new WeakMap(), _Coordinator_now = new WeakMap(), _Coordinator_simulateZeroLengthNotes = new WeakMap(), _Coordinator_nextFpsMeasureSecond = new WeakMap(), _Coordinator_frames = new WeakMap(), _Coordinator_flips = new WeakMap(), _Coordinator_playbackTicks = new WeakMap(), _Coordinator_efps = new WeakMap(), _Coordinator_wakelock = new WeakMap(), _Coordinator_wakelockTimer = new WeakMap(), _Coordinator_notes = new WeakMap(), _Coordinator_chords = new WeakMap(), _Coordinator_useSharp = new WeakMap(), _Coordinator_showOctaveLines = new WeakMap(), _Coordinator_showNoteNames = new WeakMap(), _Coordinator_scrollSpeedIndex = new WeakMap(), _Coordinator_playSpeedIndex = new WeakMap(), _Coordinator_showNoteOffLines = new WeakMap(), _Coordinator_isHelpVisible = new WeakMap(), _Coordinator_metronomeOptions = new WeakMap(), _Coordinator_knownRecorderState = new WeakMap(), _Coordinator_playbackTimerLastNow = new WeakMap(), _Coordinator_ignoreRepeatedRewindKey = new WeakMap(), _Coordinator_updateNoteInformationNoteNamesShown = new WeakMap(), _Coordinator_updateNoteInformationLastNotes = new WeakMap(), _Coordinator_animationFrameId = new WeakMap(), _Coordinator_instances = new WeakSet(), _Coordinator_setPlaySpeedIndex = function _Coordinator_setPlaySpeedIndex(index) {
    var _b;
    __classPrivateFieldSet(this, _Coordinator_playSpeedIndex, index, "f");
    (_b = __classPrivateFieldGet(this, _Coordinator_storage, "f")) === null || _b === void 0 ? void 0 : _b.setItem(_a.STORAGE_KEY_PLAY_SPEED, String(index));
    this.updateUi();
    console.log("Speed changed", index, this.playSpeedFactor);
}, _Coordinator_ensureOutputDevice = function _Coordinator_ensureOutputDevice() {
    if (!__classPrivateFieldGet(this, _Coordinator_midiOutputManager, "f").anyDeviceSelected) {
        info("No MIDI output device selected");
        return false;
    }
    return true;
}, _Coordinator_onRewindPressed = function _Coordinator_onRewindPressed(isRepeat) {
    if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording) {
        return;
    }
    if (isRepeat && __classPrivateFieldGet(this, _Coordinator_ignoreRepeatedRewindKey, "f")) {
        return;
    }
    if (!isRepeat) {
        __classPrivateFieldSet(this, _Coordinator_ignoreRepeatedRewindKey, false, "f");
    }
    __classPrivateFieldGet(this, _Coordinator_recorder, "f").adjustPlaybackPosition(-1000);
    if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isBeginning) {
        // Stop accepting repeated rewind keys once we hit the beginning.
        __classPrivateFieldSet(this, _Coordinator_ignoreRepeatedRewindKey, true, "f");
    }
    this.updateUi();
}, _Coordinator_onFastForwardPressed = function _Coordinator_onFastForwardPressed(_isRepeat) {
    if (__classPrivateFieldGet(this, _Coordinator_recorder, "f").isRecording || __classPrivateFieldGet(this, _Coordinator_recorder, "f").isAfterLast) {
        return;
    }
    __classPrivateFieldGet(this, _Coordinator_recorder, "f").adjustPlaybackPosition(1000);
    this.updateUi();
}, _Coordinator_normalizeMidiEvent = function _Coordinator_normalizeMidiEvent(ev) {
    // Allow V25's leftmost knobs to act as damper and sostenuto pedals.
    if (ev.device.startsWith("V25")) {
        if (ev.data0 === 176 && ev.data1 === 20) {
            ev.replaceData(1, 64);
        }
        else if (ev.data0 === 176 && ev.data1 === 21) {
            ev.replaceData(1, 66);
        }
    }
}, _Coordinator_updateFps = function _Coordinator_updateFps() {
    if (!this.isAnimating) {
        __classPrivateFieldGet(this, _Coordinator_efps, "f").text("Animation stopped");
        __classPrivateFieldSet(this, _Coordinator_nextFpsMeasureSecond, 0, "f");
        return;
    }
    const now = __classPrivateFieldGet(this, _Coordinator_now, "f").call(this);
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
Coordinator.STORAGE_KEY_USE_SHARP = 'mvv_useSharp';
Coordinator.STORAGE_KEY_SHOW_VLINES = 'mvv_showVlines';
Coordinator.STORAGE_KEY_SHOW_NOTE_NAMES = 'mvv_showNoteNames';
Coordinator.STORAGE_KEY_SCROLL_SPEED = 'mvv_scrollSpeed';
Coordinator.STORAGE_KEY_PLAY_SPEED = 'mvv_playSpeed';
Coordinator.STORAGE_KEY_NOTE_OFF_LINES = 'note_off_lines';
Coordinator.STORAGE_KEY_METRONOME_OPTIONS = 'mvv_metronomeOptions';
//# sourceMappingURL=coordinator.js.map