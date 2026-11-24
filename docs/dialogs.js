/**
 * @file dialogs.ts
 * @description Controls the display and input logic for modal popup dialog boxes, including
 * the "Save As" file box, metronome settings (BPM/beats/tempo change), and MIDI output selector.
 */
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
var _SaveAsBox_recorder, _SaveAsBox_getCurrentTime, _MetronomeBox_instances, _MetronomeBox_now, _MetronomeBox_updateEnablement, _MidiOutputBox_selector, _MidiOutputBox_outputManager;
import { info, getCurrentTime } from './util.js';
function refocusBody() {
    setTimeout(() => $('body').focus(), 0);
}
const defaultPopboxFactory = (options) => new Popbox(options);
export class DialogBase {
    constructor(id, createPopbox = defaultPopboxFactory) {
        this._box = null;
        this._id = id;
        this._createPopbox = createPopbox;
        $(`#${id}`).on('popbox_closing', (_ev) => {
            refocusBody();
        });
    }
    _handleKeyDown(ev, okId, cancelId) {
        ev.stopPropagation();
        if (ev.code === 'Enter') {
            $(`#${okId}`).trigger('click');
            ev.preventDefault();
        }
        else if (ev.code === 'Escape') {
            $(`#${cancelId}`).trigger('click');
            ev.preventDefault();
        }
    }
}
export class SaveAsBox extends DialogBase {
    constructor(recorder, createPopbox = defaultPopboxFactory, getTime = getCurrentTime) {
        super('save_as_box', createPopbox);
        _SaveAsBox_recorder.set(this, void 0);
        _SaveAsBox_getCurrentTime.set(this, void 0);
        __classPrivateFieldSet(this, _SaveAsBox_recorder, recorder, "f");
        __classPrivateFieldSet(this, _SaveAsBox_getCurrentTime, getTime, "f");
        $("#save_as_filename").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'save', 'save_as_cancel');
        });
        $("#save").on('click', (ev) => {
            if (this._box) {
                this._box.clear();
            }
            this.doDownload();
            ev.preventDefault();
        });
        $("#save_as_cancel").on('click', (ev) => {
            if (this._box) {
                this._box.clear();
            }
            ev.preventDefault();
        });
    }
    open() {
        if (!__classPrivateFieldGet(this, _SaveAsBox_recorder, "f").isAnythingRecorded) {
            info("Nothing is recorded");
            return;
        }
        const filename = "mvv-" + __classPrivateFieldGet(this, _SaveAsBox_getCurrentTime, "f").call(this);
        $('#save_as_filename').val(filename);
        this._box = this._createPopbox({
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
        __classPrivateFieldGet(this, _SaveAsBox_recorder, "f").download(filename);
        info("Saved as " + filename);
    }
}
_SaveAsBox_recorder = new WeakMap(), _SaveAsBox_getCurrentTime = new WeakMap();
export class ConfirmBox extends DialogBase {
    constructor(createPopbox = defaultPopboxFactory) {
        super('confirm_box', createPopbox);
        $("#confirm_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'confirm_ok', 'confirm_cancel');
        });
    }
    show(text, okayCallback) {
        $('#confirm_text').text(text);
        $("#confirm_ok").off('click').on('click', (ev) => {
            console.log("ok");
            if (this._box) {
                this._box.clear();
            }
            ev.preventDefault();
            if (okayCallback) {
                okayCallback();
            }
        });
        $("#confirm_cancel").off('click').on('click', (ev) => {
            console.log("canceled");
            if (this._box) {
                this._box.clear();
            }
            ev.preventDefault();
        });
        this._box = this._createPopbox({
            blur: true,
            overlay: true,
        });
        this._box.open('confirm_box');
        $('#confirm_box').attr('tabindex', -1).focus();
    }
}
export class MetronomeBox extends DialogBase {
    constructor(createPopbox = defaultPopboxFactory, now = () => performance.now()) {
        super('metronome_box', createPopbox);
        _MetronomeBox_instances.add(this);
        this.focusedInput = null;
        this.metronomeTapLastTime = 0;
        _MetronomeBox_now.set(this, void 0);
        __classPrivateFieldSet(this, _MetronomeBox_now, now, "f");
        const handleKeyDown = (ev) => {
            if (!this.focusedInput) {
                return;
            }
            let val = parseInt($(ev.target).val(), 10);
            if (isNaN(val)) {
                val = 0;
            }
            const min = parseInt(this.focusedInput.attr('min') || "0", 10);
            const max = parseInt(this.focusedInput.attr('max') || "0", 10);
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
        $('#metronome_bpm').on('keydown', handleKeyDown);
        $('#metronome_main_beats').on('keydown', handleKeyDown);
        $('#metronome_sub_beats').on('keydown', handleKeyDown);
        $("#metronome_box input").on('focus', (ev) => {
            this.focusedInput = $(ev.target);
            $(ev.target).select();
        });
        $("#metronome_keypad .keypad_key").on('click', (ev) => {
            if (!this.focusedInput) {
                return;
            }
            const inputEl = this.focusedInput[0];
            const key = $(ev.target).text();
            let val = inputEl.value;
            const selectionStart = inputEl.selectionStart || 0;
            const selectionEnd = inputEl.selectionEnd || 0;
            const anythingSelected = (selectionStart !== selectionEnd);
            if (key === 'BS') {
                if (!anythingSelected) {
                    val = val.slice(0, -1);
                }
                else {
                    val = "";
                }
            }
            else {
                if (!anythingSelected) {
                    val = val + key;
                }
                else {
                    val = key;
                }
            }
            inputEl.value = val;
            const newCursorPos = val.length;
            inputEl.setSelectionRange(newCursorPos, newCursorPos);
        });
        $("#metronome_adj_keys .adj_key").on('click', (ev) => {
            if (!this.focusedInput) {
                return;
            }
            const inputEl = this.focusedInput[0];
            const key = $(ev.target);
            const adj = parseInt(key.attr('adj') || "0", 10);
            const factor = parseFloat(key.attr('factor') || "0");
            let val = parseInt(inputEl.value, 10);
            if (isNaN(val)) {
                val = 0;
            }
            if (adj !== 0) {
                val += adj;
            }
            else if (factor !== 0) {
                val = Math.round(val * factor);
            }
            const min = parseInt(this.focusedInput.attr('min') || "0", 10);
            const max = parseInt(this.focusedInput.attr('max') || "0", 10);
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
        $("#metronome_tap").on('click', (ev) => {
            ev.preventDefault();
            const now = __classPrivateFieldGet(this, _MetronomeBox_now, "f").call(this);
            if (this.metronomeTapLastTime > 0) {
                const delta = now - this.metronomeTapLastTime;
                if (delta > 50) { // debounce
                    if (delta < 2000) {
                        const bpm = Math.floor(60 * 1000 / delta);
                        const bpmInput = $('#metronome_bpm');
                        const min = parseInt(bpmInput.attr('min') || "10", 10);
                        const max = parseInt(bpmInput.attr('max') || "500", 10);
                        const clampedBpm = Math.max(min, Math.min(max, bpm));
                        bpmInput.val(clampedBpm);
                    }
                    else {
                        this.metronomeTapLastTime = 0;
                    }
                }
            }
            this.metronomeTapLastTime = now;
        });
        $(`#${this._id}`).on('popbox_closing', (_ev) => {
            this.metronomeTapLastTime = 0;
        });
        $('#metronome_auto_tempo input[type="checkbox"], #metronome_auto_tempo input[type="radio"], #metronome_auto_tempo label').on('click', (ev) => {
            ev.stopPropagation();
        });
    }
    show(options, okayCallback) {
        this.metronomeTapLastTime = 0;
        $('#metronome_bpm').val(options.bpm);
        $('#metronome_main_beats').val(options.beats);
        $('#metronome_sub_beats').val(options.subBeats);
        $('#increase_tempo_enabled').prop('checked', options.automaticIncrease);
        $('#increase_tempo_after').val(options.increaseAfterSeconds || options.increaseAfterBars);
        $(`input[name="increase_tempo_unit"][value="${options.increaseAfterBars > 0 ? "bars" : "seconds"}"]`).prop('checked', true);
        $('#increase_tempo_bpm').val(options.increaseBpm);
        $('#increase_tempo_max').val(options.increaseMaxBpm);
        $('#decrease_tempo_enabled').prop('checked', options.automaticDecrease);
        $('#decrease_tempo_after').val(options.decreaseAfterSeconds || options.decreaseAfterBars);
        $(`input[name="decrease_tempo_unit"][value="${options.decreaseAfterBars > 0 ? "bars" : "seconds"}"]`).prop('checked', true);
        $('#decrease_tempo_bpm').val(options.decreaseBpm);
        $('#decrease_tempo_min').val(options.decreaseMinBpm);
        __classPrivateFieldGet(this, _MetronomeBox_instances, "m", _MetronomeBox_updateEnablement).call(this);
        const initialOptions = options.copy();
        $("#metronome_ok").off('click').on('click', (ev) => {
            ev.preventDefault();
            const check = (el, defValue) => {
                const min = parseInt(el.attr('min') || "0", 10);
                const max = parseInt(el.attr('max') || "0", 10);
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
            const opts = initialOptions.copy();
            const bpm = check($('#metronome_bpm'), -1);
            if (bpm === null)
                return;
            const mainBeats = check($('#metronome_main_beats'), 4);
            if (mainBeats === null)
                return;
            const subBeats = check($('#metronome_sub_beats'), 0);
            if (subBeats === null)
                return;
            opts.bpm = bpm;
            opts.beats = mainBeats;
            opts.subBeats = subBeats;
            opts.automaticIncrease = $('#increase_tempo_enabled').is(':checked');
            if (opts.automaticIncrease) {
                const itAfter = check($('#increase_tempo_after'), -1);
                if (itAfter === null)
                    return;
                const itBpm = check($('#increase_tempo_bpm'), -1);
                if (itBpm === null)
                    return;
                const itMax = check($('#increase_tempo_max'), -1);
                if (itMax === null)
                    return;
                opts.increaseBpm = itBpm;
                opts.increaseMaxBpm = itMax;
                opts.increaseAfterBars = 0;
                opts.increaseAfterSeconds = 0;
                if ($('input[name="increase_tempo_unit"]:checked').val() === "bars") {
                    opts.increaseAfterBars = itAfter;
                }
                else {
                    opts.increaseAfterSeconds = itAfter;
                }
            }
            opts.automaticDecrease = $('#decrease_tempo_enabled').is(':checked');
            if (opts.automaticDecrease) {
                const dtAfter = check($('#decrease_tempo_after'), -1);
                if (dtAfter === null)
                    return;
                const dtBpm = check($('#decrease_tempo_bpm'), -1);
                if (dtBpm === null)
                    return;
                const dtMin = check($('#decrease_tempo_min'), -1);
                if (dtMin === null)
                    return;
                opts.decreaseBpm = dtBpm;
                opts.decreaseMinBpm = dtMin;
                opts.decreaseAfterBars = 0;
                opts.decreaseAfterSeconds = 0;
                if ($('input[name="decrease_tempo_unit"]:checked').val() === "bars") {
                    opts.decreaseAfterBars = dtAfter;
                }
                else {
                    opts.decreaseAfterSeconds = dtAfter;
                }
            }
            if (this._box) {
                this._box.clear();
            }
            if (okayCallback) {
                okayCallback(opts);
            }
        });
        $("#metronome_cancel").off('click').on('click', (ev) => {
            if (this._box) {
                this._box.clear();
            }
            ev.preventDefault();
        });
        this._box = this._createPopbox({
            blur: true,
            overlay: true,
        });
        this._box.open('metronome_box');
        $('#metronome_bpm').focus();
    }
}
_MetronomeBox_now = new WeakMap(), _MetronomeBox_instances = new WeakSet(), _MetronomeBox_updateEnablement = function _MetronomeBox_updateEnablement() {
    const setupTempoChangeSection = (type) => {
        const enabledCheckbox = $(`#${type}_tempo_enabled`);
        const fieldset = enabledCheckbox.closest('fieldset');
        const updateState = () => {
            const isEnabled = enabledCheckbox.is(':checked');
            fieldset.find('input').not(enabledCheckbox).prop('disabled', !isEnabled);
        };
        enabledCheckbox.off('change').on('change', updateState);
        updateState();
    };
    setupTempoChangeSection('increase');
    setupTempoChangeSection('decrease');
};
export class MidiOutputBox extends DialogBase {
    constructor(selector, outputManager, createPopbox = defaultPopboxFactory) {
        super('midi_output_box', createPopbox);
        _MidiOutputBox_selector.set(this, void 0);
        _MidiOutputBox_outputManager.set(this, void 0);
        __classPrivateFieldSet(this, _MidiOutputBox_selector, selector, "f");
        __classPrivateFieldSet(this, _MidiOutputBox_outputManager, outputManager, "f");
        $("#midi_output_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'midi_output_ok', 'midi_output_cancel');
        });
        $("#midi_output_ok").on('click', (ev) => {
            const selectedDevice = $('#midi_output_select').val();
            __classPrivateFieldGet(this, _MidiOutputBox_selector, "f").selectDevice(selectedDevice);
            if (this._box) {
                this._box.clear();
            }
            ev.preventDefault();
        });
        $("#midi_output_cancel").on('click', (ev) => {
            if (this._box) {
                this._box.clear();
            }
            ev.preventDefault();
        });
    }
    open() {
        var _a, _b;
        const devices = __classPrivateFieldGet(this, _MidiOutputBox_selector, "f").getDevices();
        const select = $('#midi_output_select');
        select.empty();
        const currentDevice = __classPrivateFieldGet(this, _MidiOutputBox_outputManager, "f").getMidiOut();
        for (const device of devices) {
            const option = $('<option></option>').val((_a = device.name) !== null && _a !== void 0 ? _a : "").text((_b = device.name) !== null && _b !== void 0 ? _b : "");
            if (currentDevice && device.name === currentDevice.name) {
                option.attr('selected', 'selected');
            }
            select.append(option);
        }
        this._box = this._createPopbox({
            blur: true,
            overlay: true,
        });
        this._box.open('midi_output_box');
        select.focus();
    }
}
_MidiOutputBox_selector = new WeakMap(), _MidiOutputBox_outputManager = new WeakMap();
//# sourceMappingURL=dialogs.js.map