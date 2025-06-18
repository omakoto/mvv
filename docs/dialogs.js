'use strict';
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _SaveAsBox_save_as_box, _ConfirmBox_confirm_box;
import { recorder } from './mvv.js';
import { info } from './util.js';
import { getCurrentTime } from './util.js';
class SaveAsBox {
    constructor() {
        _SaveAsBox_save_as_box.set(this, null); // Changed Popbox to any to avoid declaration issues
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
            $("#confirm_box").trigger('blur'); // unfocus, so shortcut keys will start working again
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
        $('#confirm_box').focus();
    }
}
_ConfirmBox_confirm_box = new WeakMap();
export var confirmBox = new ConfirmBox();
