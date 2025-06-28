'use strict';

import { coordinator, renderer, recorder } from './mvv.js';

const speedClassses = ["speed-normal", "speed-fast", "speed-slowest", "speed-slow"];

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
    #notenames;

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
        this.#notenames = $("#notenames");

        this.#top.on('click', (ev) => {
            coordinator.moveToStart();
            ev.stopPropagation();
        });
        this.#play.on('click', (ev) => {
            coordinator.togglePlayback();
            ev.stopPropagation();
        });
        this.#pause.on('click', (ev) => {
            coordinator.pause();
            ev.stopPropagation();
        });
        this.#stop.on('click', (ev) => {
            coordinator.stop();
            ev.stopPropagation();
        });
        this.#record.on('click', (ev) => {
            coordinator.startRecording();
            ev.stopPropagation();
        });


        this.#up.on('click', (ev) => {
            coordinator.uploadRequested();
            ev.stopPropagation();
        });
        this.#down.on('click', (ev) => {
            coordinator.downloadRequested();
            ev.stopPropagation();
        });
        this.#freeze.on('click', (ev) => {
            coordinator.toggleRollFrozen();
            this.update();
            ev.stopPropagation();
        });
        this.#videoMute.on('click', (ev) => {
            coordinator.toggleVideoMute();
            this.update();
            ev.stopPropagation();
        });

        this.#sharp.on('click', (ev) => {
            coordinator.setSharpMode(true);
            this.update();
            ev.stopPropagation();
        });

        this.#flat.on('click', (ev) => {
            coordinator.setSharpMode(false);
            this.update();
            ev.stopPropagation();
        });

        this.#vlines.on('click', (ev) => {
            coordinator.setShowingVlines(!coordinator.isShowingVlines);
            this.update();
            ev.stopPropagation();
        });
        this.#speedup.on('click', (ev) => {
            coordinator.rotateScrollSpeed();
            this.update();
            ev.stopPropagation();
        });

        this.#notenames.on('click', (ev) => {
            coordinator.toggleNoteNames();
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

    private removeClassses(control: JQuery<HTMLElement>): void {
        control.removeClass('button-disabled')
        control.removeClass('button-activated')
        control.removeClass('button-activated-unclickable')
    }

    private disable(control: JQuery<HTMLElement>): void {
        this.removeClassses(control);
        control.addClass('button-disabled')
    }

    private enable(control: JQuery<HTMLElement>): void {
        this.removeClassses(control);
    }

    private activate(control: JQuery<HTMLElement>, activate = true): void {
        this.removeClassses(control);
        if (activate) {
            control.addClass('button-activated')
        }
    }

    private activateUnclickable(control: JQuery<HTMLElement>): void {
        this.removeClassses(control);
        control.addClass('button-activated-unclickable')
    }

    public update() {
        this.activate(this.#freeze, renderer.isRollFrozen);
        this.activate(this.#videoMute, renderer.isVideoMuted);
        if (recorder.isRecording) {
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
        if (recorder.isPlaying) {
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
        if (recorder.isPausing) {
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

        if (recorder.isAnythingRecorded) {
            this.enable(this.#play);
            this.enable(this.#down);
            this.enable(this.#position);
        }
        this.activate(this.#sharp, coordinator.isSharpMode);
        this.activate(this.#flat, !coordinator.isSharpMode);
        this.activate(this.#vlines, coordinator.isShowingVlines);
        this.activate(this.#notenames, coordinator.isShowingNoteNames);

        // Speed button. Select the right icon.
        // Also activate it if the speed isn't the default.
        for (let i = 0; i < speedClassses.length; i++) {
            this.#speedup.removeClass(speedClassses[i]);
        }
        this.#speedup.addClass(speedClassses[coordinator.scrollSpeedIndex]);
        this.activate(this.#speedup, coordinator.scrollSpeedIndex > 0);
    }

    setCurrentPosition(positionMillis: number, totalMillis: number) {
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

    private positionDragStart(_ev: any, _ui: any): void { // TODO: What's the type?
        console.log("Drag start");
        this.#isPositionDragging = true;

        this.#wasPlayingBeforeDrag = false;
        if (recorder.isPlaying) {
            this.#wasPlayingBeforeDrag = true;
            coordinator.pause();
        }
    }

    private positionDrag(_ev: any, ui: any): void {
        if (ui.position.left < 0) {
            ui.position.left = 0;
            return;
        }
        const max: number = this.#positionOuter.innerWidth()!;
        if (ui.position.left > max) {
            ui.position.left = max;
        }
        const left: number = ui.position.left;
        coordinator.moveToPercent(left / max);
    }

    private positionDragStop(_ev: any, ui: any): void {
        console.log("Drag stop: " + ui.position.left);
        this.#isPositionDragging = false;

        const max: number = this.#positionOuter.innerWidth()!;
        const left: number = ui.position.left;

        coordinator.moveToPercent(left / max);

        if (this.#wasPlayingBeforeDrag) {
            coordinator.startPlayback();
        }
    }

    private directJump(ev: any): void { // TODO: What's the type?
        const max: number = this.#positionBar.innerWidth()!;
        console.log("jump to: " + ev.offsetX + " / " + max);

        coordinator.moveToPercent(ev.offsetX / max);
    }
}

export const controls = new Controls();
