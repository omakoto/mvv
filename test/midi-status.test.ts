import { describe, it, expect, vi } from 'vitest';
import { MidiRenderingNoteStatus, MidiRenderingStatus } from '../src/midi-status.js';
import { MidiEvent } from '../src/smf.js';

describe('MidiRenderingNoteStatus', () => {
    it('initializes reset state and creates independent copies', () => {
        const status = new MidiRenderingNoteStatus();
        expect(status.noteOn).toBe(false);
        expect(status.velocity).toBe(0);
        expect(status.onTick).toBe(-99999);

        status.noteOn = true;
        status.note = 60;
        status.velocity = 110;
        status.onTick = 5;

        const clone = status.copy();
        expect(clone).not.toBe(status);
        expect(clone.note).toBe(60);
        expect(clone.velocity).toBe(110);

        clone.noteOn = false;
        expect(status.noteOn).toBe(true);
    });
});

describe('MidiRenderingStatus', () => {
    it('tracks note on/off, timestamps, tick counts, and activity callback', () => {
        let nowMs = 1000;
        const onActivity = vi.fn();
        const status = new MidiRenderingStatus({ onActivity, now: () => nowMs });

        status.onMidiMessage(new MidiEvent(0, [0x90, 60, 100]));
        expect(onActivity).toHaveBeenCalledTimes(1);
        expect(status.onNoteCountInTick).toBe(1);
        expect(status.getNote(60).noteOn).toBe(true);
        expect(status.getNote(60).velocity).toBe(100);
        expect(status.getNote(60).onTime).toBe(1000);
        expect(status.isJustPressed(60)).toBe(true);

        // Duplicate note-on for same key is ignored
        status.onMidiMessage(new MidiEvent(5, [0x90, 60, 120]));
        expect(status.onNoteCountInTick).toBe(1);
        expect(status.getNote(60).velocity).toBe(100);

        // Advance draw tick
        status.afterDraw(1016);
        expect(status.currentTick).toBe(1);
        expect(status.onNoteCountInTick).toBe(0);
        expect(status.isJustPressed(60)).toBe(false);

        // Note off via velocity-0 note-on
        nowMs = 1200;
        status.onMidiMessage(new MidiEvent(200, [0x90, 60, 0]));
        expect(status.offNoteCountInTick).toBe(1);
        expect(status.getNote(60).offTime).toBe(1200);

        // Duplicate note-off is ignored
        status.onMidiMessage(new MidiEvent(210, [0x80, 60, 0]));
        expect(status.offNoteCountInTick).toBe(1);
    });

    it('keeps zero-length notes visible for SHORTEST_NOTE_LENGTH ticks', () => {
        const status = new MidiRenderingStatus({ now: () => 500 });

        // Press and immediately release on tick 0
        status.onMidiMessage(new MidiEvent(0, [0x90, 64, 90]));
        status.onMidiMessage(new MidiEvent(0, [0x80, 64, 0]));

        // Still visible on tick 0 and tick 1 (SHORTEST_NOTE_LENGTH === 1)
        expect(status.isJustPressed(64)).toBe(true);
        expect(status.getNote(64).noteOn).toBe(true);
        expect(status.getPressedNotes().map(n => n.note)).toEqual([64]);
        expect(status.needsAnimation()).toBe(true);

        status.afterDraw(16); // tick 1
        expect(status.getNote(64).noteOn).toBe(true);
        expect(status.needsAnimation()).toBe(true);

        status.afterDraw(32); // tick 2 -> elapsed (2 - 0 = 2 > 1)
        expect(status.getNote(64).noteOn).toBe(false);
        expect(status.getPressedNotes()).toEqual([]);
        expect(status.needsAnimation()).toBe(false);
        expect(status.getLastNoteOffAgeTick(64)).toBe(2);
    });

    it('tracks damper (CC 64), expression (CC 11), and sostenuto (CC 66) pedals and resets cleanly', () => {
        const status = new MidiRenderingStatus();

        status.onMidiMessage(new MidiEvent(0, [0xB0, 64, 127]));
        expect(status.damperPedal).toBe(127);

        status.onMidiMessage(new MidiEvent(10, [0xB0, 11, 80]));
        expect(status.damperPedal).toBe(80);

        status.onMidiMessage(new MidiEvent(20, [0xB0, 66, 95]));
        expect(status.sostenuto).toBe(95);

        // Unrelated CC does not change pedals
        status.onMidiMessage(new MidiEvent(30, [0xB0, 7, 50]));
        expect(status.damperPedal).toBe(80);
        expect(status.sostenuto).toBe(95);

        status.reset();
        expect(status.damperPedal).toBe(0);
        expect(status.sostenuto).toBe(0);
        expect(status.currentTick).toBe(0);
        expect(status.getPressedNotes()).toEqual([]);
    });
});
