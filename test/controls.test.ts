// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Controls, ControlsCoordinator, ControlsDeps, TimeKeeper } from '../src/controls.js';
import { DEFAULT_PLAY_SPEED_INDEX } from '../src/config.js';
import { setupMvvDom } from './helpers/dom-setup.js';

describe('TimeKeeper', () => {
    it('formats unset and updated seconds with zero-padded seconds and caches results', () => {
        const tk = new TimeKeeper();
        expect(tk.second).toBeNull();
        expect(tk.getHumanReadable()).toBe('0:00');

        expect(tk.setSecond(5.8)).toBe(true);
        expect(tk.second).toBe(5);
        expect(tk.getHumanReadable()).toBe('0:05');

        // Same integer second returns false (no change)
        expect(tk.setSecond(5.1)).toBe(false);

        expect(tk.setSecond(60)).toBe(true);
        expect(tk.getHumanReadable()).toBe('1:00');

        expect(tk.setSecond(754.9)).toBe(true);
        expect(tk.getHumanReadable()).toBe('12:34');
    });
});

describe('Controls', () => {
    let coordinator: ControlsCoordinator & {
        scrollSpeedIndex: number;
        playSpeedIndex: number;
        isSharpMode: boolean;
        isShowingOctaveLines: boolean;
        isShowingNoteNames: boolean;
        isShowingNoteOffLines: boolean;
        isReplayAvailable: boolean;
    };
    let renderer: { isRollFrozen: boolean; isVideoMuted: boolean };
    let recorder: {
        isRecording: boolean;
        isPlaying: boolean;
        isPausing: boolean;
        isAnythingRecorded: boolean;
        sections: number[];
        lastEventTimestamp: number;
        currentPlaybackTimestamp: number;
    };
    let metronome: { isPlaying: boolean };
    let controls: Controls;

    beforeEach(() => {
        setupMvvDom();
        vi.spyOn(console, 'log').mockImplementation(() => {});

        coordinator = {
            scrollSpeedIndex: 0,
            playSpeedIndex: DEFAULT_PLAY_SPEED_INDEX,
            isSharpMode: true,
            isShowingOctaveLines: true,
            isShowingNoteNames: true,
            isShowingNoteOffLines: true,
            isReplayAvailable: false,
            moveToStart: vi.fn(),
            togglePlayback: vi.fn(),
            startPlayback: vi.fn(),
            pause: vi.fn(),
            stop: vi.fn(),
            rotatePlaySpeed: vi.fn(),
            resetPlaySpeed: vi.fn(),
            startRecording: vi.fn(),
            replayFromAlwaysRecordingBuffer: vi.fn(),
            uploadRequested: vi.fn(),
            downloadRequested: vi.fn(),
            toggleRollFrozen: vi.fn(),
            toggleVideoMute: vi.fn(),
            setSharpMode: vi.fn(),
            setShowingOctaveLines: vi.fn(),
            rotateScrollSpeed: vi.fn(),
            toggleNoteNames: vi.fn(),
            toggleNoteOffLines: vi.fn(),
            toggleMetronome: vi.fn(),
            showOutputSelector: vi.fn(),
            moveToPercent: vi.fn(),
            moveToTime: vi.fn(),
        };
        renderer = { isRollFrozen: false, isVideoMuted: false };
        recorder = {
            isRecording: false,
            isPlaying: false,
            isPausing: false,
            isAnythingRecorded: false,
            sections: [],
            lastEventTimestamp: 0,
            currentPlaybackTimestamp: 0,
        };
        metronome = { isPlaying: false };

        const deps: ControlsDeps = { coordinator, renderer, recorder, metronome };
        controls = new Controls(deps);
    });

    it('routes button click and double-click events to coordinator', () => {
        $('#top').trigger('click');
        $('#play').trigger('click');
        $('#pause').trigger('click');
        $('#stop').trigger('click');
        $('#play-speed').trigger('click');
        $('#play-speed').trigger('dblclick');
        $('#record').trigger('click');
        $('#replay').trigger('click');
        $('#up').trigger('click');
        $('#down').trigger('click');
        $('#freeze').trigger('click');
        $('#video-mute').trigger('click');
        $('#sharp').trigger('click');
        $('#flat').trigger('click');
        $('#vlines').trigger('click');
        $('#roll-speed').trigger('click');
        $('#notenames').trigger('click');
        $('#off-lines').trigger('click');
        $('#metronome').trigger('click');
        $('#midi-output').trigger('click');

        expect(coordinator.moveToStart).toHaveBeenCalledTimes(1);
        expect(coordinator.togglePlayback).toHaveBeenCalledTimes(1);
        expect(coordinator.pause).toHaveBeenCalledTimes(1);
        expect(coordinator.stop).toHaveBeenCalledTimes(1);
        expect(coordinator.rotatePlaySpeed).toHaveBeenCalledTimes(1);
        expect(coordinator.resetPlaySpeed).toHaveBeenCalledTimes(1);
        expect(coordinator.startRecording).toHaveBeenCalledTimes(1);
        expect(coordinator.replayFromAlwaysRecordingBuffer).toHaveBeenCalledTimes(1);
        expect(coordinator.uploadRequested).toHaveBeenCalledTimes(1);
        expect(coordinator.downloadRequested).toHaveBeenCalledTimes(1);
        expect(coordinator.toggleRollFrozen).toHaveBeenCalledTimes(1);
        expect(coordinator.toggleVideoMute).toHaveBeenCalledTimes(1);
        expect(coordinator.setSharpMode).toHaveBeenCalledWith(true);
        expect(coordinator.setSharpMode).toHaveBeenCalledWith(false);
        expect(coordinator.setShowingOctaveLines).toHaveBeenCalledWith(false);
        expect(coordinator.rotateScrollSpeed).toHaveBeenCalledTimes(1);
        expect(coordinator.toggleNoteNames).toHaveBeenCalledTimes(1);
        expect(coordinator.toggleNoteOffLines).toHaveBeenCalledTimes(1);
        expect(coordinator.toggleMetronome).toHaveBeenCalledTimes(1);
        expect(coordinator.showOutputSelector).toHaveBeenCalledTimes(1);
    });

    it('updates button CSS states across idle, recording, playing, and pausing modes', () => {
        // Idle with nothing recorded
        controls.update();
        expect($('#play').hasClass('button-disabled')).toBe(true);
        expect($('#down').hasClass('button-disabled')).toBe(true);
        expect($('#replay').hasClass('button-disabled')).toBe(true);
        expect($('#timestamp').text()).toBe('-');

        // Idle with recording + replay available + sections
        recorder.isAnythingRecorded = true;
        recorder.lastEventTimestamp = 10_000;
        recorder.currentPlaybackTimestamp = 2500;
        recorder.sections = [0, 5000];
        coordinator.isReplayAvailable = true;
        coordinator.scrollSpeedIndex = 1;
        coordinator.playSpeedIndex = 4; // 2x
        controls.update();

        expect($('#play').hasClass('button-disabled')).toBe(false);
        expect($('#down').hasClass('button-disabled')).toBe(false);
        expect($('#replay').hasClass('button-disabled')).toBe(false);
        expect($('#roll-speed').hasClass('roll-speed-fast')).toBe(true);
        expect($('#roll-speed').hasClass('button-activated')).toBe(true);
        expect($('#play-speed').hasClass('play-speed-200')).toBe(true);
        expect($('#play-speed').hasClass('button-activated')).toBe(true);
        expect($('#timestamp').text()).toBe('0:02/0:10');
        expect($('#position').css('left')).toBe('25%');
        expect($('#section-markers-container .section-marker')).toHaveLength(2);

        // Recording state
        recorder.isRecording = true;
        controls.update();
        expect($('#record').hasClass('button-activated-unclickable')).toBe(true);
        expect($('#stop').hasClass('button-disabled')).toBe(false);
        expect($('#play').hasClass('button-disabled')).toBe(true);
        expect($('#timestamp').text()).toBe('-');
        expect($('#position').css('left')).toBe('0%');

        // Playing state
        recorder.isRecording = false;
        recorder.isPlaying = true;
        controls.update();
        expect($('#play').hasClass('button-activated-unclickable')).toBe(true);
        expect($('#pause').hasClass('button-disabled')).toBe(false);
        expect($('#top').hasClass('button-disabled')).toBe(false);

        // Pausing state
        recorder.isPlaying = false;
        recorder.isPausing = true;
        controls.update();
        expect($('#pause').hasClass('button-activated')).toBe(true);
        expect($('#play').hasClass('button-disabled')).toBe(false);
    });

    it('snaps directJump to nearby section markers and jumps proportionally otherwise', () => {
        recorder.isAnythingRecorded = true;
        recorder.lastEventTimestamp = 10_000;
        recorder.sections = [5000]; // 50% -> x=100px on a 200px bar

        vi.spyOn($.fn, 'innerWidth').mockReturnValue(200);

        // Click at x=108 (8px away from section at 100px, within 16px snap threshold)
        const nearEv = $.Event('mousedown', { offsetX: 108 });
        $('#position_bar').trigger(nearEv);
        expect(coordinator.moveToTime).toHaveBeenCalledWith(4990);

        // Click at x=40 (60px away from section -> proportional jump to 40/200 = 0.2)
        const farEv = $.Event('mousedown', { offsetX: 40 });
        $('#position_bar').trigger(farEv);
        expect(coordinator.moveToPercent).toHaveBeenCalledWith(0.2);
    });

    it('pauses on dragstart while playing, clamps drag position, and resumes on dragstop', () => {
        recorder.isPlaying = true;
        vi.spyOn($.fn, 'innerWidth').mockReturnValue(200);

        $('#position').trigger('dragstart', { position: { left: 50 } });
        expect(coordinator.pause).toHaveBeenCalledTimes(1);

        const negativeUi = { position: { left: -20 } };
        $('#position').trigger('drag', negativeUi);
        expect(negativeUi.position.left).toBe(0);
        expect(coordinator.moveToPercent).toHaveBeenCalledWith(0);

        const overflowUi = { position: { left: 260 } };
        $('#position').trigger('drag', overflowUi);
        expect(overflowUi.position.left).toBe(200);
        expect(coordinator.moveToPercent).toHaveBeenCalledWith(1);

        $('#position').trigger('dragstop', { position: { left: 100 } });
        expect(coordinator.moveToPercent).toHaveBeenCalledWith(0.5);
        expect(coordinator.startPlayback).toHaveBeenCalledTimes(1);
    });

    it('ignores directJump and drag when progress bar width is zero to avoid NaN', () => {
        vi.spyOn($.fn, 'innerWidth').mockReturnValue(0);

        $('#position_bar').trigger($.Event('mousedown', { offsetX: 0 }));
        $('#position').trigger('drag', { position: { left: 0 } });
        $('#position').trigger('dragstop', { position: { left: 0 } });

        expect(coordinator.moveToPercent).not.toHaveBeenCalled();
        expect(coordinator.moveToTime).not.toHaveBeenCalled();
    });
});
