'use strict';

class Controls {
    #top;
    #rewind;
    #play;
    #playing;
    #pause;
    #stop;
    #ff;
    #record;
    #recording;
    #up;
    #down;

    constructor() {
        this.#top = $("#top")
        this.#rewind = $("#rewind")
        this.#play = $("#play")
        this.#playing = $("#play-i")
        this.#pause = $("#pause")
        this.#stop = $("#stop")
        this.#ff = $("#ff")
        this.#record = $("#record")
        this.#recording = $("#record-i")
        this.#up = $("#up")
        this.#down = $("#down")

        this.#up.on('click', (_) => coordinator.uploadRequested());
        this.#down.on('click', (_) => coordinator.downloadRequested());
    }


}

const controls = new Controls();
