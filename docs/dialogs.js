'use strict';
import { recorder } from './mvv.js';
import { info } from './util.js';
import { getCurrentTime } from './util.js';
function refocusBody() {
    setTimeout(() => $('body').focus(), 0);
}
class DialogBase {
    constructor(id) {
        this._box = null;
        this._id = id;
        $(`#${id}`).on('popbox_closing', (_ev) => {
            refocusBody();
        });
    }
    _handleKeyDown(ev, okId, cancelId) {
        ev.stopPropagation();
        if (ev.code === 'Enter') { // enter
            $(`#${okId}`).trigger('click');
            ev.preventDefault();
        }
        else if (ev.code === 'Escape') {
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
            this._box.clear();
            ev.preventDefault();
        });
    }
    open() {
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
    doDownload() {
        if (!this._box) {
            return; // Shouldn't happen
        }
        this._box.clear();
        let filename = $('#save_as_filename').val();
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
    show(text, okayCallback) {
        $('#confirm_text').text(text);
        $("#confirm_ok").off('click').on('click', (ev) => {
            console.log("ok");
            this._box.clear(); // Close the box
            ev.preventDefault();
            if (okayCallback)
                okayCallback();
        });
        $("#confirm_cancel").off('click').on('click', (ev) => {
            console.log("canceled");
            this._box.clear(); // Close the box
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
    constructor() {
        super('metronome_box');
        const handleKeyDown = (ev, min) => {
            let val = parseInt($(ev.target).val());
            if (ev.code === 'ArrowUp') {
                val++;
                $(ev.target).val(val);
                ev.preventDefault();
            }
            else if (ev.code === 'ArrowDown') {
                val = Math.max(min, val - 1);
                $(ev.target).val(val);
                ev.preventDefault();
            }
            else if (ev.code === 'PageUp') {
                val += 10;
                $(ev.target).val(val);
                ev.preventDefault();
            }
            else if (ev.code === 'PageDown') {
                val = Math.max(min, val - 10);
                $(ev.target).val(val);
                ev.preventDefault();
            }
        };
        $('#metronome_bpm').on('keydown', (ev) => handleKeyDown(ev, 10));
        $('#metronome_main_beats').on('keydown', (ev) => handleKeyDown(ev, 0));
        $('#metronome_sub_beats').on('keydown', (ev) => handleKeyDown(ev, 0));
        $("#metronome_box input").on('focus', function () {
            $(this).select();
        });
        $("#metronome_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'metronome_ok', 'metronome_cancel');
        });
    }
    show(bpm, mainBeats, subBeats, okayCallback) {
        $('#metronome_bpm').val(bpm);
        $('#metronome_main_beats').val(mainBeats);
        $('#metronome_sub_beats').val(subBeats);
        $("#metronome_ok").off('click').on('click', (ev) => {
            this._box.clear();
            ev.preventDefault();
            const bpm = parseInt($('#metronome_bpm').val());
            const mainBeats = parseInt($('#metronome_main_beats').val());
            const subBeats = parseInt($('#metronome_sub_beats').val());
            if (okayCallback)
                okayCallback(bpm, mainBeats, subBeats);
        });
        $("#metronome_cancel").off('click').on('click', (ev) => {
            this._box.clear();
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
