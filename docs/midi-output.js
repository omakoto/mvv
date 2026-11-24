/**
 * @file midi-output.ts
 * @description Manages WebMIDI output device selection, persistence, reset sequences,
 * and event dispatching.
 */
'use strict';
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
var _MidiOutputManager_device, _MidiOutputDeviceSelector_devices, _MidiOutputDeviceSelector_selectedDeviceName, _MidiOutputDeviceSelector_outputManager, _MidiOutputDeviceSelector_storage;
import { info } from './util.js';
export class MidiOutputManager {
    constructor() {
        _MidiOutputManager_device.set(this, null);
    }
    setMidiOut(device) {
        info("Output device set to " + device.name);
        console.log("MIDI output device set to: " + device.name, device);
        __classPrivateFieldSet(this, _MidiOutputManager_device, device, "f");
        this.reset();
    }
    getMidiOut() {
        return __classPrivateFieldGet(this, _MidiOutputManager_device, "f");
    }
    get anyDeviceSelected() {
        return __classPrivateFieldGet(this, _MidiOutputManager_device, "f") !== null;
    }
    reset() {
        if (!__classPrivateFieldGet(this, _MidiOutputManager_device, "f")) {
            return;
        }
        if (__classPrivateFieldGet(this, _MidiOutputManager_device, "f").clear) {
            __classPrivateFieldGet(this, _MidiOutputManager_device, "f").clear(); // Chrome doesn't support it yet.
        }
        for (let i = 0; i <= 15; i++) {
            __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([176 + i, 123, 0], 0); // All notes off
            __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([176 + i, 121, 0], 0); // Reset all controllers
        }
        __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send([255], 0); // System reset
    }
    sendEvent(data, timeStamp) {
        if (!__classPrivateFieldGet(this, _MidiOutputManager_device, "f")) {
            return;
        }
        __classPrivateFieldGet(this, _MidiOutputManager_device, "f").send(data, timeStamp);
    }
}
_MidiOutputManager_device = new WeakMap();
export class MidiOutputDeviceSelector {
    constructor(outputManager, storage = (typeof localStorage !== 'undefined' ? localStorage : null)) {
        var _a, _b;
        _MidiOutputDeviceSelector_devices.set(this, []);
        _MidiOutputDeviceSelector_selectedDeviceName.set(this, null);
        _MidiOutputDeviceSelector_outputManager.set(this, void 0);
        _MidiOutputDeviceSelector_storage.set(this, void 0);
        __classPrivateFieldSet(this, _MidiOutputDeviceSelector_outputManager, outputManager, "f");
        __classPrivateFieldSet(this, _MidiOutputDeviceSelector_storage, storage, "f");
        __classPrivateFieldSet(this, _MidiOutputDeviceSelector_selectedDeviceName, (_b = (_a = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_storage, "f")) === null || _a === void 0 ? void 0 : _a.getItem(MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE)) !== null && _b !== void 0 ? _b : null, "f");
    }
    setDevices(outputs) {
        __classPrivateFieldSet(this, _MidiOutputDeviceSelector_devices, outputs, "f");
        if (__classPrivateFieldGet(this, _MidiOutputDeviceSelector_selectedDeviceName, "f")) {
            const device = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f").find(d => d.name === __classPrivateFieldGet(this, _MidiOutputDeviceSelector_selectedDeviceName, "f"));
            if (device) {
                __classPrivateFieldGet(this, _MidiOutputDeviceSelector_outputManager, "f").setMidiOut(device);
                return;
            }
        }
        // Fallback to the first non-"midi through" device
        const device = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f").find(output => { var _a; return !/midi through/i.test((_a = output.name) !== null && _a !== void 0 ? _a : ""); });
        if (device) {
            __classPrivateFieldGet(this, _MidiOutputDeviceSelector_outputManager, "f").setMidiOut(device);
            return;
        }
        info("No MIDI output devices detected.");
    }
    getDevices() {
        return __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f");
    }
    selectDevice(deviceName) {
        var _a;
        const device = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_devices, "f").find(d => d.name === deviceName);
        if (device) {
            __classPrivateFieldSet(this, _MidiOutputDeviceSelector_selectedDeviceName, deviceName, "f");
            (_a = __classPrivateFieldGet(this, _MidiOutputDeviceSelector_storage, "f")) === null || _a === void 0 ? void 0 : _a.setItem(MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE, deviceName);
            __classPrivateFieldGet(this, _MidiOutputDeviceSelector_outputManager, "f").setMidiOut(device);
        }
    }
}
_MidiOutputDeviceSelector_devices = new WeakMap(), _MidiOutputDeviceSelector_selectedDeviceName = new WeakMap(), _MidiOutputDeviceSelector_outputManager = new WeakMap(), _MidiOutputDeviceSelector_storage = new WeakMap();
MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE = 'mvv_outputDevice';
//# sourceMappingURL=midi-output.js.map