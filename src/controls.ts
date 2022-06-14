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
            this.disable(this.#recording);
            this.disable(this.#rewind);
            this.disable(this.#ff);
            return;
        }
        if (recorder.isPlaying) {
            this.enable(this.#top);
            this.disable(this.#play);
            this.enable(this.#playing);
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

        if (recorder.isAnythingRecorded) {
            this.enable(this.#play);
        }
    }
}

const controls = new Controls();
