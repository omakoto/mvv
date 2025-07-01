'use strict';

import { recorder } from './mvv.js';
import { info } from './util.js';
import { getCurrentTime } from './util.js';

function refocusBody() {
    setTimeout(() => $('body').focus(), 0);
}

declare var Popbox: any;

class DialogBase {
    _box: any | null = null;
    _id: string;

    constructor(id: string) {
        this._id = id;
        $(`#${id}`).on('popbox_closing', (_ev) => {
            refocusBody();
        });
    }

    _handleKeyDown(ev: JQuery.KeyDownEvent, okId: string, cancelId: string) {
        ev.stopPropagation();
        if (ev.code === 'Enter') { // enter
            $(`#${okId}`).trigger('click');
            ev.preventDefault();
        } else if (ev.code === 'Escape') {
            $(`#${cancelId}`).trigger('click');
            ev.preventDefault();
        }
    }
}

class SaveAsBox extends DialogBase {
    constructor() {
        super('save_as_box');
        $("#save_as_filename").keydown((ev) => {
            this._handleKeyDown(ev, 'save', 'save_as_cancel');
        });

        $("#save").on('click', (ev) => {
            this.doDownload();
            ev.preventDefault();
        });

        $("#save_as_cancel").on('click', (ev) => {
            this._box!.clear();
            ev.preventDefault();
        });
    }

    open(): void {
        if (!recorder.isAnythingRecorded) {
            info("Nothing is recorded");
            return;
        }
        let filename = "mvv-" + getCurrentTime();
        $('#save_as_filename').val(filename);
        this._box = new Popbox({
            blur: true,
            overlay: true,
        });

        this._box.open('save_as_box');
        $('#save_as_filename').focus();
    }

    doDownload(): void {
        if (!this._box) {
            return; // Shouldn't happen
        }
        this._box.clear();
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

class ConfirmBox extends DialogBase {
    constructor() {
        super('confirm_box');
        $("#confirm_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'confirm_ok', 'confirm_cancel');
        });
    }

    show(text: string, okayCallback: ()=> void): void {
        $('#confirm_text').text(text);
        $("#confirm_ok").off('click').on('click', (ev) => { // Use .off('click') to prevent multiple bindings
            console.log("ok");
            this._box!.clear(); // Close the box
            ev.preventDefault();
            if (okayCallback) okayCallback();
        });
        $("#confirm_cancel").off('click').on('click', (ev) => {
            console.log("canceled");
            this._box!.clear(); // Close the box
            ev.preventDefault();
        });

        this._box = new Popbox({
            blur: true,
            overlay: true,
        });
        this._box.open('confirm_box');
        $('#confirm_box').attr('tabindex', -1).focus();
    }
}

export var confirmBox = new ConfirmBox();

class MetronomeBox extends DialogBase {
    private focusedInput: JQuery<HTMLElement> | null = null;

    constructor() {
        super('metronome_box');
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

        $("#metronome_box input").on('focus', (ev) => {
            this.focusedInput = $(ev.target);
            $(ev.target).select();
        });

        $("#metronome_keypad .keypad_key").on('click', (ev) => {
            if (!this.focusedInput) return;

            const key = $(ev.target).text();
            let val = this.focusedInput.val() as string;

            if (key === 'BS') {
                val = val.slice(0, -1);
            } else {
                val += key;
            }
            this.focusedInput.val(val);
            this.focusedInput.focus();
        });

        $("#metronome_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'metronome_ok', 'metronome_cancel');
        });
    }

    show(bpm: number, mainBeats: number, subBeats: number, okayCallback: (bpm: number, mainBeats: number, subBeats: number) => void): void {
        $('#metronome_bpm').val(bpm);
        $('#metronome_main_beats').val(mainBeats);
        $('#metronome_sub_beats').val(subBeats);

        $("#metronome_ok").off('click').on('click', (ev) => {
            ev.preventDefault();

            const check = (el: JQuery<HTMLElement>, min: number): number | null => {
                const valStr = el.val() as string;
                if (!/^\d+$/.test(valStr)) {
                    el.focus();
                    return null;
                }
                const val = parseInt(valStr, 10);
                if (val < min) {
                    el.focus();
                    return null;
                }
                return val;
            };

            const bpm = check($('#metronome_bpm'), 1);
            if (bpm === null) return;

            const mainBeats = check($('#metronome_main_beats'), 1);
            if (mainBeats === null) return;

            const subBeats = check($('#metronome_sub_beats'), 0);
            if (subBeats === null) return;

            this._box!.clear();
            if (okayCallback) okayCallback(bpm, mainBeats, subBeats);
        });

        $("#metronome_cancel").off('click').on('click', (ev) => {
            this._box!.clear();
            ev.preventDefault();
        });

        this._box = new Popbox({
            blur: true,
            overlay: true,
        });
        this._box.open('metronome_box');
        $('#metronome_bpm').focus();
    }
}

export var metronomeBox = new MetronomeBox();
