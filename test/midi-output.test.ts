import { describe, it, expect, vi } from 'vitest';
import { MidiOutputDeviceSelector, MidiOutputManager } from '../src/midi-output.js';

function createMockOutput(name: string, withClear = true): WebMidi.MIDIOutput & {
    send: ReturnType<typeof vi.fn>;
    clear?: ReturnType<typeof vi.fn>;
} {
    const output: any = {
        name,
        send: vi.fn(),
    };
    if (withClear) {
        output.clear = vi.fn();
    }
    return output;
}

function createMemoryStorage(initial: Record<string, string> = {}): Storage {
    const map = new Map<string, string>(Object.entries(initial));
    return {
        get length() { return map.size; },
        clear: () => map.clear(),
        getItem: (key: string) => map.get(key) ?? null,
        key: (index: number) => Array.from(map.keys())[index] ?? null,
        removeItem: (key: string) => { map.delete(key); },
        setItem: (key: string, value: string) => { map.set(key, value); },
    };
}

describe('MidiOutputManager', () => {
    it('safely no-ops when no device is selected', () => {
        const manager = new MidiOutputManager();
        expect(manager.anyDeviceSelected).toBe(false);
        expect(manager.getMidiOut()).toBeNull();
        expect(() => manager.reset()).not.toThrow();
        expect(() => manager.sendEvent([0x90, 60, 100], 0)).not.toThrow();
    });

    it('sends full 16-channel reset sequence and system reset on setMidiOut', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const manager = new MidiOutputManager();
        const device = createMockOutput('Roland FP-30');

        manager.setMidiOut(device);
        expect(manager.anyDeviceSelected).toBe(true);
        expect(manager.getMidiOut()).toBe(device);
        expect(device.clear).toHaveBeenCalledTimes(1);
        // 16 channels * 2 CCs (123 + 121) + 1 system reset (255) = 33 messages
        expect(device.send).toHaveBeenCalledTimes(33);
        expect(device.send).toHaveBeenCalledWith([176, 123, 0], 0);
        expect(device.send).toHaveBeenCalledWith([176 + 15, 121, 0], 0);
        expect(device.send).toHaveBeenLastCalledWith([255], 0);

        device.send.mockClear();
        manager.sendEvent([0x90, 60, 100], 42);
        expect(device.send).toHaveBeenCalledWith([0x90, 60, 100], 42);
    });

    it('handles output devices without clear() method', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const manager = new MidiOutputManager();
        const device = createMockOutput('Chrome MIDI Out', false);
        expect(() => manager.setMidiOut(device)).not.toThrow();
        expect(device.send).toHaveBeenCalledTimes(33);
    });
});

describe('MidiOutputDeviceSelector', () => {
    it('skips "MIDI Through" and picks the first real output device', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const manager = new MidiOutputManager();
        const storage = createMemoryStorage();
        const selector = new MidiOutputDeviceSelector(manager, storage);

        const through = createMockOutput('Midi Through Port-0');
        const piano = createMockOutput('Yamaha P-125');
        const synth = createMockOutput('FluidSynth');

        selector.setDevices([through, piano, synth]);
        expect(selector.getDevices()).toEqual([through, piano, synth]);
        expect(manager.getMidiOut()).toBe(piano);
    });

    it('restores saved device from storage when available and falls back if missing', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const manager = new MidiOutputManager();
        const storage = createMemoryStorage({
            [MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE]: 'FluidSynth',
        });
        const selector = new MidiOutputDeviceSelector(manager, storage);

        const piano = createMockOutput('Yamaha P-125');
        const synth = createMockOutput('FluidSynth');

        selector.setDevices([piano, synth]);
        expect(manager.getMidiOut()).toBe(synth);

        // Disconnect FluidSynth -> falls back to Yamaha
        selector.setDevices([piano]);
        expect(manager.getMidiOut()).toBe(piano);
    });

    it('leaves output unselected when only MIDI Through devices exist', () => {
        const manager = new MidiOutputManager();
        const selector = new MidiOutputDeviceSelector(manager, createMemoryStorage());

        selector.setDevices([createMockOutput('MIDI Through 14:0')]);
        expect(manager.anyDeviceSelected).toBe(false);
    });

    it('selects and persists a device by name, ignoring unknown names', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const manager = new MidiOutputManager();
        const storage = createMemoryStorage();
        const selector = new MidiOutputDeviceSelector(manager, storage);

        const piano = createMockOutput('Yamaha P-125');
        const synth = createMockOutput('FluidSynth');
        selector.setDevices([piano, synth]);

        selector.selectDevice('FluidSynth');
        expect(manager.getMidiOut()).toBe(synth);
        expect(storage.getItem(MidiOutputDeviceSelector.STORAGE_KEY_OUTPUT_DEVICE)).toBe('FluidSynth');

        selector.selectDevice('NonExistent');
        expect(manager.getMidiOut()).toBe(synth);
    });

    it('skips redundant reset when active device stays connected and clears output when all disconnect', () => {
        vi.spyOn(console, 'log').mockImplementation(() => {});
        const manager = new MidiOutputManager();
        const selector = new MidiOutputDeviceSelector(manager, createMemoryStorage());

        const piano = createMockOutput('Yamaha P-125');
        (piano as any).state = 'connected';
        selector.setDevices([piano]);
        expect(piano.send).toHaveBeenCalledTimes(33);

        // Refreshing with same connected device does not re-send MIDI reset
        piano.send.mockClear();
        selector.setDevices([piano]);
        expect(piano.send).not.toHaveBeenCalled();

        // Disconnecting clears output manager so anyDeviceSelected becomes false
        (piano as any).state = 'disconnected';
        selector.setDevices([piano]);
        expect(manager.anyDeviceSelected).toBe(false);
        expect(manager.getMidiOut()).toBeNull();
    });
});
