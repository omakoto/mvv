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
        $('#confirm_box').focus();
    }
}

export var confirmBox = new ConfirmBox();
