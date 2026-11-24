/**
 * @file audio-processor.ts
 * @description Manages microphone capture and the Web Audio AttackProcessor worklet
 * to highlight acoustic onset spikes on the visualizer roll.
 */
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
var _AudioProcessor_audioContext, _AudioProcessor_workletNode, _AudioProcessor_mediaStream, _AudioProcessor_onAttack;
import { info } from './util.js';
export class AudioProcessor {
    constructor(options = {}) {
        _AudioProcessor_audioContext.set(this, null);
        _AudioProcessor_workletNode.set(this, null);
        _AudioProcessor_mediaStream.set(this, null);
        _AudioProcessor_onAttack.set(this, void 0);
        __classPrivateFieldSet(this, _AudioProcessor_onAttack, options.onAttack, "f");
    }
    get isRunning() {
        return __classPrivateFieldGet(this, _AudioProcessor_audioContext, "f") !== null;
    }
    start() {
        return __awaiter(this, void 0, void 0, function* () {
            if (__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f")) {
                info("Audio processor already running.");
                return;
            }
            let stream = null;
            let audioContext = null;
            try {
                stream = yield navigator.mediaDevices.getUserMedia({ audio: true, video: false });
                const AudioCtx = window.AudioContext || window.webkitAudioContext;
                audioContext = new AudioCtx();
                yield audioContext.audioWorklet.addModule('attack-processor.js');
                const workletNode = new AudioWorkletNode(audioContext, 'attack-processor');
                workletNode.port.onmessage = (event) => {
                    var _a;
                    if (event.data.type === 'attack') {
                        (_a = __classPrivateFieldGet(this, _AudioProcessor_onAttack, "f")) === null || _a === void 0 ? void 0 : _a.call(this);
                    }
                };
                const source = audioContext.createMediaStreamSource(stream);
                source.connect(workletNode);
                workletNode.connect(audioContext.destination);
                __classPrivateFieldSet(this, _AudioProcessor_mediaStream, stream, "f");
                __classPrivateFieldSet(this, _AudioProcessor_audioContext, audioContext, "f");
                __classPrivateFieldSet(this, _AudioProcessor_workletNode, workletNode, "f");
                info("Audio recording and analysis started. Press 'i' again to stop.");
            }
            catch (err) {
                if (stream && typeof stream.getTracks === 'function') {
                    for (const track of stream.getTracks()) {
                        track.stop();
                    }
                }
                if (audioContext) {
                    audioContext.close().catch(() => { });
                }
                console.error("Error starting audio processor:", err);
                info("Could not start audio recording. Please grant microphone permission.");
            }
        });
    }
    stop() {
        if (__classPrivateFieldGet(this, _AudioProcessor_workletNode, "f")) {
            __classPrivateFieldGet(this, _AudioProcessor_workletNode, "f").port.onmessage = null;
            __classPrivateFieldGet(this, _AudioProcessor_workletNode, "f").disconnect();
            __classPrivateFieldSet(this, _AudioProcessor_workletNode, null, "f");
        }
        if (__classPrivateFieldGet(this, _AudioProcessor_mediaStream, "f")) {
            if (typeof __classPrivateFieldGet(this, _AudioProcessor_mediaStream, "f").getTracks === 'function') {
                for (const track of __classPrivateFieldGet(this, _AudioProcessor_mediaStream, "f").getTracks()) {
                    track.stop();
                }
            }
            __classPrivateFieldSet(this, _AudioProcessor_mediaStream, null, "f");
        }
        if (__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f")) {
            const ctx = __classPrivateFieldGet(this, _AudioProcessor_audioContext, "f");
            __classPrivateFieldSet(this, _AudioProcessor_audioContext, null, "f");
            ctx.close().then(() => {
                info("Audio recording and analysis stopped.");
            });
        }
    }
    toggle() {
        if (__classPrivateFieldGet(this, _AudioProcessor_audioContext, "f")) {
            this.stop();
        }
        else {
            this.start();
        }
    }
}
_AudioProcessor_audioContext = new WeakMap(), _AudioProcessor_workletNode = new WeakMap(), _AudioProcessor_mediaStream = new WeakMap(), _AudioProcessor_onAttack = new WeakMap();
//# sourceMappingURL=audio-processor.js.map