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
var _SaveAsBox_save_as_box;
class SaveAsBox {
    constructor() {
        _SaveAsBox_save_as_box.set(this, null);
        $("#save_as_filename").keydown((ev) => {
            console.log(ev);
            ev.stopPropagation();
            if (ev.code === 'Enter') { // enter
                this.doDownload();
                ev.preventDefault();
            }
        });
        $("#save").on('click', (_ev) => {
            this.doDownload();
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
var saveAsBox = new SaveAsBox();
