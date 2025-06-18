'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.controls = void 0;
const mvv_js_1 = require("./mvv.js");
class Controls {
    #top;
    #rewind;
    #play;
    #pause;
    #ff;
    #stop;
    #record;
    #up;
    #down;
    #position;
    #positionOuter;
    #positionBar;
    #freeze;
    #videoMute;
    #sharp;
    #flat;
    #vlines;
    #speedup;
    constructor() {
        this.#top = $("#top");
        this.#play = $("#play");
        this.#pause = $("#pause");
        this.#stop = $("#stop");
        this.#record = $("#record");
        this.#rewind = $("#rewind");
        this.#ff = $("#ff");
        this.#up = $("#up");
        this.#down = $("#down");
        this.#position = $("#position");
        this.#positionOuter = $("#position_outer");
        this.#positionBar = $("#position_bar");
        this.#freeze = $("#freeze");
        this.#videoMute = $("#video-mute");
        this.#sharp = $("#sharp");
        this.#flat = $("#flat");
        this.#vlines = $("#vlines");
        this.#speedup = $("#speedup");
        this.#top.on('click', (ev) => {
            mvv_js_1.coordinator.moveToStart();
            ev.stopPropagation();
        });
        this.#play.on('click', (ev) => {
            mvv_js_1.coordinator.togglePlayback();
            ev.stopPropagation();
        });
        this.#pause.on('click', (ev) => {
            mvv_js_1.coordinator.pause();
            ev.stopPropagation();
        });
        this.#stop.on('click', (ev) => {
            mvv_js_1.coordinator.stop();
            ev.stopPropagation();
        });
        this.#record.on('click', (ev) => {
            mvv_js_1.coordinator.startRecording();
            ev.stopPropagation();
        });
        this.#up.on('click', (ev) => {
            mvv_js_1.coordinator.uploadRequested();
            ev.stopPropagation();
        });
        this.#down.on('click', (ev) => {
            mvv_js_1.coordinator.downloadRequested();
            ev.stopPropagation();
        });
        this.#freeze.on('click', (ev) => {
            mvv_js_1.coordinator.toggleRollFrozen();
            this.update();
            ev.stopPropagation();
        });
        this.#videoMute.on('click', (ev) => {
            mvv_js_1.coordinator.toggleVideoMute();
            this.update();
            ev.stopPropagation();
        });
        this.#sharp.on('click', (ev) => {
            mvv_js_1.coordinator.setSharpMode(true);
            this.update();
            ev.stopPropagation();
        });
        this.#flat.on('click', (ev) => {
            mvv_js_1.coordinator.setSharpMode(false);
            this.update();
            ev.stopPropagation();
        });
        this.#vlines.on('click', (ev) => {
            mvv_js_1.coordinator.setShowingVlines(!mvv_js_1.coordinator.isShowingVlines);
            this.update();
            ev.stopPropagation();
        });
        this.#speedup.on('click', (ev) => {
            mvv_js_1.coordinator.toggleScrollSpeedFactor();
            this.update();
            ev.stopPropagation();
        });
        this.#position.draggable({
            addClasses: false,
            axis: "x",
            // containment: "parent", // Doesn't work because jquery takes into account the element width,
            // making it impossible to drag to the end.
        });
        this.#position.on('dragstart', (ev, ui) => this.positionDragStart(ev, ui));
        this.#position.on('drag', (ev, ui) => this.positionDrag(ev, ui));
        this.#position.on('dragstop', (ev, ui) => this.positionDragStop(ev, ui));
        this.#positionBar.on('mousedown', (ev) => this.directJump(ev));
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
        this.activate(this.#freeze, mvv_js_1.renderer.isRollFrozen);
        this.activate(this.#videoMute, mvv_js_1.renderer.isVideoMuted);
        if (mvv_js_1.recorder.isRecording) {
            this.disable(this.#top);
            this.disable(this.#play);
            this.disable(this.#pause);
            this.enable(this.#stop);
            this.activateUnclickable(this.#record);
            this.disable(this.#rewind);
            this.disable(this.#ff);
            this.disable(this.#position);
            return;
        }
        if (mvv_js_1.recorder.isPlaying) {
            this.enable(this.#top);
            this.activateUnclickable(this.#play);
            this.enable(this.#pause);
            this.enable(this.#stop);
            this.enable(this.#record);
            this.enable(this.#rewind);
            this.enable(this.#ff);
            this.enable(this.#position);
            return;
        }
        if (mvv_js_1.recorder.isPausing) {
            this.enable(this.#top);
            this.enable(this.#play);
            this.enable(this.#pause);
            this.enable(this.#stop);
            this.enable(this.#record);
            this.enable(this.#rewind);
            this.enable(this.#ff);
            this.enable(this.#position);
            return;
        }
        this.disable(this.#top);
        this.disable(this.#play);
        this.disable(this.#pause);
        this.disable(this.#stop);
        this.enable(this.#record);
        this.disable(this.#rewind);
        this.disable(this.#ff);
        this.disable(this.#down);
        this.disable(this.#position);
        if (mvv_js_1.recorder.isAnythingRecorded) {
            this.enable(this.#play);
            this.enable(this.#down);
            this.enable(this.#position);
        }
        this.activate(this.#sharp, mvv_js_1.coordinator.isSharpMode);
        this.activate(this.#flat, !mvv_js_1.coordinator.isSharpMode);
        this.activate(this.#vlines, mvv_js_1.coordinator.isShowingVlines);
        this.activate(this.#speedup, mvv_js_1.coordinator.scrollSpeedFactor > 1);
    }
    setCurrentPosition(positionMillis, totalMillis) {
        if (this.#isPositionDragging) {
            // Dragging, ignore it.
            return;
        }
        let percent = 0;
        if (totalMillis > 0) {
            percent = Math.min(100, positionMillis / totalMillis * 100);
        }
        this.#position.css('left', percent + '%');
    }
    #isPositionDragging = false;
    #wasPlayingBeforeDrag = false;
    positionDragStart(_ev, _ui) {
        console.log("Drag start");
        this.#isPositionDragging = true;
        this.#wasPlayingBeforeDrag = false;
        if (mvv_js_1.recorder.isPlaying) {
            this.#wasPlayingBeforeDrag = true;
            mvv_js_1.coordinator.pause();
        }
    }
    positionDrag(_ev, ui) {
        if (ui.position.left < 0) {
            ui.position.left = 0;
            return;
        }
        const max = this.#positionOuter.innerWidth();
        if (ui.position.left > max) {
            ui.position.left = max;
        }
        const left = ui.position.left;
        mvv_js_1.coordinator.moveToPercent(left / max);
    }
    positionDragStop(_ev, ui) {
        console.log("Drag stop: " + ui.position.left);
        this.#isPositionDragging = false;
        const max = this.#positionOuter.innerWidth();
        const left = ui.position.left;
        mvv_js_1.coordinator.moveToPercent(left / max);
        if (this.#wasPlayingBeforeDrag) {
            mvv_js_1.coordinator.startPlayback();
        }
    }
    directJump(ev) {
        const max = this.#positionBar.innerWidth();
        console.log("jump to: " + ev.offsetX + " / " + max);
        mvv_js_1.coordinator.moveToPercent(ev.offsetX / max);
    }
}
exports.controls = new Controls();
