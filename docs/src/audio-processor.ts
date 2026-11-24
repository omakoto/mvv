/**
 * @file audio-processor.ts
 * @description Manages microphone capture and the Web Audio AttackProcessor worklet
 * to highlight acoustic onset spikes on the visualizer roll.
 */

'use strict';

import { info } from './util.js';

export interface AudioProcessorOptions {
    onAttack?: () => void;
}

export class AudioProcessor {
    #audioContext: AudioContext | null = null;
    #workletNode: AudioWorkletNode | null = null;
    #mediaStream: MediaStream | null = null;
    #onAttack?: () => void;

    constructor(options: AudioProcessorOptions = {}) {
        this.#onAttack = options.onAttack;
    }

    get isRunning(): boolean {
        return this.#audioContext !== null;
    }

    async start(): Promise<void> {
        if (this.#audioContext) {
            info("Audio processor already running.");
            return;
        }

        let stream: MediaStream | null = null;
        let audioContext: AudioContext | null = null;

        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
            audioContext = new AudioCtx();

            await audioContext.audioWorklet.addModule('attack-processor.js');

            const workletNode = new AudioWorkletNode(audioContext, 'attack-processor');
            workletNode.port.onmessage = (event) => {
                if (event.data.type === 'attack') {
                    this.#onAttack?.();
                }
            };

            const source = audioContext.createMediaStreamSource(stream);
            source.connect(workletNode);
            workletNode.connect(audioContext.destination);

            this.#mediaStream = stream;
            this.#audioContext = audioContext;
            this.#workletNode = workletNode;

            info("Audio recording and analysis started. Press 'i' again to stop.");

        } catch (err) {
            if (stream && typeof stream.getTracks === 'function') {
                for (const track of stream.getTracks()) {
                    track.stop();
                }
            }
            if (audioContext) {
                audioContext.close().catch(() => {});
            }
            console.error("Error starting audio processor:", err);
            info("Could not start audio recording. Please grant microphone permission.");
        }
    }

    stop(): void {
        if (this.#workletNode) {
            this.#workletNode.port.onmessage = null;
            this.#workletNode.disconnect();
            this.#workletNode = null;
        }
        if (this.#mediaStream) {
            if (typeof this.#mediaStream.getTracks === 'function') {
                for (const track of this.#mediaStream.getTracks()) {
                    track.stop();
                }
            }
            this.#mediaStream = null;
        }
        if (this.#audioContext) {
            const ctx = this.#audioContext;
            this.#audioContext = null;
            ctx.close().then(() => {
                info("Audio recording and analysis stopped.");
            });
        }
    }

    toggle(): void {
        if (this.#audioContext) {
            this.stop();
        } else {
            this.start();
        }
    }
}
