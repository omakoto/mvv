'use strict';

import { recorder } from './mvv.js';
import { info } from './util.js';
import { getCurrentTime } from './util.js';

declare var Popbox: any;

class SaveAsBox {
    #save_as_box: any | null = null; // Changed Popbox to any to avoid declaration issues

    constructor() {
        $("#save_as_filename").keydown((ev) => {
            console.log(ev);
            ev.stopPropagation();
            if (ev.code === 'Enter') { // enter
                this.doDownload();
                ev.preventDefault();
            }
        });

        $("#save").on('click', (ev) => {
            this.doDownload();
            ev.preventDefault();
        });

        $("#save_as_box").on('popbox_closing', (_ev) => {
            $("#save_as_filename").trigger('blur'); // unfocus, so shortcut keys will start working again
        });
    }

    open(): void {
        if (!recorder.isAnythingRecorded) {
            info("Nothing is recorded");
            return;
        }
        let filename = "mvv-" + getCurrentTime();
        $('#save_as_filename').val(filename);
        this.#save_as_box = new Popbox({
            blur: true,
            overlay: true,
        });

        this.#save_as_box.open('save_as_box');
        $('#save_as_filename').focus();
    }

    doDownload(): void {
        if (!this.#save_as_box) {
            return; // Shouldn't happen
        }
        this.#save_as_box.clear();
        let filename = $('#save_as_filename').val() as string;
        if (!filename) {
            info("Empty filename");
            return;
        }
        filename += ".mid";
        recorder.download(filename);
        info("Saved as " + filename);
    }
}

export var saveAsBox = new SaveAsBox();

class ConfirmBox {
    #confirm_box: any | null = null; // Changed Popbox to any

    constructor() {
        $("#confirm_box").on('popbox_closing', (_ev) => {
            $("#confirm_box").trigger('blur'); // unfocus, so shortcut keys will start working again
        });

        $("#confirm_box").on('keydown', (ev) => {
            ev.stopPropagation();
            if (ev.code === 'Enter') { // enter
                $("#confirm_ok").trigger('click');
                ev.preventDefault();
            } else if (ev.code === 'Escape') { // escape
                $("#confirm_cancel").trigger('click');
                ev.preventDefault();
            }
        });
    }

    show(text: string, okayCallback: ()=> void): void {
        $('#confirm_text').text(text);
        $("#confirm_ok").off('click').on('click', (ev) => { // Use .off('click') to prevent multiple bindings
            console.log("ok");
            this.#confirm_box!.clear(); // Close the box
            ev.preventDefault();
            if (okayCallback) okayCallback();
        });
        $("#confirm_cancel").off('click').on('click', (ev) => {
            console.log("canceled");
            this.#confirm_box!.clear(); // Close the box
            ev.preventDefault();
        });

        this.#confirm_box = new Popbox({
            blur: true,
            overlay: true,
        });
        this.#confirm_box.open('confirm_box');
        $('#confirm_box').attr('tabindex', -1).focus();
    }
}

export var confirmBox = new ConfirmBox();

class MetronomeBox {
    #metronome_box: any | null = null;

    constructor() {
        $("#metronome_box").on('popbox_closing', (_ev) => {
            $("#metronome_box").trigger('blur');
        });

        const handleKeyDown = (ev: JQuery.KeyDownEvent, min: number) => {
            let val = parseInt($(ev.target).val() as string);
            if (ev.code === 'ArrowUp') {
                val++;
                $(ev.target).val(val);
                ev.preventDefault();
            } else if (ev.code === 'ArrowDown') {
                val = Math.max(min, val - 1);
                $(ev.target).val(val);
                ev.preventDefault();
            } else if (ev.code === 'PageUp') {
                val += 10;
                $(ev.target).val(val);
                ev.preventDefault();
            } else if (ev.code === 'PageDown') {
                val = Math.max(min, val - 10);
                $(ev.target).val(val);
                ev.preventDefault();
            }
        };

        $('#metronome_bpm').on('keydown', (ev) => handleKeyDown(ev, 10));
        $('#metronome_main_beats').on('keydown', (ev) => handleKeyDown(ev, 0));
        $('#metronome_sub_beats').on('keydown', (ev) => handleKeyDown(ev, 0));

        $("#metronome_box input").on('focus', function() {
            $(this).select();
        });

        $("#metronome_box").on('keydown', (ev) => {
            ev.stopPropagation();
            if (ev.code === 'Enter') {
                $("#metronome_ok").trigger('click');
                ev.preventDefault();
            } else if (ev.code === 'Escape') {
                $("#metronome_cancel").trigger('click');
                ev.preventDefault();
            }
        });
    }

    show(bpm: number, mainBeats: number, subBeats: number, okayCallback: (bpm: number, mainBeats: number, subBeats: number) => void): void {
        $('#metronome_bpm').val(bpm);
        $('#metronome_main_beats').val(mainBeats);
        $('#metronome_sub_beats').val(subBeats);

        $("#metronome_ok").off('click').on('click', (ev) => {
            this.#metronome_box!.clear();
            ev.preventDefault();
            const bpm = parseInt($('#metronome_bpm').val() as string);
            const mainBeats = parseInt($('#metronome_main_beats').val() as string);
            const subBeats = parseInt($('#metronome_sub_beats').val() as string);
            if (okayCallback) okayCallback(bpm, mainBeats, subBeats);
        });

        $("#metronome_cancel").off('click').on('click', (ev) => {
            this.#metronome_box!.clear();
            ev.preventDefault();
        });

        this.#metronome_box = new Popbox({
            blur: true,
            overlay: true,
        });
        this.#metronome_box.open('metronome_box');
        $('#metronome_bpm').focus();
    }
}

export var metronomeBox = new MetronomeBox();
