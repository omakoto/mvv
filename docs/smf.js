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
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
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
var _MidiEvent_timestamp, _MidiEvent_data, _MidiEvent_device, _BytesWriter_instances, _BytesWriter_cap, _BytesWriter_size, _BytesWriter_buf, _BytesWriter_ensureCap, _BytesReader_buffer, _BytesReader_pos, _TickConverter_instances, _TickConverter_ticksPerBeat, _TickConverter_tempos, _TickConverter_lastTempoEvent, _TickConverter_ticksToMilliseconds, _SmfReader_instances, _SmfReader_reader, _SmfReader_loaded, _SmfReader_events, _SmfReader_onInvalidFormat, _SmfReader_ensureU32, _SmfReader_cleanEvents, _SmfReader_load, _SmfReader_loadInner, _SmfWriter_instances, _SmfWriter_writer, _SmfWriter_trackLengthPos, _SmfWriter_closed, _SmfWriter_writeResetData;
import { debug } from './util.js';
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
function byteToHex(byte, uppercase = true) {
    const hex = ("0" + byte.toString(16)).slice(-2);
    return uppercase ? hex.toUpperCase() : hex;
}
export class MidiEvent {
    constructor(timestamp, data, device) {
        _MidiEvent_timestamp.set(this, void 0);
        _MidiEvent_data.set(this, void 0);
        _MidiEvent_device.set(this, void 0);
        __classPrivateFieldSet(this, _MidiEvent_timestamp, timestamp, "f");
        __classPrivateFieldSet(this, _MidiEvent_data, data, "f");
        __classPrivateFieldSet(this, _MidiEvent_device, device !== null && device !== void 0 ? device : "unknown-device", "f");
    }
    static fromNativeEvent(e) {
        return new MidiEvent(e.timeStamp, e.data, e.currentTarget.name);
    }
    clone() {
        const dataCopy = Array.isArray(__classPrivateFieldGet(this, _MidiEvent_data, "f"))
            ? [...__classPrivateFieldGet(this, _MidiEvent_data, "f")]
            : new Uint8Array(__classPrivateFieldGet(this, _MidiEvent_data, "f"));
        return new MidiEvent(__classPrivateFieldGet(this, _MidiEvent_timestamp, "f"), dataCopy, __classPrivateFieldGet(this, _MidiEvent_device, "f"));
    }
    withTimestamp(timestamp) {
        return new MidiEvent(timestamp, __classPrivateFieldGet(this, _MidiEvent_data, "f"), __classPrivateFieldGet(this, _MidiEvent_device, "f"));
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
            throw new RangeError("Index cannot be negative");
        }
        if (index >= __classPrivateFieldGet(this, _MidiEvent_data, "f").length) {
            return 0;
        }
        return __classPrivateFieldGet(this, _MidiEvent_data, "f")[index];
    }
    replaceData(index, value) {
        if (index < 0) {
            throw new RangeError("Index cannot be negative");
        }
        if (index >= __classPrivateFieldGet(this, _MidiEvent_data, "f").length) {
            throw new RangeError("Index out of range");
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
    get isCC() {
        return this.status === 0xB0;
    }
    getDataAsArray() {
        return __classPrivateFieldGet(this, _MidiEvent_data, "f");
    }
    toString() {
        const formattedTime = (Math.floor(this.timestamp * 1000) / 1000).toFixed(3);
        const hexString = Array.from(__classPrivateFieldGet(this, _MidiEvent_data, "f")).map(byte => byteToHex(byte)).join(' ');
        const description = this.describeMidiEvent();
        return `time=${formattedTime}, data=${hexString}: ${description}`;
    }
    describeMidiEvent() {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        const data = __classPrivateFieldGet(this, _MidiEvent_data, "f");
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
                const note = (_a = data[1]) !== null && _a !== void 0 ? _a : 0;
                const velocity = (_b = data[2]) !== null && _b !== void 0 ? _b : 0;
                details = `Note: ${note}, Vel: ${velocity}`;
                break;
            }
            case 0xB: { // Control Change
                const controllerNumber = (_c = data[1]) !== null && _c !== void 0 ? _c : 0;
                const controllerValue = (_d = data[2]) !== null && _d !== void 0 ? _d : 0;
                const controllerName = MIDI_CONTROL_CHANGE[controllerNumber] || `CC #${controllerNumber}`;
                details = `${controllerName}: ${controllerValue}`;
                break;
            }
            case 0xE: { // Pitch Bend
                // Combine two 7-bit bytes into a 14-bit value. Center is 8192.
                const val1 = (_e = data[1]) !== null && _e !== void 0 ? _e : 0;
                const val2 = (_f = data[2]) !== null && _f !== void 0 ? _f : 0;
                const pitchValue = ((val2 << 7) | val1) - 8192;
                details = `Value: ${pitchValue}`;
                break;
            }
            case 0xA: { // Polyphonic Key Pressure (Note Aftertouch)
                const pressureNote = (_g = data[1]) !== null && _g !== void 0 ? _g : 0;
                const pressureValue = (_h = data[2]) !== null && _h !== void 0 ? _h : 0;
                details = `Note: ${pressureNote}, Pressure: ${pressureValue}`;
                break;
            }
            case 0xD: { // Channel Pressure (Channel Aftertouch)
                const channelPressure = (_j = data[1]) !== null && _j !== void 0 ? _j : 0;
                details = `Pressure: ${channelPressure}`;
                break;
            }
            case 0xC: { // Program Change
                const programNum = (_k = data[1]) !== null && _k !== void 0 ? _k : 0;
                details = `Program: ${programNum}`;
                break;
            }
        }
        return `${eventName} (ch:${channel}) [${details}]`;
    }
}
_MidiEvent_timestamp = new WeakMap(), _MidiEvent_data = new WeakMap(), _MidiEvent_device = new WeakMap();
const TICKS_PER_SECOND = 1000;
class BytesWriter {
    constructor(initialCapacity = 4096) {
        _BytesWriter_instances.add(this);
        _BytesWriter_cap.set(this, void 0);
        _BytesWriter_size.set(this, 0);
        _BytesWriter_buf.set(this, void 0);
        __classPrivateFieldSet(this, _BytesWriter_cap, initialCapacity, "f");
        __classPrivateFieldSet(this, _BytesWriter_buf, new Uint8Array(__classPrivateFieldGet(this, _BytesWriter_cap, "f")), "f");
    }
    writeVar(value) {
        if (value < 0) {
            throw new RangeError("Value must be non-negative.");
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
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos] = val & 255;
        return this;
    }
    setU16(pos, val) {
        __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_ensureCap).call(this, pos + 2);
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos] = (val >> 8) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 1] = val & 255;
        return this;
    }
    setU24(pos, val) {
        __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_ensureCap).call(this, pos + 3);
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos] = (val >> 16) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 1] = (val >> 8) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 2] = val & 255;
        return this;
    }
    setU32(pos, val) {
        __classPrivateFieldGet(this, _BytesWriter_instances, "m", _BytesWriter_ensureCap).call(this, pos + 4);
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos] = (val >> 24) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 1] = (val >> 16) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 2] = (val >> 8) & 255;
        __classPrivateFieldGet(this, _BytesWriter_buf, "f")[pos + 3] = val & 255;
        return this;
    }
    getSize() {
        return __classPrivateFieldGet(this, _BytesWriter_size, "f");
    }
    getBlob(contentType) {
        return new Blob([__classPrivateFieldGet(this, _BytesWriter_buf, "f").subarray(0, __classPrivateFieldGet(this, _BytesWriter_size, "f"))], { type: contentType });
    }
}
_BytesWriter_cap = new WeakMap(), _BytesWriter_size = new WeakMap(), _BytesWriter_buf = new WeakMap(), _BytesWriter_instances = new WeakSet(), _BytesWriter_ensureCap = function _BytesWriter_ensureCap(requiredCap) {
    if (__classPrivateFieldGet(this, _BytesWriter_cap, "f") >= requiredCap) {
        return;
    }
    let newCap = __classPrivateFieldGet(this, _BytesWriter_cap, "f");
    while (newCap < requiredCap) {
        newCap *= 2;
    }
    __classPrivateFieldSet(this, _BytesWriter_cap, newCap, "f");
    const newBuf = new Uint8Array(__classPrivateFieldGet(this, _BytesWriter_cap, "f"));
    newBuf.set(__classPrivateFieldGet(this, _BytesWriter_buf, "f"));
    __classPrivateFieldSet(this, _BytesWriter_buf, newBuf, "f");
};
class BytesReader {
    constructor(ar) {
        _BytesReader_buffer.set(this, void 0);
        _BytesReader_pos.set(this, 0);
        __classPrivateFieldSet(this, _BytesReader_buffer, ar, "f");
    }
    readU8() {
        var _a, _b;
        if (__classPrivateFieldGet(this, _BytesReader_buffer, "f").length <= __classPrivateFieldGet(this, _BytesReader_pos, "f")) {
            throw new Error("Reading after EOF");
        }
        return __classPrivateFieldGet(this, _BytesReader_buffer, "f")[__classPrivateFieldSet(this, _BytesReader_pos, (_b = __classPrivateFieldGet(this, _BytesReader_pos, "f"), _a = _b++, _b), "f"), _a];
    }
    readU16() {
        return (this.readU8() << 8) + this.readU8();
    }
    readU24() {
        return (this.readU16() << 8) + this.readU8();
    }
    readU32() {
        return (this.readU16() << 16) + this.readU16();
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
        this.ticks = ticks;
        this.mspb = mspb;
        this.timeOffset = timeOffset;
    }
}
/**
 * Converts "ticks" (absolute ticks from the start of the MIDI file) to milliseconds.
 */
class TickConverter {
    constructor(ticksPerBeat) {
        _TickConverter_instances.add(this);
        _TickConverter_ticksPerBeat.set(this, void 0);
        _TickConverter_tempos.set(this, []);
        _TickConverter_lastTempoEvent.set(this, void 0);
        __classPrivateFieldSet(this, _TickConverter_ticksPerBeat, ticksPerBeat, "f");
        // Start with an arbitrary initial tempo of 120 BPM (500,000 microseconds per beat)
        __classPrivateFieldSet(this, _TickConverter_lastTempoEvent, new TempoEvent(0, 500000, 0), "f");
        __classPrivateFieldGet(this, _TickConverter_tempos, "f").push(__classPrivateFieldGet(this, _TickConverter_lastTempoEvent, "f"));
    }
    setTempo(ticks, microsecondsPerBeat) {
        const last = __classPrivateFieldGet(this, _TickConverter_lastTempoEvent, "f");
        const deltaTicks = ticks - last.ticks;
        const deltaTimeOffset = __classPrivateFieldGet(this, _TickConverter_instances, "m", _TickConverter_ticksToMilliseconds).call(this, deltaTicks, last.mspb);
        const timeOffset = last.timeOffset + deltaTimeOffset;
        __classPrivateFieldSet(this, _TickConverter_lastTempoEvent, new TempoEvent(ticks, microsecondsPerBeat, timeOffset), "f");
        __classPrivateFieldGet(this, _TickConverter_tempos, "f").push(__classPrivateFieldGet(this, _TickConverter_lastTempoEvent, "f"));
    }
    /**
     * Converts a absolute MIDI tick number to milliseconds.
     */
    getTime(ticks) {
        if (ticks < 0) {
            throw new RangeError("ticks must not be negative");
        }
        let nearestTempo = __classPrivateFieldGet(this, _TickConverter_tempos, "f")[0];
        for (const t of __classPrivateFieldGet(this, _TickConverter_tempos, "f")) {
            if (t.ticks > ticks) {
                break;
            }
            nearestTempo = t;
        }
        return nearestTempo.timeOffset + __classPrivateFieldGet(this, _TickConverter_instances, "m", _TickConverter_ticksToMilliseconds).call(this, ticks - nearestTempo.ticks, nearestTempo.mspb);
    }
}
_TickConverter_ticksPerBeat = new WeakMap(), _TickConverter_tempos = new WeakMap(), _TickConverter_lastTempoEvent = new WeakMap(), _TickConverter_instances = new WeakSet(), _TickConverter_ticksToMilliseconds = function _TickConverter_ticksToMilliseconds(ticks, mspb) {
    return ((ticks / __classPrivateFieldGet(this, _TickConverter_ticksPerBeat, "f")) * mspb) / 1000;
};
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
    throw new Error(`Unexpected byte found near index ${__classPrivateFieldGet(this, _SmfReader_reader, "f").getPos() - 1}`);
}, _SmfReader_ensureU32 = function _SmfReader_ensureU32(v) {
    if (__classPrivateFieldGet(this, _SmfReader_reader, "f").readU32() !== v) {
        __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_onInvalidFormat).call(this);
    }
}, _SmfReader_cleanEvents = function _SmfReader_cleanEvents() {
    __classPrivateFieldGet(this, _SmfReader_events, "f").sort((a, b) => a.timestamp - b.timestamp);
    // Find the first Note On event to use as the timing anchor
    const firstNoteOn = __classPrivateFieldGet(this, _SmfReader_events, "f").find(ev => ev.isNoteOn);
    if (!firstNoteOn || firstNoteOn.timestamp === 0) {
        return;
    }
    const shiftTime = firstNoteOn.timestamp;
    for (const ev of __classPrivateFieldGet(this, _SmfReader_events, "f")) {
        ev.shiftTime(-shiftTime);
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
    debug("Parsing a midi file with a new parser...");
    __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_ensureU32).call(this, 0x4d546864); // MIDI "MThd" header
    __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_ensureU32).call(this, 6); // Header length must be 6
    const rd = __classPrivateFieldGet(this, _SmfReader_reader, "f");
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
        __classPrivateFieldGet(this, _SmfReader_instances, "m", _SmfReader_ensureU32).call(this, 0x4d54726b); // Track "MTrk" header
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
            let data1;
            if (status >= 0x80) {
                data1 = rd.readU8();
            }
            else {
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
            __classPrivateFieldGet(this, _SmfReader_events, "f").push(ev);
        }
        const bytesRead = rd.getPos() - trackStart;
        if (bytesRead < trackLen) {
            rd.skip(trackLen - bytesRead);
        }
    }
    debug("Done parsing MIDI file.");
};
export class SmfWriter {
    constructor() {
        _SmfWriter_instances.add(this);
        _SmfWriter_writer.set(this, new BytesWriter());
        _SmfWriter_trackLengthPos.set(this, 0);
        _SmfWriter_closed.set(this, false);
        const w = __classPrivateFieldGet(this, _SmfWriter_writer, "f");
        w.writeU32(0x4D546864); // "MThd" header
        w.writeU32(6); // Header length
        w.writeU16(0); // Format 0 (single track)
        w.writeU16(1); // One track
        w.writeU16(TICKS_PER_SECOND); // 1000 ticks per quarter-note (1ms resolution)
        w.writeU32(0x4D54726B); // "MTrk" track header
        __classPrivateFieldSet(this, _SmfWriter_trackLengthPos, w.getSize(), "f");
        w.writeU32(0); // Placeholder for track length
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
        w.writeU24(1000000);
        __classPrivateFieldGet(this, _SmfWriter_instances, "m", _SmfWriter_writeResetData).call(this);
    }
    close() {
        if (__classPrivateFieldGet(this, _SmfWriter_closed, "f")) {
            return;
        }
        __classPrivateFieldSet(this, _SmfWriter_closed, true, "f");
        const w = __classPrivateFieldGet(this, _SmfWriter_writer, "f");
        // End of Track Meta Event (0xFF 0x2F 0x00)
        w.writeVar(0);
        w.writeU8(0xFF);
        w.writeU8(0x2F);
        w.writeU8(0x00);
        const pos = w.getSize();
        w.setU32(__classPrivateFieldGet(this, _SmfWriter_trackLengthPos, "f"), pos - __classPrivateFieldGet(this, _SmfWriter_trackLengthPos, "f") - 4);
    }
    getBlob() {
        this.close();
        return __classPrivateFieldGet(this, _SmfWriter_writer, "f").getBlob("audio/mid");
    }
    download(filename) {
        downloadMidi(this.getBlob(), filename);
    }
    writeMessage(deltaTimeMs, data) {
        __classPrivateFieldGet(this, _SmfWriter_writer, "f").writeVar(deltaTimeMs);
        for (const d of data) {
            __classPrivateFieldGet(this, _SmfWriter_writer, "f").writeU8(d);
        }
    }
}
_SmfWriter_writer = new WeakMap(), _SmfWriter_trackLengthPos = new WeakMap(), _SmfWriter_closed = new WeakMap(), _SmfWriter_instances = new WeakSet(), _SmfWriter_writeResetData = function _SmfWriter_writeResetData() {
    const w = __classPrivateFieldGet(this, _SmfWriter_writer, "f");
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
};
function downloadMidi(blob, filename = "unnamed.mid") {
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
export function loadMidi(file) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const buffer = yield file.arrayBuffer();
            const ar = new Uint8Array(buffer);
            debug("Read from file", file);
            return new SmfReader(ar).getEvents();
        }
        catch (error) {
            console.error("Failed to load MIDI file:", error);
            throw error;
        }
    });
}
//# sourceMappingURL=smf.js.map