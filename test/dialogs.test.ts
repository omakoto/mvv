// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ConfirmBox, MetronomeBox, MidiOutputBox, SaveAsBox } from '../src/dialogs.js';
import { MetronomeOptions } from '../src/metronome.js';
import { createMockPopboxFactory, setupMvvDom } from './helpers/dom-setup.js';

describe('dialogs', () => {
    beforeEach(() => {
        setupMvvDom();
        vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    describe('SaveAsBox', () => {
        it('refuses to open when nothing is recorded', () => {
            const { factory, instances } = createMockPopboxFactory();
            const recorder = { isAnythingRecorded: false, download: vi.fn() };
            const box = new SaveAsBox(recorder, factory, () => '2026-01-01-12-00-00');

            box.open();
            expect(instances).toHaveLength(0);
            expect($('#status').text()).toBe('Nothing is recorded');
        });

        it('opens with timestamp filename, downloads with .mid extension, and handles Enter/Escape', () => {
            const { factory, instances } = createMockPopboxFactory();
            const recorder = { isAnythingRecorded: true, download: vi.fn() };
            const box = new SaveAsBox(recorder, factory, () => '2026-01-01-12-00-00');

            box.open();
            expect(instances).toHaveLength(1);
            expect(instances[0]!.open).toHaveBeenCalledWith('save_as_box');
            expect($('#save_as_filename').val()).toBe('mvv-2026-01-01-12-00-00');

            // Pressing Enter triggers Save
            $('#save_as_filename').trigger($.Event('keydown', { code: 'Enter' }));
            expect(instances[0]!.clear).toHaveBeenCalledTimes(1);
            expect(recorder.download).toHaveBeenCalledWith('mvv-2026-01-01-12-00-00.mid');
            expect($('#status').text()).toBe('Saved as mvv-2026-01-01-12-00-00.mid');

            // Empty filename shows warning and skips download
            box.open();
            $('#save_as_filename').val('');
            $('#save').trigger('click');
            expect(recorder.download).toHaveBeenCalledTimes(1);
            expect($('#status').text()).toBe('Empty filename');

            // Escape cancels and clears popbox
            box.open();
            $('#save_as_filename').trigger($.Event('keydown', { code: 'Escape' }));
            expect(instances[2]!.clear).toHaveBeenCalledTimes(1);
        });
    });

    describe('ConfirmBox', () => {
        it('invokes callback on OK/Enter and skips callback on Cancel/Escape', () => {
            const { factory, instances } = createMockPopboxFactory();
            const confirmBox = new ConfirmBox(factory);
            const onOk = vi.fn();

            confirmBox.show('Discard recording?', onOk);
            expect($('#confirm_text').text()).toBe('Discard recording?');
            expect(instances[0]!.open).toHaveBeenCalledWith('confirm_box');

            $('#confirm_box').trigger($.Event('keydown', { code: 'Enter' }));
            expect(instances[0]!.clear).toHaveBeenCalledTimes(1);
            expect(onOk).toHaveBeenCalledTimes(1);

            const onCancelTest = vi.fn();
            confirmBox.show('Second confirm?', onCancelTest);
            $('#confirm_box').trigger($.Event('keydown', { code: 'Escape' }));
            expect(instances[1]!.clear).toHaveBeenCalledTimes(1);
            expect(onCancelTest).not.toHaveBeenCalled();
        });
    });

    describe('MetronomeBox', () => {
        function defaultOpts(): MetronomeOptions {
            const opts = new MetronomeOptions();
            opts.bpm = 120;
            opts.beats = 4;
            opts.subBeats = 1;
            opts.automaticIncrease = false;
            opts.increaseAfterBars = 4;
            opts.increaseAfterSeconds = 0;
            opts.increaseBpm = 5;
            opts.increaseMaxBpm = 160;
            opts.automaticDecrease = false;
            opts.decreaseAfterBars = 0;
            opts.decreaseAfterSeconds = 30;
            opts.decreaseBpm = 5;
            opts.decreaseMinBpm = 80;
            return opts;
        }

        it('populates fields, manages auto-tempo disablement, validates inputs, and returns updated options', () => {
            const { factory, instances } = createMockPopboxFactory();
            const box = new MetronomeBox(factory);
            const onOk = vi.fn();

            box.show(defaultOpts(), onOk);
            expect(instances[0]!.open).toHaveBeenCalledWith('metronome_box');
            expect($('#metronome_bpm').val()).toBe('120');
            expect($('#increase_tempo_after').prop('disabled')).toBe(true);

            // Invalid non-numeric BPM prevents submission
            $('#metronome_bpm').val('abc');
            $('#metronome_ok').trigger('click');
            expect(onOk).not.toHaveBeenCalled();

            // Out-of-range BPM gets clamped to min or max and prevents immediate submission
            $('#metronome_bpm').val('5');
            $('#metronome_ok').trigger('click');
            expect($('#metronome_bpm').val()).toBe('10');
            expect(onOk).not.toHaveBeenCalled();

            $('#metronome_bpm').val('999');
            $('#metronome_ok').trigger('click');
            expect($('#metronome_bpm').val()).toBe('500');
            expect(onOk).not.toHaveBeenCalled();

            // Valid BPM + empty beats/subBeats use defaults (4 and 0), enable both auto-increase (seconds) and auto-decrease (bars)
            $('#metronome_bpm').val('132');
            $('#metronome_main_beats').val('');
            $('#metronome_sub_beats').val('');
            $('#increase_tempo_enabled').prop('checked', true).trigger('change');
            expect($('#increase_tempo_after').prop('disabled')).toBe(false);
            $('#increase_tempo_after').val('15');
            $('input[name="increase_tempo_unit"][value="seconds"]').prop('checked', true);
            $('#increase_tempo_bpm').val('8');
            $('#increase_tempo_max').val('180');

            $('#decrease_tempo_enabled').prop('checked', true).trigger('change');
            expect($('#decrease_tempo_after').prop('disabled')).toBe(false);
            $('#decrease_tempo_after').val('2');
            $('input[name="decrease_tempo_unit"][value="bars"]').prop('checked', true);
            $('#decrease_tempo_bpm').val('4');
            $('#decrease_tempo_min').val('90');

            $('#metronome_ok').trigger('click');
            expect(onOk).toHaveBeenCalledTimes(1);
            const result: MetronomeOptions = onOk.mock.calls[0]![0];
            expect(result.bpm).toBe(132);
            expect(result.beats).toBe(4);
            expect(result.subBeats).toBe(0);
            expect(result.automaticIncrease).toBe(true);
            expect(result.increaseAfterSeconds).toBe(15);
            expect(result.increaseAfterBars).toBe(0);
            expect(result.increaseBpm).toBe(8);
            expect(result.increaseMaxBpm).toBe(180);
            expect(result.automaticDecrease).toBe(true);
            expect(result.decreaseAfterBars).toBe(2);
            expect(result.decreaseAfterSeconds).toBe(0);
            expect(result.decreaseBpm).toBe(4);
            expect(result.decreaseMinBpm).toBe(90);

            // Cancel button clears popbox without invoking callback
            const onCancel = vi.fn();
            box.show(defaultOpts(), onCancel);
            $('#metronome_cancel').trigger('click');
            expect(instances[1]!.clear).toHaveBeenCalledTimes(1);
            expect(onCancel).not.toHaveBeenCalled();
        });

        it('supports keypad, adjustment keys, keyboard arrows, PageDown, and tap tempo', () => {
            let nowMs = 1000;
            const { factory } = createMockPopboxFactory();
            const box = new MetronomeBox(factory, () => nowMs);
            box.show(defaultOpts(), vi.fn());

            const bpmInput = $('#metronome_bpm');
            const inputEl = bpmInput[0] as HTMLInputElement;
            bpmInput.trigger('focus');

            // Select all -> pressing '9' replaces value with '9'
            inputEl.setSelectionRange(0, inputEl.value.length);
            $('#metronome_keypad .keypad_key').filter((_, el) => $(el).text() === '9').trigger('click');
            expect(inputEl.value).toBe('9');

            // Append '5' -> '95'
            $('#metronome_keypad .keypad_key').filter((_, el) => $(el).text() === '5').trigger('click');
            expect(inputEl.value).toBe('95');

            // Backspace -> '9'
            $('#metronome_keypad .keypad_key').filter((_, el) => $(el).text() === 'BS').trigger('click');
            expect(inputEl.value).toBe('9');

            // Adjustment key +10 -> 19
            $('#metronome_adj_keys .adj_key[adj="10"]').trigger('click');
            expect(inputEl.value).toBe('19');

            // Factor key 200% -> 38
            $('#metronome_adj_keys .adj_key[factor="2"]').trigger('click');
            expect(inputEl.value).toBe('38');

            // Keyboard ArrowUp / PageUp / ArrowDown / PageDown
            bpmInput.trigger($.Event('keydown', { code: 'ArrowUp' }));
            expect(bpmInput.val()).toBe('39');
            bpmInput.trigger($.Event('keydown', { code: 'PageUp' }));
            expect(bpmInput.val()).toBe('49');
            bpmInput.trigger($.Event('keydown', { code: 'ArrowDown' }));
            expect(bpmInput.val()).toBe('48');
            bpmInput.trigger($.Event('keydown', { code: 'PageDown' }));
            expect(bpmInput.val()).toBe('38');

            // Tap tempo: 500ms apart -> 120 BPM
            $('#metronome_tap').trigger('click');
            nowMs = 1500;
            $('#metronome_tap').trigger('click');
            expect(bpmInput.val()).toBe('120');

            // Debounce (<50ms) does not alter BPM
            nowMs = 1520;
            $('#metronome_tap').trigger('click');
            expect(bpmInput.val()).toBe('120');

            // Closing popbox resets tap history so next tap alone does not change BPM
            $('#metronome_box').trigger('popbox_closing');
            nowMs = 2000;
            $('#metronome_tap').trigger('click');
            expect(bpmInput.val()).toBe('120');
        });
    });

    describe('MidiOutputBox', () => {
        it('populates device options, pre-selects active device, and saves selection on OK', () => {
            const { factory, instances } = createMockPopboxFactory();
            const devA = { name: 'Piano A' } as WebMidi.MIDIOutput;
            const devB = { name: 'Synth B' } as WebMidi.MIDIOutput;

            const selector = {
                getDevices: () => [devA, devB],
                selectDevice: vi.fn(),
            };
            const outputManager = {
                getMidiOut: () => devB,
            };

            const box = new MidiOutputBox(selector, outputManager, factory);
            box.open();

            expect(instances[0]!.open).toHaveBeenCalledWith('midi_output_box');
            const options = $('#midi_output_select option');
            expect(options).toHaveLength(2);
            expect($('#midi_output_select').val()).toBe('Synth B');

            $('#midi_output_select').val('Piano A');
            $('#midi_output_ok').trigger('click');
            expect(selector.selectDevice).toHaveBeenCalledWith('Piano A');
            expect(instances[0]!.clear).toHaveBeenCalledTimes(1);
        });
    });
});
