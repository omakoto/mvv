// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach, type Mock } from 'vitest';
import { AudioProcessor } from '../src/audio-processor.js';
import { setupMvvDom } from './helpers/dom-setup.js';

describe('AudioProcessor', () => {
    let onAttack: Mock<() => void>;
    let addModule: Mock<(url: string) => Promise<void>>;
    let createMediaStreamSource: Mock<(stream: MediaStream) => { connect: Mock<() => void> }>;
    let close: Mock<() => Promise<void>>;
    let sourceConnect: Mock<() => void>;
    let workletConnect: Mock<() => void>;
    let workletDisconnect: Mock<() => void>;
    let trackStop: Mock<() => void>;
    let capturedWorkletPort: { onmessage: ((ev: { data: any }) => void) | null };

    const originalMediaDevices = (navigator as any).mediaDevices;
    const originalAudioContext = (window as any).AudioContext;
    const originalAudioWorkletNode = (globalThis as any).AudioWorkletNode;

    beforeEach(() => {
        setupMvvDom();
        onAttack = vi.fn<() => void>();
        addModule = vi.fn<(url: string) => Promise<void>>().mockResolvedValue(undefined);
        sourceConnect = vi.fn<() => void>();
        createMediaStreamSource = vi.fn<(stream: MediaStream) => { connect: Mock<() => void> }>().mockReturnValue({ connect: sourceConnect });
        close = vi.fn<() => Promise<void>>().mockResolvedValue(undefined);
        workletConnect = vi.fn<() => void>();
        workletDisconnect = vi.fn<() => void>();
        trackStop = vi.fn<() => void>();
        capturedWorkletPort = { onmessage: null };

        (navigator as any).mediaDevices = {
            getUserMedia: vi.fn().mockResolvedValue({
                id: 'mock-stream',
                getTracks: () => [{ stop: trackStop }],
            }),
        };

        class MockAudioContext {
            destination = { id: 'mock-dest' };
            audioWorklet = { addModule };
            createMediaStreamSource = createMediaStreamSource;
            close = close;
        }

        class MockAudioWorkletNode {
            port = capturedWorkletPort;
            connect = workletConnect;
            disconnect = workletDisconnect;
            constructor(_ctx: any, _name: string) {}
        }

        (window as any).AudioContext = MockAudioContext;
        (globalThis as any).AudioWorkletNode = MockAudioWorkletNode;
    });

    afterEach(() => {
        (navigator as any).mediaDevices = originalMediaDevices;
        (window as any).AudioContext = originalAudioContext;
        (globalThis as any).AudioWorkletNode = originalAudioWorkletNode;
    });

    it('starts microphone capture, forwards attack messages, and stops cleanly', async () => {
        const proc = new AudioProcessor({ onAttack });
        expect(proc.isRunning).toBe(false);

        await proc.start();
        expect(proc.isRunning).toBe(true);
        expect(addModule).toHaveBeenCalledWith('attack-processor.js');
        expect(sourceConnect).toHaveBeenCalledTimes(1);
        expect(workletConnect).toHaveBeenCalledTimes(1);

        // Duplicate start does not recreate AudioContext
        await proc.start();
        expect(addModule).toHaveBeenCalledTimes(1);

        // Worklet attack message triggers callback; other messages are ignored
        capturedWorkletPort.onmessage?.({ data: { type: 'other' } });
        expect(onAttack).not.toHaveBeenCalled();

        capturedWorkletPort.onmessage?.({ data: { type: 'attack' } });
        expect(onAttack).toHaveBeenCalledTimes(1);

        // Stop disconnects worklet, stops mic tracks, and closes AudioContext
        proc.stop();
        expect(workletDisconnect).toHaveBeenCalledTimes(1);
        expect(trackStop).toHaveBeenCalledTimes(1);
        expect(capturedWorkletPort.onmessage).toBeNull();
        expect(close).toHaveBeenCalledTimes(1);
        expect(proc.isRunning).toBe(false);
    });

    it('cleans up AudioContext and mic tracks if addModule fails so retry succeeds', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        addModule.mockRejectedValueOnce(new Error('Worklet load failed'));

        const proc = new AudioProcessor({ onAttack });
        await proc.start();

        expect(proc.isRunning).toBe(false);
        expect(close).toHaveBeenCalledTimes(1);
        expect(trackStop).toHaveBeenCalledTimes(1);

        // Retry succeeds cleanly
        await proc.start();
        expect(proc.isRunning).toBe(true);
    });

    it('handles microphone permission errors gracefully', async () => {
        vi.spyOn(console, 'error').mockImplementation(() => {});
        (navigator as any).mediaDevices.getUserMedia = vi.fn().mockRejectedValue(new Error('Permission denied'));

        const proc = new AudioProcessor({ onAttack });
        await proc.start();

        expect(proc.isRunning).toBe(false);
        expect($('#status').text()).toContain('Could not start audio recording');
    });

    it('toggles between start and stop', async () => {
        const proc = new AudioProcessor({ onAttack });
        proc.toggle();
        await vi.waitFor(() => expect(proc.isRunning).toBe(true));

        proc.toggle();
        expect(proc.isRunning).toBe(false);
    });
});
