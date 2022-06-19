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
var _Controls_top, _Controls_rewind, _Controls_play, _Controls_playing, _Controls_pause, _Controls_ff, _Controls_stop, _Controls_record, _Controls_recording, _Controls_up, _Controls_down, _Controls_position, _Controls_positionOuter, _Controls_positionBar, _Controls_isPositionDragging, _Controls_wasPlayingBeforeDrag;
class Controls {
    constructor() {
        _Controls_top.set(this, void 0);
        _Controls_rewind.set(this, void 0);
        _Controls_play.set(this, void 0);
        _Controls_playing.set(this, void 0);
        _Controls_pause.set(this, void 0);
        _Controls_ff.set(this, void 0);
        _Controls_stop.set(this, void 0);
        _Controls_record.set(this, void 0);
        _Controls_recording.set(this, void 0);
        _Controls_up.set(this, void 0);
        _Controls_down.set(this, void 0);
        _Controls_position.set(this, void 0);
        _Controls_positionOuter.set(this, void 0);
        _Controls_positionBar.set(this, void 0);
        _Controls_isPositionDragging.set(this, false);
        _Controls_wasPlayingBeforeDrag.set(this, false);
        __classPrivateFieldSet(this, _Controls_top, $("#top"), "f");
        __classPrivateFieldSet(this, _Controls_play, $("#play"), "f");
        __classPrivateFieldSet(this, _Controls_playing, $("#play-i"), "f");
        __classPrivateFieldSet(this, _Controls_pause, $("#pause"), "f");
        __classPrivateFieldSet(this, _Controls_stop, $("#stop"), "f");
        __classPrivateFieldSet(this, _Controls_record, $("#record"), "f");
        __classPrivateFieldSet(this, _Controls_recording, $("#record-i"), "f");
        __classPrivateFieldSet(this, _Controls_rewind, $("#rewind"), "f");
        __classPrivateFieldSet(this, _Controls_ff, $("#ff"), "f");
        __classPrivateFieldSet(this, _Controls_up, $("#up"), "f");
        __classPrivateFieldSet(this, _Controls_down, $("#down"), "f");
        __classPrivateFieldSet(this, _Controls_position, $("#position"), "f");
        __classPrivateFieldSet(this, _Controls_positionOuter, $("#position_outer"), "f");
        __classPrivateFieldSet(this, _Controls_positionBar, $("#position_bar"), "f");
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
    hide(control) {
        control.hide();
    }
    disable(control) {
        control.show();
        control.addClass('button-disabled');
    }
    enable(control) {
        control.show();
        control.removeClass('button-disabled');
    }
    update() {
        if (recorder.isRecording) {
            this.disable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.hide(__classPrivateFieldGet(this, _Controls_playing, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.hide(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_recording, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.disable(__classPrivateFieldGet(this, _Controls_position, "f"));
            return;
        }
        if (recorder.isPlaying) {
            this.enable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.hide(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_playing, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.hide(__classPrivateFieldGet(this, _Controls_recording, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
            return;
        }
        if (recorder.isPausing) {
            this.enable(__classPrivateFieldGet(this, _Controls_top, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.hide(__classPrivateFieldGet(this, _Controls_playing, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_pause, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_stop, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_record, "f"));
            this.hide(__classPrivateFieldGet(this, _Controls_recording, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_ff, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
            return;
        }
        this.disable(__classPrivateFieldGet(this, _Controls_top, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_play, "f"));
        this.hide(__classPrivateFieldGet(this, _Controls_playing, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_pause, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_stop, "f"));
        this.enable(__classPrivateFieldGet(this, _Controls_record, "f"));
        this.hide(__classPrivateFieldGet(this, _Controls_recording, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_rewind, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_ff, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_down, "f"));
        this.disable(__classPrivateFieldGet(this, _Controls_position, "f"));
        if (recorder.isAnythingRecorded) {
            this.enable(__classPrivateFieldGet(this, _Controls_play, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_down, "f"));
            this.enable(__classPrivateFieldGet(this, _Controls_position, "f"));
        }
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
_Controls_top = new WeakMap(), _Controls_rewind = new WeakMap(), _Controls_play = new WeakMap(), _Controls_playing = new WeakMap(), _Controls_pause = new WeakMap(), _Controls_ff = new WeakMap(), _Controls_stop = new WeakMap(), _Controls_record = new WeakMap(), _Controls_recording = new WeakMap(), _Controls_up = new WeakMap(), _Controls_down = new WeakMap(), _Controls_position = new WeakMap(), _Controls_positionOuter = new WeakMap(), _Controls_positionBar = new WeakMap(), _Controls_isPositionDragging = new WeakMap(), _Controls_wasPlayingBeforeDrag = new WeakMap();
const controls = new Controls();
