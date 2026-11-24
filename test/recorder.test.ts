import { describe, it, expect, vi, afterEach } from 'vitest';
import { AlwaysRecorder, Recorder, RecorderState, recordFilter } from '../src/recorder.js';
import { MidiEvent, SmfReader } from '../src/smf.js';

function noteOn(ts: number, note: number, velocity = 100, channel = 0): MidiEvent {
    return new MidiEvent(ts, [0x90 | channel, note, velocity]);
}

function noteOff(ts: number, note: number, channel = 0): MidiEvent {
    return new MidiEvent(ts, [0x80 | channel, note, 0]);
}

function cc(ts: number, controller: number, value: number, channel = 0): MidiEvent {
    return new MidiEvent(ts, [0xB0 | channel, controller, value]);
}

describe('recordFilter', () => {
    it('accepts channel voice events except program change and rejects system messages', () => {
        expect(recordFilter(new MidiEvent(0, [0x80, 60, 0]))).toBe(true);
        expect(recordFilter(new MidiEvent(0, [0x90, 60, 100]))).toBe(true);
        expect(recordFilter(new MidiEvent(0, [0xA0, 60, 50]))).toBe(true);
        expect(recordFilter(new MidiEvent(0, [0xB0, 64, 127]))).toBe(true);
        expect(recordFilter(new MidiEvent(0, [0xC0, 1]))).toBe(false); // Program change ignored
        expect(recordFilter(new MidiEvent(0, [0xD0, 50]))).toBe(true);
        expect(recordFilter(new MidiEvent(0, [0xE0, 0, 64]))).toBe(true);
        expect(recordFilter(new MidiEvent(0, [0xF8]))).toBe(false);
        expect(recordFilter(new MidiEvent(0, [0xFE]))).toBe(false);
    });
});

describe('AlwaysRecorder', () => {
    it('filters events, prunes events older than maxSeconds, and clears', () => {
        let nowMs = 10_000;
        const ar = new AlwaysRecorder({ now: () => nowMs, maxSeconds: 5, maxEvents: 100 });

        expect(ar.isAvailable).toBe(false);
        ar.recordEvent(new MidiEvent(10_000, [0xC0, 1])); // filtered out
        expect(ar.isAvailable).toBe(false);

        ar.recordEvent(noteOn(10_000, 60));
        ar.recordEvent(noteOn(12_000, 64));
        expect(ar.isAvailable).toBe(true);
        expect(ar.getEvents()).toHaveLength(2);

        // Advance clock to 16_000 -> cutoff is 11_000 -> first event at 10_000 is pruned
        nowMs = 16_000;
        ar.recordEvent(noteOn(16_000, 67));
        expect(ar.getEvents().map(e => e.data1)).toEqual([64, 67]);

        ar.clear();
        expect(ar.isAvailable).toBe(false);
        expect(ar.getEvents()).toHaveLength(0);
    });

    it('trims oldest quarter when maxEvents is exceeded', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const ar = new AlwaysRecorder({ now: () => 1000, maxSeconds: 60, maxEvents: 8 });
        for (let i = 0; i < 9; i++) {
            ar.recordEvent(noteOn(1000 + i, 40 + i));
        }
        // 9 > 8 -> splices 8 / 4 = 2 oldest events -> 7 remain
        expect(ar.getEvents()).toHaveLength(7);
        expect(ar.getEvents()[0]!.data1).toBe(42);
    });
});

describe('Recorder', () => {
    afterEach(() => {
        vi.useRealTimers();
    });

    it('enforces state machine transitions for recording, playing, pausing, and stopping', () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const states: RecorderState[] = [];
        const onStartAnimationLoop = vi.fn();
        const onResetMidi = vi.fn();
        const onPlaybackTimer = vi.fn();

        const rec = new Recorder({
            onStatusChanged: (s) => states.push(s),
            onStartAnimationLoop,
            onResetMidi,
            onPlaybackTimer,
            playbackResolutionMs: 10,
        });

        expect(rec.isIdle).toBe(true);
        expect(rec.stopRecording()).toBe(false);
        expect(rec.stopPlaying()).toBe(false);
        expect(rec.pause()).toBe(false);
        expect(rec.unpause()).toBe(false);
        expect(rec.startPlaying()).toBe(false); // Nothing recorded yet

        // Record two events
        expect(rec.startRecording()).toBe(true);
        expect(rec.startRecording()).toBe(false); // Already recording
        expect(rec.recordEvent(noteOn(5000, 60, 100))).toBe(true);
        expect(rec.recordEvent(new MidiEvent(5050, [0xC0, 2]))).toBe(false); // Filtered
        expect(rec.recordEvent(noteOff(5500, 60))).toBe(true);
        expect(rec.stopRecording()).toBe(true);

        expect(rec.isIdle).toBe(true);
        expect(rec.isDirty).toBe(true);
        expect(rec.lastEventTimestamp).toBe(500);
        expect(rec.recordEvent(noteOn(6000, 62))).toBe(false); // Not recording

        // Play -> timer ticks -> pause -> unpause -> stop
        expect(rec.startPlaying()).toBe(true);
        expect(rec.isPlaying).toBe(true);
        expect(onStartAnimationLoop).toHaveBeenCalledTimes(1);

        vi.advanceTimersByTime(25);
        expect(onPlaybackTimer).toHaveBeenCalledTimes(2);

        expect(rec.pause()).toBe(true);
        expect(rec.isPausing).toBe(true);
        vi.advanceTimersByTime(30);
        expect(onPlaybackTimer).toHaveBeenCalledTimes(2); // Timer stopped while paused

        expect(rec.unpause()).toBe(true);
        expect(rec.isPlaying).toBe(true);
        vi.advanceTimersByTime(10);
        expect(onPlaybackTimer).toHaveBeenCalledTimes(3);

        expect(rec.stopPlaying()).toBe(true);
        expect(rec.isIdle).toBe(true);
        expect(onResetMidi).toHaveBeenCalledTimes(1);

        expect(states).toEqual([
            RecorderState.Recording,
            RecorderState.Idle,
            RecorderState.Playing,
            RecorderState.Pausing,
            RecorderState.Playing,
            RecorderState.Idle,
        ]);

        vi.useRealTimers();
    });

    it('plays back events incrementally and stops automatically 5s after the last event', () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const played: MidiEvent[] = [];
        const onNoteChanged = vi.fn();

        const rec = new Recorder({
            onPlaybackMidiEvent: (ev) => played.push(ev),
            onNoteChanged,
        });

        rec.setEvents([
            noteOn(0, 60, 90),
            cc(100, 64, 127),
            noteOff(200, 60),
        ]);

        rec.startPlaying();

        // Advance 50ms -> dispatches noteOn at 0
        rec.playbackUpToNow(50);
        expect(played.map(e => e.timestamp)).toEqual([0]);
        expect(onNoteChanged).toHaveBeenCalledTimes(1);

        // Advance 100ms (to 150ms) -> dispatches CC at 100 (not a note -> no onNoteChanged)
        rec.playbackUpToNow(100);
        expect(played.map(e => e.timestamp)).toEqual([0, 100]);
        expect(onNoteChanged).toHaveBeenCalledTimes(1);

        // Advance 100ms (to 250ms) -> dispatches noteOff at 200
        rec.playbackUpToNow(100);
        expect(played.map(e => e.timestamp)).toEqual([0, 100, 200]);
        expect(onNoteChanged).toHaveBeenCalledTimes(2);
        expect(rec.isPlaying).toBe(true);

        // Still playing within 5000ms tail after lastEventTimestamp (200 + 5000 = 5200)
        rec.playbackUpToNow(4900); // -> 5150ms
        expect(rec.isPlaying).toBe(true);

        // Crosses 5200ms limit -> automatically stops
        rec.playbackUpToNow(100); // -> 5250ms
        expect(rec.isIdle).toBe(true);

        vi.useRealTimers();
    });

    it('replays latest non-note controller states when seeking and preserves playing state', () => {
        vi.useFakeTimers();
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const replayed: MidiEvent[] = [];
        const onResetMidi = vi.fn();

        const rec = new Recorder({
            onResetMidi,
            onPlaybackMidiEvent: (ev) => replayed.push(ev),
        });

        rec.setEvents([
            noteOn(0, 60, 100),
            cc(100, 64, 60),             // damper 60 (will be superseded)
            cc(200, 64, 127),            // damper 127 (latest before 500)
            cc(250, 66, 80),             // sostenuto 80
            new MidiEvent(300, [0xE0, 0, 80]), // pitch bend
            noteOff(400, 60),
            cc(600, 64, 0),              // after seek target -> must NOT be replayed
            noteOn(1000, 64, 90),
        ]);

        // Start playing, then seek -> pauses during seek and resumes playing afterward
        rec.startPlaying();
        replayed.length = 0;
        onResetMidi.mockClear();

        rec.adjustPlaybackPosition(500);
        expect(onResetMidi).toHaveBeenCalledTimes(1);
        expect(rec.currentPlaybackTimestamp).toBe(500);
        expect(rec.isPlaying).toBe(true);

        // Only the latest CC64 (127), CC66 (80), and pitch bend (0xE0) before 500ms
        expect(replayed.map(e => [e.status, e.data1, e.data2])).toEqual([
            [0xB0, 64, 127],
            [0xB0, 66, 80],
            [0xE0, 0, 80],
        ]);

        // Clamps above lastEventTimestamp and below 0
        rec.adjustPlaybackPosition(99_999);
        expect(rec.currentPlaybackTimestamp).toBe(1000);
        rec.moveToStart();
        expect(rec.currentPlaybackTimestamp).toBe(0);
        expect(rec.isBeginning).toBe(true);
        rec.stopPlaying();
    });

    it('detects sections separated by >1500ms silence and navigates next/previous sections', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const rec = new Recorder();

        rec.setEvents([
            // Section 1: t=100..600 (held overlapping notes do not split)
            noteOn(100, 60, 100),
            noteOn(200, 64, 100),
            noteOff(300, 60),
            noteOff(600, 64),
            // Gap of 1000ms (<= 1500ms) -> still Section 1
            noteOn(1600, 67, 100),
            noteOff(2000, 67),
            // Gap of 2000ms (> 1500ms) -> Section 2 starts at 4000
            noteOn(4000, 72, 100),
            noteOff(4500, 72),
            // Gap of 2500ms (> 1500ms) -> Section 3 starts at 7000
            noteOn(7000, 76, 100),
            noteOff(7500, 76),
        ]);

        expect(rec.sections).toEqual([100, 4000, 7000]);

        // Jump next from 0 -> 100 -> 4000 -> 7000 -> stays at 7000
        rec.jumpToNextSection();
        expect(rec.currentPlaybackTimestamp).toBe(100);
        rec.jumpToNextSection();
        expect(rec.currentPlaybackTimestamp).toBe(4000);
        rec.jumpToNextSection();
        expect(rec.currentPlaybackTimestamp).toBe(7000);
        rec.jumpToNextSection();
        expect(rec.currentPlaybackTimestamp).toBe(7000);

        // Move past threshold (7000 + 600 = 7600, clamped to 7500 -> delta 500 >= 500) -> jumps to current section start (7000)
        rec.adjustPlaybackPosition(500);
        expect(rec.currentPlaybackTimestamp).toBe(7500);
        rec.jumpToPreviousSection();
        expect(rec.currentPlaybackTimestamp).toBe(7000);

        // Within 500ms of section 3 start -> jumps to section 2 (4000)
        rec.jumpToPreviousSection();
        expect(rec.currentPlaybackTimestamp).toBe(4000);

        // Within 500ms of section 2 start -> jumps to section 1 (100)
        rec.jumpToPreviousSection();
        expect(rec.currentPlaybackTimestamp).toBe(100);

        // Before first section -> moves to start (0)
        rec.adjustPlaybackPosition(-50); // t=50
        rec.jumpToPreviousSection();
        expect(rec.currentPlaybackTimestamp).toBe(0);
    });

    it('trims events before current playback position and re-normalizes timestamps', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const rec = new Recorder();

        rec.setEvents([
            noteOn(0, 60, 100),
            noteOff(500, 60),
            noteOn(3000, 64, 90),
            noteOff(3500, 64),
        ]);

        // At t=0 nothing is trimmed
        rec.trimBefore();
        expect(rec.getEvents()).toHaveLength(4);

        // Seek to t=2000 and trim -> first remaining event at 3000 shifts to 0
        rec.adjustPlaybackPosition(2000);
        rec.trimBefore();

        expect(rec.isDirty).toBe(true);
        expect(rec.currentPlaybackTimestamp).toBe(0);
        expect(rec.lastEventTimestamp).toBe(500);
        expect(rec.getEvents().map(e => [e.timestamp, e.data1])).toEqual([
            [0, 64],
            [500, 64],
        ]);
        expect(rec.sections).toEqual([0]);
    });

    it('copies events from AlwaysRecorder including empty and short (<3s) buffers', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const rec = new Recorder();

        // Empty AlwaysRecorder does nothing
        const emptyAr = new AlwaysRecorder({ now: () => 20_000 });
        rec.copyFromAlwaysRecorder(emptyAr);
        expect(rec.isAnythingRecorded).toBe(false);

        // Buffer shorter than 3s clamps position to 0
        const shortAr = new AlwaysRecorder({ now: () => 20_000 });
        shortAr.recordEvent(noteOn(10_000, 60, 90));
        shortAr.recordEvent(noteOff(11_000, 60));
        rec.copyFromAlwaysRecorder(shortAr);
        expect(rec.currentPlaybackTimestamp).toBe(0);

        // Buffer longer than 3s positions 3s before end
        const ar = new AlwaysRecorder({ now: () => 20_000 });
        ar.recordEvent(noteOn(10_000, 60, 90));
        ar.recordEvent(noteOff(15_000, 60));

        rec.copyFromAlwaysRecorder(ar);
        expect(rec.isPausing).toBe(true);
        expect(rec.isDirty).toBe(true);
        expect(rec.lastEventTimestamp).toBe(5000);
        expect(rec.currentPlaybackTimestamp).toBe(2000); // 5000 - 3000

        // setEvents([]) clears events and sections
        rec.setEvents([]);
        expect(rec.isAnythingRecorded).toBe(false);
        expect(rec.lastEventTimestamp).toBe(0);
        expect(rec.sections).toEqual([]);
    });

    it('exports recorded and empty events to valid SMF via buildSmf()', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const rec = new Recorder();

        // Empty recorder produces a valid SMF with no note events
        const emptyParsed = new SmfReader(rec.buildSmf().getBytes()).getEvents();
        expect(emptyParsed.filter(e => e.isNoteOn || e.isNoteOff)).toHaveLength(0);

        rec.setEvents([
            noteOn(0, 60, 100),
            noteOff(400, 60),
        ]);

        const bytes = rec.buildSmf().getBytes();
        const parsed = new SmfReader(bytes).getEvents();
        const notes = parsed.filter(e => e.isNoteOn || e.isNoteOff);
        expect(notes).toHaveLength(2);
        expect(notes[0]!.timestamp).toBe(0);
        expect(notes[0]!.data1).toBe(60);
        expect(notes[1]!.timestamp).toBe(400);
    });
});
