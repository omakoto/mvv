'use strict';
import { recorder, midiOutputDeviceSelector } from './mvv.js';
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
            this._box.clear();
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
        this.focusedInput = null;
        const handleKeyDown = (ev) => {
            if (!this.focusedInput)
                return;
            let val = parseInt($(ev.target).val());
            const min = parseInt(this.focusedInput.attr('min') || "0");
            const max = parseInt(this.focusedInput.attr('max') || "0");
            if (ev.code === 'ArrowUp') {
                val = Math.min(max, val + 1);
                $(ev.target).val(val);
                ev.preventDefault();
            }
            else if (ev.code === 'ArrowDown') {
                val = Math.max(min, val - 1);
                $(ev.target).val(val);
                ev.preventDefault();
            }
            else if (ev.code === 'PageUp') {
                val = Math.min(max, val + 10);
                $(ev.target).val(val);
                ev.preventDefault();
            }
            else if (ev.code === 'PageDown') {
                val = Math.max(min, val - 10);
                $(ev.target).val(val);
                ev.preventDefault();
            }
        };
        $('#metronome_bpm').on('keydown', (ev) => handleKeyDown(ev));
        $('#metronome_main_beats').on('keydown', (ev) => handleKeyDown(ev));
        $('#metronome_sub_beats').on('keydown', (ev) => handleKeyDown(ev));
        $("#metronome_box input").on('focus', (ev) => {
            this.focusedInput = $(ev.target);
            $(ev.target).select();
        });
        $("#metronome_keypad .keypad_key").on('click', (ev) => {
            if (!this.focusedInput)
                return;
            const inputEl = this.focusedInput[0];
            const key = $(ev.target).text();
            let val = inputEl.value;
            const selectionStart = inputEl.selectionStart || 0;
            const selectionEnd = inputEl.selectionEnd || 0;
            const anythingSelected = (selectionStart !== selectionEnd);
            if (key === 'BS') {
                if (!anythingSelected) {
                    // No selection, delete the last character
                    val = val.slice(0, -1);
                }
                else {
                    // Selection exists, assume it's selecting the whole text, and delete all.
                    val = "";
                }
            }
            else {
                if (!anythingSelected) {
                    // No selection, add the digit.
                    val = val + key;
                }
                else {
                    // Selection exists, assume it's selecting the whole text, and replace all.
                    val = key;
                }
            }
            inputEl.value = val;
            const newCursorPos = val.length;
            inputEl.setSelectionRange(newCursorPos, newCursorPos);
        });
        $("#metronome_adj_keys .adj_key").on('click', (ev) => {
            if (!this.focusedInput)
                return;
            const inputEl = this.focusedInput[0];
            const key = $(ev.target);
            const adj = parseInt(key.attr('adj') || "0");
            const factor = parseFloat(key.attr('factor') || "0");
            let val = parseInt(inputEl.value, 10);
            if (isNaN(val))
                val = 0;
            if (adj != 0) {
                val += adj;
            }
            else if (factor != 0) {
                val = Math.round(val * factor);
            }
            const min = parseInt(this.focusedInput.attr('min') || "0");
            const max = parseInt(this.focusedInput.attr('max') || "0");
            if (val < min) {
                val = min;
            }
            else if (val > max) {
                val = max;
            }
            inputEl.value = val.toString();
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
            ev.preventDefault();
            const check = (el, defValue) => {
                const min = parseInt(el.attr('min') || "0");
                const max = parseInt(el.attr('max') || "0");
                const valStr = el.val().trim();
                el.val(valStr);
                if (valStr.length === 0 && defValue >= 0) {
                    el.val("" + defValue);
                    return defValue;
                }
                if (!/^\d+$/.test(valStr)) {
                    el.focus();
                    return null;
                }
                const val = parseInt(valStr, 10);
                if (val < min) {
                    el.val("" + min);
                    el.focus();
                    return null;
                }
                if (val > max) {
                    el.val("" + max);
                    el.focus();
                    return null;
                }
                return val;
            };
            const bpm = check($('#metronome_bpm'), -1);
            if (bpm === null)
                return;
            const mainBeats = check($('#metronome_main_beats'), 4);
            if (mainBeats === null)
                return;
            const subBeats = check($('#metronome_sub_beats'), 0);
            if (subBeats === null)
                return;
            this._box.clear();
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
class MidiOutputBox extends DialogBase {
    constructor() {
        super('midi_output_box');
        $("#midi_output_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'midi_output_ok', 'midi_output_cancel');
        });
        $("#midi_output_ok").on('click', (ev) => {
            const selectedDevice = $('#midi_output_select').val();
            midiOutputDeviceSelector.selectDevice(selectedDevice);
            this._box.clear();
            ev.preventDefault();
        });
        $("#midi_output_cancel").on('click', (ev) => {
            this._box.clear();
            ev.preventDefault();
        });
    }
    open() {
        const devices = midiOutputDeviceSelector.getDevices();
        const select = $('#midi_output_select');
        select.empty();
        for (const device of devices) {
            const option = $('<option></option>').val(device.name).text(device.name);
            select.append(option);
        }
        this._box = new Popbox({
            blur: true,
            overlay: true,
        });
        this._box.open('midi_output_box');
        $('#midi_output_select').focus();
    }
}
export var midiOutputBox = new MidiOutputBox();
//# sourceMappingURL=dialogs.js.map