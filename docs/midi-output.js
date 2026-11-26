/**
 * @file midi-output.ts
 * @description Manages WebMIDI output device selection, persistence, reset sequences,
 * and event dispatching.
 */
'use strict';
import { info } from './util.js';
export class MidiOutputManager {
    #device = null;
    setMidiOut(device) {
        info("Output device set to " + device.name);
        console.log("MIDI output device set to: " + device.name, device);
        this.#device = device;
        this.reset();
    }
    clearMidiOut() {
        this.#device = null;
    }
    getMidiOut() {
        return this.#device;
    }
    get anyDeviceSelected() {
        return this.#device !== null;
    }
    reset() {
        if (!this.#device) {
            return;
        }
        if (this.#device.clear) {
            this.#device.clear(); // Chrome doesn't support it yet.
        }
        for (let i = 0; i <= 15; i++) {
            this.#device.send([176 + i, 123, 0], 0); // All notes off
            this.#device.send([176 + i, 121, 0], 0); // Reset all controllers
        }
        this.#device.send([255], 0); // System reset
    }
    sendEvent(data, timeStamp) {
        if (!this.#device) {
            return;
        }
        this.#device.send(data, timeStamp);
    }
}
export class MidiOutputDeviceSelector {
    #devices = [];
    #selectedDeviceName = null;
    #outputManager;
    #storage;
    static STORAGE_KEY_OUTPUT_DEVICE = 'mvv_outputDevice';
    constructor(outputManager, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
        this.#outputManager = outputManager;
        this.#storage = storage;
        try {
            this.#selectedDeviceName = this.#storage?.getItem(MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE) ?? null;
        }
        catch {
            this.#selectedDeviceName = null;
        }
    }
    setDevices(outputs) {
        // Ignore disconnected ports when refreshing after hot-plug events.
        this.#devices = outputs.filter(output => output.state !== 'disconnected');
        let target;
        if (this.#selectedDeviceName) {
            target = this.#devices.find(d => d.name === this.#selectedDeviceName);
        }
        // Fallback to the first non-"midi through" device
        if (!target) {
            target = this.#devices.find(output => !/midi through/i.test(output.name ?? ""));
        }
        if (target) {
            // Avoid sending a 33-message MIDI reset when the selected device hasn't changed.
            if (this.#outputManager.getMidiOut() !== target) {
                this.#outputManager.setMidiOut(target);
            }
            return;
        }
        this.#outputManager.clearMidiOut();
        info("No MIDI output devices detected.");
    }
    getDevices() {
        return this.#devices;
    }
    selectDevice(deviceName) {
        const device = this.#devices.find(d => d.name === deviceName);
        if (device) {
            this.#selectedDeviceName = deviceName;
            try {
                this.#storage?.setItem(MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE, deviceName);
            }
            catch {
                // Ignore storage quota/security errors.
            }
            this.#outputManager.setMidiOut(device);
        }
    }
}
//# sourceMappingURL=midi-output.js.map