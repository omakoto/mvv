/**
 * @file attack-processor.ts
 * @description An AudioWorkletProcessor that processes real-time microphone/audio input
 * to detect sudden volume onset spikes ("attacks").
 *
 * This is built entirely on the vanilla browser Web Audio API.
 *
 * How it works:
 * 1. Runs in the browser's background audio thread as a standard Web Audio AudioWorklet.
 * 2. The `process` method is called automatically with incoming audio buffers (usually blocks of 128 samples).
 * 3. It calculates the peak absolute amplitude (`maxVal`) of the current audio block.
 * 4. If the peak amplitude in the *previous* block was below the threshold (`0.1`) and the current
 *    peak amplitude is at or above the threshold, a volume "attack" (onset) is detected.
 * 5. Upon detection, it posts an message (`{ type: 'attack' }`) back to the main thread's host node
 *    via the standard `port.postMessage` API, triggering a visual highlight line in the visualizer.
 * 6. Returns `true` to keep the Web Audio processor instance alive.
 *
 * Lifespan & UI Toggle:
 * - Disabled by default (it is not always running).
 * - Managed and controlled by the `AudioProcessor` class in `mvv.ts`.
 * - Toggled on/off in the host application via the 'I' key shortcut.
 * - Activating it prompts the user for microphone permissions and loads this worklet module.
 * - Deactivating it closes the AudioContext, disconnects the audio stream, and shuts down this processor.
 */
class AttackProcessor extends AudioWorkletProcessor {
    constructor() {
        super();
        this.lastMaxVolume = 0;
        this.attackThreshold = 0.1;
    }
    process(inputs, outputs, parameters) {
        const input = inputs[0];
        if (!input || input.length === 0) {
            return true;
        }
        const channelData = input[0];
        if (!channelData) {
            return true;
        }
        let maxVal = 0;
        const len = channelData.length;
        const threshold = this.attackThreshold;
        if (this.lastMaxVolume < threshold) {
            // Eligible for new attack detection.
            // Break early as soon as any sample crosses the threshold.
            let crossed = false;
            for (let i = 0; i < len; i++) {
                const absVal = Math.abs(channelData[i]);
                if (absVal >= threshold) {
                    crossed = true;
                    maxVal = absVal;
                    break;
                }
                maxVal = Math.max(maxVal, absVal);
            }
            if (crossed) {
                this.port.postMessage({ type: 'attack' });
            }
        }
        else {
            // Already in a loud state, we just compute peak volume to track decay.
            for (let i = 0; i < len; i++) {
                maxVal = Math.max(maxVal, Math.abs(channelData[i]));
            }
        }
        this.lastMaxVolume = maxVal;
        return true; // Keep processor alive
    }
}
try {
    registerProcessor('attack-processor', AttackProcessor);
}
catch (e) {
    console.error(e);
}
//# sourceMappingURL=attack-processor.js.map