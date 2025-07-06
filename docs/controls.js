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
var _TimeKeeper_second, _TimeKeeper_text, _Controls_instances, _Controls_top, _Controls_rewind, _Controls_play, _Controls_pause, _Controls_ff, _Controls_stop, _Controls_playSpeed, _Controls_record, _Controls_replay, _Controls_up, _Controls_down, _Controls_position, _Controls_positionOuter, _Controls_positionBar, _Controls_sectionMarkersContainer, _Controls_freeze, _Controls_videoMute, _Controls_sharp, _Controls_flat, _Controls_vlines, _Controls_rollSpeed, _Controls_notenames, _Controls_noteOffLines, _Controls_metronome, _Controls_midiOutput, _Controls_timestamp, _Controls_cachedTimestamp, _Controls_currentTime, _Controls_totalTime, _Controls_cachedPercent, _Controls_setTimestamp, _Controls_setTimePercent, _Controls_isPositionDragging, _Controls_wasPlayingBeforeDrag;
import { DEFAULT_PLAY_SPEED_INDEX, coordinator, renderer, recorder, metronome } from './mvv.js';
const rollSpeedClassses = ["roll-speed-normal", "roll-speed-fast", "roll-speed-slowest", "roll-speed-slow"];
const playSpeedClasses = ["play-speed-0125", "play-speed-025", "play-speed-050", "play-speed-100", "play-speed-200", "play-speed-400", "play-speed-800"];
class TimeKeeper {
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
        if (__classPrivateFieldGet(this, _TimeKeeper_text, "f") == null) {
            const s = __classPrivateFieldGet(this, _TimeKeeper_second, "f");
            const minutes = Math.floor(s / 60);
            const seconds = s % 60;
            return minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
        }
        return __classPrivateFieldGet(this, _TimeKeeper_text, "f");
    }
}
_TimeKeeper_second = new WeakMap(), _TimeKeeper_text = new WeakMap();
class Controls {
    constructor() {
        _Controls_instances.add(this);
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
        _Controls_metronome.set(this, void 0);
        _Controls_midiOutput.set(this, void 0);
        _Controls_timestamp.set(this, void 0);
        _Controls_cachedTimestamp.set(this, "");
        _Controls_currentTime.set(this, new TimeKeeper());
        _Controls_totalTime.set(this, new TimeKeeper());
        _Controls_cachedPercent.set(this, 0);
        _Controls_isPositionDragging.set(this, false);
        _Controls_wasPlayingBeforeDrag.set(this, false);
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
        __classPrivateFieldSet(this, _Controls_metronome, $("#metronome"), "f");
        __classPrivateFieldSet(this, _Controls_midiOutput, $("#midi-output"), "f");
        __classPrivateFieldSet(this, _Controls_timestamp, $("#timestamp"), "f");
        __classPrivateFieldGet(this, _Controls_top, "f").on('click', (ev) => {
            coordinator.moveToStart();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_play, "f").on('click', (ev) => {
            coordinator.togglePlayback();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_pause, "f").on('click', (ev) => {
            coordinator.pause();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_stop, "f").on('click', (ev) => {
            coordinator.stop();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_playSpeed, "f").on('click', (ev) => {
            coordinator.rotatePlaySpeed();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_playSpeed, "f").on('dblclick', (ev) => {
            coordinator.resetPlaySpeed();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_record, "f").on('click', (ev) => {
            coordinator.startRecording();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_replay, "f").on('click', (ev) => {
            coordinator.replayFromAlwaysRecordingBuffer();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_up, "f").on('click', (ev) => {
            coordinator.uploadRequested();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_down, "f").on('click', (ev) => {
            coordinator.downloadRequested();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_freeze, "f").on('click', (ev) => {
            coordinator.toggleRollFrozen();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_videoMute, "f").on('click', (ev) => {
            coordinator.toggleVideoMute();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_sharp, "f").on('click', (ev) => {
            coordinator.setSharpMode(true);
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_flat, "f").on('click', (ev) => {
            coordinator.setSharpMode(false);
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_vlines, "f").on('click', (ev) => {
            coordinator.setShowingOctaveLines(!coordinator.isShowingOctaveLines);
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_rollSpeed, "f").on('click', (ev) => {
            coordinator.rotateScrollSpeed();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_notenames, "f").on('click', (ev) => {
            coordinator.toggleNoteNames();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_noteOffLines, "f").on('click', (ev) => {
            coordinator.toggleNoteOffLines();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_metronome, "f").on('click', (ev) => {
            coordinator.toggleMetronome();
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_midiOutput, "f").on('click', (ev) => {
            coordinator.showOutputSelector();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_position, "f").draggable({
            addClasses: false,
            axis: "x",
            // containment: "parent", // Doesn't work because jquery takes into account the element width,
            // making it impossible to drag to the end.
        });
        __classPrivateFieldGet(this, _Controls_position, "f").on('dragstart', (ev, ui) => this.positionDragStart(ev, ui));
        __classPrivateFieldGet(this, _Controls_position, "f").on('drag', (ev, ui) => this.positionDrag(ev, ui));
        __classPrivateFieldGet(this, _Controls_position, "f").on('dragstop', (ev, ui) => this.positionDragStop(ev, ui));
        __classPrivateFieldGet(this, _Controls_positionBar, "f").on('mousedown', (ev) => this.directJump(ev));
    }
    removeClassses(control) {
        control.removeClass('button-disabled');
        control.removeClass('button-activated');
        control.removeClass('button-activated-unclickable');
    }
    disable(control) {
        this.removeClassses(control);
        control.addClass('button-disabled');
    }
    enable(control) {
        this.removeClassses(control);
    }
    activate(control, activate = true) {
        this.removeClassses(control);
        if (activate) {
            control.addClass('button-activated');
        }
    }
    activateUnclickable(control) {
        this.removeClassses(control);
        control.addClass('button-activated-unclickable');
    }
    update() {
        // console.log("Updating control states...");
        // Always update the timestamp.s
        this.updateTimestamp();
        // Update section markers
        __classPrivateFieldGet(this, _Controls_sectionMarkersContainer, "f").empty();
        const sections = recorder.sections;
        const totalTime = recorder.lastEventTimestamp;
        if (totalTime > 0) {
            for (const sectionTime of sections) {
                const percent = (sectionTime / totalTime) * 100;
                const marker = $('<div class="section-marker"></div>');
                marker.css('left', percent + '%');
                __classPrivateFieldGet(this, _Controls_sectionMarkersContainer, "f").append(marker);
            }
        }
        // First, update the controls that are always available.
        // Speed button. Select the right icon.
        // Also activate it if the speed isn't the default.
        for (let i = 0; i < rollSpeedClassses.length; i++) {
            __classPrivateFieldGet(this, _Controls_rollSpeed, "f").removeClass(rollSpeedClassses[i]);
        }
        __classPrivateFieldGet(this, _Controls_rollSpeed, "f").addClass(rollSpeedClassses[coordinator.scrollSpeedIndex]);
        this.activate(__classPrivateFieldGet(this, _Controls_rollSpeed, "f"), coordinator.scrollSpeedIndex > 0);
        // Play speed button
        for (let i = 0; i < playSpeedClasses.length; i++) {
            __classPrivateFieldGet(this, _Controls_playSpeed, "f").removeClass(playSpeedClasses[i]);
        }
        __classPrivateFieldGet(this, _Controls_playSpeed, "f").addClass(playSpeedClasses[coordinator.playSpeedIndex]);
        this.activate(__classPrivateFieldGet(this, _Controls_playSpeed, "f"), coordinator.playSpeedIndex != DEFAULT_PLAY_SPEED_INDEX);
        // Roll freeze and video mute.
        this.activate(__classPrivateFieldGet(this, _Controls_freeze, "f"), renderer.isRollFrozen);
        this.activate(__classPrivateFieldGet(this, _Controls_videoMute, "f"), renderer.isVideoMuted);
        this.activate(__classPrivateFieldGet(this, _Controls_sharp, "f"), coordinator.isSharpMode);
        this.activate(__classPrivateFieldGet(this, _Controls_flat, "f"), !coordinator.isSharpMode);
        this.activate(__classPrivateFieldGet(this, _Controls_vlines, "f"), coordinator.isShowingOctaveLines);
        this.activate(__classPrivateFieldGet(this, _Controls_notenames, "f"), coordinator.isShowingNoteNames);
        this.activate(__classPrivateFieldGet(this, _Controls_noteOffLines, "f"), coordinator.isShowingNoteOffLines);
        this.activate(__classPrivateFieldGet(this, _Controls_metronome, "f"), metronome.isPlaying);
        // Playback control buttons...
        if (recorder.isRecording) {
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
        if (recorder.isPlaying) {
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
        if (recorder.isPausing) {
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
        if (recorder.isAnythingRecorded) {
            this.enable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_down, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
        }
        if (coordinator.isReplayAvailable) {
            this.enable(__classPrivateFieldGet(this, _Controls_replay, "f"));
        }
        else {
            this.disable(__classPrivateFieldGet(this, _Controls_replay, "f"));
        }
    }
    updateTimestamp() {
        if (recorder.isRecording) {
            __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimestamp).call(this, "-");
            __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimePercent).call(this, 0);
            return;
        }
        const totalTime = recorder.lastEventTimestamp;
        const currentTime = recorder.currentPlaybackTimestamp;
        // First, update the text.
        if (recorder.isAnythingRecorded) {
            var changed = false;
            changed || (changed = __classPrivateFieldGet(this, _Controls_totalTime, "f").setSecond(totalTime / 1000));
            changed || (changed = __classPrivateFieldGet(this, _Controls_currentTime, "f").setSecond(currentTime / 1000));
            if (changed) {
                __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimestamp).call(this, __classPrivateFieldGet(this, _Controls_currentTime, "f").getHumanReadable() + "/" + __classPrivateFieldGet(this, _Controls_totalTime, "f").getHumanReadable());
            }
        }
        else {
            __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimestamp).call(this, "-");
        }
        let percent = 0;
        if (totalTime > 0) {
            percent = Math.min(100, currentTime / totalTime * 100);
        }
        __classPrivateFieldGet(this, _Controls_instances, "m", _Controls_setTimePercent).call(this, percent);
    }
    positionDragStart(_ev, _ui) {
        console.log("Drag start");
        __classPrivateFieldSet(this, _Controls_isPositionDragging, true, "f");
        __classPrivateFieldSet(this, _Controls_wasPlayingBeforeDrag, false, "f");
        if (recorder.isPlaying) {
            __classPrivateFieldSet(this, _Controls_wasPlayingBeforeDrag, true, "f");
            coordinator.pause();
        }
    }
    positionDrag(_ev, ui) {
        if (ui.position.left < 0) {
            ui.position.left = 0;
            return;
        }
        const max = __classPrivateFieldGet(this, _Controls_positionOuter, "f").innerWidth();
        if (ui.position.left > max) {
            ui.position.left = max;
        }
        const left = ui.position.left;
        coordinator.moveToPercent(left / max);
    }
    positionDragStop(_ev, ui) {
        console.log("Drag stop: " + ui.position.left);
        __classPrivateFieldSet(this, _Controls_isPositionDragging, false, "f");
        const max = __classPrivateFieldGet(this, _Controls_positionOuter, "f").innerWidth();
        const left = ui.position.left;
        coordinator.moveToPercent(left / max);
        if (__classPrivateFieldGet(this, _Controls_wasPlayingBeforeDrag, "f")) {
            coordinator.startPlayback();
        }
    }
    directJump(ev) {
        const max = __classPrivateFieldGet(this, _Controls_positionBar, "f").innerWidth();
        const clickX = ev.offsetX;
        const sections = recorder.sections;
        const totalTime = recorder.lastEventTimestamp;
        if (totalTime > 0 && sections.length > 0) {
            const snapThreshold = 16; // 16px
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
                coordinator.moveToTime(closestSectionTime - 10);
                return;
            }
        }
        console.log("jump to: " + clickX + " / " + max);
        coordinator.moveToPercent(clickX / max);
    }
}
_Controls_top = new WeakMap(), _Controls_rewind = new WeakMap(), _Controls_play = new WeakMap(), _Controls_pause = new WeakMap(), _Controls_ff = new WeakMap(), _Controls_stop = new WeakMap(), _Controls_playSpeed = new WeakMap(), _Controls_record = new WeakMap(), _Controls_replay = new WeakMap(), _Controls_up = new WeakMap(), _Controls_down = new WeakMap(), _Controls_position = new WeakMap(), _Controls_positionOuter = new WeakMap(), _Controls_positionBar = new WeakMap(), _Controls_sectionMarkersContainer = new WeakMap(), _Controls_freeze = new WeakMap(), _Controls_videoMute = new WeakMap(), _Controls_sharp = new WeakMap(), _Controls_flat = new WeakMap(), _Controls_vlines = new WeakMap(), _Controls_rollSpeed = new WeakMap(), _Controls_notenames = new WeakMap(), _Controls_noteOffLines = new WeakMap(), _Controls_metronome = new WeakMap(), _Controls_midiOutput = new WeakMap(), _Controls_timestamp = new WeakMap(), _Controls_cachedTimestamp = new WeakMap(), _Controls_currentTime = new WeakMap(), _Controls_totalTime = new WeakMap(), _Controls_cachedPercent = new WeakMap(), _Controls_isPositionDragging = new WeakMap(), _Controls_wasPlayingBeforeDrag = new WeakMap(), _Controls_instances = new WeakSet(), _Controls_setTimestamp = function _Controls_setTimestamp(text) {
    if (__classPrivateFieldGet(this, _Controls_cachedTimestamp, "f") == text) {
        return;
    }
    __classPrivateFieldSet(this, _Controls_cachedTimestamp, text, "f");
    __classPrivateFieldGet(this, _Controls_timestamp, "f").text(text);
}, _Controls_setTimePercent = function _Controls_setTimePercent(percent) {
    if (__classPrivateFieldGet(this, _Controls_cachedPercent, "f") != percent) {
        __classPrivateFieldGet(this, _Controls_position, "f").css('left', percent + '%');
        __classPrivateFieldSet(this, _Controls_cachedPercent, percent, "f");
    }
};
export const controls = new Controls();
//# sourceMappingURL=controls.js.map