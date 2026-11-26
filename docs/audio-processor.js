/**
 * @file audio-processor.ts
 * @description Manages microphone capture and the Web Audio AttackProcessor worklet
 * to highlight acoustic onset spikes on the visualizer roll.
 */
'use strict';
import { info } from './util.js';
export class AudioProcessor {
    #state = 'idle';
    #aborted = false;
    #audioContext = null;
    #source = null;
    #workletNode = null;
    #mediaStream = null;
    #onAttack;
    constructor(options = {}) {
        this.#onAttack = options.onAttack;
    }
    get isRunning() {
        return this.#state === 'running';
    }
    #stopStream(stream) {
        if (stream && typeof stream.getTracks === 'function') {
            for (const track of stream.getTracks()) {
                track.stop();
            }
        }
    }
    async start() {
        if (this.#state !== 'idle') {
            info("Audio processor already running.");
            return;
        }
        this.#state = 'starting';
        this.#aborted = false;
        let stream = null;
        let audioContext = null;
        try {
            stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
            if (this.#aborted) {
                this.#stopStream(stream);
                this.#state = 'idle';
                return;
            }
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            audioContext = new AudioCtx();
            await audioContext.audioWorklet.addModule('attack-processor.js');
            if (this.#aborted) {
                this.#stopStream(stream);
                audioContext.close().catch(() => { });
                this.#state = 'idle';
                return;
            }
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
            this.#source = source;
            this.#workletNode = workletNode;
            this.#state = 'running';
            info("Audio recording and analysis started. Press 'i' again to stop.");
        }
        catch (err) {
            this.#stopStream(stream);
            if (audioContext) {
                audioContext.close().catch(() => { });
            }
            this.#state = 'idle';
            console.error("Error starting audio processor:", err);
            info("Could not start audio recording. Please grant microphone permission.");
        }
    }
    stop() {
        if (this.#state === 'starting') {
            this.#aborted = true;
        }
        if (this.#source) {
            if (typeof this.#source.disconnect === 'function') {
                this.#source.disconnect();
            }
            this.#source = null;
        }
        if (this.#workletNode) {
            this.#workletNode.port.onmessage = null;
            this.#workletNode.disconnect();
            this.#workletNode = null;
        }
        if (this.#mediaStream) {
            this.#stopStream(this.#mediaStream);
            this.#mediaStream = null;
        }
        if (this.#audioContext) {
            const ctx = this.#audioContext;
            this.#audioContext = null;
            this.#state = 'idle';
            ctx.close().then(() => {
                info("Audio recording and analysis stopped.");
            }).catch(() => { });
        }
        else if (this.#state !== 'starting') {
            this.#state = 'idle';
        }
    }
    toggle() {
        if (this.#state !== 'idle') {
            this.stop();
        }
        else {
            this.start();
        }
    }
}
//# sourceMappingURL=audio-processor.js.map