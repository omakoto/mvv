'use strict';

import { coordinator, renderer, recorder, metronome, alwaysRecorder } from './mvv.js';

const rollSpeedClassses = ["roll-speed-normal", "roll-speed-fast", "roll-speed-slowest", "roll-speed-slow"];
const playSpeedClasses = ["play-speed-0125", "play-speed-025", "play-speed-050", "play-speed-100", "play-speed-200", "play-speed-400", "play-speed-800"];


class Controls {
    #top;
    #rewind;
    #play;
    #pause;
    #ff;
    #stop;
    #playSpeed;
    #record;
    #replay;
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
    #rollSpeed;
    #notenames;
    #noteOffLines;
    #metronome;

    constructor() {
        this.#top = $("#top");
        this.#play = $("#play");
        this.#pause = $("#pause");
        this.#stop = $("#stop");
        this.#playSpeed = $("#play-speed");
        this.#record = $("#record");
        this.#replay = $("#replay");
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
        this.#rollSpeed = $("#roll-speed");
        this.#notenames = $("#notenames");
        this.#noteOffLines = $("#off-lines");

        this.#metronome = $("#metronome");

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
        this.#playSpeed.on('click', (ev) => {
            coordinator.rotatePlaySpeed();
            this.update();
            ev.stopPropagation();
        });
        this.#record.on('click', (ev) => {
            coordinator.startRecording();
            ev.stopPropagation();
        });
        this.#replay.on('click', (ev) => {
            coordinator.replayFromAlwaysRecordingBuffer();
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
            coordinator.setShowingOctaveLines(!coordinator.isShowingOctaveLines);
            this.update();
            ev.stopPropagation();
        });
        this.#rollSpeed.on('click', (ev) => {
            coordinator.rotateScrollSpeed();
            this.update();
            ev.stopPropagation();
        });

        this.#notenames.on('click', (ev) => {
            coordinator.toggleNoteNames();
            this.update();
            ev.stopPropagation();
        });
        this.#noteOffLines.on('click', (ev) => {
            coordinator.toggleNoteOffLines();
            this.update();
            ev.stopPropagation();
        });
        this.#metronome.on('click', (ev) => {
            coordinator.toggleMetronome();
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
        // console.log("Updating control states...");

        // First, update the controls that are always available.

        // Speed button. Select the right icon.
        // Also activate it if the speed isn't the default.
        for (let i = 0; i < rollSpeedClassses.length; i++) {
            this.#rollSpeed.removeClass(rollSpeedClassses[i]);
        }
        this.#rollSpeed.addClass(rollSpeedClassses[coordinator.scrollSpeedIndex]);
        this.activate(this.#rollSpeed, coordinator.scrollSpeedIndex > 0);

        // Play speed button
        for (let i = 0; i < playSpeedClasses.length; i++) {
            this.#playSpeed.removeClass(playSpeedClasses[i]);
        }
        this.#playSpeed.addClass(playSpeedClasses[coordinator.playSpeedIndex]);
        this.activate(this.#playSpeed, coordinator.playSpeedIndex != 3);

        // Roll freeze and video mute.
        this.activate(this.#freeze, renderer.isRollFrozen);
        this.activate(this.#videoMute, renderer.isVideoMuted);

        this.activate(this.#sharp, coordinator.isSharpMode);
        this.activate(this.#flat, !coordinator.isSharpMode);
        this.activate(this.#vlines, coordinator.isShowingOctaveLines);
        this.activate(this.#notenames, coordinator.isShowingNoteNames);
        this.activate(this.#noteOffLines, coordinator.isShowingNoteOffLines);

        this.activate(this.#metronome, metronome.isPlaying);

        // Playback control buttons...
        if (recorder.isRecording) {
            this.disable(this.#top);
            this.disable(this.#play);
            this.disable(this.#pause);
            this.enable(this.#stop);
            this.activateUnclickable(this.#record);
            this.disable(this.#rewind);
            this.disable(this.#ff);
            this.disable(this.#position);

            this.disable(this.#replay);
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

            this.disable(this.#replay);
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

            this.disable(this.#replay);
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
        if (coordinator.isReplayAvailable) {
            this.enable(this.#replay);
        } else {
            this.disable(this.#replay);
        }
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
