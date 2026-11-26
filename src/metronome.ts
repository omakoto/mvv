/**
 * @file metronome.ts
 * @description Implements metronome options, BPM/polyrhythm/auto-tempo scheduling logic
 * (BpmManager), and Tone.js-backed audio playback (Metronome).
 */

'use strict';

import { DEBUG, info } from './util.js';

declare const Tone: any;

export class MetronomeOptions {
    bpm: number = 120;
    beats: number = 4;
    subBeats: number = 1;

    automaticIncrease: boolean = false;
    increaseAfterBars: number = 0;
    increaseAfterSeconds: number = 0;
    increaseBpm: number = 0;
    increaseMaxBpm: number = 0;

    automaticDecrease: boolean = false;
    decreaseAfterBars: number = 0;
    decreaseAfterSeconds: number = 0;
    decreaseBpm: number = 0;
    decreaseMinBpm: number = 0;

    copy(): MetronomeOptions {
        const copy = new MetronomeOptions();
        Object.assign(copy, this);
        return copy;
    }

    static fromJson(json: string): MetronomeOptions {
        const obj = JSON.parse(json);

        const copy = new MetronomeOptions();
        Object.assign(copy, obj);
        return copy;
    }
}

export class BpmManager {
    #options: MetronomeOptions;
    #now: () => number;

    #bpm = 0;
    #beats = 0;
    #subBeats = 0;

    #intervalSec = 0;
    #cycle = 0;
    #posInCycle = 0;

    #mode = 0; // 0 == no increase/decrease, 1 == increasing, 2 == decreasing

    #currentBar = -1;

    #lastChangedBar = 0;
    #lastChangedTime = 0;

    constructor(opts: MetronomeOptions, now: () => number = () => performance.now()) {
        this.#options = opts.copy();
        this.#now = now;

        this.#bpm = Math.max(10, opts.bpm);
        this.#beats = Math.max(1, opts.beats);
        this.#subBeats = Math.max(1, opts.subBeats);
        if (this.#beats === this.#subBeats) {
            this.#subBeats = 1;
        }

        this.#cycle = this.#beats * this.#subBeats;

        this.#updateInterval();

        // Initialize automatic tempo ramp direction
        if (opts.automaticIncrease && this.#bpm < opts.increaseMaxBpm) {
            this.#mode = 1;
        } else if (opts.automaticDecrease && this.#bpm > opts.decreaseMinBpm) {
            this.#mode = 2;
        }

        this.#lastChangedTime = this.#now();
    }

    #updateInterval(): void {
        const measureMs = 60_000 / (this.#bpm / this.#beats);
        this.#intervalSec = (measureMs / this.#cycle) / 1000.0;
    }

    get options(): MetronomeOptions {
        return this.#options;
    }

    get bpm(): number {
        return this.#bpm;
    }

    get beats(): number {
        return this.#beats;
    }

    get subBeats(): number {
        return this.#subBeats;
    }

    get intervalSec(): number {
        return this.#intervalSec;
    }

    get cycle(): number {
        return this.#cycle;
    }

    get posInCycle(): number {
        return this.#posInCycle;
    }

    adjustTempo(increment: number): void {
        if (increment == 0) {
            return;
        }
        this.#bpm = Math.min(500, Math.max(10, this.#bpm + increment));
        this.#updateInterval();
        info("Tempo set to " + this.#bpm);
    }

    advance(): void {
        const curPos = this.#posInCycle;

        this.#posInCycle++;
        if (this.#posInCycle >= this.#cycle) {
            this.#posInCycle = 0;
        }

        if (this.#mode === 0) {
            return;
        }

        const increasing = this.#mode === 1;

        if (curPos == 0) {
            this.#currentBar++;
            if (DEBUG) {
                console.log("Bar=" + this.#currentBar);
            }
        }
        const now = this.#now();
        const sinceLastChangeBar = this.#currentBar - this.#lastChangedBar;
        const sinceLastChangeSec = Math.floor((now - this.#lastChangedTime) / 1000);
        let changed = false;
        if (DEBUG) {
            console.log("Metronome advance: bar=" + this.#currentBar
                + " posInCycle=" + this.#posInCycle + " mode=" + this.#mode
                + " delta bar=" + sinceLastChangeBar + " delta sec=" + sinceLastChangeSec);
        }
        if (increasing) {
            let doIncrease = false;
            if (this.#options.increaseAfterBars > 0 && sinceLastChangeBar >= this.#options.increaseAfterBars) {
                doIncrease = true;
            }
            if (this.#options.increaseAfterSeconds > 0 && sinceLastChangeSec >= this.#options.increaseAfterSeconds) {
                doIncrease = true;
            }
            if (doIncrease) {
                changed = true;

                this.#bpm = Math.min(this.#bpm + this.#options.increaseBpm, this.#options.increaseMaxBpm);
                if (this.#bpm >= this.#options.increaseMaxBpm) {
                    this.#mode = this.#options.automaticDecrease ? 2 : 0;
                }
            }
        } else {
            let doDecrease = false;
            if (this.#options.decreaseAfterBars > 0 && sinceLastChangeBar >= this.#options.decreaseAfterBars) {
                doDecrease = true;
            }
            if (this.#options.decreaseAfterSeconds > 0 && sinceLastChangeSec >= this.#options.decreaseAfterSeconds) {
                doDecrease = true;
            }
            if (doDecrease) {
                changed = true;

                this.#bpm = Math.max(this.#bpm - this.#options.decreaseBpm, this.#options.decreaseMinBpm);
                if (this.#bpm <= this.#options.decreaseMinBpm) {
                    this.#mode = this.#options.automaticIncrease ? 1 : 0;
                }
            }
        }
        if (changed) {
            this.#lastChangedBar = this.#currentBar;
            this.#lastChangedTime = now;
            this.#updateInterval();
            const msg = "Tempo changed to " + this.#bpm + " BPM";
            if (DEBUG) {
                console.log(msg + " mode=" + this.#mode);
            }
            info(msg);
        }
    }
}

export interface MetronomeDeps {
    onBeatLine?: (lineType: number) => void;
    tone?: any;
    now?: () => number;
}

export class Metronome {
    #playing = false;
    #session = 0;
    #bpmm: BpmManager | null = null;
    #nextTime = 0;
    #synth: any = null;
    #onBeatLine?: (lineType: number) => void;
    #toneOverride?: any;
    #now: () => number;

    constructor(deps: MetronomeDeps = {}) {
        this.#onBeatLine = deps.onBeatLine;
        this.#toneOverride = deps.tone;
        this.#now = deps.now ?? (() => performance.now());
    }

    setOnBeatLine(callback: (lineType: number) => void): void {
        this.#onBeatLine = callback;
    }

    #getTone(): any {
        return this.#toneOverride ?? (typeof Tone !== 'undefined' ? Tone : null);
    }

    #ensureSynth(tone: any): any {
        if (!this.#synth) {
            this.#synth = new tone.PolySynth(tone.Synth).toDestination();
        }
        return this.#synth;
    }

    get isPlaying(): boolean {
        return this.#playing;
    }

    get currentBpm(): number | null {
        return this.#bpmm ? this.#bpmm.bpm : null;
    }

    start(opts: MetronomeOptions): void {
        if (this.isPlaying) {
            return;
        }
        const tone = this.#getTone();
        this.#ensureSynth(tone);

        console.log("Metronome start: options=", opts);
        this.#bpmm = new BpmManager(opts, this.#now);

        this.#nextTime = 0;
        const session = ++this.#session;
        this.#playing = true;

        tone.start();
        tone.Transport.cancel();
        tone.Transport.seconds = 0;
        tone.Transport.start();
        tone.Transport.scheduleOnce((time: any) => this.#beat(time, session), "+0");
    }

    #beat(time: any, session: number): void {
        if (!this.#playing || session !== this.#session) {
            return;
        }
        const tone = this.#getTone();
        const bpmm = this.#bpmm!;
        const pos = bpmm.posInCycle;

        const accent = (pos === 0 && bpmm.beats > 1);

        let lineType = -1;

        if (bpmm.subBeats > 1 && ((pos % bpmm.beats) === 0)) {
            lineType = 2;

            const note = (pos === 0) ? "E6" : "E5";
            this.#synth.triggerAttackRelease(note, 0.05, time, 0.8);
        }
        if ((pos % bpmm.subBeats) === 0) {
            lineType = 1;

            const note = accent ? "A5" : "A4";
            this.#synth.triggerAttackRelease(note, 0.05, time, 0.8);
        }
        if (accent) {
            lineType = 0; // Force accent color
        }

        if (lineType >= 0) {
            const scheduledLineType = lineType;
            tone.Draw.schedule(() => {
                if (!this.#playing || session !== this.#session) {
                    return;
                }
                this.#onBeatLine?.(scheduledLineType);
            }, time);
        }

        // Schedule the next beat tick.
        bpmm.advance();
        this.#nextTime += bpmm.intervalSec;
        tone.Transport.scheduleOnce((nextTime: any) => this.#beat(nextTime, session), this.#nextTime);
    }

    stop(): void {
        if (!this.isPlaying) {
            return;
        }
        this.#playing = false;
        this.#session++;

        const tone = this.#getTone();
        tone.Transport.stop();
        tone.Transport.cancel();
    }

    adjustTempo(increment: number): void {
        if (this.#bpmm) {
            this.#bpmm.adjustTempo(increment);
        }
    }
}
