'use strict';

import { DEFAULT_PLAY_SPEED_INDEX, coordinator, renderer, recorder, metronome, alwaysRecorder } from './mvv.js';

const rollSpeedClassses = ["roll-speed-normal", "roll-speed-fast", "roll-speed-slowest", "roll-speed-slow"];
const playSpeedClasses = ["play-speed-0125", "play-speed-025", "play-speed-050", "play-speed-100", "play-speed-200", "play-speed-400", "play-speed-800"];


class TimeKeeper {
    #second: number = null;
    #text: string = null;

    constructor() {
    }

    get second(): number {
        return this.#second;
    }

    setSecond(second: number): boolean {
        const n = Math.floor(second);
        if (n === this.#second) {
            return false;
        }
        this.#text = null;
        this.#second = n;
        return true;
    }

    getHumanReadable(): string {
        if (this.#text == null) {
            const s = this.#second;

            const minutes = Math.floor(s / 60);
            const seconds = s % 60;
            return minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
        }
        return this.#text;
    }
}


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
    #sectionMarkersContainer;
    #freeze;
    #videoMute;
    #sharp;
    #flat;
    #vlines;
    #rollSpeed;
    #notenames;
    #noteOffLines;
    #metronome;

    #timestamp;
    #cachedTimestamp = "";

    #currentTime: TimeKeeper = new TimeKeeper();
    #totalTime: TimeKeeper = new TimeKeeper();

    #cachedPercent = 0;

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
        this.#sectionMarkersContainer = $("#section-markers-container");
        this.#freeze = $("#freeze");
        this.#videoMute = $("#video-mute");

        this.#sharp = $("#sharp");
        this.#flat = $("#flat");

        this.#vlines = $("#vlines");
        this.#rollSpeed = $("#roll-speed");
        this.#notenames = $("#notenames");
        this.#noteOffLines = $("#off-lines");

        this.#metronome = $("#metronome");

        this.#timestamp = $("#timestamp");

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
        this.#playSpeed.on('dblclick', (ev) => {
            coordinator.resetPlaySpeed();
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

        // Always update the timestamp.s
        this.updateTimestamp();

        // Update section markers
        this.#sectionMarkersContainer.empty();
        const sections = recorder.sections;
        const totalTime = recorder.lastEventTimestamp;
        if (totalTime > 0) {
            for (const sectionTime of sections) {
                const percent = (sectionTime / totalTime) * 100;
                const marker = $('<div class="section-marker"></div>');
                marker.css('left', percent + '%');
                this.#sectionMarkersContainer.append(marker);
            }
        }

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
        this.activate(this.#playSpeed, coordinator.playSpeedIndex != DEFAULT_PLAY_SPEED_INDEX);

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

    #setTimestamp(text: string) {
        if (this.#cachedTimestamp == text) {
            return;
        }
        this.#cachedTimestamp = text;
        this.#timestamp.text(text);
    }

    #setTimePercent(percent: number) {
        if (this.#cachedPercent != percent) {
            this.#position.css('left', percent + '%');
            this.#cachedPercent = percent;
        }
    }

    updateTimestamp() {
        if (recorder.isRecording)  {
            this.#setTimestamp("-");
            this.#setTimePercent(0);
            return;
        }

        const totalTime = recorder.lastEventTimestamp;
        const currentTime = recorder.currentPlaybackTimestamp;
        
        // First, update the text.
        if (recorder.isAnythingRecorded) {
            var changed = false;
            changed ||= this.#totalTime.setSecond(totalTime / 1000);
            changed ||= this.#currentTime.setSecond(currentTime / 1000);

            if (changed) {
                this.#setTimestamp(this.#currentTime.getHumanReadable() + "/" + this.#totalTime.getHumanReadable());
            }
        } else {
            this.#setTimestamp("-");
        }

        let percent = 0;
        if (totalTime > 0) {
            percent = Math.min(100, currentTime / totalTime * 100);
        }
        this.#setTimePercent(percent);
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
