'use strict';
class SaveAsBox {
    #save_as_box = null;
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
    doDownload() {
        if (!this.#save_as_box) {
            return; // Shouldn't happen
        }
        this.#save_as_box.clear();
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
var saveAsBox = new SaveAsBox();
class ConfirmBox {
    #confirm_box = null;
    constructor() {
        $("#confirm_box").on('popbox_closing', (_ev) => {
            $("#confirm_box").trigger('blur'); // unfocus, so shortcut keys will start working again
        });
    }
    show(text, okayCallback) {
        $('#confirm_text').text(text);
        $("#confirm_ok").on('click', (ev) => {
            console.log("ok");
            ev.preventDefault();
            if (okayCallback)
                okayCallback();
        });
        $("#confirm_cancel").on('click', (ev) => {
            console.log("canceled");
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
var confirmBox = new ConfirmBox();
