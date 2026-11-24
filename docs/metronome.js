/**
 * @file metronome.ts
 * @description Implements metronome options, BPM/polyrhythm/auto-tempo scheduling logic
 * (BpmManager), and Tone.js-backed audio playback (Metronome).
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
var _BpmManager_instances, _BpmManager_options, _BpmManager_now, _BpmManager_bpm, _BpmManager_beats, _BpmManager_subBeats, _BpmManager_intervalSec, _BpmManager_cycle, _BpmManager_posInCycle, _BpmManager_mode, _BpmManager_currentBar, _BpmManager_lastChangedBar, _BpmManager_lastChangedTime, _BpmManager_updateInterval, _Metronome_instances, _Metronome_playing, _Metronome_bpmm, _Metronome_nextTime, _Metronome_synth, _Metronome_onBeatLine, _Metronome_toneOverride, _Metronome_now, _Metronome_getTone, _Metronome_ensureSynth, _Metronome_beat;
import { DEBUG, info } from './util.js';
export class MetronomeOptions {
    constructor() {
        this.bpm = 120;
        this.beats = 4;
        this.subBeats = 1;
        this.automaticIncrease = false;
        this.increaseAfterBars = 0;
        this.increaseAfterSeconds = 0;
        this.increaseBpm = 0;
        this.increaseMaxBpm = 0;
        this.automaticDecrease = false;
        this.decreaseAfterBars = 0;
        this.decreaseAfterSeconds = 0;
        this.decreaseBpm = 0;
        this.decreaseMinBpm = 0;
    }
    copy() {
        const copy = new MetronomeOptions();
        Object.assign(copy, this);
        return copy;
    }
    static fromJson(json) {
        const obj = JSON.parse(json);
        const copy = new MetronomeOptions();
        Object.assign(copy, obj);
        return copy;
    }
}
export class BpmManager {
    constructor(opts, now = () => performance.now()) {
        _BpmManager_instances.add(this);
        _BpmManager_options.set(this, void 0);
        _BpmManager_now.set(this, void 0);
        _BpmManager_bpm.set(this, 0);
        _BpmManager_beats.set(this, 0);
        _BpmManager_subBeats.set(this, 0);
        _BpmManager_intervalSec.set(this, 0);
        _BpmManager_cycle.set(this, 0);
        _BpmManager_posInCycle.set(this, 0);
        _BpmManager_mode.set(this, 0); // 0 == no increase/decrease, 1 == increasing, 2 == decreasing
        _BpmManager_currentBar.set(this, -1);
        _BpmManager_lastChangedBar.set(this, 0);
        _BpmManager_lastChangedTime.set(this, 0);
        __classPrivateFieldSet(this, _BpmManager_options, opts.copy(), "f");
        __classPrivateFieldSet(this, _BpmManager_now, now, "f");
        __classPrivateFieldSet(this, _BpmManager_bpm, Math.max(10, opts.bpm), "f");
        __classPrivateFieldSet(this, _BpmManager_beats, Math.max(1, opts.beats), "f");
        __classPrivateFieldSet(this, _BpmManager_subBeats, Math.max(1, opts.subBeats), "f");
        if (__classPrivateFieldGet(this, _BpmManager_beats, "f") === __classPrivateFieldGet(this, _BpmManager_subBeats, "f")) {
            __classPrivateFieldSet(this, _BpmManager_subBeats, 1, "f");
        }
        __classPrivateFieldSet(this, _BpmManager_cycle, __classPrivateFieldGet(this, _BpmManager_beats, "f") * __classPrivateFieldGet(this, _BpmManager_subBeats, "f"), "f");
        __classPrivateFieldGet(this, _BpmManager_instances, "m", _BpmManager_updateInterval).call(this);
        // Initialize automatic tempo ramp direction
        if (opts.automaticIncrease && __classPrivateFieldGet(this, _BpmManager_bpm, "f") < opts.increaseMaxBpm) {
            __classPrivateFieldSet(this, _BpmManager_mode, 1, "f");
        }
        else if (opts.automaticDecrease && __classPrivateFieldGet(this, _BpmManager_bpm, "f") > opts.decreaseMinBpm) {
            __classPrivateFieldSet(this, _BpmManager_mode, 2, "f");
        }
        __classPrivateFieldSet(this, _BpmManager_lastChangedTime, __classPrivateFieldGet(this, _BpmManager_now, "f").call(this), "f");
    }
    get options() {
        return __classPrivateFieldGet(this, _BpmManager_options, "f");
    }
    get bpm() {
        return __classPrivateFieldGet(this, _BpmManager_bpm, "f");
    }
    get beats() {
        return __classPrivateFieldGet(this, _BpmManager_beats, "f");
    }
    get subBeats() {
        return __classPrivateFieldGet(this, _BpmManager_subBeats, "f");
    }
    get intervalSec() {
        return __classPrivateFieldGet(this, _BpmManager_intervalSec, "f");
    }
    get cycle() {
        return __classPrivateFieldGet(this, _BpmManager_cycle, "f");
    }
    get posInCycle() {
        return __classPrivateFieldGet(this, _BpmManager_posInCycle, "f");
    }
    adjustTempo(increment) {
        if (increment == 0) {
            return;
        }
        __classPrivateFieldSet(this, _BpmManager_bpm, Math.min(500, Math.max(10, __classPrivateFieldGet(this, _BpmManager_bpm, "f") + increment)), "f");
        __classPrivateFieldGet(this, _BpmManager_instances, "m", _BpmManager_updateInterval).call(this);
        info("Tempo set to " + __classPrivateFieldGet(this, _BpmManager_bpm, "f"));
    }
    advance() {
        var _a, _b;
        const curPos = __classPrivateFieldGet(this, _BpmManager_posInCycle, "f");
        __classPrivateFieldSet(this, _BpmManager_posInCycle, (_a = __classPrivateFieldGet(this, _BpmManager_posInCycle, "f"), _a++, _a), "f");
        if (__classPrivateFieldGet(this, _BpmManager_posInCycle, "f") >= __classPrivateFieldGet(this, _BpmManager_cycle, "f")) {
            __classPrivateFieldSet(this, _BpmManager_posInCycle, 0, "f");
        }
        if (__classPrivateFieldGet(this, _BpmManager_mode, "f") === 0) {
            return;
        }
        const increasing = __classPrivateFieldGet(this, _BpmManager_mode, "f") === 1;
        if (curPos == 0) {
            __classPrivateFieldSet(this, _BpmManager_currentBar, (_b = __classPrivateFieldGet(this, _BpmManager_currentBar, "f"), _b++, _b), "f");
            if (DEBUG) {
                console.log("Bar=" + __classPrivateFieldGet(this, _BpmManager_currentBar, "f"));
            }
        }
        const now = __classPrivateFieldGet(this, _BpmManager_now, "f").call(this);
        const sinceLastChangeBar = __classPrivateFieldGet(this, _BpmManager_currentBar, "f") - __classPrivateFieldGet(this, _BpmManager_lastChangedBar, "f");
        const sinceLastChangeSec = Math.floor((now - __classPrivateFieldGet(this, _BpmManager_lastChangedTime, "f")) / 1000);
        let changed = false;
        if (DEBUG) {
            console.log("Metronome advance: bar=" + __classPrivateFieldGet(this, _BpmManager_currentBar, "f")
                + " posInCycle=" + __classPrivateFieldGet(this, _BpmManager_posInCycle, "f") + " mode=" + __classPrivateFieldGet(this, _BpmManager_mode, "f")
                + " delta bar=" + sinceLastChangeBar + " delta sec=" + sinceLastChangeSec);
        }
        if (increasing) {
            let doIncrease = false;
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterBars > 0 && sinceLastChangeBar >= __classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterBars) {
                doIncrease = true;
            }
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterSeconds > 0 && sinceLastChangeSec >= __classPrivateFieldGet(this, _BpmManager_options, "f").increaseAfterSeconds) {
                doIncrease = true;
            }
            if (doIncrease) {
                changed = true;
                __classPrivateFieldSet(this, _BpmManager_bpm, Math.min(__classPrivateFieldGet(this, _BpmManager_bpm, "f") + __classPrivateFieldGet(this, _BpmManager_options, "f").increaseBpm, __classPrivateFieldGet(this, _BpmManager_options, "f").increaseMaxBpm), "f");
                if (__classPrivateFieldGet(this, _BpmManager_bpm, "f") >= __classPrivateFieldGet(this, _BpmManager_options, "f").increaseMaxBpm) {
                    __classPrivateFieldSet(this, _BpmManager_mode, __classPrivateFieldGet(this, _BpmManager_options, "f").automaticDecrease ? 2 : 0, "f");
                }
            }
        }
        else {
            let doDecrease = false;
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterBars > 0 && sinceLastChangeBar >= __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterBars) {
                doDecrease = true;
            }
            if (__classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterSeconds > 0 && sinceLastChangeSec >= __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseAfterSeconds) {
                doDecrease = true;
            }
            if (doDecrease) {
                changed = true;
                __classPrivateFieldSet(this, _BpmManager_bpm, Math.max(__classPrivateFieldGet(this, _BpmManager_bpm, "f") - __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseBpm, __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseMinBpm), "f");
                if (__classPrivateFieldGet(this, _BpmManager_bpm, "f") <= __classPrivateFieldGet(this, _BpmManager_options, "f").decreaseMinBpm) {
                    __classPrivateFieldSet(this, _BpmManager_mode, __classPrivateFieldGet(this, _BpmManager_options, "f").automaticIncrease ? 1 : 0, "f");
                }
            }
        }
        if (changed) {
            __classPrivateFieldSet(this, _BpmManager_lastChangedBar, __classPrivateFieldGet(this, _BpmManager_currentBar, "f"), "f");
            __classPrivateFieldSet(this, _BpmManager_lastChangedTime, now, "f");
            __classPrivateFieldGet(this, _BpmManager_instances, "m", _BpmManager_updateInterval).call(this);
            const msg = "Tempo changed to " + __classPrivateFieldGet(this, _BpmManager_bpm, "f") + " BPM";
            if (DEBUG) {
                console.log(msg + " mode=" + __classPrivateFieldGet(this, _BpmManager_mode, "f"));
            }
            info(msg);
        }
    }
}
_BpmManager_options = new WeakMap(), _BpmManager_now = new WeakMap(), _BpmManager_bpm = new WeakMap(), _BpmManager_beats = new WeakMap(), _BpmManager_subBeats = new WeakMap(), _BpmManager_intervalSec = new WeakMap(), _BpmManager_cycle = new WeakMap(), _BpmManager_posInCycle = new WeakMap(), _BpmManager_mode = new WeakMap(), _BpmManager_currentBar = new WeakMap(), _BpmManager_lastChangedBar = new WeakMap(), _BpmManager_lastChangedTime = new WeakMap(), _BpmManager_instances = new WeakSet(), _BpmManager_updateInterval = function _BpmManager_updateInterval() {
    const measureMs = 60000 / (__classPrivateFieldGet(this, _BpmManager_bpm, "f") / __classPrivateFieldGet(this, _BpmManager_beats, "f"));
    __classPrivateFieldSet(this, _BpmManager_intervalSec, (measureMs / __classPrivateFieldGet(this, _BpmManager_cycle, "f")) / 1000.0, "f");
};
export class Metronome {
    constructor(deps = {}) {
        var _a;
        _Metronome_instances.add(this);
        _Metronome_playing.set(this, false);
        _Metronome_bpmm.set(this, null);
        _Metronome_nextTime.set(this, 0);
        _Metronome_synth.set(this, null);
        _Metronome_onBeatLine.set(this, void 0);
        _Metronome_toneOverride.set(this, void 0);
        _Metronome_now.set(this, void 0);
        __classPrivateFieldSet(this, _Metronome_onBeatLine, deps.onBeatLine, "f");
        __classPrivateFieldSet(this, _Metronome_toneOverride, deps.tone, "f");
        __classPrivateFieldSet(this, _Metronome_now, (_a = deps.now) !== null && _a !== void 0 ? _a : (() => performance.now()), "f");
    }
    setOnBeatLine(callback) {
        __classPrivateFieldSet(this, _Metronome_onBeatLine, callback, "f");
    }
    get isPlaying() {
        return __classPrivateFieldGet(this, _Metronome_playing, "f");
    }
    get currentBpm() {
        return __classPrivateFieldGet(this, _Metronome_bpmm, "f") ? __classPrivateFieldGet(this, _Metronome_bpmm, "f").bpm : null;
    }
    start(opts) {
        if (this.isPlaying) {
            return;
        }
        const tone = __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_getTone).call(this);
        __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_ensureSynth).call(this, tone);
        console.log("Metronome start: options=", opts);
        __classPrivateFieldSet(this, _Metronome_bpmm, new BpmManager(opts, __classPrivateFieldGet(this, _Metronome_now, "f")), "f");
        __classPrivateFieldSet(this, _Metronome_nextTime, 0, "f");
        tone.start();
        tone.Transport.cancel();
        tone.Transport.seconds = 0;
        tone.Transport.start();
        tone.Transport.scheduleOnce((time) => __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_beat).call(this, time), "+0");
        __classPrivateFieldSet(this, _Metronome_playing, true, "f");
    }
    stop() {
        if (!this.isPlaying) {
            return;
        }
        __classPrivateFieldSet(this, _Metronome_playing, false, "f");
        const tone = __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_getTone).call(this);
        tone.Transport.stop();
        tone.Transport.cancel();
    }
    adjustTempo(increment) {
        if (__classPrivateFieldGet(this, _Metronome_bpmm, "f")) {
            __classPrivateFieldGet(this, _Metronome_bpmm, "f").adjustTempo(increment);
        }
    }
}
_Metronome_playing = new WeakMap(), _Metronome_bpmm = new WeakMap(), _Metronome_nextTime = new WeakMap(), _Metronome_synth = new WeakMap(), _Metronome_onBeatLine = new WeakMap(), _Metronome_toneOverride = new WeakMap(), _Metronome_now = new WeakMap(), _Metronome_instances = new WeakSet(), _Metronome_getTone = function _Metronome_getTone() {
    var _a;
    return (_a = __classPrivateFieldGet(this, _Metronome_toneOverride, "f")) !== null && _a !== void 0 ? _a : (typeof Tone !== 'undefined' ? Tone : null);
}, _Metronome_ensureSynth = function _Metronome_ensureSynth(tone) {
    if (!__classPrivateFieldGet(this, _Metronome_synth, "f")) {
        __classPrivateFieldSet(this, _Metronome_synth, new tone.PolySynth(tone.Synth).toDestination(), "f");
    }
    return __classPrivateFieldGet(this, _Metronome_synth, "f");
}, _Metronome_beat = function _Metronome_beat(time) {
    const tone = __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_getTone).call(this);
    const bpmm = __classPrivateFieldGet(this, _Metronome_bpmm, "f");
    const pos = bpmm.posInCycle;
    const accent = (pos === 0 && bpmm.beats > 1);
    let lineType = -1;
    if (bpmm.subBeats > 1 && ((pos % bpmm.beats) === 0)) {
        lineType = 2;
        const note = (pos === 0) ? "E6" : "E5";
        __classPrivateFieldGet(this, _Metronome_synth, "f").triggerAttackRelease(note, 0.05, time, 0.8);
    }
    if ((pos % bpmm.subBeats) === 0) {
        lineType = 1;
        const note = accent ? "A5" : "A4";
        __classPrivateFieldGet(this, _Metronome_synth, "f").triggerAttackRelease(note, 0.05, time, 0.8);
    }
    if (accent) {
        lineType = 0; // Force accent color
    }
    if (lineType >= 0) {
        const scheduledLineType = lineType;
        tone.Draw.schedule(() => {
            var _a;
            (_a = __classPrivateFieldGet(this, _Metronome_onBeatLine, "f")) === null || _a === void 0 ? void 0 : _a.call(this, scheduledLineType);
        }, time);
    }
    // Schedule the next beat tick.
    bpmm.advance();
    __classPrivateFieldSet(this, _Metronome_nextTime, __classPrivateFieldGet(this, _Metronome_nextTime, "f") + bpmm.intervalSec, "f");
    tone.Transport.scheduleOnce((nextTime) => __classPrivateFieldGet(this, _Metronome_instances, "m", _Metronome_beat).call(this, nextTime), __classPrivateFieldGet(this, _Metronome_nextTime, "f"));
};
//# sourceMappingURL=metronome.js.map