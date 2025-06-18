'use strict';
Object.defineProperty(exports, "__esModule", { value: true });
exports.confirmBox = exports.saveAsBox = void 0;
const mvv_js_1 = require("./mvv.js");
const util_js_1 = require("./util.js");
const util_js_2 = require("./util.js");
class SaveAsBox {
    #save_as_box = null; // Changed Popbox to any to avoid declaration issues
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
    open() {
        if (!mvv_js_1.recorder.isAnythingRecorded) {
            (0, util_js_1.info)("Nothing is recorded");
            return;
        }
        let filename = "mvv-" + (0, util_js_2.getCurrentTime)();
        $('#save_as_filename').val(filename);
        this.#save_as_box = new Popbox({
            blur: true,
            overlay: true,
        });
        this.#save_as_box.open('save_as_box');
        $('#save_as_filename').focus();
    }
    doDownload() {
        if (!this.#save_as_box) {
            return; // Shouldn't happen
        }
        this.#save_as_box.clear();
        let filename = $('#save_as_filename').val();
        if (!filename) {
            (0, util_js_1.info)("Empty filename");
            return;
        }
        filename += ".mid";
        mvv_js_1.recorder.download(filename);
        (0, util_js_1.info)("Saved as " + filename);
    }
}
exports.saveAsBox = new SaveAsBox();
class ConfirmBox {
    #confirm_box = null; // Changed Popbox to any
    constructor() {
        $("#confirm_box").on('popbox_closing', (_ev) => {
            $("#confirm_box").trigger('blur'); // unfocus, so shortcut keys will start working again
        });
    }
    show(text, okayCallback) {
        $('#confirm_text').text(text);
        $("#confirm_ok").off('click').on('click', (ev) => {
            console.log("ok");
            this.#confirm_box.clear(); // Close the box
            ev.preventDefault();
            if (okayCallback)
                okayCallback();
        });
        $("#confirm_cancel").off('click').on('click', (ev) => {
            console.log("canceled");
            this.#confirm_box.clear(); // Close the box
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
exports.confirmBox = new ConfirmBox();
