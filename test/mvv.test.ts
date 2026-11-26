// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { bindDomEvents, initWebMidi, loadMidiFile, setupMidiAccess } from '../src/app-wiring.js';
import { SmfWriter } from '../src/smf.js';
import { setupMvvDom } from './helpers/dom-setup.js';

describe('app-wiring', () => {
    const originalRequestMIDIAccess = (navigator as any).requestMIDIAccess;

    beforeEach(() => {
        setupMvvDom();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        $(window).off();
        $(document).off();
        $('body').off();
    });

    afterEach(() => {
        $(window).off();
        $(document).off();
        $('body').off();
        (navigator as any).requestMIDIAccess = originalRequestMIDIAccess;
        vi.useRealTimers();
    });

    describe('setupMidiAccess and initWebMidi', () => {
        it('binds connected inputs, clears disconnected inputs, and passes outputs to selector', async () => {
            const onMidiMessage = vi.fn();
            const setDevices = vi.fn();

            const connectedInput: any = { name: 'Piano In', state: 'connected', onmidimessage: null };
            const disconnectedInput: any = { name: 'Old In', state: 'disconnected', onmidimessage: vi.fn() };
            const outputA: any = { name: 'Synth Out', state: 'connected' };

            const midiAccess: any = {
                inputs: new Map([['1', connectedInput], ['2', disconnectedInput]]),
                outputs: new Map([['o1', outputA]]),
                onstatechange: null,
            };

            setupMidiAccess(midiAccess, { onMidiMessage }, { setDevices });
            expect(disconnectedInput.onmidimessage).toBeNull();
            expect(typeof connectedInput.onmidimessage).toBe('function');
            expect(setDevices).toHaveBeenCalledWith([outputA]);

            // Incoming WebMIDI event forwards to coordinator
            connectedInput.onmidimessage({
                timeStamp: 123,
                data: new Uint8Array([0x90, 60, 100]),
                currentTarget: connectedInput,
            });
            expect(onMidiMessage).toHaveBeenCalledTimes(1);
            expect(onMidiMessage.mock.calls[0]![0].data1).toBe(60);

            // initWebMidi wires onstatechange for hot-plug refresh
            (navigator as any).requestMIDIAccess = vi.fn().mockResolvedValue(midiAccess);
            const notifyError = vi.fn();
            await initWebMidi({ onMidiMessage }, { setDevices }, notifyError);
            expect(notifyError).not.toHaveBeenCalled();

            setDevices.mockClear();
            midiAccess.onstatechange({ port: { name: 'Synth Out', state: 'connected' } });
            expect(setDevices).toHaveBeenCalledTimes(1);
        });

        it('notifies user when WebMIDI is unavailable or denied', async () => {
            const notifyError = vi.fn();
            delete (navigator as any).requestMIDIAccess;
            await initWebMidi({ onMidiMessage: vi.fn() }, { setDevices: vi.fn() }, notifyError);
            expect(notifyError).toHaveBeenCalledWith(expect.stringContaining("doesn't support WebMIDI"));

            notifyError.mockClear();
            (navigator as any).requestMIDIAccess = vi.fn().mockRejectedValue(new Error('denied'));
            await initWebMidi({ onMidiMessage: vi.fn() }, { setDevices: vi.fn() }, notifyError);
            expect(notifyError).toHaveBeenCalledWith('Could not access your MIDI devices.');
        });
    });

    describe('loadMidiFile', () => {
        it('loads valid SMF files and reports errors for corrupt files', async () => {
            const wr = new SmfWriter();
            wr.writeMessage(0, [0x90, 60, 100]);
            wr.writeMessage(200, [0x80, 60, 0]);
            const file = new File([wr.getBytes()], 'song.mid', { type: 'audio/mid' });

            const coordinator = { reset: vi.fn(), updateUi: vi.fn() };
            const recorder = { setEvents: vi.fn() };

            await loadMidiFile(file, coordinator, recorder);
            expect(coordinator.reset).toHaveBeenCalledTimes(1);
            expect(recorder.setEvents).toHaveBeenCalledTimes(1);
            expect(coordinator.updateUi).toHaveBeenCalledTimes(1);

            // Corrupt file reports status message without throwing
            vi.spyOn(console, 'error').mockImplementation(() => {});
            const badFile = new File([new Uint8Array([1, 2, 3])], 'broken.mid');
            await loadMidiFile(badFile, coordinator, recorder);
            expect($('#status').text()).toContain('Failed loading from broken.mid');
        });
    });

    describe('bindDomEvents', () => {
        it('wires load focus, low-perf mask, beforeunload dirty guard, pagehide, drop, and clicks', () => {
            vi.useFakeTimers();
            const coordinator = {
                onMidiMessage: vi.fn(),
                onKeyDown: vi.fn(),
                reset: vi.fn(),
                updateUi: vi.fn(),
                withOverwriteConfirm: vi.fn((_msg: string, cb: () => void) => cb()),
                extendWakelock: vi.fn(),
                toggleFullScreen: vi.fn(),
                toggleHelpScreen: vi.fn(),
                close: vi.fn(),
            };
            const recorder = { isDirty: false, setEvents: vi.fn() };
            const openUrl = vi.fn();

            bindDomEvents({
                coordinator,
                recorder,
                runtimeConfig: { lowPerfMode: true, scale: 1, playbackResolutionMs: 16.6 },
                openUrl,
            });

            // Load focuses body (requiring tabindex="-1" on <body>) and enables low-perf mask
            $(window).trigger('load');
            expect(document.activeElement).toBe(document.body);
            expect($('#bottom_mask').css('display')).toBe('none');
            expect($('#bottom_mask_opaque').css('display')).toBe('block');

            // beforeunload only prevents unload when recording is dirty
            const cleanOrig: any = { preventDefault: vi.fn(), returnValue: undefined };
            const cleanEv = $.Event('beforeunload', { originalEvent: cleanOrig });
            $(window).trigger(cleanEv);
            expect(cleanEv.isDefaultPrevented()).toBe(false);

            recorder.isDirty = true;
            const dirtyOrig: any = { preventDefault: vi.fn(), returnValue: undefined };
            const dirtyEv = $.Event('beforeunload', { originalEvent: dirtyOrig });
            $(window).trigger(dirtyEv);
            expect(dirtyEv.isDefaultPrevented()).toBe(true);
            expect(dirtyOrig.preventDefault).toHaveBeenCalledTimes(1);
            expect(dirtyOrig.returnValue).toBe('');

            // pagehide closes coordinator
            $(window).trigger('pagehide');
            expect(coordinator.close).toHaveBeenCalledTimes(1);

            // Non-file drop is ignored safely
            const emptyDrop = $.Event('drop', {
                originalEvent: { preventDefault: vi.fn(), dataTransfer: { files: [] } },
            });
            $('body').trigger(emptyDrop);
            expect(coordinator.withOverwriteConfirm).not.toHaveBeenCalled();

            // Click handlers
            $('#fullscreen').trigger('click');
            $('#source').trigger('click');
            $('#help_close').trigger('click');
            expect(coordinator.toggleFullScreen).toHaveBeenCalledTimes(1);
            expect(openUrl).toHaveBeenCalledWith('https://github.com/omakoto/mvv', 'source');
            expect(coordinator.toggleHelpScreen).toHaveBeenCalledTimes(1);

            // Mousemove shows cursor then hides after 3s
            $('body').trigger('mousemove');
            expect($('body').css('cursor')).toBe('default');
            expect(coordinator.extendWakelock).toHaveBeenCalledTimes(1);
            vi.advanceTimersByTime(3000);
            expect($('body').css('cursor')).toBe('none');
        });
    });
});
