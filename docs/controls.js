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
var _Controls_top, _Controls_rewind, _Controls_play, _Controls_pause, _Controls_ff, _Controls_stop, _Controls_record, _Controls_up, _Controls_down, _Controls_position, _Controls_positionOuter, _Controls_positionBar, _Controls_freeze, _Controls_videoMute, _Controls_sharp, _Controls_flat, _Controls_vlines, _Controls_speedup, _Controls_notenames, _Controls_noteOffLines, _Controls_metronome, _Controls_isPositionDragging, _Controls_wasPlayingBeforeDrag;
import { coordinator, renderer, recorder, metronome } from './mvv.js';
const speedClassses = ["speed-normal", "speed-fast", "speed-slowest", "speed-slow"];
class Controls {
    constructor() {
        _Controls_top.set(this, void 0);
        _Controls_rewind.set(this, void 0);
        _Controls_play.set(this, void 0);
        _Controls_pause.set(this, void 0);
        _Controls_ff.set(this, void 0);
        _Controls_stop.set(this, void 0);
        _Controls_record.set(this, void 0);
        _Controls_up.set(this, void 0);
        _Controls_down.set(this, void 0);
        _Controls_position.set(this, void 0);
        _Controls_positionOuter.set(this, void 0);
        _Controls_positionBar.set(this, void 0);
        _Controls_freeze.set(this, void 0);
        _Controls_videoMute.set(this, void 0);
        _Controls_sharp.set(this, void 0);
        _Controls_flat.set(this, void 0);
        _Controls_vlines.set(this, void 0);
        _Controls_speedup.set(this, void 0);
        _Controls_notenames.set(this, void 0);
        _Controls_noteOffLines.set(this, void 0);
        _Controls_metronome.set(this, void 0);
        _Controls_isPositionDragging.set(this, false);
        _Controls_wasPlayingBeforeDrag.set(this, false);
        __classPrivateFieldSet(this, _Controls_top, $("#top"), "f");
        __classPrivateFieldSet(this, _Controls_play, $("#play"), "f");
        __classPrivateFieldSet(this, _Controls_pause, $("#pause"), "f");
        __classPrivateFieldSet(this, _Controls_stop, $("#stop"), "f");
        __classPrivateFieldSet(this, _Controls_record, $("#record"), "f");
        __classPrivateFieldSet(this, _Controls_rewind, $("#rewind"), "f");
        __classPrivateFieldSet(this, _Controls_ff, $("#ff"), "f");
        __classPrivateFieldSet(this, _Controls_up, $("#up"), "f");
        __classPrivateFieldSet(this, _Controls_down, $("#down"), "f");
        __classPrivateFieldSet(this, _Controls_position, $("#position"), "f");
        __classPrivateFieldSet(this, _Controls_positionOuter, $("#position_outer"), "f");
        __classPrivateFieldSet(this, _Controls_positionBar, $("#position_bar"), "f");
        __classPrivateFieldSet(this, _Controls_freeze, $("#freeze"), "f");
        __classPrivateFieldSet(this, _Controls_videoMute, $("#video-mute"), "f");
        __classPrivateFieldSet(this, _Controls_sharp, $("#sharp"), "f");
        __classPrivateFieldSet(this, _Controls_flat, $("#flat"), "f");
        __classPrivateFieldSet(this, _Controls_vlines, $("#vlines"), "f");
        __classPrivateFieldSet(this, _Controls_speedup, $("#speedup"), "f");
        __classPrivateFieldSet(this, _Controls_notenames, $("#notenames"), "f");
        __classPrivateFieldSet(this, _Controls_noteOffLines, $("#off-lines"), "f");
        __classPrivateFieldSet(this, _Controls_metronome, $("#metronome"), "f");
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
        __classPrivateFieldGet(this, _Controls_record, "f").on('click', (ev) => {
            coordinator.startRecording();
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
            coordinator.setShowingVlines(!coordinator.isShowingVlines);
            this.update();
            ev.stopPropagation();
        });
        __classPrivateFieldGet(this, _Controls_speedup, "f").on('click', (ev) => {
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
        console.log("Updating control states...");
        this.activate(__classPrivateFieldGet(this, _Controls_freeze, "f"), renderer.isRollFrozen);
        this.activate(__classPrivateFieldGet(this, _Controls_videoMute, "f"), renderer.isVideoMuted);
        if (recorder.isRecording) {
            this.disable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.activateUnclickable(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_position, "f"));
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
            return;
        }
        if (recorder.isPausing) {
            this.enable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
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
        this.activate(__classPrivateFieldGet(this, _Controls_sharp, "f"), coordinator.isSharpMode);
        this.activate(__classPrivateFieldGet(this, _Controls_flat, "f"), !coordinator.isSharpMode);
        this.activate(__classPrivateFieldGet(this, _Controls_vlines, "f"), coordinator.isShowingVlines);
        this.activate(__classPrivateFieldGet(this, _Controls_notenames, "f"), coordinator.isShowingNoteNames);
        this.activate(__classPrivateFieldGet(this, _Controls_noteOffLines, "f"), coordinator.isShowingNoteOffLines);
        this.activate(__classPrivateFieldGet(this, _Controls_metronome, "f"), metronome.isPlaying);
        // Speed button. Select the right icon.
        // Also activate it if the speed isn't the default.
        for (let i = 0; i < speedClassses.length; i++) {
            __classPrivateFieldGet(this, _Controls_speedup, "f").removeClass(speedClassses[i]);
        }
        __classPrivateFieldGet(this, _Controls_speedup, "f").addClass(speedClassses[coordinator.scrollSpeedIndex]);
        this.activate(__classPrivateFieldGet(this, _Controls_speedup, "f"), coordinator.scrollSpeedIndex > 0);
    }
    setCurrentPosition(positionMillis, totalMillis) {
        if (__classPrivateFieldGet(this, _Controls_isPositionDragging, "f")) {
            // Dragging, ignore it.
            return;
        }
        let percent = 0;
        if (totalMillis > 0) {
            percent = Math.min(100, positionMillis / totalMillis * 100);
        }
        __classPrivateFieldGet(this, _Controls_position, "f").css('left', percent + '%');
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
        console.log("jump to: " + ev.offsetX + " / " + max);
        coordinator.moveToPercent(ev.offsetX / max);
    }
}
_Controls_top = new WeakMap(), _Controls_rewind = new WeakMap(), _Controls_play = new WeakMap(), _Controls_pause = new WeakMap(), _Controls_ff = new WeakMap(), _Controls_stop = new WeakMap(), _Controls_record = new WeakMap(), _Controls_up = new WeakMap(), _Controls_down = new WeakMap(), _Controls_position = new WeakMap(), _Controls_positionOuter = new WeakMap(), _Controls_positionBar = new WeakMap(), _Controls_freeze = new WeakMap(), _Controls_videoMute = new WeakMap(), _Controls_sharp = new WeakMap(), _Controls_flat = new WeakMap(), _Controls_vlines = new WeakMap(), _Controls_speedup = new WeakMap(), _Controls_notenames = new WeakMap(), _Controls_noteOffLines = new WeakMap(), _Controls_metronome = new WeakMap(), _Controls_isPositionDragging = new WeakMap(), _Controls_wasPlayingBeforeDrag = new WeakMap();
export const controls = new Controls();
