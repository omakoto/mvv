'use strict';

class Controls {
    #top;
    #rewind;
    #play;
    #playing;
    #pause;
    #ff;
    #stop;
    #record;
    #recording;
    #up;
    #down;
    #position;
    #positionOuter;
    #positionBar;
    #freeze;
    #videoMute;

    constructor() {
        this.#top = $("#top");
        this.#play = $("#play");
        this.#playing = $("#play-i");
        this.#pause = $("#pause");
        this.#stop = $("#stop");
        this.#record = $("#record");
        this.#recording = $("#record-i");
        this.#rewind = $("#rewind");
        this.#ff = $("#ff");

        this.#up = $("#up");
        this.#down = $("#down");

        this.#position = $("#position");
        this.#positionOuter = $("#position_outer");
        this.#positionBar = $("#position_bar");
        this.#freeze = $("#freeze");
        this.#videoMute = $("#video-mute");

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
            if (renderer.isRollFrozen) {
                $(ev.target).addClass('button-activated')
            } else {
                $(ev.target).removeClass('button-activated')
            }
            ev.stopPropagation();
        });
        this.#videoMute.on('click', (ev) => {
            coordinator.toggleVideoMute();
            if (renderer.isVideoMuted) {
                $(ev.target).addClass('button-activated')
            } else {
                $(ev.target).removeClass('button-activated')
            }
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

    private hide(control: JQuery<HTMLElement>): void {
        control.hide();
    }

    private disable(control: JQuery<HTMLElement>): void {
        control.show();
        control.addClass('button-disabled')
    }

    private enable(control: JQuery<HTMLElement>): void {
        control.show();
        control.removeClass('button-disabled')
    }

    public update() {
        if (recorder.isRecording) {
            this.disable(this.#top);
            this.disable(this.#play);
            this.hide(this.#playing);
            this.disable(this.#pause);
            this.enable(this.#stop);
            this.hide(this.#record);
            this.enable(this.#recording);
            this.disable(this.#rewind);
            this.disable(this.#ff);
            this.disable(this.#position);
            return;
        }
        if (recorder.isPlaying) {
            this.enable(this.#top);
            this.hide(this.#play);
            this.enable(this.#playing);
            this.enable(this.#pause);
            this.enable(this.#stop);
            this.enable(this.#record);
            this.hide(this.#recording);
            this.enable(this.#rewind);
            this.enable(this.#ff);
            this.enable(this.#position);
            return;
        }
        if (recorder.isPausing) {
            this.enable(this.#top);
            this.enable(this.#play);
            this.hide(this.#playing);
            this.enable(this.#pause);
            this.enable(this.#stop);
            this.enable(this.#record);
            this.hide(this.#recording);
            this.enable(this.#rewind);
            this.enable(this.#ff);
            this.enable(this.#position);
            return;
        }
        this.disable(this.#top);
        this.disable(this.#play);
        this.hide(this.#playing);
        this.disable(this.#pause);
        this.disable(this.#stop);
        this.enable(this.#record);
        this.hide(this.#recording);
        this.disable(this.#rewind);
        this.disable(this.#ff);

        this.disable(this.#down);
        this.disable(this.#position);

        if (recorder.isAnythingRecorded) {
            this.enable(this.#play);
            this.enable(this.#down);
            this.enable(this.#position);
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

const controls = new Controls();
