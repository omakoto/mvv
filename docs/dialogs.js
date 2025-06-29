'use strict';
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _SaveAsBox_save_as_box, _ConfirmBox_confirm_box, _MetronomeBox_metronome_box;
import { recorder } from './mvv.js';
import { info } from './util.js';
import { getCurrentTime } from './util.js';
function refocusBody() {
    setTimeout(() => $('body').focus(), 0);
}
class SaveAsBox {
    constructor() {
        _SaveAsBox_save_as_box.set(this, null); // Changed Popbox to any to avoid declaration issues
        $("#save_as_filename").keydown((ev) => {
            ev.stopPropagation();
            if (ev.code === 'Enter') { // enter
                $("#save").trigger('click');
                ev.preventDefault();
            }
            else if (ev.code === 'Escape') {
                $("#save_as_cancel").trigger('click');
                ev.preventDefault();
            }
        });
        $("#save").on('click', (ev) => {
            this.doDownload();
            ev.preventDefault();
        });
        $("#save_as_cancel").on('click', (ev) => {
            __classPrivateFieldGet(this, _SaveAsBox_save_as_box, "f").clear();
            ev.preventDefault();
        });
        $("#save_as_box").on('popbox_closing', (_ev) => {
            refocusBody();
        });
    }
    open() {
        if (!recorder.isAnythingRecorded) {
            info("Nothing is recorded");
            return;
        }
        let filename = "mvv-" + getCurrentTime();
        $('#save_as_filename').val(filename);
        __classPrivateFieldSet(this, _SaveAsBox_save_as_box, new Popbox({
            blur: true,
            overlay: true,
        }), "f");
        __classPrivateFieldGet(this, _SaveAsBox_save_as_box, "f").open('save_as_box');
        $('#save_as_filename').focus();
    }
    doDownload() {
        if (!__classPrivateFieldGet(this, _SaveAsBox_save_as_box, "f")) {
            return; // Shouldn't happen
        }
        __classPrivateFieldGet(this, _SaveAsBox_save_as_box, "f").clear();
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
_SaveAsBox_save_as_box = new WeakMap();
export var saveAsBox = new SaveAsBox();
class ConfirmBox {
    constructor() {
        _ConfirmBox_confirm_box.set(this, null); // Changed Popbox to any
        $("#confirm_box").on('popbox_closing', (_ev) => {
            refocusBody();
        });
        $("#confirm_box").on('keydown', (ev) => {
            ev.stopPropagation();
            if (ev.code === 'Enter') { // enter
                $("#confirm_ok").trigger('click');
                ev.preventDefault();
            }
            else if (ev.code === 'Escape') { // escape
                $("#confirm_cancel").trigger('click');
                ev.preventDefault();
            }
        });
    }
    show(text, okayCallback) {
        $('#confirm_text').text(text);
        $("#confirm_ok").off('click').on('click', (ev) => {
            console.log("ok");
            __classPrivateFieldGet(this, _ConfirmBox_confirm_box, "f").clear(); // Close the box
            ev.preventDefault();
            if (okayCallback)
                okayCallback();
        });
        $("#confirm_cancel").off('click').on('click', (ev) => {
            console.log("canceled");
            __classPrivateFieldGet(this, _ConfirmBox_confirm_box, "f").clear(); // Close the box
            ev.preventDefault();
        });
        __classPrivateFieldSet(this, _ConfirmBox_confirm_box, new Popbox({
            blur: true,
            overlay: true,
        }), "f");
        __classPrivateFieldGet(this, _ConfirmBox_confirm_box, "f").open('confirm_box');
        $('#confirm_box').attr('tabindex', -1).focus();
    }
}
_ConfirmBox_confirm_box = new WeakMap();
export var confirmBox = new ConfirmBox();
class MetronomeBox {
    constructor() {
        _MetronomeBox_metronome_box.set(this, null);
        $("#metronome_box").on('popbox_closing', (_ev) => {
            refocusBody();
        });
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
            ev.stopPropagation();
            if (ev.code === 'Enter') {
                $("#metronome_ok").trigger('click');
                ev.preventDefault();
            }
            else if (ev.code === 'Escape') {
                $("#metronome_cancel").trigger('click');
                ev.preventDefault();
            }
        });
    }
    show(bpm, mainBeats, subBeats, okayCallback) {
        $('#metronome_bpm').val(bpm);
        $('#metronome_main_beats').val(mainBeats);
        $('#metronome_sub_beats').val(subBeats);
        $("#metronome_ok").off('click').on('click', (ev) => {
            __classPrivateFieldGet(this, _MetronomeBox_metronome_box, "f").clear();
            ev.preventDefault();
            const bpm = parseInt($('#metronome_bpm').val());
            const mainBeats = parseInt($('#metronome_main_beats').val());
            const subBeats = parseInt($('#metronome_sub_beats').val());
            if (okayCallback)
                okayCallback(bpm, mainBeats, subBeats);
        });
        $("#metronome_cancel").off('click').on('click', (ev) => {
            __classPrivateFieldGet(this, _MetronomeBox_metronome_box, "f").clear();
            ev.preventDefault();
        });
        __classPrivateFieldSet(this, _MetronomeBox_metronome_box, new Popbox({
            blur: true,
            overlay: true,
        }), "f");
        __classPrivateFieldGet(this, _MetronomeBox_metronome_box, "f").open('metronome_box');
        $('#metronome_bpm').focus();
    }
}
_MetronomeBox_metronome_box = new WeakMap();
export var metronomeBox = new MetronomeBox();
