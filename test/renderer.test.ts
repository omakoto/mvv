// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, type Mock } from 'vitest';
import { Renderer, RendererSettings } from '../src/renderer.js';
import { MidiRenderingStatus } from '../src/midi-status.js';
import { MidiEvent } from '../src/smf.js';
import { installMockCanvasContexts, MockCanvasContext, setupMvvDom } from './helpers/dom-setup.js';

describe('Renderer', () => {
    let contexts: Map<string, MockCanvasContext>;
    let status: MidiRenderingStatus;
    let settings: RendererSettings;
    let onRequestAnimation: Mock<() => void>;
    let renderer: Renderer;

    beforeEach(() => {
        setupMvvDom();
        contexts = installMockCanvasContexts();
        status = new MidiRenderingStatus({ now: () => 1000 });
        settings = {
            scrollSpeedPx: 2,
            scrollSpeedFactor: 1,
            isShowingNoteOffLines: true,
            isShowingNoteNames: true,
            isShowingOctaveLines: true,
            isSharpMode: true,
        };
        onRequestAnimation = vi.fn<() => void>();

        renderer = new Renderer({
            status,
            getSettings: () => settings,
            onRequestAnimation,
            scale: 2,
            screenWidth: 800,
            screenHeight: 500,
            tonal: {
                Midi: {
                    midiToNoteName: (n: number) => (n === 60 ? 'C4' : 'D4'),
                },
            },
        });
    });

    it('configures scaled double-buffered canvas dimensions', () => {
        const bar = document.getElementById('bar') as HTMLCanvasElement;
        const roll = document.getElementById('roll') as HTMLCanvasElement;
        expect(bar.width).toBe(1600);
        expect(bar.height).toBe(150); // 1000 * 0.15
        expect(roll.width).toBe(1600);
        expect(roll.height).toBe(850);
        expect(contexts.get('bar')!.imageSmoothingEnabled).toBe(false);
        expect(contexts.get('roll')!.imageSmoothingEnabled).toBe(false);
    });

    it('draws active notes, note names, pedal, octave lines, and extra metronome lines', () => {
        status.onMidiMessage(new MidiEvent(0, [0x90, 60, 100]));
        status.onMidiMessage(new MidiEvent(0, [0xB0, 64, 127]));
        renderer.drawExtraLine(0);

        expect(onRequestAnimation).toHaveBeenCalledTimes(1);

        renderer.onDraw(1000);

        const barCtx = contexts.get('bar')!;
        const rollCtx = contexts.get('roll')!;

        // Bar cleared, sub-lines, note bar, octave lines, and base line drawn
        expect(barCtx.fillRect).toHaveBeenCalled();
        // Roll scrolled, pedal filled, on-line drawn, note block drawn
        expect(rollCtx.drawImage).toHaveBeenCalled();
        expect(rollCtx.fillRect).toHaveBeenCalled();
        // Extra metronome line stroked with dash, then dash reset to solid so note names aren't dashed
        expect(rollCtx.setLineDash).toHaveBeenNthCalledWith(1, expect.arrayContaining([expect.any(Number)]));
        expect(rollCtx.stroke).toHaveBeenCalledTimes(1);
        expect(rollCtx.setLineDash).toHaveBeenLastCalledWith([]);
        // Note name drawn for just-pressed C4 (octave stripped -> "C")
        expect(rollCtx.fillText).toHaveBeenCalledWith('C', expect.any(Number), expect.any(Number));
        expect(rollCtx.strokeText).toHaveBeenCalledWith('C', expect.any(Number), expect.any(Number));
    });

    it('preserves lines on zero-scroll frames in slowest scroll mode (0.25px)', () => {
        settings.scrollSpeedPx = 0.25;
        settings.scrollSpeedFactor = 0.125;
        settings.isShowingOctaveLines = false;

        const rollCtx = contexts.get('roll')!;
        rollCtx.fillRect.mockClear();
        rollCtx.drawImage.mockClear();

        // Frame 1 (subpixel 0.25 -> scrollAmount 0): extra line drawn, NO pedal fill overwrite
        renderer.drawExtraLine(0);
        renderer.onDraw(1000);
        expect(rollCtx.drawImage).not.toHaveBeenCalled();
        expect(rollCtx.stroke).toHaveBeenCalledTimes(1);
        expect(rollCtx.fillRect).not.toHaveBeenCalled();

        // Frames 2 & 3 (subpixel 0.50, 0.75 -> scrollAmount 0): top band still NOT overwritten
        renderer.onDraw(1010);
        renderer.onDraw(1020);
        expect(rollCtx.drawImage).not.toHaveBeenCalled();
        expect(rollCtx.fillRect).not.toHaveBeenCalled();

        // Frame 4 (subpixel 1.00 -> scrollAmount 1): shifts by 1px and fills only the 1px exposed strip
        renderer.onDraw(1030);
        expect(rollCtx.drawImage).toHaveBeenCalledTimes(1);
        expect(rollCtx.fillRect).toHaveBeenCalledWith(0, 0, 1600, 1);
    });

    it('keeps needsAnimation true while released notes fade out and stops after ALPHA_DECAY_SEC', () => {
        let nowMs = 1000;
        status = new MidiRenderingStatus({ now: () => nowMs });
        renderer = new Renderer({
            status,
            getSettings: () => settings,
            scale: 1,
            screenWidth: 400,
            screenHeight: 200,
        });

        // Freeze roll so needsAnimation() reflects only note fade-out, not roll scrolling.
        renderer.toggleRollFrozen();

        // Press note 60, draw, and advance past SHORTEST_NOTE_LENGTH
        status.onMidiMessage(new MidiEvent(0, [0x90, 60, 100]));
        renderer.onDraw(1000);
        status.afterDraw(1000);
        status.afterDraw(1020);

        // Release note at t=1050
        nowMs = 1050;
        status.onMidiMessage(new MidiEvent(50, [0x80, 60, 0]));

        // 50ms into 300ms fade -> still animating
        renderer.onDraw(1100);
        expect(renderer.needsAnimation()).toBe(true);

        // 350ms after release (> 300ms ALPHA_DECAY_SEC) -> alpha <= 0, animation no longer needed
        renderer.onDraw(1400);
        expect(renderer.needsAnimation()).toBe(false);
    });

    it('suppresses duplicate consecutive note-off lines and resumes after an off-free tick', () => {
        const rollCtx = contexts.get('roll')!;
        const offLineDrawCount = () =>
            rollCtx.fillRect.mock.calls.filter((_args, idx) => fillStylesAtCall[idx] === '#008040').length;

        const fillStylesAtCall: string[] = [];
        rollCtx.fillRect.mockImplementation(() => {
            fillStylesAtCall.push(rollCtx.fillStyle);
        });

        // Press two notes so we can release them on consecutive ticks
        status.onMidiMessage(new MidiEvent(0, [0x90, 60, 100]));
        status.onMidiMessage(new MidiEvent(0, [0x90, 64, 100]));
        status.onMidiMessage(new MidiEvent(0, [0x90, 67, 100]));
        renderer.onDraw(1000);
        status.afterDraw(1000);

        // Tick 1: first note-off -> draws off-line (#008040)
        status.onMidiMessage(new MidiEvent(20, [0x80, 60, 0]));
        renderer.onDraw(1020);
        status.afterDraw(1020);
        expect(offLineDrawCount()).toBe(1);

        // Tick 2: consecutive note-off -> suppressed to avoid double brightness
        status.onMidiMessage(new MidiEvent(40, [0x80, 64, 0]));
        renderer.onDraw(1040);
        status.afterDraw(1040);
        expect(offLineDrawCount()).toBe(1);

        // Tick 3: no note-off -> resets suppression
        renderer.onDraw(1060);
        status.afterDraw(1060);

        // Tick 4: next note-off -> draws off-line again
        status.onMidiMessage(new MidiEvent(80, [0x80, 67, 0]));
        renderer.onDraw(1080);
        status.afterDraw(1080);
        expect(offLineDrawCount()).toBe(2);
    });

    it('freezes roll updates and roll flip when rollFrozen is toggled', () => {
        renderer.toggleRollFrozen();
        expect(renderer.isRollFrozen).toBe(true);

        const rollCtx = contexts.get('roll')!;
        const roll2Ctx = contexts.get('roll2')!;
        const bar2Ctx = contexts.get('bar2')!;
        rollCtx.drawImage.mockClear();
        roll2Ctx.drawImage.mockClear();
        bar2Ctx.drawImage.mockClear();

        renderer.onDraw(1000);
        renderer.flip();

        expect(rollCtx.drawImage).not.toHaveBeenCalled();
        expect(roll2Ctx.drawImage).not.toHaveBeenCalled();
        expect(bar2Ctx.drawImage).toHaveBeenCalledTimes(1);

        // Unfreezing flips both canvases
        renderer.toggleRollFrozen();
        expect(renderer.isRollFrozen).toBe(false);
        expect(roll2Ctx.drawImage).toHaveBeenCalledTimes(1);
    });

    it('toggles video mute state via #canvases visibility', () => {
        expect(renderer.isVideoMuted).toBe(false);
        renderer.toggleMute();
        expect(renderer.isVideoMuted).toBe(true);
        renderer.show();
        expect(renderer.isVideoMuted).toBe(false);
    });
});
