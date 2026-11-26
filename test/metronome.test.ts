import { describe, it, expect, vi } from 'vitest';
import { BpmManager, Metronome, MetronomeOptions } from '../src/metronome.js';

function makeOptions(overrides: Partial<MetronomeOptions> = {}): MetronomeOptions {
    const opts = new MetronomeOptions();
    Object.assign(opts, overrides);
    return opts;
}

describe('MetronomeOptions', () => {
    it('copies all properties independently and parses from JSON', () => {
        const opts = makeOptions({
            bpm: 96,
            beats: 3,
            subBeats: 2,
            automaticIncrease: true,
            increaseAfterBars: 4,
            increaseBpm: 5,
            increaseMaxBpm: 140,
        });

        const clone = opts.copy();
        expect(clone).not.toBe(opts);
        expect(clone).toEqual(opts);

        const parsed = MetronomeOptions.fromJson(JSON.stringify(opts));
        expect(parsed).toBeInstanceOf(MetronomeOptions);
        expect(parsed).toEqual(opts);
    });
});

describe('BpmManager', () => {
    it('clamps invalid values, collapses equal beats/subBeats, and computes intervalSec', () => {
        const clamped = new BpmManager(makeOptions({ bpm: 2, beats: 0, subBeats: 0 }));
        expect(clamped.bpm).toBe(10);
        expect(clamped.beats).toBe(1);
        expect(clamped.subBeats).toBe(1);
        expect(clamped.cycle).toBe(1);
        expect(clamped.intervalSec).toBeCloseTo(6.0);

        // When beats === subBeats, subBeats resets to 1
        const same = new BpmManager(makeOptions({ bpm: 120, beats: 4, subBeats: 4 }));
        expect(same.subBeats).toBe(1);
        expect(same.cycle).toBe(4);
        expect(same.intervalSec).toBeCloseTo(0.5);

        // Polyrhythm 4 against 3 at 120 BPM: measure = 2s, cycle = 12 -> interval = 2/12 s
        const poly = new BpmManager(makeOptions({ bpm: 120, beats: 4, subBeats: 3 }));
        expect(poly.cycle).toBe(12);
        expect(poly.intervalSec).toBeCloseTo(2 / 12);
    });

    it('adjusts tempo with clamping between 10 and 500 BPM and ignores 0', () => {
        const mgr = new BpmManager(makeOptions({ bpm: 120, beats: 4, subBeats: 1 }));
        mgr.adjustTempo(0);
        expect(mgr.bpm).toBe(120);

        mgr.adjustTempo(60);
        expect(mgr.bpm).toBe(180);
        expect(mgr.intervalSec).toBeCloseTo(60 / 180);

        mgr.adjustTempo(1000);
        expect(mgr.bpm).toBe(500);

        mgr.adjustTempo(-1000);
        expect(mgr.bpm).toBe(10);
    });

    it('cycles posInCycle from 0 to cycle - 1', () => {
        const mgr = new BpmManager(makeOptions({ bpm: 120, beats: 3, subBeats: 1 }));
        const positions: number[] = [];
        for (let i = 0; i < 6; i++) {
            positions.push(mgr.posInCycle);
            mgr.advance();
        }
        expect(positions).toEqual([0, 1, 2, 0, 1, 2]);
    });

    it('automatically increases BPM after N bars and transitions to decrease when both enabled', () => {
        const opts = makeOptions({
            bpm: 100,
            beats: 2,
            subBeats: 1,
            automaticIncrease: true,
            increaseAfterBars: 1,
            increaseBpm: 10,
            increaseMaxBpm: 115,
            automaticDecrease: true,
            decreaseAfterBars: 1,
            decreaseBpm: 10,
            decreaseMinBpm: 105,
        });
        const mgr = new BpmManager(opts, () => 0);

        // Bar 0: pos 0 -> bar becomes 0 (delta 0, no change), pos 1
        mgr.advance();
        mgr.advance();
        expect(mgr.bpm).toBe(100);

        // Bar 1: pos 0 -> bar becomes 1 (delta 1 >= 1) -> 110 BPM
        mgr.advance();
        expect(mgr.bpm).toBe(110);
        mgr.advance();

        // Bar 2: pos 0 -> bar becomes 2 -> capped at 115 BPM, flips to decreasing mode
        mgr.advance();
        expect(mgr.bpm).toBe(115);
        mgr.advance();

        // Bar 3: pos 0 -> decreases by 10 to 105 BPM (min), flips back to increasing mode
        mgr.advance();
        expect(mgr.bpm).toBe(105);
        mgr.advance();

        // Bar 4: pos 0 -> increases again to 115 BPM
        mgr.advance();
        expect(mgr.bpm).toBe(115);
    });

    it('automatically increases and decreases BPM after elapsed seconds', () => {
        let nowMs = 0;
        const opts = makeOptions({
            bpm: 120,
            beats: 1,
            subBeats: 1,
            automaticIncrease: true,
            increaseAfterSeconds: 5,
            increaseBpm: 20,
            increaseMaxBpm: 140,
        });
        const mgr = new BpmManager(opts, () => nowMs);

        nowMs = 4999;
        mgr.advance();
        expect(mgr.bpm).toBe(120);

        nowMs = 5000;
        mgr.advance();
        expect(mgr.bpm).toBe(140);

        // Reached max without automaticDecrease -> stops changing
        nowMs = 20000;
        mgr.advance();
        expect(mgr.bpm).toBe(140);
    });
});

describe('Metronome', () => {
    function createMockTone() {
        const triggerAttackRelease = vi.fn();
        const scheduledBeats: Array<{ cb: (time: number) => void; when: any }> = [];
        const drawCallbacks: Array<() => void> = [];

        class MockPolySynth {
            toDestination() {
                return { triggerAttackRelease };
            }
        }

        const tone = {
            Synth: class {},
            PolySynth: MockPolySynth,
            start: vi.fn(),
            Transport: {
                seconds: 0,
                start: vi.fn(),
                stop: vi.fn(),
                cancel: vi.fn(),
                scheduleOnce: vi.fn((cb: (time: number) => void, when: any) => {
                    scheduledBeats.push({ cb, when });
                }),
            },
            Draw: {
                schedule: vi.fn((cb: () => void) => {
                    drawCallbacks.push(cb);
                }),
            },
        };

        return { tone, triggerAttackRelease, scheduledBeats, drawCallbacks };
    }

    it('starts, schedules beats with accents and polyrhythm sub-beats, adjusts tempo, and stops', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const { tone, triggerAttackRelease, scheduledBeats, drawCallbacks } = createMockTone();
        const beatLines: number[] = [];

        const metronome = new Metronome({
            tone,
            onBeatLine: (lineType) => beatLines.push(lineType),
            now: () => 0,
        });

        const opts = makeOptions({ bpm: 120, beats: 2, subBeats: 3 });
        metronome.start(opts);
        expect(metronome.isPlaying).toBe(true);
        expect(metronome.currentBpm).toBe(120);
        expect(tone.start).toHaveBeenCalledTimes(1);
        expect(scheduledBeats).toHaveLength(1);

        // Calling start again while playing is a no-op
        metronome.start(opts);
        expect(tone.start).toHaveBeenCalledTimes(1);

        // Execute 6 ticks of a 2:3 polyrhythm (cycle = 6):
        // pos 0: both sub-beat (0%2==0 -> E6) and main beat (0%3==0 -> A5 accent), lineType=0
        // pos 1: neither
        // pos 2: sub-beat (2%2==0 -> E5), lineType=2
        // pos 3: main beat (3%3==0 -> A4), lineType=1
        // pos 4: sub-beat (4%2==0 -> E5), lineType=2
        // pos 5: neither
        for (let i = 0; i < 6; i++) {
            scheduledBeats[i]!.cb(i * 0.1);
        }
        drawCallbacks.forEach(fn => fn());

        expect(beatLines).toEqual([0, 2, 1, 2]);
        expect(triggerAttackRelease.mock.calls.map(c => c[0])).toEqual(['E6', 'A5', 'E5', 'A4', 'E5']);

        metronome.adjustTempo(10);
        expect(metronome.currentBpm).toBe(130);

        metronome.stop();
        expect(metronome.isPlaying).toBe(false);
        expect(tone.Transport.stop).toHaveBeenCalledTimes(1);
        expect(tone.Transport.cancel).toHaveBeenCalledTimes(2);

        // Queued lookahead Draw callbacks do not fire after stop()
        const countAfterStop = beatLines.length;
        drawCallbacks.forEach(fn => fn());
        expect(beatLines).toHaveLength(countAfterStop);

        // Calling stop when already stopped is a no-op
        metronome.stop();
        expect(tone.Transport.stop).toHaveBeenCalledTimes(1);
    });
});
