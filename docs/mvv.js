/**
 * @file mvv.ts
 * @description Browser entry point and composition root for MVV (MIDI Event Visualizer).
 * Instantiates core modules, wires UI controls and dialogs, initializes WebMIDI, and binds
 * top-level DOM/window event listeners.
 */
'use strict';
import { readRuntimeConfig } from './config.js';
import { MidiRenderingStatus } from './midi-status.js';
import { MidiOutputManager, MidiOutputDeviceSelector } from './midi-output.js';
import { Metronome } from './metronome.js';
import { AlwaysRecorder, Recorder } from './recorder.js';
import { Renderer } from './renderer.js';
import { AudioProcessor } from './audio-processor.js';
import { Controls } from './controls.js';
import { SaveAsBox, ConfirmBox, MetronomeBox, MidiOutputBox } from './dialogs.js';
import { Coordinator } from './coordinator.js';
import { bindDomEvents, initWebMidi } from './app-wiring.js';
const runtimeConfig = readRuntimeConfig(window.location.search, window.devicePixelRatio);
if (!runtimeConfig.lowPerfMode) {
    console.log(`Low-perf is disabled. Use ${location.origin}${location.pathname}?lp=1 to enable low-perf mode for slow devices`);
}
console.log("Scale: " + runtimeConfig.scale);
export const midiRenderingStatus = new MidiRenderingStatus();
export const midiOutputManager = new MidiOutputManager();
export const midiOutputDeviceSelector = new MidiOutputDeviceSelector(midiOutputManager);
export const alwaysRecorder = new AlwaysRecorder();
export const recorder = new Recorder({
    playbackResolutionMs: runtimeConfig.playbackResolutionMs,
});
export const renderer = new Renderer({
    status: midiRenderingStatus,
    scale: runtimeConfig.scale,
});
export const metronome = new Metronome({
    onBeatLine: (lineType) => renderer.drawExtraLine(lineType),
});
export const audioProcessor = new AudioProcessor({
    onAttack: () => renderer.drawExtraLine(3),
});
export const coordinator = new Coordinator({
    renderer,
    midiRenderingStatus,
    midiOutputManager,
    metronome,
    alwaysRecorder,
    recorder,
    audioProcessor,
    scale: runtimeConfig.scale,
});
// Wire cross-component callbacks now that all instances exist.
midiRenderingStatus.setOnActivity(() => coordinator.startAnimationLoop());
renderer.setOnRequestAnimation(() => coordinator.startAnimationLoop());
renderer.setGetSettings(() => ({
    scrollSpeedPx: coordinator.scrollSpeedPx,
    scrollSpeedFactor: coordinator.scrollSpeedFactor,
    isShowingNoteOffLines: coordinator.isShowingNoteOffLines,
    isShowingNoteNames: coordinator.isShowingNoteNames,
    isShowingOctaveLines: coordinator.isShowingOctaveLines,
    isSharpMode: coordinator.isSharpMode,
}));
recorder.setCallbacks({
    onStatusChanged: (state) => coordinator.onRecorderStatusChanged(state),
    onStartAnimationLoop: () => coordinator.startAnimationLoop(),
    onResetMidi: () => coordinator.resetMidi(),
    onPlaybackTimer: () => coordinator.onPlaybackTimer(),
    onPlaybackMidiEvent: (ev) => {
        midiRenderingStatus.onMidiMessage(ev);
        midiOutputManager.sendEvent(ev.getDataAsArray(), 0);
    },
    onNoteChanged: () => coordinator.updateNoteInformation(),
});
export const controls = new Controls({
    coordinator,
    renderer,
    recorder,
    metronome,
});
export const saveAsBox = new SaveAsBox(recorder);
export const confirmBox = new ConfirmBox();
export const metronomeBox = new MetronomeBox();
export const midiOutputBox = new MidiOutputBox(midiOutputDeviceSelector, midiOutputManager);
coordinator.setUiComponents({
    controls,
    saveAsBox,
    confirmBox,
    metronomeBox,
    midiOutputBox,
});
initWebMidi(coordinator, midiOutputDeviceSelector);
bindDomEvents({ coordinator, recorder, runtimeConfig });
// Start the vsync-based animation loop.
coordinator.startAnimationLoop();
coordinator.updateUi();
//# sourceMappingURL=mvv.js.map