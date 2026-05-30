/**
 * @file smf.ts
 * @description Provides a parser and generator for Standard MIDI Files (SMF, Format 0).
 * Implements TickConverter for absolute timeline mapping, MidiEvent description formatting,
 * and robust binary reading/writing structures.
 */

// SMF Format: https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html
// https://www.music.mcgill.ca/~gary/306/week9/smf.html
// https://midimusic.github.io/tech/midispec.html

'use strict';

import { debug } from './util.js';

const MIDI_COMMANDS: Record<number, string> = {
    0x8: 'Note Off',
    0x9: 'Note On',
    0xA: 'Polyphonic Key Pressure', // (Aftertouch)
    0xB: 'Control Change',
    0xC: 'Program Change',
    0xD: 'Channel Pressure', // (Aftertouch)
    0xE: 'Pitch Bend Change'
};

// --- MIDI Control Change Names ---
const MIDI_CONTROL_CHANGE: Record<number, string> = {
    0: 'Bank Select',
    1: 'Modulation',
    2: 'Breath Controller',
    4: 'Foot Controller',
    5: 'Portamento Time',
    6: 'Data Entry MSB',
    7: 'Channel Volume',
    8: 'Balance',
    10: 'Pan',
    11: 'Expression Controller',
    12: 'Effect Control 1',
    13: 'Effect Control 2',
    16: 'General Purpose Controller 1',
    17: 'General Purpose Controller 2',
    18: 'General Purpose Controller 3',
    19: 'General Purpose Controller 4',
    64: 'Damper Pedal (Sustain)',
    65: 'Portamento On/Off',
    66: 'Sostenuto',
    67: 'Soft Pedal',
    68: 'Legato Footswitch',
    69: 'Hold 2',
    70: 'Sound Controller 1 (Sound Variation)',
    71: 'Sound Controller 2 (Timbre/Harmonic Content)',
    72: 'Sound Controller 3 (Release Time)',
    73: 'Sound Controller 4 (Attack Time)',
    74: 'Sound Controller 5 (Brightness)',
    84: 'Portamento Control',
    91: 'Effects 1 Depth (Reverb)',
    93: 'Effects 3 Depth (Chorus)',
    121: 'Reset All Controllers',
    123: 'All Notes Off'
};

/**
 * Converts a byte number to a padded 2-character hex string.
 */
function byteToHex(byte: number, uppercase = true): string {
    const hex = ("0" + byte.toString(16)).slice(-2);
    return uppercase ? hex.toUpperCase() : hex;
}

export class MidiEvent {
    #timestamp: number;
    #data: Array<number> | Uint8Array;
    #device: string;

    constructor(timestamp: number, data: Array<number> | Uint8Array, device?: string) {
        this.#timestamp = timestamp;
        this.#data = data;
        this.#device = device ?? "unknown-device";
    }

    static fromNativeEvent(e: WebMidi.MIDIMessageEvent): MidiEvent {
        return new MidiEvent(e.timeStamp, e.data, (e.currentTarget as WebMidi.MIDIPort).name);
    }

    clone(): MidiEvent {
        const dataCopy = Array.isArray(this.#data)
            ? [...this.#data]
            : new Uint8Array(this.#data);
        return new MidiEvent(this.#timestamp, dataCopy, this.#device);
    }

    withTimestamp(timestamp: number): MidiEvent {
        return new MidiEvent(timestamp, this.#data, this.#device);
    }

    get timestamp(): number {
        return this.#timestamp;
    }

    shiftTime(millisecond: number): void {
        this.#timestamp = Math.max(0, this.#timestamp + millisecond);
    }

    get device(): string {
        return this.#device;
    }

    getData(index: number): number {
        if (index < 0) {
            throw new RangeError("Index cannot be negative");
        }
        if (index >= this.#data.length) {
            return 0;
        }
        return this.#data[index]!;
    }

    replaceData(index: number, value: number): void {
        if (index < 0) {
            throw new RangeError("Index cannot be negative");
        }
        if (index >= this.#data.length) {
            throw new RangeError("Index out of range");
        }
        this.#data[index] = value;
    }

    clearChannel(): void {
        this.#data[0] = this.data0 & 0xf0;
    }

    get status(): number {
        return this.data0 & 0xf0;
    }

    get channel(): number {
        return this.data0 & 0x0f;
    }

    get data0(): number {
        return this.getData(0);
    }

    get data1(): number {
        return this.getData(1);
    }

    get data2(): number {
        return this.getData(2);
    }

    get isNoteOn(): boolean {
        return this.status === 0x90 && this.data2 > 0;
    }

    get isNoteOff(): boolean {
        return this.status === 0x80 || (this.status === 0x90 && this.data2 === 0);
    }

    get isCC(): boolean {
        return this.status === 0xB0;
    }

    getDataAsArray(): Array<number> | Uint8Array {
        return this.#data;
    }

    toString(): string {
        const formattedTime = (Math.floor(this.timestamp * 1000) / 1000).toFixed(3);
        const hexString = Array.from(this.#data).map(byte => byteToHex(byte)).join(' ');
        const description = this.describeMidiEvent();

        return `time=${formattedTime}, data=${hexString}: ${description}`;
    }

    describeMidiEvent(): string {
        const data = this.#data;
        const statusByte = data[0];
        if (statusByte === undefined) {
            return "[Empty MIDI Event]";
        }

        const commandByte = statusByte >> 4;
        const channel = (statusByte & 0x0f) + 1;
        const eventName = MIDI_COMMANDS[commandByte] || `[Unknown Event:${byteToHex(statusByte)}]`;

        let details = '';

        switch (commandByte) {
            case 0x9: // Note On
            case 0x8: { // Note Off
                const note = data[1] ?? 0;
                const velocity = data[2] ?? 0;
                details = `Note: ${note}, Vel: ${velocity}`;
                break;
            }
            case 0xB: { // Control Change
                const controllerNumber = data[1] ?? 0;
                const controllerValue = data[2] ?? 0;
                const controllerName = MIDI_CONTROL_CHANGE[controllerNumber] || `CC #${controllerNumber}`;
                details = `${controllerName}: ${controllerValue}`;
                break;
            }
            case 0xE: { // Pitch Bend
                // Combine two 7-bit bytes into a 14-bit value. Center is 8192.
                const val1 = data[1] ?? 0;
                const val2 = data[2] ?? 0;
                const pitchValue = ((val2 << 7) | val1) - 8192;
                details = `Value: ${pitchValue}`;
                break;
            }
            case 0xA: { // Polyphonic Key Pressure (Note Aftertouch)
                const pressureNote = data[1] ?? 0;
                const pressureValue = data[2] ?? 0;
                details = `Note: ${pressureNote}, Pressure: ${pressureValue}`;
                break;
            }
            case 0xD: { // Channel Pressure (Channel Aftertouch)
                const channelPressure = data[1] ?? 0;
                details = `Pressure: ${channelPressure}`;
                break;
            }
            case 0xC: { // Program Change
                const programNum = data[1] ?? 0;
                details = `Program: ${programNum}`;
                break;
            }
        }
        return `${eventName} (ch:${channel}) [${details}]`;
    }
}

const TICKS_PER_SECOND = 1000;

class BytesWriter {
    #cap: number;
    #size = 0;
    #buf: Uint8Array;

    constructor(initialCapacity = 4096) {
        this.#cap = initialCapacity;
        this.#buf = new Uint8Array(this.#cap);
    }

    writeVar(value: number): this {
        if (value < 0) {
            throw new RangeError("Value must be non-negative.");
        }
        const buffer: number[] = [];
        do {
            buffer.push(value & 0x7F);
            value >>= 7;
        } while (value > 0);

        while (buffer.length > 1) {
            this.writeU8(buffer.pop()! | 0x80);
        }
        this.writeU8(buffer.pop()!);
        return this;
    }

    writeU8(val: number): this {
        this.setU8(this.#size, val);
        this.#size += 1;
        return this;
    }

    writeU16(val: number): this {
        this.setU16(this.#size, val);
        this.#size += 2;
        return this;
    }

    writeU24(val: number): this {
        this.setU24(this.#size, val);
        this.#size += 3;
        return this;
    }

    writeU32(val: number): this {
        this.setU32(this.#size, val);
        this.#size += 4;
        return this;
    }

    setU8(pos: number, val: number): this {
        this.#ensureCap(pos + 1);
        this.#buf[pos] = val & 255;
        return this;
    }

    setU16(pos: number, val: number): this {
        this.#ensureCap(pos + 2);
        this.#buf[pos] = (val >> 8) & 255;
        this.#buf[pos + 1] = val & 255;
        return this;
    }

    setU24(pos: number, val: number): this {
        this.#ensureCap(pos + 3);
        this.#buf[pos] = (val >> 16) & 255;
        this.#buf[pos + 1] = (val >> 8) & 255;
        this.#buf[pos + 2] = val & 255;
        return this;
    }

    setU32(pos: number, val: number): this {
        this.#ensureCap(pos + 4);
        this.#buf[pos] = (val >> 24) & 255;
        this.#buf[pos + 1] = (val >> 16) & 255;
        this.#buf[pos + 2] = (val >> 8) & 255;
        this.#buf[pos + 3] = val & 255;
        return this;
    }

    #ensureCap(requiredCap: number): void {
        if (this.#cap >= requiredCap) {
            return;
        }
        let newCap = this.#cap;
        while (newCap < requiredCap) {
            newCap *= 2;
        }
        this.#cap = newCap;
        const newBuf = new Uint8Array(this.#cap);
        newBuf.set(this.#buf);
        this.#buf = newBuf;
    }

    getSize(): number {
        return this.#size;
    }

    getBlob(contentType: string): Blob {
        return new Blob([this.#buf.subarray(0, this.#size)], { type: contentType });
    }
}

class BytesReader {
    readonly #buffer: Uint8Array;
    #pos = 0;

    constructor(ar: Uint8Array) {
        this.#buffer = ar;
    }

    readU8(): number {
        if (this.#buffer.length <= this.#pos) {
            throw new Error("Reading after EOF");
        }
        return this.#buffer[this.#pos++]!;
    }

    readU16(): number {
        return (this.readU8() << 8) + this.readU8();
    }

    readU24(): number {
        return (this.readU16() << 8) + this.readU8();
    }

    readU32(): number {
        return (this.readU16() << 16) + this.readU16();
    }

    getPos(): number {
        return this.#pos;
    }

    readVar(): number {
        let value = 0;
        let byte: number;
        do {
            byte = this.readU8();
            value = (value << 7) | (byte & 0x7F);
        } while ((byte & 0x80) !== 0);
        return value;
    }

    skip(nbytes: number): void {
        this.#pos += nbytes;
    }

    startOver(): void {
        this.#pos = 0;
    }
}

class TempoEvent {
    constructor(
        public readonly ticks: number,
        public readonly mspb: number,
        public readonly timeOffset: number
    ) {}
}

/**
 * Converts "ticks" (absolute ticks from the start of the MIDI file) to milliseconds.
 */
class TickConverter {
    readonly #ticksPerBeat: number;
    readonly #tempos: TempoEvent[] = [];
    #lastTempoEvent: TempoEvent;

    constructor(ticksPerBeat: number) {
        this.#ticksPerBeat = ticksPerBeat;

        // Start with an arbitrary initial tempo of 120 BPM (500,000 microseconds per beat)
        this.#lastTempoEvent = new TempoEvent(0, 500_000, 0);
        this.#tempos.push(this.#lastTempoEvent);
    }

    #ticksToMilliseconds(ticks: number, mspb: number): number {
        return ((ticks / this.#ticksPerBeat) * mspb) / 1000;
    }

    setTempo(ticks: number, microsecondsPerBeat: number): void {
        const last = this.#lastTempoEvent;
        const deltaTicks = ticks - last.ticks;
        const deltaTimeOffset = this.#ticksToMilliseconds(deltaTicks, last.mspb);
        const timeOffset = last.timeOffset + deltaTimeOffset;

        this.#lastTempoEvent = new TempoEvent(ticks, microsecondsPerBeat, timeOffset);
        this.#tempos.push(this.#lastTempoEvent);
    }

    /**
     * Converts a absolute MIDI tick number to milliseconds.
     */
    getTime(ticks: number): number {
        if (ticks < 0) {
            throw new RangeError("ticks must not be negative");
        }
        
        let nearestTempo = this.#tempos[0]!;
        for (const t of this.#tempos) {
            if (t.ticks > ticks) {
                break;
            }
            nearestTempo = t;
        }
        return nearestTempo.timeOffset + this.#ticksToMilliseconds(ticks - nearestTempo.ticks, nearestTempo.mspb);
    }
}

class SmfReader {
    readonly #reader: BytesReader;
    #loaded = false;
    #events: MidiEvent[] = [];

    constructor(ar: Uint8Array) {
        this.#reader = new BytesReader(ar);
    }

    getEvents(): MidiEvent[] {
        this.#load();
        return this.#events;
    }

    #onInvalidFormat(): never {
        throw new Error(`Unexpected byte found near index ${this.#reader.getPos() - 1}`);
    }

    #ensureU32(v: number): void {
        if (this.#reader.readU32() !== v) {
            this.#onInvalidFormat();
        }
    }

    #cleanEvents(): void {
        this.#events.sort((a, b) => a.timestamp - b.timestamp);

        // Find the first Note On event to use as the timing anchor
        const firstNoteOn = this.#events.find(ev => ev.isNoteOn);
        if (!firstNoteOn || firstNoteOn.timestamp === 0) {
            return;
        }
        
        const shiftTime = firstNoteOn.timestamp;
        for (const ev of this.#events) {
            ev.shiftTime(-shiftTime);
        }
    }

    #load(): void {
        if (this.#loaded) {
            return;
        }
        this.#events = [];
        this.#loadInner();
        this.#cleanEvents();
        this.#loaded = true;
    }

    #loadInner(): void {
        debug("Parsing a midi file with a new parser...");
        this.#ensureU32(0x4d546864); // MIDI "MThd" header
        this.#ensureU32(6);          // Header length must be 6

        const rd = this.#reader;
        const type = rd.readU16();
        if (type > 2) {
            throw new Error(`Invalid file format: ${type}`);
        }
        const numTracks = rd.readU16();
        const ticksPerBeat = rd.readU16();

        if (ticksPerBeat >= 0x8000) {
            throw new Error("SMPTE time format not supported");
        }

        debug("MIDI Type:", type, "numTracks:", numTracks, "ticksPerBeat:", ticksPerBeat);

        const tc = new TickConverter(ticksPerBeat);

        for (let track = 0; track < numTracks; track++) {
            debug("Current tick converter status:", tc);
            this.#ensureU32(0x4d54726b); // Track "MTrk" header
            const trackLen = rd.readU32();

            debug("Track #", track + 1, "len", trackLen);

            const trackStart = rd.getPos();
            let lastStatus = 0;
            let tick = 0;

            for (;;) {
                const delta = rd.readVar();
                let status = rd.readU8();

                tick += delta;

                // META message?
                if (status === 0xFF) {
                    const metaType = rd.readU8();
                    const len = rd.readVar();

                    if (metaType === 0x2F) {
                        // End of track
                        break;
                    }
                    if (metaType === 0x51) {
                        // Tempo change
                        const tempo = rd.readU24();
                        debug(`  @${tick} Tempo=${tempo}`);
                        tc.setTempo(tick, tempo);
                        continue;
                    }
                    rd.skip(len);
                    continue;
                }
                
                // SysEx message?
                if (status === 0xF0 || status === 0xF7) {
                    const len = rd.readVar();
                    rd.skip(len);
                    continue;
                }

                // Running status or standard channel voice message
                let data1: number;
                if (status >= 0x80) {
                    data1 = rd.readU8();
                } else {
                    // Running status: the status byte is omitted, and the byte read is actually data1
                    data1 = status;
                    status = lastStatus;
                    if (status === 0) {
                        throw new Error("Invalid running status: no previous status byte set.");
                    }
                }
                lastStatus = status;

                const statusType = status & 0xF0;

                // Program changes (0xC0) are ignored in this application.
                // Channel Pressure (0xD0) is 1-byte, others (0x80, 0x90, 0xA0, 0xB0, 0xE0) are 2-bytes.
                if (statusType === 0xC0) {
                    continue;
                }

                let data2 = 0;
                switch (statusType) {
                    case 0x80: // note off
                    case 0x90: // note on
                    case 0xA0: // polyphonic key pressure
                    case 0xB0: // control change
                    case 0xE0: // pitch bend
                        data2 = rd.readU8();
                        break;
                }
                
                const ev = new MidiEvent(tc.getTime(tick), [status, data1, data2]);
                this.#events.push(ev);
            }
            
            const bytesRead = rd.getPos() - trackStart;
            if (bytesRead < trackLen) {
                rd.skip(trackLen - bytesRead);
            }
        }
        debug("Done parsing MIDI file.");
    }
}

export class SmfWriter {
    readonly #writer = new BytesWriter();
    #trackLengthPos = 0;
    #closed = false;

    constructor() {
        const w = this.#writer;
        w.writeU32(0x4D546864); // "MThd" header
        w.writeU32(6);          // Header length

        w.writeU16(0);          // Format 0 (single track)
        w.writeU16(1);          // One track
        w.writeU16(TICKS_PER_SECOND); // 1000 ticks per quarter-note (1ms resolution)

        w.writeU32(0x4D54726B); // "MTrk" track header
        this.#trackLengthPos = w.getSize();
        w.writeU32(0);          // Placeholder for track length

        // Time Signature Meta Event (4/4 time signature)
        // 0xFF 0x58 [length=4] [numerator=4] [denominator=2 (2^2=4)] [clocks=24] [32nd-notes=8]
        w.writeVar(0);
        w.writeU8(0xFF);
        w.writeU8(0x58);
        w.writeU8(0x04);
        w.writeU8(0x04);
        w.writeU8(0x02);
        w.writeU8(0x18);
        w.writeU8(0x08);

        // Tempo Meta Event (60 BPM)
        // 0xFF 0x51 [length=3] [microseconds per beat = 1,000,000 (1 second)]
        w.writeVar(0);
        w.writeU8(0xFF);
        w.writeU8(0x51);
        w.writeU8(0x03);
        w.writeU24(1_000_000);

        this.#writeResetData();
    }

    #writeResetData(): void {
        const w = this.#writer;
        
        // All Notes Off
        w.writeVar(0);
        w.writeU8(0xB0);
        w.writeU8(123);
        w.writeU8(0);

        // Reset All Controllers
        w.writeVar(0);
        w.writeU8(0xB0);
        w.writeU8(121);
        w.writeU8(0);

        // Set Channel Volume
        w.writeVar(0);
        w.writeU8(0xB0);
        w.writeU8(7);
        w.writeU8(127);
    }

    close(): void {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        
        const w = this.#writer;
        // End of Track Meta Event (0xFF 0x2F 0x00)
        w.writeVar(0);
        w.writeU8(0xFF);
        w.writeU8(0x2F);
        w.writeU8(0x00);

        const pos = w.getSize();
        w.setU32(this.#trackLengthPos, pos - this.#trackLengthPos - 4);
    }

    getBlob(): Blob {
        this.close();
        return this.#writer.getBlob("audio/mid");
    }

    download(filename?: string): void {
        downloadMidi(this.getBlob(), filename);
    }

    writeMessage(deltaTimeMs: number, data: Array<number> | Uint8Array): void {
        this.#writer.writeVar(deltaTimeMs);
        for (const d of data) {
            this.#writer.writeU8(d);
        }
    }
}

function downloadMidi(blob: Blob, filename = "unnamed.mid"): void {
    const url = URL.createObjectURL(blob);
    const element = document.createElement('a');
    element.href = url;
    element.download = filename;
    element.style.display = 'none';
    document.body.appendChild(element);
    
    element.click();
    
    document.body.removeChild(element);
    URL.revokeObjectURL(url);
}

/**
 * Loads and parses a Standard MIDI File from a Blob/File.
 */
export async function loadMidi(file: Blob): Promise<Array<MidiEvent>> {
    try {
        const buffer = await file.arrayBuffer();
        const ar = new Uint8Array(buffer);
        debug("Read from file", file);
        return new SmfReader(ar).getEvents();
    } catch (error) {
        console.error("Failed to load MIDI file:", error);
        throw error;
    }
}
