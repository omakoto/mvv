/**
 * @file midi-status.ts
 * @description Tracks active MIDI note state, velocities, pedal depths, and tick-based
 * visibility compensation for short trigger notes.
 */
'use strict';
import { NOTES_COUNT, SHORTEST_NOTE_LENGTH } from './config.js';
export class MidiRenderingNoteStatus {
    noteOn = false;
    note = 0;
    velocity = 0;
    onTick = 0;
    offTick = 0;
    // Timestamps recorded via the clock (default: performance.now()).
    onTime = 0;
    offTime = 0;
    constructor() {
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
    #tick = 0;
    #notes = [];
    #damperPedal = 0;
    #sostenuto = 0;
    #onNoteCountInTick = 0;
    #offNoteCountInTick = 0;
    #lastNoteOnTick = 0;
    #lastNoteOffTick = 0;
    #onActivity;
    #now;
    constructor(options = {}) {
        this.#onActivity = options.onActivity;
        this.#now = options.now ?? (() => performance.now());
        this.reset();
    }
    setOnActivity(callback) {
        this.#onActivity = callback;
    }
    get currentTick() {
        return this.#tick;
    }
    onMidiMessage(ev) {
        const status = ev.status;
        const data1 = ev.data1;
        const data2 = ev.data2;
        if (ev.isNoteOn) {
            const n = this.#notes[data1];
            if (n.noteOn) {
                return; // Already on
            }
            this.#onNoteCountInTick++;
            n.noteOn = true;
            n.velocity = data2;
            n.note = data1;
            n.onTick = this.#tick;
            n.onTime = this.#now();
            this.#lastNoteOnTick = this.#tick;
        }
        else if (ev.isNoteOff) {
            const n = this.#notes[data1];
            if (!n.noteOn) {
                return; // Already off
            }
            this.#offNoteCountInTick++;
            n.noteOn = false;
            n.offTick = this.#tick;
            n.offTime = this.#now();
            this.#lastNoteOffTick = this.#tick;
        }
        else if (status === 176) { // Control Change
            switch (data1) {
                case 64: // Damper pedal (sustain)
                case 11: // Expression (mapped to damper for digital wind instruments)
                    this.#damperPedal = data2;
                    break;
                case 66: // Sostenuto pedal
                    this.#sostenuto = data2;
                    break;
            }
        }
        this.#onActivity?.();
    }
    reset() {
        this.#tick = 0;
        this.#notes = new Array(NOTES_COUNT);
        for (let i = 0; i < NOTES_COUNT; i++) {
            this.#notes[i] = new MidiRenderingNoteStatus();
        }
        this.#damperPedal = 0;
        this.#sostenuto = 0;
        this.#onNoteCountInTick = 0;
        this.#offNoteCountInTick = 0;
        this.#lastNoteOnTick = 0;
        this.#lastNoteOffTick = 0;
    }
    afterDraw(_time) {
        this.#tick++;
        this.#onNoteCountInTick = 0;
        this.#offNoteCountInTick = 0;
    }
    get onNoteCountInTick() {
        return this.#onNoteCountInTick;
    }
    get offNoteCountInTick() {
        return this.#offNoteCountInTick;
    }
    get damperPedal() {
        return this.#damperPedal;
    }
    get sostenuto() {
        return this.#sostenuto;
    }
    getNote(noteIndex) {
        const n = this.#notes[noteIndex];
        if (n.noteOn) {
            return n;
        }
        else if ((this.#tick - n.onTick) <= SHORTEST_NOTE_LENGTH) {
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
        return (this.#tick - this.#lastNoteOnTick) <= SHORTEST_NOTE_LENGTH ||
            (this.#tick - this.#lastNoteOffTick) <= SHORTEST_NOTE_LENGTH;
    }
    isJustPressed(noteIndex) {
        const n = this.#notes[noteIndex];
        // A note is "just pressed" if its on-tick is the current tick,
        // even if it was already released within the same tick.
        return n.onTick === this.#tick;
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
        const n = this.#notes[noteIndex];
        return this.#tick - n.offTick;
    }
}
//# sourceMappingURL=midi-status.js.map