/**
 * @file midi-status.ts
 * @description Tracks active MIDI note state, velocities, pedal depths, and tick-based
 * visibility compensation for short trigger notes.
 */
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
var _MidiRenderingStatus_tick, _MidiRenderingStatus_notes, _MidiRenderingStatus_damperPedal, _MidiRenderingStatus_sostenuto, _MidiRenderingStatus_onNoteCountInTick, _MidiRenderingStatus_offNoteCountInTick, _MidiRenderingStatus_lastNoteOnTick, _MidiRenderingStatus_lastNoteOffTick, _MidiRenderingStatus_onActivity, _MidiRenderingStatus_now;
import { NOTES_COUNT, SHORTEST_NOTE_LENGTH } from './config.js';
export class MidiRenderingNoteStatus {
    constructor() {
        this.noteOn = false;
        this.note = 0;
        this.velocity = 0;
        this.onTick = 0;
        this.offTick = 0;
        // Timestamps recorded via the clock (default: performance.now()).
        this.onTime = 0;
        this.offTime = 0;
        this.reset();
    }
    reset() {
        this.noteOn = false;
        this.note = 0;
        this.velocity = 0;
        this.onTick = -99999;
        this.offTick = -99999;
    }
    copy() {
        const copy = new MidiRenderingNoteStatus();
        Object.assign(copy, this);
        return copy;
    }
}
export class MidiRenderingStatus {
    constructor(options = {}) {
        var _a;
        _MidiRenderingStatus_tick.set(this, 0);
        _MidiRenderingStatus_notes.set(this, []);
        _MidiRenderingStatus_damperPedal.set(this, 0);
        _MidiRenderingStatus_sostenuto.set(this, 0);
        _MidiRenderingStatus_onNoteCountInTick.set(this, 0);
        _MidiRenderingStatus_offNoteCountInTick.set(this, 0);
        _MidiRenderingStatus_lastNoteOnTick.set(this, 0);
        _MidiRenderingStatus_lastNoteOffTick.set(this, 0);
        _MidiRenderingStatus_onActivity.set(this, void 0);
        _MidiRenderingStatus_now.set(this, void 0);
        __classPrivateFieldSet(this, _MidiRenderingStatus_onActivity, options.onActivity, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_now, (_a = options.now) !== null && _a !== void 0 ? _a : (() => performance.now()), "f");
        this.reset();
    }
    setOnActivity(callback) {
        __classPrivateFieldSet(this, _MidiRenderingStatus_onActivity, callback, "f");
    }
    get currentTick() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
    }
    onMidiMessage(ev) {
        var _a;
        var _b, _c;
        const status = ev.status;
        const data1 = ev.data1;
        const data2 = ev.data2;
        if (ev.isNoteOn) {
            const n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1];
            if (n.noteOn) {
                return; // Already on
            }
            __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCountInTick, (_b = __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCountInTick, "f"), _b++, _b), "f");
            n.noteOn = true;
            n.velocity = data2;
            n.note = data1;
            n.onTick = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
            n.onTime = __classPrivateFieldGet(this, _MidiRenderingStatus_now, "f").call(this);
            __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOnTick, __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f"), "f");
        }
        else if (ev.isNoteOff) {
            const n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[data1];
            if (!n.noteOn) {
                return; // Already off
            }
            __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCountInTick, (_c = __classPrivateFieldGet(this, _MidiRenderingStatus_offNoteCountInTick, "f"), _c++, _c), "f");
            n.noteOn = false;
            n.offTick = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
            n.offTime = __classPrivateFieldGet(this, _MidiRenderingStatus_now, "f").call(this);
            __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOffTick, __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f"), "f");
        }
        else if (status === 176) { // Control Change
            switch (data1) {
                case 64: // Damper pedal (sustain)
                case 11: // Expression (mapped to damper for digital wind instruments)
                    __classPrivateFieldSet(this, _MidiRenderingStatus_damperPedal, data2, "f");
                    break;
                case 66: // Sostenuto pedal
                    __classPrivateFieldSet(this, _MidiRenderingStatus_sostenuto, data2, "f");
                    break;
            }
        }
        (_a = __classPrivateFieldGet(this, _MidiRenderingStatus_onActivity, "f")) === null || _a === void 0 ? void 0 : _a.call(this);
    }
    reset() {
        __classPrivateFieldSet(this, _MidiRenderingStatus_tick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_notes, new Array(NOTES_COUNT), "f");
        for (let i = 0; i < NOTES_COUNT; i++) {
            __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[i] = new MidiRenderingNoteStatus();
        }
        __classPrivateFieldSet(this, _MidiRenderingStatus_damperPedal, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_sostenuto, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCountInTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCountInTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOnTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_lastNoteOffTick, 0, "f");
    }
    afterDraw(_time) {
        var _a;
        __classPrivateFieldSet(this, _MidiRenderingStatus_tick, (_a = __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f"), _a++, _a), "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_onNoteCountInTick, 0, "f");
        __classPrivateFieldSet(this, _MidiRenderingStatus_offNoteCountInTick, 0, "f");
    }
    get onNoteCountInTick() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_onNoteCountInTick, "f");
    }
    get offNoteCountInTick() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_offNoteCountInTick, "f");
    }
    get damperPedal() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_damperPedal, "f");
    }
    get sostenuto() {
        return __classPrivateFieldGet(this, _MidiRenderingStatus_sostenuto, "f");
    }
    getNote(noteIndex) {
        const n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
        if (n.noteOn) {
            return n;
        }
        else if ((__classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - n.onTick) <= SHORTEST_NOTE_LENGTH) {
            // Keep very short notes visible for at least SHORTEST_NOTE_LENGTH ticks
            // without mutating the underlying off-timestamp fields.
            const copy = n.copy();
            copy.noteOn = true;
            return copy;
        }
        else {
            return n;
        }
    }
    needsAnimation() {
        return (__classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - __classPrivateFieldGet(this, _MidiRenderingStatus_lastNoteOnTick, "f")) <= SHORTEST_NOTE_LENGTH ||
            (__classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - __classPrivateFieldGet(this, _MidiRenderingStatus_lastNoteOffTick, "f")) <= SHORTEST_NOTE_LENGTH;
    }
    isJustPressed(noteIndex) {
        const n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
        // A note is "just pressed" if its on-tick is the current tick,
        // even if it was already released within the same tick.
        return n.onTick === __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f");
    }
    /**
     * Returns info for all notes currently considered "on", including their press timestamp.
     */
    getPressedNotes() {
        const pressed = [];
        for (let i = 0; i < NOTES_COUNT; i++) {
            const n = this.getNote(i);
            if (n.noteOn) {
                pressed.push(n);
            }
        }
        return pressed;
    }
    getLastNoteOffAgeTick(noteIndex) {
        const n = __classPrivateFieldGet(this, _MidiRenderingStatus_notes, "f")[noteIndex];
        return __classPrivateFieldGet(this, _MidiRenderingStatus_tick, "f") - n.offTick;
    }
}
_MidiRenderingStatus_tick = new WeakMap(), _MidiRenderingStatus_notes = new WeakMap(), _MidiRenderingStatus_damperPedal = new WeakMap(), _MidiRenderingStatus_sostenuto = new WeakMap(), _MidiRenderingStatus_onNoteCountInTick = new WeakMap(), _MidiRenderingStatus_offNoteCountInTick = new WeakMap(), _MidiRenderingStatus_lastNoteOnTick = new WeakMap(), _MidiRenderingStatus_lastNoteOffTick = new WeakMap(), _MidiRenderingStatus_onActivity = new WeakMap(), _MidiRenderingStatus_now = new WeakMap();
//# sourceMappingURL=midi-status.js.map