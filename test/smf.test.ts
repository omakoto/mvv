import { describe, it, expect, vi } from 'vitest';
import {
    BytesReader,
    BytesWriter,
    MidiEvent,
    SmfReader,
    SmfWriter,
    TickConverter,
    loadMidi,
} from '../src/smf.js';

describe('smf', () => {
    describe('MidiEvent', () => {
        it('exposes status, channel, data accessors, and type flags', () => {
            const noteOn = new MidiEvent(100, [0x92, 60, 100], 'MyKeyboard');
            expect(noteOn.timestamp).toBe(100);
            expect(noteOn.device).toBe('MyKeyboard');
            expect(noteOn.status).toBe(0x90);
            expect(noteOn.channel).toBe(2);
            expect(noteOn.data0).toBe(0x92);
            expect(noteOn.data1).toBe(60);
            expect(noteOn.data2).toBe(100);
            expect(noteOn.isNoteOn).toBe(true);
            expect(noteOn.isNoteOff).toBe(false);
            expect(noteOn.isCC).toBe(false);

            const noteOffByVel0 = new MidiEvent(150, [0x92, 60, 0]);
            expect(noteOffByVel0.device).toBe('unknown-device');
            expect(noteOffByVel0.isNoteOn).toBe(false);
            expect(noteOffByVel0.isNoteOff).toBe(true);

            const noteOff = new MidiEvent(160, [0x82, 60, 64]);
            expect(noteOff.isNoteOff).toBe(true);

            const cc = new MidiEvent(170, [0xB0, 64, 127]);
            expect(cc.isCC).toBe(true);
        });

        it('constructs from native WebMIDI event', () => {
            const nativeEvent = {
                timeStamp: 123.45,
                data: new Uint8Array([0x90, 64, 80]),
                currentTarget: { name: 'Digital Piano' },
            } as unknown as WebMidi.MIDIMessageEvent;

            const ev = MidiEvent.fromNativeEvent(nativeEvent);
            expect(ev.timestamp).toBe(123.45);
            expect(ev.device).toBe('Digital Piano');
            expect(ev.data1).toBe(64);
            expect(ev.data2).toBe(80);
        });

        it('clones data independently for both Array and Uint8Array', () => {
            const evArr = new MidiEvent(10, [0x90, 60, 100], 'dev');
            const arrClone = evArr.clone();
            arrClone.replaceData(1, 62);
            expect(evArr.data1).toBe(60);
            expect(arrClone.data1).toBe(62);

            const evTyped = new MidiEvent(20, new Uint8Array([0x90, 60, 100]), 'dev');
            const typedClone = evTyped.clone();
            typedClone.replaceData(2, 50);
            expect(evTyped.data2).toBe(100);
            expect(typedClone.data2).toBe(50);
            expect(typedClone.getDataAsArray()).toBeInstanceOf(Uint8Array);
        });

        it('handles withTimestamp, shiftTime clamping, clearChannel, and bounds checks', () => {
            const ev = new MidiEvent(50, [0x95, 60, 100]);
            const shifted = ev.withTimestamp(200);
            expect(shifted.timestamp).toBe(200);
            expect(ev.timestamp).toBe(50);

            ev.shiftTime(-30);
            expect(ev.timestamp).toBe(20);
            ev.shiftTime(-100);
            expect(ev.timestamp).toBe(0);

            ev.clearChannel();
            expect(ev.channel).toBe(0);
            expect(ev.status).toBe(0x90);

            expect(ev.getData(5)).toBe(0);
            expect(() => ev.getData(-1)).toThrow(RangeError);
            expect(() => ev.replaceData(-1, 0)).toThrow(RangeError);
            expect(() => ev.replaceData(3, 0)).toThrow(RangeError);
        });

        it('describes all MIDI event types and formats toString', () => {
            expect(new MidiEvent(0, []).describeMidiEvent()).toBe('[Empty MIDI Event]');
            expect(new MidiEvent(0, [0x90, 60, 100]).describeMidiEvent())
                .toBe('Note On (ch:1) [Note: 60, Vel: 100]');
            expect(new MidiEvent(0, [0x81, 60, 0]).describeMidiEvent())
                .toBe('Note Off (ch:2) [Note: 60, Vel: 0]');
            expect(new MidiEvent(0, [0xB0, 64, 127]).describeMidiEvent())
                .toBe('Control Change (ch:1) [Damper Pedal (Sustain): 127]');
            expect(new MidiEvent(0, [0xB0, 99, 42]).describeMidiEvent())
                .toBe('Control Change (ch:1) [CC #99: 42]');
            // Center pitch bend: LSB=0, MSB=64 -> ((64 << 7) | 0) - 8192 = 0
            expect(new MidiEvent(0, [0xE0, 0x00, 0x40]).describeMidiEvent())
                .toBe('Pitch Bend Change (ch:1) [Value: 0]');
            expect(new MidiEvent(0, [0xA0, 60, 70]).describeMidiEvent())
                .toBe('Polyphonic Key Pressure (ch:1) [Note: 60, Pressure: 70]');
            expect(new MidiEvent(0, [0xD0, 88]).describeMidiEvent())
                .toBe('Channel Pressure (ch:1) [Pressure: 88]');
            expect(new MidiEvent(0, [0xC0, 5]).describeMidiEvent())
                .toBe('Program Change (ch:1) [Program: 5]');
            expect(new MidiEvent(0, [0xF8]).describeMidiEvent())
                .toBe('[Unknown Event:F8] (ch:9) []');

            expect(new MidiEvent(12.3456, [0x90, 60, 100]).toString())
                .toBe('time=12.345, data=90 3C 64: Note On (ch:1) [Note: 60, Vel: 100]');
        });
    });

    describe('BytesWriter and BytesReader', () => {
        it('round-trips U8, U16, U24, U32 and expands buffer capacity dynamically', () => {
            const writer = new BytesWriter(4); // small initial cap to force resize
            writer
                .writeU8(0xAB)
                .writeU16(0x1234)
                .writeU24(0x56789A)
                .writeU32(0x1BCDEF01);

            const bytes = writer.getBytes();
            expect(writer.getSize()).toBe(10);

            const reader = new BytesReader(bytes);
            expect(reader.readU8()).toBe(0xAB);
            expect(reader.readU16()).toBe(0x1234);
            expect(reader.readU24()).toBe(0x56789A);
            expect(reader.readU32()).toBe(0x1BCDEF01);
            expect(reader.getPos()).toBe(10);
            expect(() => reader.readU8()).toThrow('Reading after EOF');

            reader.startOver();
            expect(reader.getPos()).toBe(0);
            reader.skip(3);
            expect(reader.getPos()).toBe(3);
        });

        it('round-trips MIDI Variable Length Quantities across 1..4 byte boundaries', () => {
            const values = [0, 1, 127, 128, 255, 16383, 16384, 2097151, 2097152, 0x0FFFFFFF];
            const writer = new BytesWriter();
            for (const v of values) {
                writer.writeVar(v);
            }

            const reader = new BytesReader(writer.getBytes());
            for (const expected of values) {
                expect(reader.readVar()).toBe(expected);
            }

            expect(() => writer.writeVar(-1)).toThrow(RangeError);
        });
    });

    describe('TickConverter', () => {
        it('converts ticks using default 120 BPM (500,000 us/beat)', () => {
            const tc = new TickConverter(480);
            expect(tc.getTime(0)).toBe(0);
            expect(tc.getTime(480)).toBe(500);
            expect(tc.getTime(960)).toBe(1000);
            expect(() => tc.getTime(-1)).toThrow(RangeError);
        });

        it('handles multiple tempo changes accurately', () => {
            const tc = new TickConverter(480);
            // 0..480 at 120 BPM (500ms per 480 ticks) -> 500ms at tick 480
            // 480..960 at 60 BPM (1000ms per 480 ticks) -> 1500ms at tick 960
            // 960..1440 at 240 BPM (250ms per 480 ticks) -> 1750ms at tick 1440
            tc.setTempo(480, 1_000_000);
            tc.setTempo(960, 250_000);

            expect(tc.getTime(240)).toBe(250);
            expect(tc.getTime(480)).toBe(500);
            expect(tc.getTime(720)).toBe(1000);
            expect(tc.getTime(960)).toBe(1500);
            expect(tc.getTime(1440)).toBe(1750);
        });
    });

    describe('SmfWriter, SmfReader, and loadMidi', () => {
        it('round-trips MIDI events through SmfWriter and loadMidi', async () => {
            const writer = new SmfWriter();
            writer.writeMessage(0, [0x90, 60, 100]);
            writer.writeMessage(250, [0xB0, 64, 127]);
            writer.writeMessage(250, [0x80, 60, 0]);
            writer.writeMessage(500, [0xE0, 0x00, 0x50]);

            // Idempotent close
            writer.close();
            writer.close();

            const blob = writer.getBlob();
            expect(blob.type).toBe('audio/mid');

            const events = await loadMidi(blob);
            // Includes the 3 reset CC messages at t=0 written by SmfWriter plus our 4 events
            const noteEvents = events.filter(e => e.isNoteOn || e.isNoteOff);
            expect(noteEvents).toHaveLength(2);
            expect(noteEvents[0]!.timestamp).toBe(0);
            expect(noteEvents[0]!.data1).toBe(60);
            expect(noteEvents[0]!.data2).toBe(100);
            expect(noteEvents[1]!.timestamp).toBe(500);
            expect(noteEvents[1]!.isNoteOff).toBe(true);

            const sustain = events.find(e => e.isCC && e.data1 === 64);
            expect(sustain?.timestamp).toBe(250);
            expect(sustain?.data2).toBe(127);

            const pitchBend = events.find(e => e.status === 0xE0);
            expect(pitchBend?.timestamp).toBe(1000);
            expect(pitchBend?.data2).toBe(0x50);
        });

        it('parses Format 1 multi-track files, running status, SysEx, Meta, and anchors first Note On to t=0', () => {
            const w = new BytesWriter();
            // Header: Format 1, 2 tracks, 500 TPB (at 120 BPM = 1ms per tick!)
            w.writeU32(0x4D546864).writeU32(6).writeU16(1).writeU16(2).writeU16(500);

            // Track 1: Tempo (120 BPM), arbitrary meta text, SysEx, Program Change (ignored), Channel Pressure (1 byte), End of track
            const t1 = new BytesWriter();
            t1.writeVar(0).writeU8(0xFF).writeU8(0x51).writeU8(0x03).writeU24(500_000); // 120 BPM
            t1.writeVar(0).writeU8(0xFF).writeU8(0x01).writeVar(2).writeU8(0x41).writeU8(0x42); // Text "AB"
            t1.writeVar(0).writeU8(0xF0).writeVar(2).writeU8(0x7E).writeU8(0xF7); // SysEx
            t1.writeVar(100).writeU8(0xC0).writeU8(10); // Program change -> ignored
            t1.writeVar(500).writeU8(0xD0).writeU8(77); // Channel pressure at tick 600
            t1.writeVar(0).writeU8(0xFF).writeU8(0x2F).writeU8(0x00); // End of track

            w.writeU32(0x4D54726B).writeU32(t1.getSize());
            for (const b of t1.getBytes()) w.writeU8(b);

            // Track 2: Note On at tick 500, running-status Note On at tick 700, running-status Note Off (vel 0) at tick 900
            const t2 = new BytesWriter();
            t2.writeVar(500).writeU8(0x90).writeU8(60).writeU8(90);
            t2.writeVar(200).writeU8(64).writeU8(85); // running status 0x90
            t2.writeVar(200).writeU8(60).writeU8(0);  // running status 0x90 vel=0 (Note Off)
            t2.writeVar(0).writeU8(0xFF).writeU8(0x2F).writeU8(0x00);

            w.writeU32(0x4D54726B).writeU32(t2.getSize());
            for (const b of t2.getBytes()) w.writeU8(b);

            const reader = new SmfReader(w.getBytes());
            const events = reader.getEvents();
            // Calling getEvents() a second time returns cached results
            expect(reader.getEvents()).toBe(events);

            // First Note On was at 500ms -> shifted to 0ms
            // Channel pressure at 600ms -> shifted to 100ms
            // Second Note On at 700ms -> shifted to 200ms
            // Note Off at 900ms -> shifted to 400ms
            expect(events.map(e => [e.timestamp, e.status, e.data1, e.data2])).toEqual([
                [0, 0x90, 60, 90],
                [100, 0xD0, 77, 0],
                [200, 0x90, 64, 85],
                [400, 0x90, 60, 0],
            ]);
        });

        it('rejects invalid headers, unsupported formats, SMPTE timing, and invalid running status', async () => {
            // Invalid magic header
            expect(() => new SmfReader(new Uint8Array([0, 0, 0, 0])).getEvents()).toThrow(/Unexpected byte/);

            // Invalid SMF format type = 3
            const badType = new BytesWriter();
            badType.writeU32(0x4D546864).writeU32(6).writeU16(3).writeU16(1).writeU16(480);
            expect(() => new SmfReader(badType.getBytes()).getEvents()).toThrow('Invalid file format: 3');

            // SMPTE division (>= 0x8000)
            const smpte = new BytesWriter();
            smpte.writeU32(0x4D546864).writeU32(6).writeU16(0).writeU16(1).writeU16(0x8000);
            expect(() => new SmfReader(smpte.getBytes()).getEvents()).toThrow('SMPTE time format not supported');

            // Running status before any status byte
            const badRunning = new BytesWriter();
            badRunning.writeU32(0x4D546864).writeU32(6).writeU16(0).writeU16(1).writeU16(480);
            badRunning.writeU32(0x4D54726B).writeU32(4).writeVar(0).writeU8(0x40).writeU8(0x40).writeU8(0x00);
            expect(() => new SmfReader(badRunning.getBytes()).getEvents()).toThrow('Invalid running status');

            // loadMidi propagates parse error
            const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
            await expect(loadMidi(new Blob([new Uint8Array([1, 2, 3, 4])]))).rejects.toThrow();
            expect(errSpy).toHaveBeenCalled();
        });
    });
});
