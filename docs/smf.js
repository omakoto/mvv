'use strict';
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var _MidiEvent_timestamp, _MidiEvent_data, _MidiEvent_device, _BytesWriter_instances, _BytesWriter_cap, _BytesWriter_size, _BytesWriter_buf, _BytesWriter_grow, _BytesWriter_ensureCap, _BytesReader_buffer, _BytesReader_pos, _TickConverter_instances, _TickConverter_ticksPerBeat, _TickConverter_tempos, _TickConverter_lastTempoEvent, _TickConverter_ticksToMilliseconds, _SmfReader_instances, _SmfReader_reader, _SmfReader_loaded, _SmfReader_events, _SmfReader_onInvalidFormat, _SmfReader_ensureU8, _SmfReader_ensureU16, _SmfReader_ensureU32, _SmfReader_ensureU8Array, _SmfReader_withReader, _SmfReader_cleanEvents, _SmfReader_load, _SmfReader_loadInner, _SmfWriter_instances, _SmfWriter_writer, _SmfWriter_trackLengthPos, _SmfWriter_closed, _SmfWriter_withWriter, _SmfWriter_writeResetData;
// SMF Format: https://ccrma.stanford.edu/~craig/14q/midifile/MidiFileFormat.html
// https://www.music.mcgill.ca/~gary/306/week9/smf.html
// https://midimusic.github.io/tech/midispec.html
import { debug } from './util.js';
function logBlob(blob) {
    let fileReader = new FileReader();
    fileReader.readAsArrayBuffer(blob);
    fileReader.onload = function (_event) {
        console.log(fileReader.result);
    };
    return blob;
}
const MIDI_COMMANDS = {
    0x8: 'Note Off',
    0x9: 'Note On',
    0xA: 'Polyphonic Key Pressure', // (Aftertouch)
    0xB: 'Control Change',
    0xC: 'Program Change',
    0xD: 'Channel Pressure', // (Aftertouch)
    0xE: 'Pitch Bend Change'
};
// --- MIDI Control Change Names ---
const MIDI_CONTROL_CHANGE = {
    0: 'Bank Select', 1: 'Modulation', 2: 'Breath Controller', 4: 'Foot Controller',
    5: 'Portamento Time', 6: 'Data Entry MSB', 7: 'Channel Volume', 8: 'Balance',
    10: 'Pan', 11: 'Expression Controller', 12: 'Effect Control 1', 13: 'Effect Control 2',
    16: 'General Purpose Controller 1', 17: 'General Purpose Controller 2', 18: 'General Purpose Controller 3', 19: 'General Purpose Controller 4',
    64: 'Damper Pedal (Sustain)', 65: 'Portamento On/Off', 66: 'Sostenuto', 67: 'Soft Pedal',
    68: 'Legato Footswitch', 69: 'Hold 2', 70: 'Sound Controller 1 (Sound Variation)', 71: 'Sound Controller 2 (Timbre/Harmonic Content)',
    72: 'Sound Controller 3 (Release Time)', 73: 'Sound Controller 4 (Attack Time)', 74: 'Sound Controller 5 (Brightness)',
    84: 'Portamento Control', 91: 'Effects 1 Depth (Reverb)', 93: 'Effects 3 Depth (Chorus)',
    121: 'Reset All Controllers', 123: 'All Notes Off'
};
function byteToHex(byte) {
    return ("0" + byte.toString(16).toUpperCase()).slice(-2);
}
export class MidiEvent {
    constructor(timeStamp, data, device) {
        _MidiEvent_timestamp.set(this, void 0);
        _MidiEvent_data.set(this, void 0);
        _MidiEvent_device.set(this, void 0);
        __classPrivateFieldSet(this, _MidiEvent_timestamp, timeStamp, "f");
        __classPrivateFieldSet(this, _MidiEvent_data, data, "f");
        __classPrivateFieldSet(this, _MidiEvent_device, device ? device : "unknown-device", "f");
    }
    static fromNativeEvent(e) {
        return new MidiEvent(e.timeStamp, e.data, e.currentTarget.name);
    }
    clone() {
        const dataCopy = Array.isArray(__classPrivateFieldGet(this, _MidiEvent_data, "f"))
            ? [...__classPrivateFieldGet(this, _MidiEvent_data, "f")] : new Uint8Array(__classPrivateFieldGet(this, _MidiEvent_data, "f"));
        return new MidiEvent(__classPrivateFieldGet(this, _MidiEvent_timestamp, "f"), dataCopy, __classPrivateFieldGet(this, _MidiEvent_device, "f"));
    }
    withTimestamp(timeStamp) {
        return new MidiEvent(timeStamp, __classPrivateFieldGet(this, _MidiEvent_data, "f"), __classPrivateFieldGet(this, _MidiEvent_device, "f"));
    }
    get timestamp() {
        return __classPrivateFieldGet(this, _MidiEvent_timestamp, "f");
    }
    shiftTime(millisecond) {
        __classPrivateFieldSet(this, _MidiEvent_timestamp, Math.max(0, __classPrivateFieldGet(this, _MidiEvent_timestamp, "f") + millisecond), "f");
    }
    get device() {
        return __classPrivateFieldGet(this, _MidiEvent_device, "f");
    }
    getData(index) {
        if (index < 0) {
            throw "Index cannot be negative";
        }
        if (index >= __classPrivateFieldGet(this, _MidiEvent_data, "f").length) {
            return 0;
        }
        return __classPrivateFieldGet(this, _MidiEvent_data, "f")[index];
    }
    replaceData(index, value) {
        if (index < 0) {
            throw "Index cannot be negative";
        }
        if (index >= __classPrivateFieldGet(this, _MidiEvent_data, "f").length) {
            throw "Index out of range";
        }
        __classPrivateFieldGet(this, _MidiEvent_data, "f")[index] = value;
    }
    clearChannel() {
        __classPrivateFieldGet(this, _MidiEvent_data, "f")[0] = this.data0 & 0xf0;
    }
    get status() {
        return this.data0 & 0xf0;
    }
    get channel() {
        return this.data0 & 0x0f;
    }
    get data0() {
        return this.getData(0);
    }
    get data1() {
        return this.getData(1);
    }
    get data2() {
        return this.getData(2);
    }
    get isNoteOn() {
        return this.status === 0x90 && this.data2 > 0;
    }
    get isNoteOff() {
        return this.status === 0x80 || (this.status === 0x90 && this.data2 === 0);
    }
    // Control change?
    get isCC() {
        return this.status === 0xB0;
    }
    getDataAsArray() {
        return __classPrivateFieldGet(this, _MidiEvent_data, "f");
    }
    toString() {
        const timestamp = Math.floor(this.timestamp * 1000) / 1000;
        const data = __classPrivateFieldGet(this, _MidiEvent_data, "f");
        const hexString = Array.from(data).map(byte => byteToHex(byte)).join(' ');
        const description = this.describeMidiEvent();
        return `time=${timestamp}, data=${hexString}: ${description}`;
    }
    describeMidiEvent() {
        const data = __classPrivateFieldGet(this, _MidiEvent_data, "f");
        const commandByte = data[0] >> 4;
        const channel = (data[0] & 0x0f) + 1;
        const eventName = MIDI_COMMANDS[commandByte] || `[Unknown Event:${byteToHex(data[0])}]`;
        let details = '';
        switch (commandByte) {
            case 0x9: // Note On
            case 0x8: // Note Off
                const note = data[1];
                const velocity = data[2];
                details = `Note: ${note}, Vel: ${velocity}`;
                break;
            case 0xB: // Control Change
                const controllerNumber = data[1];
                const controllerValue = data[2];
                const controllerName = MIDI_CONTROL_CHANGE[controllerNumber] || `CC #${controllerNumber}`;
                details = `${controllerName}: ${controllerValue}`;
                break;
            case 0xE: // Pitch Bend
                // Combine two 7-bit bytes into a 14-bit value. Center is 8192.
                const pitchValue = ((data[2] << 7) | data[1]) - 8192;
                details = `Value: ${pitchValue}`;
                break;
            case 0xA: // Polyphonic Key Pressure (Note Aftertouch)
                const pressureNote = data[1];
                const pressureValue = data[2];
                details = `Note: ${pressureNote}, Pressure: ${pressureValue}`;
                break;
            case 0xD: // Channel Pressure (Channel Aftertouch)
                const channelPressure = data[1];
                details = `Pressure: ${channelPressure}`;
                break;
            case 0xC: // Program Change
                const programNum = data[1];
                details = `Program: ${programNum}`;
                break;
        }
        return `${eventName} (ch:${channel}) [${details}]`;
    }
}
_MidiEvent_timestamp = new WeakMap(), _MidiEvent_data = new WeakMap(), _MidiEvent_device = new WeakMap();
const TICKS_PER_SECOND = 1000;
class BytesWriter {
    constructor() {
        _BytesWriter_instances.add(this);
        _BytesWriter_cap.set(this, 2); // 1024 * 32;
        _BytesWriter_size.set(this, 0);
        _BytesWriter_buf.set(this, void 0);
        __classPrivateFieldSet(this, _BytesWriter_buf, new Uint8Array(__classPrivateFieldGet(this, _BytesWriter_cap, "f")), "f");
    }
    writeVar(value) {
        if (value < 0) {
            throw new Error("Value must be non-negative.");
        }
        const buffer = [];
        do {
            buffer.push(value & 0x7F);
            value >>= 7;
        } while (value > 0);
        while (buffer.length > 1) {
            this.writeU8(buffer.pop() | 0x80);
        }
        this.writeU8(buffer.pop());
        return this;
    }
    writeU8(val) {
        this.setU8(__classPrivateFieldGet(this, _BytesWriter_size, "f"), val);
        __classPrivateFieldSet(this, _BytesWriter_size, __classPrivateFieldGet(this, _BytesWriter_size, "f") + 1, "f");
        return this;
    }
    writeU16(val) {
        this.setU16(__classPrivateFieldGet(this, _BytesWriter_size, "f"), val);
        __classPrivateFieldSet(this, _BytesWriter_size, __classPrivateFieldGet(this, _BytesWriter_size, "f") + 2, "f");
        return this;
    }
    writeU24(val) {
        this.setU24(__classPrivateFieldGet(this, _BytesWriter_size, "f"), val);
        __classPrivateFieldSet(this, _BytesWriter_size, __classPrivateFieldGet(this, _BytesWriter_size, "f") + 3, "f");
        return this;
    }
    writeU32(val) {
        this.setU32(__classPrivateFieldGet(this, _BytesWriter_size, "f"), val);
        __classPrivateFieldSet(this, _BytesWriter_size, __classPrivateFieldGet(this, _BytesWriter_size, "f") + 4, "f");
        return this;
    }
    setU8(pos, val) {
        __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_ensureCap).call(this, pos + 1);
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 0] = val & 255;
        return this;
    }
    setU16(pos, val) {
        __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_ensureCap).call(this, pos + 2);
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 0] = (val >> 8) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 1] = val & 255;
        return this;
    }
    setU24(pos, val) {
        __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_ensureCap).call(this, pos + 3);
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 0] = (val >> 16) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 1] = (val >> 8) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 2] = val & 255;
        return this;
    }
    setU32(pos, val) {
        __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_ensureCap).call(this, pos + 4);
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 0] = (val >> 24) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 1] = (val >> 16) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 2] = (val >> 8) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 3] = val & 255;
        return this;
    }
    getSize() {
        return __classPrivateFieldGet(this, _BytesWriter_size, "f");
    }
    getBlob(contentType) {
        let ret = (new Blob([__classPrivateFieldGet(this, _BytesWriter_buf, "f")])).slice(0, __classPrivateFieldGet(this, _BytesWriter_size, "f"), contentType);
        // logBlob(ret);
        return ret;
    }
}
_BytesWriter_cap = new WeakMap(), _BytesWriter_size = new WeakMap(), _BytesWriter_buf = new WeakMap(), _BytesWriter_instances = new WeakSet(), _BytesWriter_grow = function _BytesWriter_grow() {
    __classPrivateFieldSet(this, _BytesWriter_cap, __classPrivateFieldGet(this, _BytesWriter_cap, "f") * 2, "f");
    let nb = new Uint8Array(__classPrivateFieldGet(this, _BytesWriter_cap, "f"));
    nb.set(__classPrivateFieldGet(this, _BytesWriter_buf, "f"));
    __classPrivateFieldSet(this, _BytesWriter_buf, nb, "f");
    return this;
}, _BytesWriter_ensureCap = function _BytesWriter_ensureCap(cap) {
    if (__classPrivateFieldGet(this, _BytesWriter_cap, "f") >= cap) {
        return this;
    }
    __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_grow).call(this);
    return this;
};
class BytesReader {
    constructor(ar) {
        _BytesReader_buffer.set(this, void 0);
        _BytesReader_pos.set(this, 0);
        __classPrivateFieldSet(this, _BytesReader_buffer, new Uint8Array(ar), "f");
    }
    readU8() {
        var _a, _b;
        if (__classPrivateFieldGet(this, _BytesReader_buffer, "f").length <= __classPrivateFieldGet(this, _BytesReader_pos, "f")) {
            throw "Reading after EOF";
        }
        return __classPrivateFieldGet(this, _BytesReader_buffer, "f")[__classPrivateFieldSet(this, _BytesReader_pos, (_b = __classPrivateFieldGet(this, _BytesReader_pos, "f"), _a = _b++, _b), "f"), _a];
    }
    readU16() {
        return (this.readU8() << 8) + this.readU8();
        ;
    }
    readU24() {
        return (this.readU16() << 8) + this.readU8();
        ;
    }
    readU32() {
        return (this.readU16() << 16) + this.readU16();
        ;
    }
    getPos() {
        return __classPrivateFieldGet(this, _BytesReader_pos, "f");
    }
    readVar() {
        let value = 0;
        let byte;
        do {
            byte = this.readU8();
            value = (value << 7) | (byte & 0x7F);
        } while ((byte & 0x80) !== 0);
        return value;
    }
    skip(nbytes) {
        __classPrivateFieldSet(this, _BytesReader_pos, __classPrivateFieldGet(this, _BytesReader_pos, "f") + nbytes, "f");
    }
    startOver() {
        __classPrivateFieldSet(this, _BytesReader_pos, 0, "f");
    }
}
_BytesReader_buffer = new WeakMap(), _BytesReader_pos = new WeakMap();
class TempoEvent {
    constructor(ticks, mspb, timeOffset) {
        this.ticks = 0;
        this.mspb = 0;
        this.timeOffset = 0;
        this.ticks = ticks;
        this.mspb = mspb;
        this.timeOffset = timeOffset;
    }
}
// Converts "ticks" (not delta ticks, but absolute ticks) in a midi file to milliseconds.
class TickConverter {
    constructor(ticksPerBeat) {
        _TickConverter_instances.add(this);
        _TickConverter_ticksPerBeat.set(this, void 0);
        _TickConverter_tempos.set(this, []);
        _TickConverter_lastTempoEvent.set(this, void 0);
        __classPrivateFieldSet(this, _TickConverter_ticksPerBeat, ticksPerBeat, "f");
        // Arbitrary initial tempo
        __classPrivateFieldSet(this, _TickConverter_lastTempoEvent, new TempoEvent(0, 500000, 0), "f");
        __classPrivateFieldGet(this, _TickConverter_tempos, "f").push(__classPrivateFieldGet(this, _TickConverter_lastTempoEvent, "f"));
    }
    setTempo(ticks, microsecondsPerBeat) {
        const last = __classPrivateFieldGet(this, _TickConverter_lastTempoEvent, "f");
        const deltaTicks = ticks - last.ticks;
        const deltaTimeOffset = __classPrivateFieldGet(this, _TickConverter_instances, "m", _TickConverter_ticksToMilliseconds).call(this, deltaTicks, last.mspb);
        const timeOffset = last.timeOffset + deltaTimeOffset;
        __classPrivateFieldSet(this, _TickConverter_lastTempoEvent, { ticks: ticks, mspb: microsecondsPerBeat, timeOffset: timeOffset }, "f");
        __classPrivateFieldGet(this, _TickConverter_tempos, "f").push(__classPrivateFieldGet(this, _TickConverter_lastTempoEvent, "f"));
    }
    // Convert a "midi tick" number to a millisecond.
    getTime(ticks) {
        if (ticks < 0) {
            throw "ticks must not be negative";
        }
        let nearestTempo;
        for (let t of __classPrivateFieldGet(this, _TickConverter_tempos, "f")) {
            if (t.ticks > ticks) {
                break;
            }
            nearestTempo = t;
        }
        if (!nearestTempo) {
            throw "Internal error: nearestTempo not found.";
        }
        return nearestTempo.timeOffset + __classPrivateFieldGet(this, _TickConverter_instances, "m", _TickConverter_ticksToMilliseconds).call(this, ticks - nearestTempo.ticks, nearestTempo.mspb);
    }
}
_TickConverter_ticksPerBeat = new WeakMap(), _TickConverter_tempos = new WeakMap(), _TickConverter_lastTempoEvent = new WeakMap(), _TickConverter_instances = new WeakSet(), _TickConverter_ticksToMilliseconds = function _TickConverter_ticksToMilliseconds(ticks, mspb) {
    return ((ticks / __classPrivateFieldGet(this, _TickConverter_ticksPerBeat, "f")) * mspb) / 1000;
};
function hex8(v) {
    return v.toString(16); // TODO pad-0
}
class SmfReader {
    constructor(ar) {
        _SmfReader_instances.add(this);
        _SmfReader_reader.set(this, void 0);
        _SmfReader_loaded.set(this, false);
        _SmfReader_events.set(this, []);
        __classPrivateFieldSet(this, _SmfReader_reader, new BytesReader(ar), "f");
    }
    getEvents() {
        __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_load).call(this);
        return __classPrivateFieldGet(this, _SmfReader_events, "f");
    }
}
_SmfReader_reader = new WeakMap(), _SmfReader_loaded = new WeakMap(), _SmfReader_events = new WeakMap(), _SmfReader_instances = new WeakSet(), _SmfReader_onInvalidFormat = function _SmfReader_onInvalidFormat() {
    throw 'Unexpected byte found near index ' +
        (__classPrivateFieldGet(this, _SmfReader_reader, "f").getPos() - 1);
}, _SmfReader_ensureU8 = function _SmfReader_ensureU8(v) {
    if (__classPrivateFieldGet(this, _SmfReader_reader, "f").readU8() != v) {
        __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_onInvalidFormat).call(this);
    }
}, _SmfReader_ensureU16 = function _SmfReader_ensureU16(v) {
    if (__classPrivateFieldGet(this, _SmfReader_reader, "f").readU16() != v) {
        __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_onInvalidFormat).call(this);
    }
}, _SmfReader_ensureU32 = function _SmfReader_ensureU32(v) {
    if (__classPrivateFieldGet(this, _SmfReader_reader, "f").readU32() != v) {
        __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_onInvalidFormat).call(this);
    }
}, _SmfReader_ensureU8Array = function _SmfReader_ensureU8Array(ar) {
    ar.forEach((v) => __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_ensureU8).call(this, v));
}, _SmfReader_withReader = function _SmfReader_withReader(callback) {
    callback(__classPrivateFieldGet(this, _SmfReader_reader, "f"));
}, _SmfReader_cleanEvents = function _SmfReader_cleanEvents() {
    __classPrivateFieldGet(this, _SmfReader_events, "f").sort((a, b) => {
        return a.timestamp - b.timestamp;
    });
    // Find the first note event;
    let firstNoteOnTime = 0;
    for (let ev of __classPrivateFieldGet(this, _SmfReader_events, "f")) {
        if (ev.isNoteOn) {
            firstNoteOnTime = ev.timestamp;
            break;
        }
    }
    if (firstNoteOnTime === 0) {
        return;
    }
    for (let ev of __classPrivateFieldGet(this, _SmfReader_events, "f")) {
        ev.shiftTime(-firstNoteOnTime);
    }
}, _SmfReader_load = function _SmfReader_load() {
    if (__classPrivateFieldGet(this, _SmfReader_loaded, "f")) {
        return;
    }
    __classPrivateFieldSet(this, _SmfReader_events, [], "f");
    __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_loadInner).call(this);
    __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_cleanEvents).call(this);
    __classPrivateFieldSet(this, _SmfReader_loaded, true, "f");
}, _SmfReader_loadInner = function _SmfReader_loadInner() {
    console.log("Parsing a midi file with a new parser...");
    __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_ensureU32).call(this, 0x4d546864); // MIDI header
    __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_ensureU32).call(this, 6); // Header length
    __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_withReader).call(this, (rd) => {
        // Parse MIDI header.
        const type = rd.readU16();
        if (type > 2) {
            throw "Invalid file format: " + type;
        }
        const numTracks = rd.readU16();
        const ticksPerBeat = rd.readU16();
        if (ticksPerBeat >= 0x8000) {
            throw "SMPTE time format not supported";
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
            __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_ensureU32).call(this, 0x4d54726B); // Track header
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
                }
                else {
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
                __classPrivateFieldGet(this, _SmfReader_events, "f").push(ev);
            }
        }
    });
    console.log("Done parsing");
};
export class SmfWriter {
    constructor() {
        _SmfWriter_instances.add(this);
        _SmfWriter_writer.set(this, new BytesWriter());
        _SmfWriter_trackLengthPos.set(this, 0);
        _SmfWriter_closed.set(this, false);
        __classPrivateFieldGet(this, _SmfWriter_instances, "m", _SmfWriter_withWriter).call(this, (w) => {
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
            __classPrivateFieldSet(this, _SmfWriter_trackLengthPos, w.getSize(), "f");
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
            __classPrivateFieldGet(this, _SmfWriter_instances, "m", _SmfWriter_writeResetData).call(this);
        });
    }
    close() {
        if (__classPrivateFieldGet(this, _SmfWriter_closed, "f")) {
            return;
        }
        __classPrivateFieldSet(this, _SmfWriter_closed, true, "f");
        __classPrivateFieldGet(this, _SmfWriter_instances, "m", _SmfWriter_withWriter).call(this, (w) => {
            // end of track
            w.writeVar(0); // time
            w.writeU8(0xff);
            w.writeU8(0x2f);
            w.writeU8(0x00);
            let pos = w.getSize();
            w.setU32(__classPrivateFieldGet(this, _SmfWriter_trackLengthPos, "f"), pos - __classPrivateFieldGet(this, _SmfWriter_trackLengthPos, "f") - 4);
        });
    }
    getBlob() {
        this.close();
        return __classPrivateFieldGet(this, _SmfWriter_writer, "f").getBlob("audio/mid");
    }
    download(filename) {
        downloadMidi(this.getBlob(), filename);
    }
    writeMessage(deltaTimeMs, data) {
        __classPrivateFieldGet(this, _SmfWriter_writer, "f").writeVar(deltaTimeMs / (1000 / TICKS_PER_SECOND));
        for (let d of data) {
            __classPrivateFieldGet(this, _SmfWriter_writer, "f").writeU8(d);
        }
    }
}
_SmfWriter_writer = new WeakMap(), _SmfWriter_trackLengthPos = new WeakMap(), _SmfWriter_closed = new WeakMap(), _SmfWriter_instances = new WeakSet(), _SmfWriter_withWriter = function _SmfWriter_withWriter(callback) {
    callback(__classPrivateFieldGet(this, _SmfWriter_writer, "f"));
}, _SmfWriter_writeResetData = function _SmfWriter_writeResetData() {
    __classPrivateFieldGet(this, _SmfWriter_instances, "m", _SmfWriter_withWriter).call(this, (w) => {
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
};
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
    reader.onload = function () {
        element.href = reader.result; // data url
        element.click();
        document.body.removeChild(element);
    };
}
// Returns a promise
export function loadMidi(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (_event) {
            const ar = new Uint8Array(reader.result);
            console.log("Read from file", file);
            try {
                resolve((new SmfReader(ar)).getEvents());
            }
            catch (error) {
                if (reject)
                    reject(error);
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
//# sourceMappingURL=smf.js.map