// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { Coordinator } from '../src/coordinator.js';
import { MidiRenderingStatus } from '../src/midi-status.js';
import { MidiOutputManager } from '../src/midi-output.js';
import { Metronome, MetronomeOptions } from '../src/metronome.js';
import { AlwaysRecorder, Recorder } from '../src/recorder.js';
import { Renderer } from '../src/renderer.js';
import { AudioProcessor } from '../src/audio-processor.js';
import { MidiEvent } from '../src/smf.js';
import { DEFAULT_PLAY_SPEED_INDEX, WAKE_LOCK_MILLIS } from '../src/config.js';
import { setDebug } from '../src/util.js';
import { installMockCanvasContexts, setupMvvDom } from './helpers/dom-setup.js';

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
    const map = new Map<string, string>(Object.entries(initial));
    return {
        get length() { return map.size; },
        clear: () => map.clear(),
        getItem: (key: string) => map.get(key) ?? null,
        key: (index: number) => Array.from(map.keys())[index] ?? null,
        removeItem: (key: string) => { map.delete(key); },
        setItem: (key: string, value: string) => { map.set(key, value); },
    };
}

describe('Coordinator', () => {
    let nowMs: number;
    let storage: Storage;
    let status: MidiRenderingStatus;
    let outputManager: MidiOutputManager;
    let metronome: Metronome;
    let alwaysRecorder: AlwaysRecorder;
    let recorder: Recorder;
    let renderer: Renderer;
    let audioProcessor: AudioProcessor;
    let controlsMock: { update: Mock<() => void>; updateTimestamp: Mock<() => void> };
    let saveAsBoxMock: { open: Mock<() => void> };
    let confirmBoxMock: { show: Mock<(text: string, cb: () => void) => void> };
    let metronomeBoxMock: { show: Mock<(options: MetronomeOptions, cb: (options: MetronomeOptions) => void) => void> };
    let midiOutputBoxMock: { open: Mock<() => void> };
    let coordinator: Coordinator;
    let rafCallbacks: Array<FrameRequestCallback>;
    const originalWakeLock = (navigator as any).wakeLock;

    beforeEach(() => {
        setupMvvDom();
        installMockCanvasContexts();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        setDebug(false);

        nowMs = 1000;
        storage = createMemoryStorage();
        status = new MidiRenderingStatus({ now: () => nowMs });
        outputManager = new MidiOutputManager();
        metronome = new Metronome({ now: () => nowMs });
        alwaysRecorder = new AlwaysRecorder({ now: () => nowMs });
        recorder = new Recorder();
        renderer = new Renderer({
            status,
            scale: 1,
            screenWidth: 400,
            screenHeight: 200,
        });
        audioProcessor = new AudioProcessor();

        controlsMock = { update: vi.fn<() => void>(), updateTimestamp: vi.fn<() => void>() };
        saveAsBoxMock = { open: vi.fn<() => void>() };
        confirmBoxMock = { show: vi.fn<(text: string, cb: () => void) => void>((_text, cb) => cb()) };
        metronomeBoxMock = { show: vi.fn<(options: MetronomeOptions, cb: (options: MetronomeOptions) => void) => void>() };
        midiOutputBoxMock = { open: vi.fn<() => void>() };

        rafCallbacks = [];
        vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
            rafCallbacks.push(cb);
            return rafCallbacks.length;
        });
        vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});

        coordinator = new Coordinator({
            renderer,
            midiRenderingStatus: status,
            midiOutputManager: outputManager,
            metronome,
            alwaysRecorder,
            recorder,
            audioProcessor,
            controls: controlsMock,
            saveAsBox: saveAsBoxMock,
            confirmBox: confirmBoxMock,
            metronomeBox: metronomeBoxMock,
            midiOutputBox: midiOutputBoxMock,
            scale: 1,
            storage,
            now: () => nowMs,
        });

        recorder.setCallbacks({
            onStatusChanged: (state) => coordinator.onRecorderStatusChanged(state),
            onStartAnimationLoop: () => coordinator.startAnimationLoop(),
            onResetMidi: () => coordinator.resetMidi(),
            onPlaybackMidiEvent: (ev) => {
                status.onMidiMessage(ev);
                outputManager.sendEvent(ev.getDataAsArray(), 0);
            },
            onNoteChanged: () => coordinator.updateNoteInformation(),
        });
    });

    afterEach(() => {
        coordinator.close();
        (navigator as any).wakeLock = originalWakeLock;
        vi.useRealTimers();
    });

    it('loads settings from storage and persists setting changes', () => {
        const preloadedStorage = createMemoryStorage({
            [Coordinator.STORAGE_KEY_USE_SHARP]: 'false',
            [Coordinator.STORAGE_KEY_SHOW_VLINES]: 'false',
            [Coordinator.STORAGE_KEY_SHOW_NOTE_NAMES]: 'false',
            [Coordinator.STORAGE_KEY_SCROLL_SPEED]: '2',
            [Coordinator.STORAGE_KEY_PLAY_SPEED]: '5',
            [Coordinator.STORAGE_KEY_NOTE_OFF_LINES]: 'false',
        });

        const c = new Coordinator({
            renderer,
            midiRenderingStatus: status,
            midiOutputManager: outputManager,
            metronome,
            alwaysRecorder,
            recorder,
            audioProcessor,
            storage: preloadedStorage,
            scale: 1,
        });

        expect(c.isSharpMode).toBe(false);
        expect(c.isShowingOctaveLines).toBe(false);
        expect(c.isShowingNoteNames).toBe(false);
        expect(c.scrollSpeedIndex).toBe(2);
        expect(c.playSpeedIndex).toBe(5);
        expect(c.playSpeedFactor).toBe(4);
        expect(c.isShowingNoteOffLines).toBe(false);

        c.setSharpMode(true);
        expect(preloadedStorage.getItem(Coordinator.STORAGE_KEY_USE_SHARP)).toBe('true');

        c.rotateScrollSpeed();
        expect(c.scrollSpeedIndex).toBe(3);
        expect(preloadedStorage.getItem(Coordinator.STORAGE_KEY_SCROLL_SPEED)).toBe('3');

        c.shiftPlaySpeed(10);
        expect(c.playSpeedIndex).toBe(6);
        c.resetPlaySpeed();
        expect(c.playSpeedIndex).toBe(DEFAULT_PLAY_SPEED_INDEX);
    });

    it('handles keyboard shortcuts and blocks them while help screen is open', () => {
        const key = (code: string, extra: Partial<KeyboardEventInit> = {}) =>
            new KeyboardEvent('keydown', { code, cancelable: true, ...extra });

        // Open help with '?'
        const helpEv = key('Slash', { key: '?' });
        coordinator.onKeyDown(helpEv);
        expect(coordinator.isHelpVisible).toBe(true);
        expect(helpEv.defaultPrevented).toBe(true);

        // Shortcuts are blocked while help is open
        const beforeSharp = coordinator.isSharpMode;
        coordinator.onKeyDown(key('Digit2'));
        expect(coordinator.isSharpMode).toBe(beforeSharp);

        // Escape closes help
        coordinator.onKeyDown(key('Escape'));
        expect(coordinator.isHelpVisible).toBe(false);

        // Modified keys are ignored
        coordinator.onKeyDown(key('Digit2', { ctrlKey: true }));
        expect(coordinator.isSharpMode).toBe(beforeSharp);

        // Normal shortcuts execute and preventDefault
        const d2 = key('Digit2');
        coordinator.onKeyDown(d2);
        expect(coordinator.isSharpMode).toBe(!beforeSharp);
        expect(d2.defaultPrevented).toBe(true);

        coordinator.onKeyDown(key('Digit4'));
        expect(coordinator.scrollSpeedIndex).toBe(1);

        coordinator.onKeyDown(key('ArrowUp'));
        expect(coordinator.playSpeedIndex).toBe(DEFAULT_PLAY_SPEED_INDEX + 1);

        coordinator.onKeyDown(key('Digit0'));
        expect(coordinator.playSpeedIndex).toBe(DEFAULT_PLAY_SPEED_INDEX);

        coordinator.onKeyDown(key('KeyD'));
        expect(midiOutputBoxMock.open).toHaveBeenCalledTimes(1);

        coordinator.onKeyDown(key('KeyS'));
        expect(saveAsBoxMock.open).toHaveBeenCalledTimes(1);

        const adjustTempoSpy = vi.spyOn(metronome, 'adjustTempo');
        coordinator.onKeyDown(key('Equal'));
        coordinator.onKeyDown(key('Equal', { key: '+', shiftKey: true }));
        coordinator.onKeyDown(key('Minus'));
        expect(adjustTempoSpy).toHaveBeenNthCalledWith(1, 5);
        expect(adjustTempoSpy).toHaveBeenNthCalledWith(2, 5);
        expect(adjustTempoSpy).toHaveBeenNthCalledWith(3, -5);

        const audioToggleSpy = vi.spyOn(audioProcessor, 'toggle').mockImplementation(() => {});
        coordinator.onKeyDown(key('KeyI'));
        expect(audioToggleSpy).toHaveBeenCalledTimes(1);
    });

    it('falls back safely when localStorage contains corrupt JSON or out-of-range indices', () => {
        const badStorage = createMemoryStorage({
            [Coordinator.STORAGE_KEY_SCROLL_SPEED]: '999',
            [Coordinator.STORAGE_KEY_PLAY_SPEED]: 'not-a-number',
            [Coordinator.STORAGE_KEY_METRONOME_OPTIONS]: '{corrupt-json',
        });

        const c = new Coordinator({
            renderer,
            midiRenderingStatus: status,
            midiOutputManager: outputManager,
            metronome,
            alwaysRecorder,
            recorder,
            audioProcessor,
            storage: badStorage,
            scale: 1,
        });

        expect(c.scrollSpeedIndex).toBe(0);
        expect(c.playSpeedIndex).toBe(DEFAULT_PLAY_SPEED_INDEX);
        c.close();
    });

    it('refreshes held note names when sharp/flat mode changes or 50ms highlight expires', () => {
        coordinator.onMidiMessage(new MidiEvent(100, [0x90, 61, 100])); // C#4
        expect($('#notes').html()).toContain('C#4');
        expect($('#notes').html()).toContain('notes_highlight');

        // Switch to flat while C#4 is still held -> updates immediately to Db4
        coordinator.setSharpMode(false);
        coordinator.updateUi();
        expect($('#notes').html()).toContain('Db4');

        // Advance past 50ms highlight window -> highlight class clears on next update
        nowMs += 100;
        coordinator.updateNoteInformation();
        expect($('#notes').html()).not.toContain('notes_highlight');
    });

    it('filters active sensing/clock, normalizes V25 knobs, records, and renders note & chord HTML', () => {
        // Ignored system realtime messages
        coordinator.onMidiMessage(new MidiEvent(0, [254]));
        coordinator.onMidiMessage(new MidiEvent(0, [248]));
        expect(alwaysRecorder.isAvailable).toBe(false);

        // V25 knob CC 20 -> damper CC 64, CC 21 -> sostenuto CC 66
        coordinator.onMidiMessage(new MidiEvent(10, [176, 20, 127], 'V25 MIDI 1'));
        coordinator.onMidiMessage(new MidiEvent(20, [176, 21, 90], 'V25 MIDI 1'));
        expect(status.damperPedal).toBe(127);
        expect(status.sostenuto).toBe(90);

        // Start recording and play C major triad (C4, E4, G4)
        coordinator.startRecording();
        coordinator.onMidiMessage(new MidiEvent(100, [0x90, 60, 100]));
        coordinator.onMidiMessage(new MidiEvent(110, [0x90, 64, 100]));
        coordinator.onMidiMessage(new MidiEvent(120, [0x90, 67, 100]));

        expect(recorder.getEvents()).toHaveLength(3);
        expect($('#notes').html()).toContain('C4');
        expect($('#notes').html()).toContain('E4');
        expect($('#notes').html()).toContain('G4');
        expect($('#notes').html()).toContain('notes_highlight');
        expect($('#chords').html()).toContain('CM');
    });

    it('simulates zero-length note-offs when simulateZeroLengthNotes is enabled', () => {
        coordinator.setSimulateZeroLengthNotes(true);
        coordinator.onMidiMessage(new MidiEvent(100, [0x90, 60, 100]));
        // Both Note On and simulated Note Off recorded in alwaysRecorder
        expect(alwaysRecorder.getEvents()).toHaveLength(2);
        expect(alwaysRecorder.getEvents()[0]!.isNoteOn).toBe(true);
        expect(alwaysRecorder.getEvents()[1]!.isNoteOff).toBe(true);
    });

    it('blocks playback when no MIDI output device is selected and plays scaled by playSpeedFactor when selected', () => {
        vi.useFakeTimers();
        recorder.setEvents([
            new MidiEvent(0, [0x90, 60, 100]),
            new MidiEvent(1000, [0x80, 60, 0]),
        ]);

        // No output device -> cannot start playback
        coordinator.togglePlayback();
        expect(recorder.isIdle).toBe(true);
        expect($('#status').text()).toBe('No MIDI output device selected');

        // Select output device -> playback works at 2x speed
        const mockSend = vi.fn();
        outputManager.setMidiOut({ name: 'Synth', send: mockSend } as unknown as WebMidi.MIDIOutput);
        mockSend.mockClear();

        coordinator.shiftPlaySpeed(1); // 2x
        coordinator.togglePlayback();
        expect(recorder.isPlaying).toBe(true);

        // Advance clock by 600ms -> at 2x speed playback advances 1200ms (past both events)
        nowMs += 600;
        coordinator.onPlaybackTimer();
        expect(mockSend).toHaveBeenCalledWith([0x90, 60, 100], 0);
        expect(mockSend).toHaveBeenCalledWith([0x80, 60, 0], 0);
        expect(controlsMock.updateTimestamp).toHaveBeenCalled();

        // Even if MIDI output disconnects mid-playback, Space / togglePlayback can still pause,
        // while unpausing stays blocked until an output device is selected again.
        outputManager.clearMidiOut();
        coordinator.togglePlayback();
        expect(recorder.isPausing).toBe(true);
        coordinator.togglePlayback();
        expect(recorder.isPausing).toBe(true);
        coordinator.pause();
        expect(recorder.isPausing).toBe(true);

        coordinator.stop();
        expect(recorder.isIdle).toBe(true);
    });

    it('prompts confirmBox when recording is dirty and skips prompt when clean', () => {
        const callback = vi.fn();
        // Clean -> invokes immediately without confirmBox
        coordinator.withOverwriteConfirm('Action.', callback);
        expect(confirmBoxMock.show).not.toHaveBeenCalled();
        expect(callback).toHaveBeenCalledTimes(1);

        // Make recorder dirty
        recorder.startRecording();
        recorder.recordEvent(new MidiEvent(0, [0x90, 60, 100]));
        recorder.stopRecording();

        const callback2 = vi.fn();
        coordinator.withOverwriteConfirm('Action.', callback2);
        expect(confirmBoxMock.show).toHaveBeenCalledWith('Action. Discard current recording?', expect.any(Function));
        expect(callback2).toHaveBeenCalledTimes(1);
    });

    it('manages animation loop start/stop without first-frame FPS flash and deduplicates wake lock requests', async () => {
        coordinator.startAnimationLoop();
        expect(coordinator.isAnimating).toBe(true);
        expect(rafCallbacks.length).toBeGreaterThan(0);
        expect($('#fps').text()).not.toBe('Animation stopped');

        coordinator.stopAnimationLoop();
        expect(coordinator.isAnimating).toBe(false);
        expect($('#fps').text()).toBe('Animation stopped');

        vi.useFakeTimers();
        const release = vi.fn().mockResolvedValue(undefined);
        const addEventListener = vi.fn();
        let resolveLock!: (sentinel: any) => void;
        (navigator as any).wakeLock = {
            request: vi.fn(() => new Promise((res) => { resolveLock = res; })),
        };

        // Concurrent extendWakelock calls only acquire a single WakeLockSentinel
        const p1 = coordinator.extendWakelock();
        const p2 = coordinator.extendWakelock();
        expect((navigator as any).wakeLock.request).toHaveBeenCalledTimes(1);
        resolveLock({ release, addEventListener });
        await Promise.all([p1, p2]);

        vi.advanceTimersByTime(WAKE_LOCK_MILLIS);
        expect(release).toHaveBeenCalledTimes(1);

        // close() releases active wake lock
        const p3 = coordinator.extendWakelock();
        resolveLock({ release, addEventListener });
        await p3;
        coordinator.close();
        expect(release).toHaveBeenCalledTimes(2);
    });

    it('steps RAF loop, auto-stops when idle, and handles repeat/rewind/trim/replay shortcuts', () => {
        // Freeze roll and advance past SHORTEST_NOTE_LENGTH so animation stops cleanly on next frame
        renderer.toggleRollFrozen();
        status.afterDraw(1000);
        status.afterDraw(1010);

        coordinator.startAnimationLoop();
        expect(coordinator.isAnimating).toBe(true);
        expect(rafCallbacks).toHaveLength(1);

        // Next RAF frame (past FPS_TO_MILLIS) sees needsAnimation === false -> stops loop
        rafCallbacks[0]!(1050);
        expect(coordinator.isAnimating).toBe(false);

        // Key repeat is ignored for non-repeating shortcuts like Digit2
        const beforeSharp = coordinator.isSharpMode;
        coordinator.onKeyDown(new KeyboardEvent('keydown', { code: 'Digit2', repeat: true, cancelable: true }));
        expect(coordinator.isSharpMode).toBe(beforeSharp);

        // Populate AlwaysRecorder and replay into Recorder via KeyB
        coordinator.onMidiMessage(new MidiEvent(10_000, [0x90, 60, 100]));
        coordinator.onMidiMessage(new MidiEvent(14_000, [0x80, 60, 0]));
        coordinator.onKeyDown(new KeyboardEvent('keydown', { code: 'KeyB', cancelable: true }));
        expect(recorder.isAnythingRecorded).toBe(true);
        expect(recorder.currentPlaybackTimestamp).toBe(1000); // 4000 - 3000

        // Rewind to beginning, verify repeated ArrowLeft locks at beginning
        const adjustSpy = vi.spyOn(recorder, 'adjustPlaybackPosition');
        coordinator.onKeyDown(new KeyboardEvent('keydown', { code: 'ArrowLeft', repeat: false, cancelable: true }));
        expect(recorder.isBeginning).toBe(true);
        adjustSpy.mockClear();
        coordinator.onKeyDown(new KeyboardEvent('keydown', { code: 'ArrowLeft', repeat: true, cancelable: true }));
        expect(adjustSpy).not.toHaveBeenCalled();

        // Seek forward and trim via KeyX
        coordinator.moveToTime(2000);
        confirmBoxMock.show.mockClear();
        coordinator.onKeyDown(new KeyboardEvent('keydown', { code: 'KeyX', cancelable: true }));
        expect(confirmBoxMock.show).toHaveBeenCalledWith('Trim recording before current position?', expect.any(Function));
        expect(recorder.getEvents()).toHaveLength(1);
    });

    it('opens metronome dialog when stopped and saves options + starts metronome on OK', () => {
        const startSpy = vi.spyOn(metronome, 'start').mockImplementation(() => {});
        const stopSpy = vi.spyOn(metronome, 'stop').mockImplementation(() => {});

        metronomeBoxMock.show.mockImplementation((opts: MetronomeOptions, cb: (o: MetronomeOptions) => void) => {
            const updated = opts.copy();
            updated.bpm = 144;
            cb(updated);
        });

        coordinator.toggleMetronome();
        expect(startSpy).toHaveBeenCalledTimes(1);
        expect(JSON.parse(storage.getItem(Coordinator.STORAGE_KEY_METRONOME_OPTIONS)!).bpm).toBe(144);

        vi.spyOn(metronome, 'isPlaying', 'get').mockReturnValue(true);
        coordinator.toggleMetronome();
        expect(stopSpy).toHaveBeenCalledTimes(1);
    });
});
