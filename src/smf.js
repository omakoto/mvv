'use strict';

// SMF Format: https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html
// https://www.music.mcgill.ca/~gary/306/week9/smf.html
// https://midimusic.github.io/tech/midispec.html

function logBlob(blob) {
    let fileReader = new FileReader();
    fileReader.readAsArrayBuffer(blob);

    fileReader.onload = function(event) {
        console.log(fileReader.result);
    };
    return blob;
}

class MidiEvent {
    constructor(timeStamp, data, device) {
        this.timeStamp = timeStamp;
        this.data = data;
        this.device = device ? device : "unknown-device";
    }

    static fromNativeEvent(e) {
        return new MidiEvent(e.timeStamp, e.data, e.currentTarget.name);
    }

    withTimestamp(timeStamp) {
        return new MidiEvent(timeStamp, this.data, this.device);
    }
}

const TICKS_PER_SECOND = 1000;

class BytesWriter {
    #cap = 2; // 1024 * 32;
    #size = 0;
    #buf;

    constructor() {
        this.#buf = new Uint8Array(this.#cap);
    }

    writeVar(val) {
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

    writeU8(val) {
        this.setU8(this.#size, val);
        this.#size += 1;
        return this;
    }

    writeU16(val) {
        this.setU16(this.#size, val);
        this.#size += 2;
        return this;
    }

    writeU32(val) {
        this.setU32(this.#size, val);
        this.#size += 4;
        return this;
    }

    writeU24(val) {
        this.setU24(this.#size, val);
        this.#size += 3;
        return this;
    }

    setU8(pos, val) {
        this.#ensureCap(pos + 1);
        this.#buf[pos + 0] = (val >>  0) & 255;
        return this;
    }

    setU16(pos, val) {
        this.#ensureCap(pos + 2);
        this.#buf[pos + 0] = (val >>  8) & 255;
        this.#buf[pos + 1] = (val >>  0) & 255;
        return this;
    }

    setU24(pos, val) {
        this.#ensureCap(pos + 3);
        this.#buf[pos + 0] = (val >> 16) & 255;
        this.#buf[pos + 1] = (val >>  8) & 255;
        this.#buf[pos + 2] = (val >>  0) & 255;
        return this;
    }

    setU32(pos, val) {
        this.#ensureCap(pos + 4);
        this.#buf[pos + 0] = (val >> 24) & 255;
        this.#buf[pos + 1] = (val >> 16) & 255;
        this.#buf[pos + 2] = (val >>  8) & 255;
        this.#buf[pos + 3] = (val >>  0) & 255;
        return this;
    }

    #grow() {
        this.#cap *= 2;
        let nb = new Uint8Array(this.#cap);
        nb.set(this.#buf);
        this.#buf = nb;
        return this;
    }

    #ensureCap(cap) {
        if (this.#cap >= cap) {
            return;
        }
        this.#grow();
        return this;
    }

    #ensureGrowth(size) {
        return this.#ensureCap(this.#size + size);
    }

    getSize() {
        return this.#size;
    }

    getBlob(contentType) {
        let ret = (new Blob([this.#buf])).slice(0, this.#size, contentType);
        // logBlob(ret);
        return ret;
    }
}

class BytesReader {
    #buffer;
    #pos = 0;

    constructor(ar) {
        this.#buffer = new Uint8Array(ar);
    }

    readU8() {
        return this.#buffer[this.#pos++];
    }

    readU16() {
        return (this.readU8() << 8) + this.readU8();;
    }

    readU24() {
        return (this.readU16() << 8) + this.readU8();;
    }

    readU32() {
        return (this.readU16() << 16) + this.readU16();;
    }

    getPos() {
        return this.#pos;
    }

    readVar() {
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

    skip(nbytes) {
        this.#pos += nbytes;
    }

    startOver() {
        this.#pos = 0;
    }
}

// Converts "ticks" (not delta ticks, but absolute ticks) in a midi file to milliseconds.
class TickConverter {
    #ticksPerBeat;

    #tempos = [];

    #lastTempoEvent;

    constructor(ticksPerBeat) {
        this.#ticksPerBeat = ticksPerBeat;

        // Arbitrary initial tempo
        this.#lastTempoEvent = {
            ticks: 0,
            mspb: 500_000,
            timeOffset: 0,
        };
        this.#tempos.push(this.#lastTempoEvent);
    }

    #ticksToMilliseconds(ticks, mspb) {
        return ((ticks / this.#ticksPerBeat) * mspb) / 1000;
    }

    setTempo(ticks, microsecondsPerBeat) {
        const last = this.#lastTempoEvent;
        const deltaTicks = ticks - last.ticks;
        const deltaTimeOffset = this.#ticksToMilliseconds(deltaTicks, last.mspb);
        const timeOffset = last.timeOffset + deltaTimeOffset;

        this.#lastTempoEvent = {ticks: ticks, mspb: microsecondsPerBeat, timeOffset: timeOffset};

        this.#tempos.push(this.#lastTempoEvent);
    }

    getTime(ticks) {
        let nearestTempo;
        for (let i = 0; i < this.#tempos.length; i++) {
            const t = this.#tempos[i];
            if (t.ticks > ticks) {
                break;
            }

            nearestTempo = t;
        }
        return nearestTempo.timeOffset + this.#ticksToMilliseconds(ticks - nearestTempo.ticks, nearestTempo.mspb);
    }
}

function hex8(v) {
    return v.toString(16); // TODO pad-0
}

class SmfReader {
    #reader;
    #events;

    constructor(ar) {
        this.#reader = new BytesReader(ar);
    }

    getEvents() {
        this.#load();
        return this.#events;
    }

    #onInvalidFormat() {
        throw 'Unexpected byte found near index ' +
                (this.#reader.getPos() - 1);
    }

    #ensureU8(v) {
        if (this.#reader.readU8() != v) {
            this.#onInvalidFormat();
        }
    }

    #ensureU16(v) {
        if (this.#reader.readU16() != v) {
            this.#onInvalidFormat();
        }
    }

    #ensureU32(v) {
        if (this.#reader.readU32() != v) {
            this.#onInvalidFormat();
        }
    }

    #ensureU8Array(ar) {
        ar.forEach((v) => this.#ensureU8(v));
    }

    #withReader(callback) {
        callback(this.#reader);
    }

    #load() {
        if (this.#events) {
            return;
        }
        this.#events = [];

        if (true) {
            this.#loadBetter();
        } else {
            this.#loadOld();
        }

        this.#events.sort((a, b) => {
            return a.timeStamp - b.timeStamp;
        });
    }

    #loadOld() {
        // Old parser that can only read self-created MIDI files.
        console.log("Parsing a midi file...");

        // For now, support only files written by MVV.

        this.#ensureU8Array([
            0x4D, // MThd
            0x54,
            0x68,
            0x64,

            0, 0, 0, 6, // Header length

            0, 0, // single track
            0, 1, // only one track
        ]);
        this.#ensureU16(TICKS_PER_SECOND);
        this.#ensureU8Array([
            0x4D, // MTrk
            0x54,
            0x72,
            0x6B,
        ]);
        const trackSize = this.#reader.readU32();

        debug("Track size", trackSize);

        let lastStatus = 0;
        let totalTime = 0;
        for (;;) {
            const time = this.#reader.readVar();
            totalTime += time;

            const status = this.#reader.readU8();
            debug("Status 0x" + status.toString(16) + " at t=" + totalTime);

            if (status == 0xff) {
                let type = this.#reader.readU8();
                let len = this.#reader.readVar();

                debug("Type 0x" + type.toString(16) + " len=" + len);

                if (type == 0x2f) { // End of track
                    break;
                } else if (type == 0x51) { // Tempo
                    if (len != 3) {
                        this.#onInvalidFormat();
                    }
                    const tempo = this.#reader.readU24();
                    debug("Tempo=" + tempo);
                    if (tempo != 1000000) {
                        this.#onInvalidFormat();
                    }
                } else {
                    for (let i = 0; i < len; i++) {
                        this.#reader.readU8();
                    }
                }
            } else {
                const d1 = this.#reader.readU8();
                const d2 = this.#reader.readU8();

                let ev = new MidiEvent(totalTime, [status, d1, d2]);
                this.#events.push(ev);
            }
        }
        console.log("Done parsing.");
    }

    // Better SMF parser
    #loadBetter() {
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
                    if (status == 0xff) {
                        const type = rd.readU8();
                        const len = rd.readVar();

                        // console.log("        Meta 0x" + hex8(type) + " len=" + len);
                        if (type == 0x2f) {
                            // end of track
                            break;
                        }
                        if (type == 0x51) {
                            // tempo
                            const tempo = rd.readU24();
                            console.log("  @" + tick + " Tempo=" + tempo);
                            tc.setTempo(tick, tempo);
                            continue;
                        }
                        // console.log("        [ignored]");
                        rd.skip(len);
                        continue;
                    }
                    // SysEX?
                    if (status == 0xf0 || status == 0xf7) {
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
                    const channel = status & 0x0f;

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

class SmfWriter {
    #writer = new BytesWriter();

    #trackLengthPos;

    #closed = false;

    #withWriter(callback) {
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
            w.writeU16(TICKS_PER_SECOND); // 1000 per quarter-note == 1ms / unit

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
            w.writeU24(1000000); // 100,000 == 60 bpm

            this.#writeResetData();
        });
    }

    #writeResetData() {
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

    close() {
        if (this.#closed) {
            return;
        }
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

    getBlob() {
        this.close();
        return this.#writer.getBlob("audio/mid");
    }

    download(filename) {
        downloadMidi(this.getBlob(), filename);
    }

    writeMessage(deltaTimeMs, data) {
        this.#writer.writeVar(deltaTimeMs / (1000 / TICKS_PER_SECOND));
        for (let i = 0; i < data.length; i++) {
            this.#writer.writeU8(data[i]);
        }
    }
}

function downloadMidi(blob, filename) {
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
        element.href = reader.result; // data url
        element.click();
        document.body.removeChild(element);
    };
}

// Returns a promise
function loadMidi(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (event) {
            const ar = new Uint8Array(event.target.result);
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

