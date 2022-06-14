'use strict';

enum ControllerState {
    Hidden,
    Shown,
    Enabled,
}

class Controls {
    #top;
    #play;
    #playing;
    #pause;
    #stop;
    #record;
    #recording;
    #up;
    #down;
    // #rewind;
    // #ff;

    constructor() {
        this.#top = $("#top");
        this.#play = $("#play");
        this.#playing = $("#play-i");
        this.#pause = $("#pause");
        this.#stop = $("#stop");
        this.#record = $("#record");
        this.#recording = $("#record-i");
        this.#up = $("#up");
        this.#down = $("#down");

        // Not used
        // this.#rewind = $("#rewind");
        // this.#ff = $("#ff");


        this.#up.on('click', (ev) => {
            coordinator.uploadRequested();
            ev.stopPropagation();
        });
        this.#down.on('click', (ev) => {
            coordinator.downloadRequested();
            ev.stopPropagation();
        });
    }

    // private updateStates(shown: ControllerState, ...controllers: JQuery<HTMLElement>[]): void {
    // }

    // public update() {
    // }


}

const controls = new Controls();
