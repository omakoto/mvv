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
        for (let i = 0; i < channelData.length; i++) {
            maxVal = Math.max(maxVal, Math.abs(channelData[i]));
        }
        if (this.lastMaxVolume < this.attackThreshold && maxVal >= this.attackThreshold) {
            this.port.postMessage({ type: 'attack' });
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