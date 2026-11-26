/**
 * @file app-wiring.ts
 * @description Testable helpers for WebMIDI device setup, MIDI file loading,
 * and top-level browser DOM/window event wiring.
 */
'use strict';
import { MidiEvent, loadMidi } from './smf.js';
import { debug, info } from './util.js';
export function setupMidiAccess(midiAccess, coordinator, selector) {
    console.log("onMIDISuccess: looking for MIDI devices...");
    for (const input of midiAccess.inputs.values()) {
        if (input.state === 'disconnected') {
            input.onmidimessage = null;
            continue;
        }
        console.log("Discovered input device: " + input.name, input);
        input.onmidimessage = (ev) => {
            coordinator.onMidiMessage(MidiEvent.fromNativeEvent(ev));
        };
    }
    const outputs = Array.from(midiAccess.outputs.values());
    for (const output of outputs) {
        console.log("Discovered output device: " + output.name, output);
    }
    selector.setDevices(outputs);
}
export function initWebMidi(coordinator, selector, notifyError = (msg) => alert(msg)) {
    if (!navigator.requestMIDIAccess) {
        notifyError("Your browser doesn't support WebMIDI. (Try Chrome instead.)");
        return Promise.resolve();
    }
    return navigator.requestMIDIAccess().then((midiAccess) => {
        setupMidiAccess(midiAccess, coordinator, selector);
        midiAccess.onstatechange = (event) => {
            console.log("MIDI device state changed: ", event.port.name, event.port.state);
            if (event.port.type === 'input' && event.port.state === 'disconnected') {
                event.port.onmidimessage = null;
            }
            setupMidiAccess(midiAccess, coordinator, selector);
        };
    }, () => {
        notifyError('Could not access your MIDI devices.');
    });
}
export function loadMidiFile(file, coordinator, recorder) {
    info("Loading from: " + file.name);
    console.log("Loading from: ", file);
    coordinator.reset();
    return loadMidi(file).then((events) => {
        debug("File loaded", events);
        recorder.setEvents(events);
        coordinator.updateUi();
    }).catch((error) => {
        info("Failed loading from " + file.name + ": " + error);
        console.log(error);
    });
}
export function bindDomEvents(options) {
    const { coordinator, recorder, runtimeConfig } = options;
    const openUrl = options.openUrl ?? ((url, target) => window.open(url, target));
    const ebody = $('body');
    $(window).on('keydown', (ev) => coordinator.onKeyDown(ev.originalEvent));
    ebody.on("dragover", function (ev) {
        ev.preventDefault();
    });
    let clearCursorTimeout = null;
    ebody.on("mousemove", function (_ev) {
        if (clearCursorTimeout !== null) {
            clearTimeout(clearCursorTimeout);
        }
        ebody.css('cursor', 'default');
        clearCursorTimeout = setTimeout(() => {
            ebody.css('cursor', 'none');
        }, 3000);
        coordinator.extendWakelock();
    });
    ebody.on("drop", function (ev) {
        ev.preventDefault();
        const oev = ev.originalEvent;
        const file = oev.dataTransfer?.files[0];
        if (!file) {
            return;
        }
        console.log("File dropped", file, oev.dataTransfer);
        coordinator.withOverwriteConfirm("Uploading a MIDI file.", () => {
            loadMidiFile(file, coordinator, recorder);
        });
    });
    $("#open_file").on("change", (ev) => {
        const file = ev.target.files?.[0];
        if (!file) {
            return; // canceled
        }
        console.log("File selected", ev);
        loadMidiFile(file, coordinator, recorder);
    });
    $('#fullscreen').on('click', (_ev) => {
        coordinator.toggleFullScreen();
    });
    $('#source').on('click', (_ev) => {
        openUrl("https://github.com/omakoto/mvv", "source");
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
    $(window).on('beforeunload', (ev) => {
        if (!recorder.isDirty) {
            return;
        }
        ev.preventDefault();
        const orig = ev.originalEvent;
        if (orig) {
            orig.returnValue = '';
        }
        return '';
    });
    $(window).on('load', () => {
        $('body').trigger('focus');
        if (typeof $(document).tooltip === 'function') {
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
        }
        if (runtimeConfig.lowPerfMode) {
            $('#bottom_mask').css('display', 'none');
            $('#bottom_mask_opaque').css('display', 'block');
        }
    });
    $(window).on('pagehide', () => {
        coordinator.close();
    });
}
//# sourceMappingURL=app-wiring.js.map