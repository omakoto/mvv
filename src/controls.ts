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
        let percent = 0;
        if (totalMillis > 0) {
            percent = Math.min(100, positionMillis / totalMillis * 100);
        }
        this.#position.css('left', percent + '%');
    }
}

const controls = new Controls();
