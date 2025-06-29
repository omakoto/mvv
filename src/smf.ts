'use strict';

// SMF Format: https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html
// https://www.music.mcgill.ca/~gary/306/week9/smf.html
// https://midimusic.github.io/tech/midispec.html

import { info, debug, DEBUG } from './util.js';

function logBlob(blob: Blob) {
    let fileReader = new FileReader();
    fileReader.readAsArrayBuffer(blob);

    fileReader.onload = function(_event) {
        console.log(fileReader.result);
    };
    return blob;
}

export class MidiEvent {
    #timeStamp: number;
    #data: Array<number> | Uint8Array;
    #device: string;

    constructor(timeStamp: number, data: Array<number> | Uint8Array, device?: string) {
        this.#timeStamp = timeStamp;
        this.#data = data;
        this.#device = device ? device : "unknown-device";
    }

    static fromNativeEvent(e: WebMidi.MIDIMessageEvent): MidiEvent {
        return new MidiEvent(e.timeStamp, e.data, (<WebMidi.MIDIPort>e.currentTarget).name);
    }

    withTimestamp(timeStamp: number): MidiEvent {
        return new MidiEvent(timeStamp, this.#data, this.#device);
    }

    get timeStamp(): number {
        return this.#timeStamp;
    }

    shiftTime(millisecond: number) {
        this.#timeStamp = Math.max(0, this.#timeStamp + millisecond);
    }

    get device(): string {
        return this.#device;
    }

    getData(index: number): number {
        if (index < 0) {
            throw "Index cannot be negative";
        }
        if (index >= this.#data.length) {
            return 0;
        }
        return this.#data[index]!;
    }

    replaceData(index: number, value: number) {
        if (index < 0) {
            throw "Index cannot be negative";
        }
        if (index >= this.#data.length) {
            throw "Index out of range";
        }
        this.#data[index] = value;
    }

    clearChannel() {
        this.#data[0] = this.data0 & 0xf0;
    }

    get status(): number {
        return this.data0 & 0xf0;
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
        return this.status === 0x80 || (this.status === 0x90 && this.data2 == 0);
    }

    // Control change?
    get isCC(): boolean {
        return this.status === 0xB0;
    }

    getDataAsArray(): Array<number> | Uint8Array {
        return this.#data;
    }
}

const TICKS_PER_SECOND = 1000;

class BytesWriter {
    #cap = 2; // 1024 * 32;
    #size = 0;
    #buf: Uint8Array;

    constructor() {
        this.#buf = new Uint8Array(this.#cap);
    }

    writeVar(val: number) {
        if (val >= 0x200000) {
            let v = val / 0x200000;
            val &= (0x200000 - 1)
            this.writeU8(0x80 | v);
        }
        if (val >= 0x4000) {
            let v = val / 0x4000;
            val &= (0x4000 - 1)
            this.writeU8(0x80 | v);
        }
        if (val >= 0x80) {
            let v = val / 0x80;
            val &= (0x80 - 1)
            this.writeU8(0x80 | v);
        }
        this.writeU8(val);
        return this;
    }

    writeU8(val: number): BytesWriter {
        this.setU8(this.#size, val);
        this.#size += 1;
        return this;
    }

    writeU16(val: number): BytesWriter {
        this.setU16(this.#size, val);
        this.#size += 2;
        return this;
    }

    writeU24(val: number): BytesWriter {
        this.setU24(this.#size, val);
        this.#size += 3;
        return this;
    }

    writeU32(val: number): BytesWriter {
        this.setU32(this.#size, val);
        this.#size += 4;
        return this;
    }

    setU8(pos: number, val: number): BytesWriter {
        this.#ensureCap(pos + 1);
        this.#buf[pos + 0] = val & 255;
        return this;
    }

    setU16(pos: number, val: number): BytesWriter {
        this.#ensureCap(pos + 2);
        this.#buf[pos + 0] = (val >>  8) & 255;
        this.#buf[pos + 1] = val         & 255;
        return this;
    }

    setU24(pos: number, val: number): BytesWriter {
        this.#ensureCap(pos + 3);
        this.#buf[pos + 0] = (val >> 16) & 255;
        this.#buf[pos + 1] = (val >>  8) & 255;
        this.#buf[pos + 2] = val         & 255;
        return this;
    }

    setU32(pos: number, val: number): BytesWriter {
        this.#ensureCap(pos + 4);
        this.#buf[pos + 0] = (val >> 24) & 255;
        this.#buf[pos + 1] = (val >> 16) & 255;
        this.#buf[pos + 2] = (val >>  8) & 255;
        this.#buf[pos + 3] = val         & 255;
        return this;
    }

    #grow(): BytesWriter {
        this.#cap *= 2;
        let nb = new Uint8Array(this.#cap);
        nb.set(this.#buf);
        this.#buf = nb;
        return this;
    }

    #ensureCap(cap: number): BytesWriter {
        if (this.#cap >= cap) {
            return this;
        }
        this.#grow();
        return this;
    }

    getSize(): number {
        return this.#size;
    }

    getBlob(contentType: string): Blob {
        let ret = (new Blob([this.#buf])).slice(0, this.#size, contentType);
        // logBlob(ret);
        return ret;
    }
}

class BytesReader {
    #buffer: Uint8Array;
    #pos = 0;

    constructor(ar: Uint8Array) {
        this.#buffer = new Uint8Array(ar);
    }

    readU8(): number {
        if (this.#buffer.length <= this.#pos) {
            throw "Reading after EOF"
        }
        return this.#buffer[this.#pos++]!;
    }

    readU16(): number {
        return (this.readU8() << 8) + this.readU8();;
    }

    readU24(): number {
        return (this.readU16() << 8) + this.readU8();;
    }

    readU32(): number {
        return (this.readU16() << 16) + this.readU16();;
    }

    getPos(): number {
        return this.#pos;
    }

    readVar(): number {
        let ret = 0;
        for (;;) {
            let v = this.readU8();
            ret += (v & 0x7f);
            if (v < 128) {
                return ret;
            }
            ret <<= 7;
        }
    }

    skip(nbytes: number): void {
        this.#pos += nbytes;
    }

    startOver(): void {
        this.#pos = 0;
    }
}

class TempoEvent {
    ticks: number = 0;
    mspb: number = 0;
    timeOffset: number = 0;

    constructor(ticks: number, mspb: number, timeOffset: number) {
        this.ticks = ticks;
        this.mspb = mspb;
        this.timeOffset = timeOffset;
    }
}

// Converts "ticks" (not delta ticks, but absolute ticks) in a midi file to milliseconds.
class TickConverter {

    #ticksPerBeat: number;

    #tempos: Array<TempoEvent> = [];

    #lastTempoEvent: TempoEvent;

    constructor(ticksPerBeat: number) {
        this.#ticksPerBeat = ticksPerBeat;

        // Arbitrary initial tempo
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

        this.#lastTempoEvent = {ticks: ticks, mspb: microsecondsPerBeat, timeOffset: timeOffset};

        this.#tempos.push(this.#lastTempoEvent);
    }

    // Convert a "midi tick" number to a millisecond.
    getTime(ticks: number): number {
        if (ticks < 0) {
            throw "ticks must not be negative";
        }
        let nearestTempo;
        for (let t of this.#tempos) {
            if (t.ticks > ticks) {
                break;
            }

            nearestTempo = t;
        }
        if (!nearestTempo) {
            throw "Internal error: nearestTempo not found.";
        }
        return nearestTempo.timeOffset + this.#ticksToMilliseconds(ticks - nearestTempo.ticks, nearestTempo.mspb);
    }
}

function hex8(v: number): string {
    return v.toString(16); // TODO pad-0
}

class SmfReader {
    #reader: BytesReader;
    #loaded = false;
    #events: Array<MidiEvent> = [];

    constructor(ar: Uint8Array) {
        this.#reader = new BytesReader(ar);
    }

    getEvents(): Array<MidiEvent> {
        this.#load();
        return this.#events;
    }

    #onInvalidFormat(): void {
        throw 'Unexpected byte found near index ' +
                (this.#reader.getPos() - 1);
    }

    #ensureU8(v: number): void {
        if (this.#reader.readU8() != v) {
            this.#onInvalidFormat();
        }
    }

    #ensureU16(v: number): void {
        if (this.#reader.readU16() != v) {
            this.#onInvalidFormat();
        }
    }

    #ensureU32(v: number): void {
        if (this.#reader.readU32() != v) {
            this.#onInvalidFormat();
        }
    }

    #ensureU8Array(ar: Array<number>) {
        ar.forEach((v) => this.#ensureU8(v));
    }

    #withReader(callback: (arg: BytesReader) => void) {
        callback(this.#reader);
    }

    #cleanEvents() {
        this.#events.sort((a, b) => {
            return a.timeStamp - b.timeStamp;
        });

        // Find the first note event;
        let firstNoteOnTime = 0;
        for (let ev of this.#events) {
            if (ev.isNoteOn) {
                firstNoteOnTime = ev.timeStamp;
                break;
            }
        }
        if (firstNoteOnTime == 0) {
            return;
        }
        for (let ev of this.#events) {
            ev.shiftTime(-firstNoteOnTime);
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
        console.log("Parsing a midi file with a new parser...");
        this.#ensureU32(0x4d546864); // MIDI header
        this.#ensureU32(6) // Header length

        this.#withReader((rd) => {
            // Parse MIDI header.
            const type = rd.readU16();
            if (type > 2) {
                throw "Invalid file format: " + type;
            }
            const numTracks = rd.readU16();
            const ticksPerBeat = rd.readU16();

            if (ticksPerBeat >= 0x8000) {
                throw "SMPTE time format not supported"
            }

            console.log("Type", type, "numTracks", numTracks, "ticksPerBeat", ticksPerBeat);

            const tc = new TickConverter(ticksPerBeat);

            // Track start
            let track = 0;
            for (;;) {
                console.log("Current tick converter status:", tc);
                if (track >= numTracks) {
                    break;
                }
                track++;
                this.#ensureU32(0x4d54726B); // Track header
                const trackLen = rd.readU32();

                console.log("Track #", track, "len", trackLen);

                let lastStatus = 0;
                let tick = 0;
                for (;;) {
                    const delta = rd.readVar();
                    let status = rd.readU8();

                    tick += delta;

                    // META message?
                    if (status === 0xff) {
                        const type = rd.readU8();
                        const len = rd.readVar();

                        // console.log("        Meta 0x" + hex8(type) + " len=" + len);
                        if (type === 0x2f) {
                            // end of track
                            break;
                        }
                        if (type === 0x51) {
                            // tempo
                            const tempo = rd.readU24();
                            debug("  @" + tick + " Tempo=" + tempo);
                            tc.setTempo(tick, tempo);
                            continue;
                        }
                        // console.log("        [ignored]");
                        rd.skip(len);
                        continue;
                    }
                    // SysEX?
                    if (status === 0xf0 || status === 0xf7) {
                        const len = rd.readVar();
                        rd.skip(len);
                        continue;
                    }

                    let data1;
                    if (status >= 0x80) {
                        data1 = rd.readU8();
                    } else {
                        data1 = status;
                        status = lastStatus;
                    }
                    lastStatus = status;

                    const statusType = status & 0xf0;
                    // const _channel = status & 0x0f;

                    // TODO: Ignore non-channel-0 data??

                    let data2 = 0;
                    switch (statusType) {
                        case 0xc0: // program change
                            // Ignore all program changes!
                            continue;
                        case 0x80: // note off
                        case 0x90: // note on
                        case 0xa0: // after touch
                        case 0xb0: // control change
                        case 0xe0: // pitch wheel
                            data2 = rd.readU8();
                            break;
                    }
                    let ev = new MidiEvent(tc.getTime(tick), [status, data1, data2]);
                    // console.log(ev);
                    this.#events.push(ev);
                }
            }
        });
        console.log("Done parsing")
    }
}

export class SmfWriter {
    #writer = new BytesWriter();

    #trackLengthPos: number = 0;

    #closed = false;

    #withWriter(callback: (arg: BytesWriter) => void) {
        callback(this.#writer);
    }

    constructor() {
        this.#withWriter((w) => {
            w.writeU8(0x4D); // M
            w.writeU8(0x54); // T
            w.writeU8(0x68); // h
            w.writeU8(0x64); // d

            w.writeU32(6); // header length

            w.writeU16(0); // single track
            w.writeU16(1); // contains a single track
            w.writeU16(TICKS_PER_SECOND); // 1000 per quarter-note === 1ms / unit

            w.writeU8(0x4D); // M
            w.writeU8(0x54); // T
            w.writeU8(0x72); // r
            w.writeU8(0x6B); // k

            this.#trackLengthPos = w.getSize();
            w.writeU32(0); // Track length

            // Time signature
            w.writeVar(0); // time
            w.writeU8(0xff);
            w.writeU8(0x58);
            w.writeU8(0x04);
            w.writeU8(0x04);
            w.writeU8(0x02);
            w.writeU8(0x18);
            w.writeU8(0x08);

            // tempo
            w.writeVar(0); // time
            w.writeU8(0xff);
            w.writeU8(0x51);
            w.writeU8(0x03);
            w.writeU24(1000000); // 100,000 === 60 bpm

            this.#writeResetData();
        });
    }

    #writeResetData(): void {
        this.#withWriter((w) => {
            // All notes off
            w.writeVar(0); // time
            w.writeU8(0xb0);
            w.writeU8(123);
            w.writeU8(0);

            // Reset all controllers
            w.writeVar(0); // time
            w.writeU8(0xb0);
            w.writeU8(121);
            w.writeU8(0);

            // Set channel volume
            w.writeVar(0); // time
            w.writeU8(0xb0);
            w.writeU8(7);
            w.writeU8(127);

            // // All reset
            // TODO: Hmm, 0xFF conflicts with meta event header, so we can't use it?
            // w.writeVar(0); // time
            // w.writeU8(255);
        });
    }

    close(): void {
        if (this.#closed) {
            return;
        }
        this.#closed = true;
        this.#withWriter((w) => {
            // end of track
            w.writeVar(0); // time
            w.writeU8(0xff);
            w.writeU8(0x2f);
            w.writeU8(0x00);

            let pos = w.getSize();
            w.setU32(this.#trackLengthPos, pos - this.#trackLengthPos - 4);
        });
    }

    getBlob(): Blob {
        this.close();
        return this.#writer.getBlob("audio/mid");
    }

    download(filename?: string): void {
        downloadMidi(this.getBlob(), filename);
    }

    writeMessage(deltaTimeMs: number, data: Array<number> | Uint8Array) {
        this.#writer.writeVar(deltaTimeMs / (1000 / TICKS_PER_SECOND));
        for (let d of data) {
            this.#writer.writeU8(d);
        }
    }
}

function downloadMidi(blob: Blob, filename?: string | null) {
    if (!filename) {
        filename = "unnamed.mid";
    }

    let element = document.createElement('a');
    element.setAttribute('download', filename);

    element.style.display = 'none';
    document.body.appendChild(element);

    let reader = new FileReader();
    reader.readAsDataURL(blob); // converts the blob to base64 and calls onload

    reader.onload = function() {
        element.href = <string>reader.result; // data url
        element.click();
        document.body.removeChild(element);
    };
}

// Returns a promise
export function loadMidi(file: Blob): Promise<Array<MidiEvent>> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (_event: ProgressEvent<FileReader>) {
            const ar = new Uint8Array((<ArrayBuffer>reader.result));
            console.log("Read from file", file);

            try {
                resolve((new SmfReader(ar)).getEvents());
            } catch (error) {
                if (reject) reject(error);
            }
        };
        reader.onerror = reject;
        reader.readAsArrayBuffer(file);
    });
}


// For manual testing
function t() {
    (new SmfWriter()).download();
}

