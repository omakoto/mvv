/**
 * @file midi-output.ts
 * @description Manages WebMIDI output device selection, persistence, reset sequences,
 * and event dispatching.
 */

'use strict';

import { info } from './util.js';

export class MidiOutputManager {
    #device: WebMidi.MIDIOutput | null = null;

    setMidiOut(device: WebMidi.MIDIOutput): void {
        info("Output device set to " + device.name);
        console.log("MIDI output device set to: " + device.name, device);
        this.#device = device;
        this.reset();
    }

    getMidiOut(): WebMidi.MIDIOutput | null {
        return this.#device;
    }

    get anyDeviceSelected(): boolean {
        return this.#device !== null;
    }

    reset(): void {
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

    sendEvent(data: Array<number> | Uint8Array, timeStamp: number): void {
        if (!this.#device) {
            return;
        }
        this.#device.send(data, timeStamp);
    }
}

export class MidiOutputDeviceSelector {
    #devices: WebMidi.MIDIOutput[] = [];
    #selectedDeviceName: string | null = null;
    #outputManager: MidiOutputManager;
    #storage: Storage | null;
    static readonly STORAGE_KEY_OUTPUT_DEVICE = 'mvv_outputDevice';

    constructor(
        outputManager: MidiOutputManager,
        storage: Storage | null = (typeof localStorage !== 'undefined' ? localStorage : null)
    ) {
        this.#outputManager = outputManager;
        this.#storage = storage;
        this.#selectedDeviceName = this.#storage?.getItem(MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE) ?? null;
    }

    setDevices(outputs: WebMidi.MIDIOutput[]): void {
        this.#devices = outputs;
        if (this.#selectedDeviceName) {
            const device = this.#devices.find(d => d.name === this.#selectedDeviceName);
            if (device) {
                this.#outputManager.setMidiOut(device);
                return;
            }
        }

        // Fallback to the first non-"midi through" device
        const device = this.#devices.find(output => !/midi through/i.test(output.name ?? ""));
        if (device) {
            this.#outputManager.setMidiOut(device);
            return;
        }
        info("No MIDI output devices detected.");
    }

    getDevices(): WebMidi.MIDIOutput[] {
        return this.#devices;
    }

    selectDevice(deviceName: string): void {
        const device = this.#devices.find(d => d.name === deviceName);
        if (device) {
            this.#selectedDeviceName = deviceName;
            this.#storage?.setItem(MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE, deviceName);
            this.#outputManager.setMidiOut(device);
        }
    }
}
