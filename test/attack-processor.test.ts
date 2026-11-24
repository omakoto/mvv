import { describe, it, expect, vi, beforeAll, beforeEach, afterAll } from 'vitest';

const postMessageSpy = vi.fn();
const registeredProcessors: Array<[string, unknown]> = [];
const originalAudioWorkletProcessor = (globalThis as any).AudioWorkletProcessor;
const originalRegisterProcessor = (globalThis as any).registerProcessor;

class FakeAudioWorkletProcessor {
    port = {
        postMessage: postMessageSpy,
    };
}

let AttackProcessorClass: new () => {
    port: { postMessage: typeof postMessageSpy };
    process(inputs: Float32Array[][], outputs: Float32Array[][], params: Record<string, Float32Array>): boolean;
};

beforeAll(async () => {
    (globalThis as any).AudioWorkletProcessor = FakeAudioWorkletProcessor;
    (globalThis as any).registerProcessor = (name: string, ctor: unknown) => {
        registeredProcessors.push([name, ctor]);
    };
    const mod = await import('../src/attack-processor.js');
    AttackProcessorClass = mod.AttackProcessor as unknown as typeof AttackProcessorClass;
});

beforeEach(() => {
    postMessageSpy.mockClear();
});

afterAll(() => {
    if (originalAudioWorkletProcessor === undefined) {
        delete (globalThis as any).AudioWorkletProcessor;
    } else {
        (globalThis as any).AudioWorkletProcessor = originalAudioWorkletProcessor;
    }
    if (originalRegisterProcessor === undefined) {
        delete (globalThis as any).registerProcessor;
    } else {
        (globalThis as any).registerProcessor = originalRegisterProcessor;
    }
});

describe('AttackProcessor', () => {
    it('registers itself under the name "attack-processor"', () => {
        expect(registeredProcessors).toContainEqual(['attack-processor', AttackProcessorClass]);
    });

    it('keeps processor alive on empty or missing input buffers', () => {
        const proc = new AttackProcessorClass();
        expect(proc.process([], [], {})).toBe(true);
        expect(proc.process([[]], [], {})).toBe(true);
        expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('does not trigger below the 0.1 amplitude threshold', () => {
        const proc = new AttackProcessorClass();
        const quiet = new Float32Array([0.0, 0.05, -0.09, 0.099]);
        expect(proc.process([[quiet]], [], {})).toBe(true);
        expect(postMessageSpy).not.toHaveBeenCalled();
    });

    it('triggers once on positive or negative onset crossing 0.1 and requires decay before re-triggering', () => {
        const proc = new AttackProcessorClass();

        // First onset via negative sample crossing -0.15
        expect(proc.process([[new Float32Array([0.01, -0.15, 0.02])]], [], {})).toBe(true);
        expect(postMessageSpy).toHaveBeenCalledTimes(1);
        expect(postMessageSpy).toHaveBeenCalledWith({ type: 'attack' });

        // Sustained loud block must NOT re-trigger
        expect(proc.process([[new Float32Array([0.25, 0.3, 0.2])]], [], {})).toBe(true);
        expect(postMessageSpy).toHaveBeenCalledTimes(1);

        // Quiet decay block resets detection eligibility
        expect(proc.process([[new Float32Array([0.05, -0.04, 0.01])]], [], {})).toBe(true);
        expect(postMessageSpy).toHaveBeenCalledTimes(1);

        // Second onset triggers again
        expect(proc.process([[new Float32Array([0.0, 0.1, 0.0])]], [], {})).toBe(true);
        expect(postMessageSpy).toHaveBeenCalledTimes(2);
    });
});
