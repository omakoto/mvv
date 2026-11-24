/**
 * @file controls.ts
 * @description Manages the HTML playback and settings controls interface, mapping user inputs
 * (clicks/dragging) to the core playback coordinator and updating UI indicators in real-time.
 */
'use strict';
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _TimeKeeper_second, _TimeKeeper_text, _Controls_instances, _Controls_coordinator, _Controls_renderer, _Controls_recorder, _Controls_metronome, _Controls_top, _Controls_rewind, _Controls_play, _Controls_pause, _Controls_ff, _Controls_stop, _Controls_playSpeed, _Controls_record, _Controls_replay, _Controls_up, _Controls_down, _Controls_position, _Controls_positionOuter, _Controls_positionBar, _Controls_sectionMarkersContainer, _Controls_freeze, _Controls_videoMute, _Controls_sharp, _Controls_flat, _Controls_vlines, _Controls_rollSpeed, _Controls_notenames, _Controls_noteOffLines, _Controls_metronomeBtn, _Controls_midiOutput, _Controls_timestamp, _Controls_cachedTimestamp, _Controls_currentTime, _Controls_totalTime, _Controls_cachedPercent, _Controls_isPositionDragging, _Controls_wasPlayingBeforeDrag, _Controls_setTimestamp, _Controls_setTimePercent;
import { DEFAULT_PLAY_SPEED_INDEX } from './config.js';
const rollSpeedClasses = ["roll-speed-normal", "roll-speed-fast", "roll-speed-slowest", "roll-speed-slow"];
const playSpeedClasses = [
    "play-speed-0125",
    "play-speed-025",
    "play-speed-050",
    "play-speed-100",
    "play-speed-200",
    "play-speed-400",
    "play-speed-800"
];
export class TimeKeeper {
    constructor() {
        _TimeKeeper_second.set(this, null);
        _TimeKeeper_text.set(this, null);
    }
    get second() {
        return __classPrivateFieldGet(this, _TimeKeeper_second, "f");
    }
    setSecond(second) {
        const n = Math.floor(second);
        if (n === __classPrivateFieldGet(this, _TimeKeeper_second, "f")) {
            return false;
        }
        __classPrivateFieldSet(this, _TimeKeeper_text, null, "f");
        __classPrivateFieldSet(this, _TimeKeeper_second, n, "f");
        return true;
    }
    getHumanReadable() {
        if (__classPrivateFieldGet(this, _TimeKeeper_text, "f") === null) {
            if (__classPrivateFieldGet(this, _TimeKeeper_second, "f") === null) {
                __classPrivateFieldSet(this, _TimeKeeper_text, "0:00", "f");
            }
            else {
                const s = __classPrivateFieldGet(this, _TimeKeeper_second, "f");
                const minutes = Math.floor(s / 60);
                const seconds = s % 60;
                __classPrivateFieldSet(this, _TimeKeeper_text, minutes + ":" + (seconds < 10 ? "0" + seconds : seconds), "f");
            }
        }
        return __classPrivateFieldGet(this, _TimeKeeper_text, "f");
    }
}
_TimeKeeper_second = new WeakMap(), _TimeKeeper_text = new WeakMap();
export class Controls {
    constructor(deps) {
        _Controls_instances.add(this);
        _Controls_coordinator.set(this, void 0);
        _Controls_renderer.set(this, void 0);
        _Controls_recorder.set(this, void 0);
        _Controls_metronome.set(this, void 0);
        _Controls_top.set(this, void 0);
        _Controls_rewind.set(this, void 0);
        _Controls_play.set(this, void 0);
        _Controls_pause.set(this, void 0);
        _Controls_ff.set(this, void 0);
        _Controls_stop.set(this, void 0);
        _Controls_playSpeed.set(this, void 0);
        _Controls_record.set(this, void 0);
        _Controls_replay.set(this, void 0);
        _Controls_up.set(this, void 0);
        _Controls_down.set(this, void 0);
        _Controls_position.set(this, void 0);
        _Controls_positionOuter.set(this, void 0);
        _Controls_positionBar.set(this, void 0);
        _Controls_sectionMarkersContainer.set(this, void 0);
        _Controls_freeze.set(this, void 0);
        _Controls_videoMute.set(this, void 0);
        _Controls_sharp.set(this, void 0);
        _Controls_flat.set(this, void 0);
        _Controls_vlines.set(this, void 0);
        _Controls_rollSpeed.set(this, void 0);
        _Controls_notenames.set(this, void 0);
        _Controls_noteOffLines.set(this, void 0);
        _Controls_metronomeBtn.set(this, void 0);
        _Controls_midiOutput.set(this, void 0);
        _Controls_timestamp.set(this, void 0);
        _Controls_cachedTimestamp.set(this, "");
        _Controls_currentTime.set(this, new TimeKeeper());
        _Controls_totalTime.set(this, new TimeKeeper());
        _Controls_cachedPercent.set(this, 0);
        _Controls_isPositionDragging.set(this, false);
        _Controls_wasPlayingBeforeDrag.set(this, false);
        __classPrivateFieldSet(this, _Controls_coordinator, deps.coordinator, "f");
        __classPrivateFieldSet(this, _Controls_renderer, deps.renderer, "f");
        __classPrivateFieldSet(this, _Controls_recorder, deps.recorder, "f");
        __classPrivateFieldSet(this, _Controls_metronome, deps.metronome, "f");
        __classPrivateFieldSet(this, _Controls_top, $("#top"), "f");
        __classPrivateFieldSet(this, _Controls_play, $("#play"), "f");
        __classPrivateFieldSet(this, _Controls_pause, $("#pause"), "f");
        __classPrivateFieldSet(this, _Controls_stop, $("#stop"), "f");
        __classPrivateFieldSet(this, _Controls_playSpeed, $("#play-speed"), "f");
        __classPrivateFieldSet(this, _Controls_record, $("#record"), "f");
        __classPrivateFieldSet(this, _Controls_replay, $("#replay"), "f");
        __classPrivateFieldSet(this, _Controls_rewind, $("#rewind"), "f");
        __classPrivateFieldSet(this, _Controls_ff, $("#ff"), "f");
        __classPrivateFieldSet(this, _Controls_up, $("#up"), "f");
        __classPrivateFieldSet(this, _Controls_down, $("#down"), "f");
        __classPrivateFieldSet(this, _Controls_position, $("#position"), "f");
        __classPrivateFieldSet(this, _Controls_positionOuter, $("#position_outer"), "f");
        __classPrivateFieldSet(this, _Controls_positionBar, $("#position_bar"), "f");
        __classPrivateFieldSet(this, _Controls_sectionMarkersContainer, $("#section-markers-container"), "f");
        __classPrivateFieldSet(this, _Controls_freeze, $("#freeze"), "f");
        __classPrivateFieldSet(this, _Controls_videoMute, $("#video-mute"), "f");
        __classPrivateFieldSet(this, _Controls_sharp, $("#sharp"), "f");
        __classPrivateFieldSet(this, _Controls_flat, $("#flat"), "f");
        __classPrivateFieldSet(this, _Controls_vlines, $("#vlines"), "f");
        __classPrivateFieldSet(this, _Controls_rollSpeed, $("#roll-speed"), "f");
        __classPrivateFieldSet(this, _Controls_notenames, $("#notenames"), "f");
        __classPrivateFieldSet(this, _Controls_noteOffLines, $("#off-lines"), "f");
        __classPrivateFieldSet(this, _Controls_metronomeBtn, $("#metronome"), "f");
        __classPrivateFieldSet(this, _Controls_midiOutput, $("#midi-output"), "f");
        __classPrivateFieldSet(this, _Controls_timestamp, $("#timestamp"), "f");
        __classPrivateFieldGet(this, _Controls_top, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").moveToStart();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_play, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").togglePlayback();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_pause, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").pause();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_stop, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").stop();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_playSpeed, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").rotatePlaySpeed();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_playSpeed, "f").on('dblclick', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").resetPlaySpeed();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_record, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").startRecording();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_replay, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").replayFromAlwaysRecordingBuffer();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_up, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").uploadRequested();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_down, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").downloadRequested();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_freeze, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").toggleRollFrozen();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_videoMute, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").toggleVideoMute();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_sharp, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").setSharpMode(true);
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_flat, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").setSharpMode(false);
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_vlines, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").setShowingOctaveLines(!__classPrivateFieldGet(this, _Controls_coordinator, "f").isShowingOctaveLines);
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_rollSpeed, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").rotateScrollSpeed();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_notenames, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").toggleNoteNames();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_noteOffLines, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").toggleNoteOffLines();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_metronomeBtn, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").toggleMetronome();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_midiOutput, "f").on('click', (ev) => {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").showOutputSelector();
            ev.stopPropagation();
        });
        // Initialize drag-drop positioning when jQuery UI draggable is loaded.
        if (typeof __classPrivateFieldGet(this, _Controls_position, "f").draggable === 'function') {
            __classPrivateFieldGet(this, _Controls_position, "f").draggable({
                addClasses: false,
                axis: "x"
            });
        }
        __classPrivateFieldGet(this, _Controls_position, "f").on('dragstart', (ev, ui) => this.positionDragStart(ev, ui));
        __classPrivateFieldGet(this, _Controls_position, "f").on('drag', (ev, ui) => this.positionDrag(ev, ui));
        __classPrivateFieldGet(this, _Controls_position, "f").on('dragstop', (ev, ui) => this.positionDragStop(ev, ui));
        __classPrivateFieldGet(this, _Controls_positionBar, "f").on('mousedown', (ev) => this.directJump(ev));
    }
    removeClasses(control) {
        control.removeClass('button-disabled button-activated button-activated-unclickable');
    }
    disable(control) {
        this.removeClasses(control);
        control.addClass('button-disabled');
    }
    enable(control) {
        this.removeClasses(control);
    }
    activate(control, activate = true) {
        this.removeClasses(control);
        if (activate) {
            control.addClass('button-activated');
        }
    }
    activateUnclickable(control) {
        this.removeClasses(control);
        control.addClass('button-activated-unclickable');
    }
    update() {
        this.updateTimestamp();
        // Update section markers on the progress bar
        __classPrivateFieldGet(this, _Controls_sectionMarkersContainer, "f").empty();
        const sections = __classPrivateFieldGet(this, _Controls_recorder, "f").sections;
        const totalTime = __classPrivateFieldGet(this, _Controls_recorder, "f").lastEventTimestamp;
        if (totalTime > 0) {
            for (const sectionTime of sections) {
                const percent = (sectionTime / totalTime) * 100;
                const marker = $('<div class="section-marker"></div>');
                marker.css('left', percent + '%');
                __classPrivateFieldGet(this, _Controls_sectionMarkersContainer, "f").append(marker);
            }
        }
        // Update control panel button states based on current settings
        __classPrivateFieldGet(this, _Controls_rollSpeed, "f").removeClass(rollSpeedClasses.join(' '));
        __classPrivateFieldGet(this, _Controls_rollSpeed, "f").addClass(rollSpeedClasses[__classPrivateFieldGet(this, _Controls_coordinator, "f").scrollSpeedIndex]);
        this.activate(__classPrivateFieldGet(this, _Controls_rollSpeed, "f"), __classPrivateFieldGet(this, _Controls_coordinator, "f").scrollSpeedIndex > 0);
        __classPrivateFieldGet(this, _Controls_playSpeed, "f").removeClass(playSpeedClasses.join(' '));
        __classPrivateFieldGet(this, _Controls_playSpeed, "f").addClass(playSpeedClasses[__classPrivateFieldGet(this, _Controls_coordinator, "f").playSpeedIndex]);
        this.activate(__classPrivateFieldGet(this, _Controls_playSpeed, "f"), __classPrivateFieldGet(this, _Controls_coordinator, "f").playSpeedIndex !== DEFAULT_PLAY_SPEED_INDEX);
        this.activate(__classPrivateFieldGet(this, _Controls_freeze, "f"), __classPrivateFieldGet(this, _Controls_renderer, "f").isRollFrozen);
        this.activate(__classPrivateFieldGet(this, _Controls_videoMute, "f"), __classPrivateFieldGet(this, _Controls_renderer, "f").isVideoMuted);
        this.activate(__classPrivateFieldGet(this, _Controls_sharp, "f"), __classPrivateFieldGet(this, _Controls_coordinator, "f").isSharpMode);
        this.activate(__classPrivateFieldGet(this, _Controls_flat, "f"), !__classPrivateFieldGet(this, _Controls_coordinator, "f").isSharpMode);
        this.activate(__classPrivateFieldGet(this, _Controls_vlines, "f"), __classPrivateFieldGet(this, _Controls_coordinator, "f").isShowingOctaveLines);
        this.activate(__classPrivateFieldGet(this, _Controls_notenames, "f"), __classPrivateFieldGet(this, _Controls_coordinator, "f").isShowingNoteNames);
        this.activate(__classPrivateFieldGet(this, _Controls_noteOffLines, "f"), __classPrivateFieldGet(this, _Controls_coordinator, "f").isShowingNoteOffLines);
        this.activate(__classPrivateFieldGet(this, _Controls_metronomeBtn, "f"), __classPrivateFieldGet(this, _Controls_metronome, "f").isPlaying);
        // Adjust availability of playback controls based on state (playing, paused, recording, etc.)
        if (__classPrivateFieldGet(this, _Controls_recorder, "f").isRecording) {
            this.disable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.activateUnclickable(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_position, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_replay, "f"));
            return;
        }
        if (__classPrivateFieldGet(this, _Controls_recorder, "f").isPlaying) {
            this.enable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.activateUnclickable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_replay, "f"));
            return;
        }
        if (__classPrivateFieldGet(this, _Controls_recorder, "f").isPausing) {
            this.enable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.activate(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_replay, "f"));
            return;
        }
        this.disable(__classPrivateFieldGet(this, _Controls_top, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_play, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_pause, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_stop, "f"));
        this.enable(__classPrivateFieldGet(this, _Controls_record, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_ff, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_down, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_position, "f"));
        if (__classPrivateFieldGet(this, _Controls_recorder, "f").isAnythingRecorded) {
            this.enable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_down, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
        }
        if (__classPrivateFieldGet(this, _Controls_coordinator, "f").isReplayAvailable) {
            this.enable(__classPrivateFieldGet(this, _Controls_replay, "f"));
        }
        else {
            this.disable(__classPrivateFieldGet(this, _Controls_replay, "f"));
        }
    }
    updateTimestamp() {
        if (__classPrivateFieldGet(this, _Controls_recorder, "f").isRecording) {
            __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimestamp).call(this, "-");
            __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimePercent).call(this, 0);
            return;
        }
        const totalTime = __classPrivateFieldGet(this, _Controls_recorder, "f").lastEventTimestamp;
        const currentTime = __classPrivateFieldGet(this, _Controls_recorder, "f").currentPlaybackTimestamp;
        if (__classPrivateFieldGet(this, _Controls_recorder, "f").isAnythingRecorded) {
            // Evaluate both time keepers to ensure both update even when the first changes.
            const totalTimeChanged = __classPrivateFieldGet(this, _Controls_totalTime, "f").setSecond(totalTime / 1000);
            const currentTimeChanged = __classPrivateFieldGet(this, _Controls_currentTime, "f").setSecond(currentTime / 1000);
            if (totalTimeChanged || currentTimeChanged) {
                __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimestamp).call(this, __classPrivateFieldGet(this, _Controls_currentTime, "f").getHumanReadable() + "/" + __classPrivateFieldGet(this, _Controls_totalTime, "f").getHumanReadable());
            }
        }
        else {
            __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimestamp).call(this, "-");
        }
        let percent = 0;
        if (totalTime > 0) {
            percent = Math.min(100, (currentTime / totalTime) * 100);
        }
        __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimePercent).call(this, percent);
    }
    positionDragStart(_ev, _ui) {
        console.log("Drag start");
        __classPrivateFieldSet(this, _Controls_isPositionDragging, true, "f");
        __classPrivateFieldSet(this, _Controls_wasPlayingBeforeDrag, false, "f");
        if (__classPrivateFieldGet(this, _Controls_recorder, "f").isPlaying) {
            __classPrivateFieldSet(this, _Controls_wasPlayingBeforeDrag, true, "f");
            __classPrivateFieldGet(this, _Controls_coordinator, "f").pause();
        }
    }
    positionDrag(_ev, ui) {
        if (ui.position.left < 0) {
            ui.position.left = 0;
        }
        const max = __classPrivateFieldGet(this, _Controls_positionOuter, "f").innerWidth();
        if (max !== undefined && max > 0) {
            if (ui.position.left > max) {
                ui.position.left = max;
            }
            __classPrivateFieldGet(this, _Controls_coordinator, "f").moveToPercent(ui.position.left / max);
        }
    }
    positionDragStop(_ev, ui) {
        console.log("Drag stop: " + ui.position.left);
        __classPrivateFieldSet(this, _Controls_isPositionDragging, false, "f");
        const max = __classPrivateFieldGet(this, _Controls_positionOuter, "f").innerWidth();
        if (max !== undefined && max > 0) {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").moveToPercent(ui.position.left / max);
        }
        if (__classPrivateFieldGet(this, _Controls_wasPlayingBeforeDrag, "f")) {
            __classPrivateFieldGet(this, _Controls_coordinator, "f").startPlayback();
        }
    }
    directJump(ev) {
        const max = __classPrivateFieldGet(this, _Controls_positionBar, "f").innerWidth();
        if (max === undefined || max <= 0) {
            return;
        }
        const clickX = ev.offsetX;
        const sections = __classPrivateFieldGet(this, _Controls_recorder, "f").sections;
        const totalTime = __classPrivateFieldGet(this, _Controls_recorder, "f").lastEventTimestamp;
        if (totalTime > 0 && sections.length > 0) {
            const snapThreshold = 16; // 16px range
            let closestSectionTime = null;
            let minDistance = Infinity;
            for (const sectionTime of sections) {
                const sectionX = (sectionTime / totalTime) * max;
                const distance = Math.abs(clickX - sectionX);
                if (distance < minDistance) {
                    minDistance = distance;
                    closestSectionTime = sectionTime;
                }
            }
            if (closestSectionTime !== null && minDistance <= snapThreshold) {
                console.log("Snapping to section at " + closestSectionTime);
                __classPrivateFieldGet(this, _Controls_coordinator, "f").moveToTime(closestSectionTime - 10);
                return;
            }
        }
        console.log("jump to: " + clickX + " / " + max);
        __classPrivateFieldGet(this, _Controls_coordinator, "f").moveToPercent(clickX / max);
    }
}
_Controls_coordinator = new WeakMap(), _Controls_renderer = new WeakMap(), _Controls_recorder = new WeakMap(), _Controls_metronome = new WeakMap(), _Controls_top = new WeakMap(), _Controls_rewind = new WeakMap(), _Controls_play = new WeakMap(), _Controls_pause = new WeakMap(), _Controls_ff = new WeakMap(), _Controls_stop = new WeakMap(), _Controls_playSpeed = new WeakMap(), _Controls_record = new WeakMap(), _Controls_replay = new WeakMap(), _Controls_up = new WeakMap(), _Controls_down = new WeakMap(), _Controls_position = new WeakMap(), _Controls_positionOuter = new WeakMap(), _Controls_positionBar = new WeakMap(), _Controls_sectionMarkersContainer = new WeakMap(), _Controls_freeze = new WeakMap(), _Controls_videoMute = new WeakMap(), _Controls_sharp = new WeakMap(), _Controls_flat = new WeakMap(), _Controls_vlines = new WeakMap(), _Controls_rollSpeed = new WeakMap(), _Controls_notenames = new WeakMap(), _Controls_noteOffLines = new WeakMap(), _Controls_metronomeBtn = new WeakMap(), _Controls_midiOutput = new WeakMap(), _Controls_timestamp = new WeakMap(), _Controls_cachedTimestamp = new WeakMap(), _Controls_currentTime = new WeakMap(), _Controls_totalTime = new WeakMap(), _Controls_cachedPercent = new WeakMap(), _Controls_isPositionDragging = new WeakMap(), _Controls_wasPlayingBeforeDrag = new WeakMap(), _Controls_instances = new WeakSet(), _Controls_setTimestamp = function _Controls_setTimestamp(text) {
    if (__classPrivateFieldGet(this, _Controls_cachedTimestamp, "f") === text) {
        return;
    }
    __classPrivateFieldSet(this, _Controls_cachedTimestamp, text, "f");
    __classPrivateFieldGet(this, _Controls_timestamp, "f").text(text);
}, _Controls_setTimePercent = function _Controls_setTimePercent(percent) {
    if (__classPrivateFieldGet(this, _Controls_cachedPercent, "f") !== percent) {
        __classPrivateFieldGet(this, _Controls_position, "f").css('left', percent + '%');
        __classPrivateFieldSet(this, _Controls_cachedPercent, percent, "f");
    }
};
//# sourceMappingURL=controls.js.map