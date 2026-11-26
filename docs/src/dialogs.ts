/**
 * @file dialogs.ts
 * @description Controls the display and input logic for modal popup dialog boxes, including
 * the "Save As" file box, metronome settings (BPM/beats/tempo change), and MIDI output selector.
 */

'use strict';

import { MetronomeOptions } from './metronome.js';
import { info, getCurrentTime } from './util.js';

function refocusBody(): void {
    setTimeout(() => $('body').focus(), 0);
}

declare const Popbox: any;

export interface PopboxInstance {
    open(tag: string): void;
    clear(): void;
}

export type PopboxFactory = (options: { blur: boolean; overlay: boolean }) => PopboxInstance;

const defaultPopboxFactory: PopboxFactory = (options) => new Popbox(options);

export class DialogBase {
    protected _box: PopboxInstance | null = null;
    protected _id: string;
    protected _createPopbox: PopboxFactory;

    constructor(id: string, createPopbox: PopboxFactory = defaultPopboxFactory) {
        this._id = id;
        this._createPopbox = createPopbox;
        $(`#${id}`).on('popbox_closing', (_ev) => {
            refocusBody();
        });
    }

    protected _getOrCreatePopbox(): PopboxInstance {
        if (!this._box) {
            this._box = this._createPopbox({
                blur: true,
                overlay: true,
            });
        }
        return this._box;
    }

    protected _handleKeyDown(ev: JQuery.KeyDownEvent, okId: string, cancelId: string): void {
        ev.stopPropagation();
        if (ev.code === 'Enter') {
            $(`#${okId}`).trigger('click');
            ev.preventDefault();
        } else if (ev.code === 'Escape') {
            $(`#${cancelId}`).trigger('click');
            ev.preventDefault();
        }
    }
}

export interface SaveAsRecorder {
    readonly isAnythingRecorded: boolean;
    download(filename: string): void;
}

export class SaveAsBox extends DialogBase {
    #recorder: SaveAsRecorder;
    #getCurrentTime: () => string;

    constructor(
        recorder: SaveAsRecorder,
        createPopbox: PopboxFactory = defaultPopboxFactory,
        getTime: () => string = getCurrentTime
    ) {
        super('save_as_box', createPopbox);
        this.#recorder = recorder;
        this.#getCurrentTime = getTime;

        $("#save_as_box").on('keydown', (ev) => {
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

    open(): void {
        if (!this.#recorder.isAnythingRecorded) {
            info("Nothing is recorded");
            return;
        }
        const filename = "mvv-" + this.#getCurrentTime();
        $('#save_as_filename').val(filename);
        this._getOrCreatePopbox().open('save_as_box');
        $('#save_as_filename').focus();
    }

    doDownload(): void {
        let filename = $('#save_as_filename').val() as string;
        if (!filename) {
            info("Empty filename");
            return;
        }
        filename += ".mid";
        this.#recorder.download(filename);
        info("Saved as " + filename);
    }
}

export class ConfirmBox extends DialogBase {
    constructor(createPopbox: PopboxFactory = defaultPopboxFactory) {
        super('confirm_box', createPopbox);
        $("#confirm_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'confirm_ok', 'confirm_cancel');
        });
    }

    show(text: string, okayCallback: () => void): void {
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

        this._getOrCreatePopbox().open('confirm_box');
        $('#confirm_box').attr('tabindex', -1).focus();
    }
}

export class MetronomeBox extends DialogBase {
    private focusedInput: JQuery<HTMLElement> | null = null;
    private metronomeTapLastTime = 0;
    #now: () => number;

    constructor(
        createPopbox: PopboxFactory = defaultPopboxFactory,
        now: () => number = () => performance.now()
    ) {
        super('metronome_box', createPopbox);
        this.#now = now;

        const handleKeyDown = (ev: JQuery.KeyDownEvent) => {
            if (!this.focusedInput) {
                return;
            }

            let val = parseInt($(ev.target).val() as string, 10);
            if (isNaN(val)) {
                val = 0;
            }

            const min = parseInt(this.focusedInput.attr('min') || "0", 10);
            const max = parseInt(this.focusedInput.attr('max') || "0", 10);

            if (ev.code === 'ArrowUp') {
                val = Math.min(max, val + 1);
                $(ev.target).val(val);
                ev.preventDefault();
            } else if (ev.code === 'ArrowDown') {
                val = Math.max(min, val - 1);
                $(ev.target).val(val);
                ev.preventDefault();
            } else if (ev.code === 'PageUp') {
                val = Math.min(max, val + 10);
                $(ev.target).val(val);
                ev.preventDefault();
            } else if (ev.code === 'PageDown') {
                val = Math.max(min, val - 10);
                $(ev.target).val(val);
                ev.preventDefault();
            }
        };

        $('#metronome_bpm').on('keydown', handleKeyDown);
        $('#metronome_main_beats').on('keydown', handleKeyDown);
        $('#metronome_sub_beats').on('keydown', handleKeyDown);

        $("#metronome_box input[type='text']").on('focus', (ev) => {
            this.focusedInput = $(ev.target);
            $(ev.target).select();
        });

        $("#metronome_keypad .keypad_key").on('click', (ev) => {
            if (!this.focusedInput) {
                return;
            }

            const inputEl = this.focusedInput[0] as HTMLInputElement;
            const key = $(ev.target).text();
            let val = inputEl.value;
            const selectionStart = inputEl.selectionStart || 0;
            const selectionEnd = inputEl.selectionEnd || 0;
            const anythingSelected = (selectionStart !== selectionEnd);

            if (key === 'BS') {
                if (!anythingSelected) {
                    val = val.slice(0, -1);
                } else {
                    val = "";
                }
            } else {
                if (!anythingSelected) {
                    val = val + key;
                } else {
                    val = key;
                }
            }
            inputEl.value = val;
            const newCursorPos = val.length;
            if (typeof inputEl.setSelectionRange === 'function') {
                inputEl.setSelectionRange(newCursorPos, newCursorPos);
            }
        });

        $("#metronome_adj_keys .adj_key").on('click', (ev) => {
            if (!this.focusedInput) {
                return;
            }

            const inputEl = this.focusedInput[0] as HTMLInputElement;
            const key = $(ev.target);
            const adj = parseInt(key.attr('adj') || "0", 10);
            const factor = parseFloat(key.attr('factor') || "0");

            let val = parseInt(inputEl.value, 10);
            if (isNaN(val)) {
                val = 0;
            }

            if (adj !== 0) {
                val += adj;
            } else if (factor !== 0) {
                val = Math.round(val * factor);
            }
            const min = parseInt(this.focusedInput.attr('min') || "0", 10);
            const max = parseInt(this.focusedInput.attr('max') || "0", 10);
            if (val < min) {
                val = min;
            } else if (val > max) {
                val = max;
            }
            inputEl.value = val.toString();
        });

        $("#metronome_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'metronome_ok', 'metronome_cancel');
        });

        $("#metronome_tap").on('click', (ev) => {
            ev.preventDefault();
            const now = this.#now();
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
                    } else {
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

    #updateEnablement(): void {
        const setupTempoChangeSection = (type: 'increase' | 'decrease') => {
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
    }

    show(options: MetronomeOptions, okayCallback: (options: MetronomeOptions) => void): void {
        this.metronomeTapLastTime = 0;
        $('#metronome_bpm').val(options.bpm);
        $('#metronome_main_beats').val(options.beats);
        $('#metronome_sub_beats').val(options.subBeats);

        $('#increase_tempo_enabled').prop('checked', options.automaticIncrease);
        $('#increase_tempo_after').val(options.increaseAfterSeconds || options.increaseAfterBars || 1);
        const increaseUnit = (options.increaseAfterSeconds > 0 && options.increaseAfterBars === 0) ? "seconds" : "bars";
        $(`input[name="increase_tempo_unit"][value="${increaseUnit}"]`).prop('checked', true);
        $('#increase_tempo_bpm').val(options.increaseBpm || 1);
        $('#increase_tempo_max').val(options.increaseMaxBpm || 120);

        $('#decrease_tempo_enabled').prop('checked', options.automaticDecrease);
        $('#decrease_tempo_after').val(options.decreaseAfterSeconds || options.decreaseAfterBars || 1);
        const decreaseUnit = (options.decreaseAfterSeconds > 0 && options.decreaseAfterBars === 0) ? "seconds" : "bars";
        $(`input[name="decrease_tempo_unit"][value="${decreaseUnit}"]`).prop('checked', true);
        $('#decrease_tempo_bpm').val(options.decreaseBpm || 1);
        $('#decrease_tempo_min').val(options.decreaseMinBpm || 60);

        this.#updateEnablement();

        const initialOptions = options.copy();

        $("#metronome_ok").off('click').on('click', (ev) => {
            ev.preventDefault();

            const check = (el: JQuery<HTMLElement>, defValue: number): number | null => {
                const min = parseInt(el.attr('min') || "0", 10);
                const max = parseInt(el.attr('max') || "0", 10);

                const valStr = (el.val() as string).trim();
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
            if (bpm === null) return;

            const mainBeats = check($('#metronome_main_beats'), 4);
            if (mainBeats === null) return;

            const subBeats = check($('#metronome_sub_beats'), 0);
            if (subBeats === null) return;

            opts.bpm = bpm;
            opts.beats = mainBeats;
            opts.subBeats = subBeats;

            opts.automaticIncrease = $('#increase_tempo_enabled').is(':checked');
            if (opts.automaticIncrease) {
                const itAfter = check($('#increase_tempo_after'), -1);
                if (itAfter === null) return;

                const itBpm = check($('#increase_tempo_bpm'), -1);
                if (itBpm === null) return;

                const itMax = check($('#increase_tempo_max'), -1);
                if (itMax === null) return;

                opts.increaseBpm = itBpm;
                opts.increaseMaxBpm = itMax;

                opts.increaseAfterBars = 0;
                opts.increaseAfterSeconds = 0;
                if ($('input[name="increase_tempo_unit"]:checked').val() === "bars") {
                    opts.increaseAfterBars = itAfter;
                } else {
                    opts.increaseAfterSeconds = itAfter;
                }
            }

            opts.automaticDecrease = $('#decrease_tempo_enabled').is(':checked');
            if (opts.automaticDecrease) {
                const dtAfter = check($('#decrease_tempo_after'), -1);
                if (dtAfter === null) return;

                const dtBpm = check($('#decrease_tempo_bpm'), -1);
                if (dtBpm === null) return;

                const dtMin = check($('#decrease_tempo_min'), -1);
                if (dtMin === null) return;

                opts.decreaseBpm = dtBpm;
                opts.decreaseMinBpm = dtMin;

                opts.decreaseAfterBars = 0;
                opts.decreaseAfterSeconds = 0;
                if ($('input[name="decrease_tempo_unit"]:checked').val() === "bars") {
                    opts.decreaseAfterBars = dtAfter;
                } else {
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

        this._getOrCreatePopbox().open('metronome_box');
        $('#metronome_bpm').focus();
    }
}

export interface MidiOutputDialogSelector {
    getDevices(): WebMidi.MIDIOutput[];
    selectDevice(deviceName: string): void;
}

export interface MidiOutputDialogManager {
    getMidiOut(): WebMidi.MIDIOutput | null;
}

export class MidiOutputBox extends DialogBase {
    #selector: MidiOutputDialogSelector;
    #outputManager: MidiOutputDialogManager;

    constructor(
        selector: MidiOutputDialogSelector,
        outputManager: MidiOutputDialogManager,
        createPopbox: PopboxFactory = defaultPopboxFactory
    ) {
        super('midi_output_box', createPopbox);
        this.#selector = selector;
        this.#outputManager = outputManager;

        $("#midi_output_box").on('keydown', (ev) => {
            this._handleKeyDown(ev, 'midi_output_ok', 'midi_output_cancel');
        });

        $("#midi_output_ok").on('click', (ev) => {
            const selectedDevice = $('#midi_output_select').val() as string;
            this.#selector.selectDevice(selectedDevice);
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

    open(): void {
        const devices = this.#selector.getDevices();
        const select = $('#midi_output_select');
        select.empty();
        const currentDevice = this.#outputManager.getMidiOut();
        for (const device of devices) {
            const option = $('<option></option>').val(device.name ?? "").text(device.name ?? "");
            if (currentDevice && device.name === currentDevice.name) {
                option.attr('selected', 'selected');
            }
            select.append(option);
        }

        this._getOrCreatePopbox().open('midi_output_box');
        select.focus();
    }
}
