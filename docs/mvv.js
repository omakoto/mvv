/**
 * @file mvv.ts
 * @description Browser entry point and composition root for MVV (MIDI Event Visualizer).
 * Instantiates core modules, wires UI controls and dialogs, initializes WebMIDI, and binds
 * top-level DOM/window event listeners.
 */
'use strict';
import { readRuntimeConfig } from './config.js';
import { debug, info } from './util.js';
import { MidiEvent, loadMidi } from './smf.js';
import { MidiRenderingStatus } from './midi-status.js';
import { MidiOutputManager, MidiOutputDeviceSelector } from './midi-output.js';
import { Metronome } from './metronome.js';
import { AlwaysRecorder, Recorder } from './recorder.js';
import { Renderer } from './renderer.js';
import { AudioProcessor } from './audio-processor.js';
import { Controls } from './controls.js';
import { SaveAsBox, ConfirmBox, MetronomeBox, MidiOutputBox } from './dialogs.js';
import { Coordinator } from './coordinator.js';
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
function onMIDISuccess(midiAccess) {
    console.log("onMIDISuccess: looking for MIDI devices...");
    for (const input of midiAccess.inputs.values()) {
        console.log("Discovered input device: " + input.name, input);
        input.onmidimessage = (ev) => {
            coordinator.onMidiMessage(MidiEvent.fromNativeEvent(ev));
        };
    }
    const outputs = Array.from(midiAccess.outputs.values());
    for (const output of outputs) {
        console.log("Discovered output device: " + output.name, output);
    }
    midiOutputDeviceSelector.setDevices(outputs);
}
function onMIDIFailure() {
    alert('Could not access your MIDI devices.');
}
if (navigator.requestMIDIAccess) {
    navigator.requestMIDIAccess()
        .then((midiAccess) => {
        onMIDISuccess(midiAccess);
        midiAccess.onstatechange = (event) => {
            console.log("MIDI device state changed: ", event.port.name, event.port.state);
            onMIDISuccess(midiAccess);
        };
    }, onMIDIFailure);
}
else {
    alert("Your browser doesn't support WebMIDI. (Try Chrome instead.)");
}
const ebody = $('body');
$(window).on('keydown', (ev) => coordinator.onKeyDown(ev.originalEvent));
$("body").on("dragover", function (ev) {
    ev.preventDefault();
});
function loadMidiFile(file) {
    info("Loading from: " + file.name);
    console.log("Loading from: ", file);
    coordinator.reset();
    loadMidi(file).then((events) => {
        debug("File loaded", events);
        recorder.setEvents(events);
        coordinator.updateUi();
    }).catch((error) => {
        info("Failed loading from " + file.name + ": " + error);
        console.log(error);
    });
}
let clearCursorTimeout = null;
$("body").on("mousemove", function (_ev) {
    if (clearCursorTimeout !== null) {
        clearTimeout(clearCursorTimeout);
    }
    ebody.css('cursor', 'default');
    clearCursorTimeout = setTimeout(() => {
        ebody.css('cursor', 'none');
    }, 3000);
    coordinator.extendWakelock();
});
$("body").on("drop", function (ev) {
    var _a;
    ev.preventDefault();
    const oev = ev.originalEvent;
    const file = (_a = oev.dataTransfer) === null || _a === void 0 ? void 0 : _a.files[0];
    if (!file) {
        return;
    }
    console.log("File dropped", file, oev.dataTransfer);
    coordinator.withOverwriteConfirm("Uploading a MIDI file.", () => {
        loadMidiFile(file);
    });
});
$("#open_file").on("change", (ev) => {
    const file = ev.target.files[0];
    if (!file) {
        return; // canceled
    }
    console.log("File selected", ev);
    loadMidiFile(file);
});
$('#fullscreen').on('click', (_ev) => {
    coordinator.toggleFullScreen();
});
$('#source').on('click', (_ev) => {
    window.open("https://github.com/omakoto/mvv", "source");
});
$('#help_close, #help_overlay').on('click', (_ev) => {
    coordinator.toggleHelpScreen();
});
$(document).on('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        coordinator.extendWakelock();
    }
});
// Record last touch timestamp to distinguish touch taps from desktop mouse hovers for tooltips.
let lastTouchTime = 0;
document.addEventListener('touchstart', () => {
    lastTouchTime = Date.now();
}, true);
$(window).on('beforeunload', () => 'Are you sure you want to leave?');
$(window).on('load', () => {
    $('.body').trigger('focus');
    $(document).tooltip({
        open: function (_event, ui) {
            if (Date.now() - lastTouchTime < 500) {
                setTimeout(function () {
                    $(ui.tooltip).fadeOut('fast');
                }, 1000);
            }
        },
        show: { effect: "fade", duration: 100 },
        hide: { effect: "fade", duration: 100 },
    });
    if (runtimeConfig.lowPerfMode) {
        $('#bottom_mask').css('display', 'none');
        $('#bottom_mask_opaque').css('display', 'block');
    }
});
$(window).on('unload', () => {
    coordinator.close();
});
// Start the vsync-based animation loop.
coordinator.startAnimationLoop();
coordinator.updateUi();
//# sourceMappingURL=mvv.js.map