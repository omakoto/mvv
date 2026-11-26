/**
 * @file controls.ts
 * @description Manages the HTML playback and settings controls interface, mapping user inputs
 * (clicks/dragging) to the core playback coordinator and updating UI indicators in real-time.
 */
'use strict';
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
    #second = null;
    #text = null;
    get second() {
        return this.#second;
    }
    setSecond(second) {
        const n = Math.floor(second);
        if (n === this.#second) {
            return false;
        }
        this.#text = null;
        this.#second = n;
        return true;
    }
    getHumanReadable() {
        if (this.#text === null) {
            if (this.#second === null) {
                this.#text = "0:00";
            }
            else {
                const s = this.#second;
                const minutes = Math.floor(s / 60);
                const seconds = s % 60;
                this.#text = minutes + ":" + (seconds < 10 ? "0" + seconds : seconds);
            }
        }
        return this.#text;
    }
}
export class Controls {
    #coordinator;
    #renderer;
    #recorder;
    #metronome;
    #top;
    #play;
    #pause;
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
    #metronomeBtn;
    #midiOutput;
    #timestamp;
    #cachedTimestamp = "";
    #currentTime = new TimeKeeper();
    #totalTime = new TimeKeeper();
    #cachedPercent = 0;
    #wasPlayingBeforeDrag = false;
    constructor(deps) {
        this.#coordinator = deps.coordinator;
        this.#renderer = deps.renderer;
        this.#recorder = deps.recorder;
        this.#metronome = deps.metronome;
        this.#top = $("#top");
        this.#play = $("#play");
        this.#pause = $("#pause");
        this.#stop = $("#stop");
        this.#playSpeed = $("#play-speed");
        this.#record = $("#record");
        this.#replay = $("#replay");
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
        this.#metronomeBtn = $("#metronome");
        this.#midiOutput = $("#midi-output");
        this.#timestamp = $("#timestamp");
        this.#top.on('click', (ev) => {
            this.#coordinator.moveToStart();
            ev.stopPropagation();
        });
        this.#play.on('click', (ev) => {
            this.#coordinator.togglePlayback();
            ev.stopPropagation();
        });
        this.#pause.on('click', (ev) => {
            this.#coordinator.pause();
            ev.stopPropagation();
        });
        this.#stop.on('click', (ev) => {
            this.#coordinator.stop();
            ev.stopPropagation();
        });
        this.#playSpeed.on('click', (ev) => {
            this.#coordinator.rotatePlaySpeed();
            this.update();
            ev.stopPropagation();
        });
        this.#playSpeed.on('dblclick', (ev) => {
            this.#coordinator.resetPlaySpeed();
            this.update();
            ev.stopPropagation();
        });
        this.#record.on('click', (ev) => {
            this.#coordinator.startRecording();
            ev.stopPropagation();
        });
        this.#replay.on('click', (ev) => {
            this.#coordinator.replayFromAlwaysRecordingBuffer();
            ev.stopPropagation();
        });
        this.#up.on('click', (ev) => {
            this.#coordinator.uploadRequested();
            ev.stopPropagation();
        });
        this.#down.on('click', (ev) => {
            this.#coordinator.downloadRequested();
            ev.stopPropagation();
        });
        this.#freeze.on('click', (ev) => {
            this.#coordinator.toggleRollFrozen();
            this.update();
            ev.stopPropagation();
        });
        this.#videoMute.on('click', (ev) => {
            this.#coordinator.toggleVideoMute();
            this.update();
            ev.stopPropagation();
        });
        this.#sharp.on('click', (ev) => {
            this.#coordinator.setSharpMode(true);
            this.update();
            ev.stopPropagation();
        });
        this.#flat.on('click', (ev) => {
            this.#coordinator.setSharpMode(false);
            this.update();
            ev.stopPropagation();
        });
        this.#vlines.on('click', (ev) => {
            this.#coordinator.setShowingOctaveLines(!this.#coordinator.isShowingOctaveLines);
            this.update();
            ev.stopPropagation();
        });
        this.#rollSpeed.on('click', (ev) => {
            this.#coordinator.rotateScrollSpeed();
            this.update();
            ev.stopPropagation();
        });
        this.#notenames.on('click', (ev) => {
            this.#coordinator.toggleNoteNames();
            this.update();
            ev.stopPropagation();
        });
        this.#noteOffLines.on('click', (ev) => {
            this.#coordinator.toggleNoteOffLines();
            this.update();
            ev.stopPropagation();
        });
        this.#metronomeBtn.on('click', (ev) => {
            this.#coordinator.toggleMetronome();
            this.update();
            ev.stopPropagation();
        });
        this.#midiOutput.on('click', (ev) => {
            this.#coordinator.showOutputSelector();
            ev.stopPropagation();
        });
        // Initialize drag-drop positioning when jQuery UI draggable is loaded.
        if (typeof this.#position.draggable === 'function') {
            this.#position.draggable({
                addClasses: false,
                axis: "x"
            });
        }
        this.#position.on('dragstart', (ev, ui) => this.positionDragStart(ev, ui));
        this.#position.on('drag', (ev, ui) => this.positionDrag(ev, ui));
        this.#position.on('dragstop', (ev, ui) => this.positionDragStop(ev, ui));
        this.#positionBar.on('mousedown', (ev) => this.directJump(ev));
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
        this.#sectionMarkersContainer.empty();
        const sections = this.#recorder.sections;
        const totalTime = this.#recorder.lastEventTimestamp;
        if (totalTime > 0) {
            for (const sectionTime of sections) {
                const percent = (sectionTime / totalTime) * 100;
                const marker = $('<div class="section-marker"></div>');
                marker.css('left', percent + '%');
                this.#sectionMarkersContainer.append(marker);
            }
        }
        // Update control panel button states based on current settings
        this.#rollSpeed.removeClass(rollSpeedClasses.join(' '));
        this.#rollSpeed.addClass(rollSpeedClasses[this.#coordinator.scrollSpeedIndex]);
        this.activate(this.#rollSpeed, this.#coordinator.scrollSpeedIndex > 0);
        this.#playSpeed.removeClass(playSpeedClasses.join(' '));
        this.#playSpeed.addClass(playSpeedClasses[this.#coordinator.playSpeedIndex]);
        this.activate(this.#playSpeed, this.#coordinator.playSpeedIndex !== DEFAULT_PLAY_SPEED_INDEX);
        this.activate(this.#freeze, this.#renderer.isRollFrozen);
        this.activate(this.#videoMute, this.#renderer.isVideoMuted);
        this.activate(this.#sharp, this.#coordinator.isSharpMode);
        this.activate(this.#flat, !this.#coordinator.isSharpMode);
        this.activate(this.#vlines, this.#coordinator.isShowingOctaveLines);
        this.activate(this.#notenames, this.#coordinator.isShowingNoteNames);
        this.activate(this.#noteOffLines, this.#coordinator.isShowingNoteOffLines);
        this.activate(this.#metronomeBtn, this.#metronome.isPlaying);
        // Adjust availability of playback controls based on state (playing, paused, recording, etc.)
        if (this.#recorder.isRecording) {
            this.disable(this.#top);
            this.disable(this.#play);
            this.disable(this.#pause);
            this.enable(this.#stop);
            this.activateUnclickable(this.#record);
            this.disable(this.#position);
            this.disable(this.#replay);
            return;
        }
        if (this.#recorder.isPlaying) {
            this.enable(this.#top);
            this.activateUnclickable(this.#play);
            this.enable(this.#pause);
            this.enable(this.#stop);
            this.enable(this.#record);
            this.enable(this.#position);
            this.disable(this.#replay);
            return;
        }
        if (this.#recorder.isPausing) {
            this.enable(this.#top);
            this.enable(this.#play);
            this.enable(this.#pause);
            this.activate(this.#pause);
            this.enable(this.#stop);
            this.enable(this.#record);
            this.enable(this.#position);
            this.disable(this.#replay);
            return;
        }
        this.disable(this.#top);
        this.disable(this.#play);
        this.disable(this.#pause);
        this.disable(this.#stop);
        this.enable(this.#record);
        this.disable(this.#down);
        this.disable(this.#position);
        if (this.#recorder.isAnythingRecorded) {
            this.enable(this.#play);
            this.enable(this.#down);
            this.enable(this.#position);
        }
        if (this.#coordinator.isReplayAvailable) {
            this.enable(this.#replay);
        }
        else {
            this.disable(this.#replay);
        }
    }
    #setTimestamp(text) {
        if (this.#cachedTimestamp === text) {
            return;
        }
        this.#cachedTimestamp = text;
        this.#timestamp.text(text);
    }
    #setTimePercent(percent) {
        if (this.#cachedPercent !== percent) {
            this.#position.css('left', percent + '%');
            this.#cachedPercent = percent;
        }
    }
    updateTimestamp() {
        if (this.#recorder.isRecording) {
            this.#setTimestamp("-");
            this.#setTimePercent(0);
            return;
        }
        const totalTime = this.#recorder.lastEventTimestamp;
        const currentTime = this.#recorder.currentPlaybackTimestamp;
        if (this.#recorder.isAnythingRecorded) {
            // Evaluate both time keepers to ensure both update even when the first changes.
            const totalTimeChanged = this.#totalTime.setSecond(totalTime / 1000);
            const currentTimeChanged = this.#currentTime.setSecond(currentTime / 1000);
            if (totalTimeChanged || currentTimeChanged) {
                this.#setTimestamp(this.#currentTime.getHumanReadable() + "/" + this.#totalTime.getHumanReadable());
            }
        }
        else {
            this.#setTimestamp("-");
        }
        let percent = 0;
        if (totalTime > 0) {
            percent = Math.min(100, (currentTime / totalTime) * 100);
        }
        this.#setTimePercent(percent);
    }
    positionDragStart(_ev, _ui) {
        console.log("Drag start");
        this.#wasPlayingBeforeDrag = false;
        if (this.#recorder.isPlaying) {
            this.#wasPlayingBeforeDrag = true;
            this.#coordinator.pause();
        }
    }
    positionDrag(_ev, ui) {
        if (ui.position.left < 0) {
            ui.position.left = 0;
        }
        const max = this.#positionOuter.innerWidth();
        if (max !== undefined && max > 0) {
            if (ui.position.left > max) {
                ui.position.left = max;
            }
            this.#coordinator.moveToPercent(ui.position.left / max);
        }
    }
    positionDragStop(_ev, ui) {
        console.log("Drag stop: " + ui.position.left);
        const max = this.#positionOuter.innerWidth();
        if (max !== undefined && max > 0) {
            this.#coordinator.moveToPercent(ui.position.left / max);
        }
        if (this.#wasPlayingBeforeDrag) {
            this.#coordinator.startPlayback();
        }
    }
    directJump(ev) {
        const max = this.#positionBar.innerWidth();
        if (max === undefined || max <= 0) {
            return;
        }
        const clickX = ev.offsetX;
        const sections = this.#recorder.sections;
        const totalTime = this.#recorder.lastEventTimestamp;
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
                this.#coordinator.moveToTime(closestSectionTime - 10);
                return;
            }
        }
        console.log("jump to: " + clickX + " / " + max);
        this.#coordinator.moveToPercent(clickX / max);
    }
}
//# sourceMappingURL=controls.js.map