/**
 * @file renderer.ts
 * @description Implements the double-buffered 2D canvas Renderer for the velocity bar graph
 * and scrolling piano roll, including pedals, octave lines, note-off markers, and note names.
 */

'use strict';

import {
    ALPHA_DECAY_SEC,
    BAR_RATIO,
    NOTES_COUNT,
    NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD,
    NOTE_NAME_FRAME_THRESHOLD,
    int,
    scaleValue,
} from './config.js';
import {
    RGB,
    RGB_OCTAVE_LINES,
    getBarColor,
    getOnColor,
    getPedalColor,
    getSostenutoPedalColor,
    mixRgb,
    rgbToInt,
    rgbToStr,
} from './color.js';
import { MidiRenderingStatus } from './midi-status.js';

declare const Tonal: any;

export interface RendererSettings {
    scrollSpeedPx: number;
    scrollSpeedFactor: number;
    isShowingNoteOffLines: boolean;
    isShowingNoteNames: boolean;
    isShowingOctaveLines: boolean;
    isSharpMode: boolean;
}

export interface RendererDeps {
    status: MidiRenderingStatus;
    getSettings?: () => RendererSettings;
    onRequestAnimation?: () => void;
    scale?: number;
    screenWidth?: number;
    screenHeight?: number;
    tonal?: any;
}

const DEFAULT_SETTINGS: RendererSettings = {
    scrollSpeedPx: 2,
    scrollSpeedFactor: 1,
    isShowingNoteOffLines: true,
    isShowingNoteNames: true,
    isShowingOctaveLines: true,
    isSharpMode: true,
};

export class Renderer {
    #scale: number;
    #BAR_SUB_LINE_WIDTH: number;
    #BAR_BASE_LINE_COLOR: RGB = [200, 255, 200];

    #W: number;
    #H: number;
    #BAR_H: number;
    #ROLL_H: number;
    #MIN_NOTE = 21;
    #MAX_NOTE = 108;

    #cbar: HTMLCanvasElement;
    #bar: CanvasRenderingContext2D;
    #croll: HTMLCanvasElement;
    #roll: CanvasRenderingContext2D;

    #cbar2: HTMLCanvasElement;
    #bar2: CanvasRenderingContext2D;
    #croll2: HTMLCanvasElement;
    #roll2: CanvasRenderingContext2D;

    #rollFrozen = false;
    #drewOffLine = false;

    #currentFrame = -1;
    #lastDrawFrame = 0;
    #subpixelScroll = 0;
    #lastDrawY = 0;

    #lastPedalColorInt = -1;
    #lastVlinesOn = false;

    #lastNoteNameDrawFrame: Array<number> = [];

    #needsAnimation = false;
    #extraLineType = -1;

    readonly #EXTRA_LINE_COLORS = [
        "#FF9090",
        "#FFC0FF",
        "#C0C0FF",
        "#FFFFC0",
        "#C0FFFF",
    ];

    readonly #EXTRA_LINE_HEIGHT: number;
    readonly #EXTRA_LINE_DASH: number[];

    #status: MidiRenderingStatus;
    #getSettings: () => RendererSettings;
    #onRequestAnimation?: () => void;
    #tonalOverride?: any;

    static getCanvas(name: string): [HTMLCanvasElement, CanvasRenderingContext2D] {
        const canvas = document.getElementById(name) as HTMLCanvasElement;
        const context = canvas.getContext("2d") as CanvasRenderingContext2D;
        return [canvas, context];
    }

    constructor(deps: RendererDeps) {
        this.#status = deps.status;
        this.#getSettings = deps.getSettings ?? (() => DEFAULT_SETTINGS);
        this.#onRequestAnimation = deps.onRequestAnimation;
        this.#tonalOverride = deps.tonal;
        this.#scale = deps.scale ?? 1;

        this.#BAR_SUB_LINE_WIDTH = scaleValue(2, this.#scale);
        this.#EXTRA_LINE_HEIGHT = scaleValue(3, this.#scale);
        this.#EXTRA_LINE_DASH = [this.#EXTRA_LINE_HEIGHT * 4, this.#EXTRA_LINE_HEIGHT * 8];

        // Adjust canvas container heights to match BAR_RATIO.
        $("#bar2").css("height", (BAR_RATIO * 100) + "%");
        $("#roll2").css("height", (100 - BAR_RATIO * 100) + "%");

        const screenW = deps.screenWidth ?? screen.width;
        const screenH = deps.screenHeight ?? screen.height;

        this.#W = scaleValue(screenW, this.#scale);
        this.#H = scaleValue(screenH, this.#scale);
        this.#BAR_H = int(this.#H * BAR_RATIO);
        this.#ROLL_H = this.#H - this.#BAR_H;

        [this.#cbar, this.#bar] = Renderer.getCanvas("bar");
        [this.#cbar2, this.#bar2] = Renderer.getCanvas("bar2");
        [this.#croll, this.#roll] = Renderer.getCanvas("roll");
        [this.#croll2, this.#roll2] = Renderer.getCanvas("roll2");

        this.#bar.imageSmoothingEnabled = false;
        this.#bar2.imageSmoothingEnabled = false;
        this.#roll.imageSmoothingEnabled = false;
        this.#roll2.imageSmoothingEnabled = false;

        this.#cbar.width = this.#W;
        this.#cbar.height = this.#BAR_H;
        this.#cbar2.width = this.#W;
        this.#cbar2.height = this.#BAR_H;

        this.#croll.width = this.#W;
        this.#croll.height = this.#ROLL_H;
        this.#croll2.width = this.#W;
        this.#croll2.height = this.#ROLL_H;

        for (let i = 0; i < NOTES_COUNT; i++) {
            this.#lastNoteNameDrawFrame[i] = -99999;
        }
    }

    setGetSettings(getSettings: () => RendererSettings): void {
        this.#getSettings = getSettings;
    }

    setOnRequestAnimation(callback: () => void): void {
        this.#onRequestAnimation = callback;
    }

    getBarColor(velocity: number): RGB {
        return getBarColor(velocity);
    }

    getOnColor(count: number): RGB {
        return getOnColor(count);
    }

    getPedalColor(value: number): RGB {
        return getPedalColor(value);
    }

    getSostenutoPedalColor(value: number): RGB {
        return getSostenutoPedalColor(value);
    }

    mixRgb(rgb1: RGB, rgb2: RGB): RGB {
        return mixRgb(rgb1, rgb2);
    }

    drawSubLine(percent: number): void {
        this.#bar.fillStyle = rgbToStr(this.getBarColor(127 * (1 - percent)));
        this.#bar.fillRect(0, this.#BAR_H * percent, this.#W, this.#BAR_SUB_LINE_WIDTH);
    }

    // Draws vertical lines between octaves (between B and C).
    drawOctaveLines(drawHeight: number): void {
        this.#roll.fillStyle = rgbToStr(RGB_OCTAVE_LINES);
        this.#bar.fillStyle = this.#roll.fillStyle;
        const OCTAVE_LINE_WIDTH = 2;

        for (let i = this.#MIN_NOTE; i <= this.#MAX_NOTE; i++) {
            if (i % 12 === 0 && i > this.#MIN_NOTE) {
                const x = this.#W * (i - this.#MIN_NOTE) / (this.#MAX_NOTE - this.#MIN_NOTE + 1);

                if (!this.#rollFrozen) {
                    this.#roll.fillRect(x, 0, OCTAVE_LINE_WIDTH, drawHeight);
                }

                this.#bar.fillRect(x, 0, OCTAVE_LINE_WIDTH, this.#BAR_H);
            }
        }
    }

    #barAreaChanged(): void {
        this.#lastDrawFrame = this.#currentFrame;
        this.#lastDrawY = 0;
    }

    needsAnimation(): boolean {
        return this.#needsAnimation ||
            (!this.#rollFrozen && this.#lastDrawY <= (this.#ROLL_H + 64));
    }

    onDraw(time: number): void {
        const settings = this.#getSettings();
        const tonalLib = this.#tonalOverride ?? (typeof Tonal !== 'undefined' ? Tonal : null);

        this.#currentFrame++;
        this.#needsAnimation = false;

        // Clear the bar area.
        this.#bar.fillStyle = 'black';
        this.#bar.fillRect(0, 0, this.#W, this.#H);

        // Sub bar lines.
        this.drawSubLine(0.25);
        this.drawSubLine(0.5);
        this.drawSubLine(0.7);

        // Individual bar width
        const bw = this.#W / (this.#MAX_NOTE - this.#MIN_NOTE + 1) - 1;

        let drawHeight = 0;
        const scrollPx = settings.scrollSpeedPx;
        const scrollFactor = settings.scrollSpeedFactor;

        if (!this.#rollFrozen) {
            this.#subpixelScroll += scrollPx;
            const scrollAmount = int(this.#subpixelScroll);
            this.#subpixelScroll -= scrollAmount;

            const hlineHeight = scaleValue(2, this.#scale);
            drawHeight = Math.max(scrollAmount, hlineHeight);

            if (scrollAmount >= 1) {
                this.#roll.drawImage(this.#croll, 0, scrollAmount);
            }

            this.#lastDrawY += scrollAmount;

            // Draw the pedals.
            const sustainColor = this.getPedalColor(this.#status.damperPedal);
            const sostenutoColor = this.getSostenutoPedalColor(this.#status.sostenuto);
            const pedalColor = this.mixRgb(sustainColor, sostenutoColor);
            const pedalColorInt = rgbToInt(pedalColor);

            this.#roll.fillStyle = rgbToStr(pedalColor);
            this.#roll.fillRect(0, 0, this.#W, drawHeight);
            if (pedalColorInt !== this.#lastPedalColorInt) {
                this.#barAreaChanged();
                this.#lastPedalColorInt = pedalColorInt;
            }

            // "Off" line
            if (this.#status.offNoteCountInTick > 0 && settings.isShowingNoteOffLines) {
                this.#barAreaChanged();

                // Avoid drawing consecutive off-lines directly adjacent, which looks overly bright.
                if (!this.#drewOffLine) {
                    this.#roll.fillStyle = "#008040";
                    this.#roll.fillRect(0, Math.max(0, drawHeight - hlineHeight), this.#W, hlineHeight);
                }

                this.#drewOffLine = true;
            } else {
                this.#drewOffLine = false;
            }

            // "On" line
            if (this.#status.onNoteCountInTick > 0) {
                this.#barAreaChanged();

                this.#roll.fillStyle = rgbToStr(this.getOnColor(this.#status.onNoteCountInTick));
                this.#roll.fillRect(0, Math.max(0, drawHeight - hlineHeight), this.#W, hlineHeight);
            }

            // Extra (metronome / audio attack) line
            if (this.#extraLineType >= 0) {
                this.#barAreaChanged();

                this.#roll.strokeStyle = this.#EXTRA_LINE_COLORS[this.#extraLineType]!;
                this.#roll.setLineDash(this.#EXTRA_LINE_DASH);
                this.#roll.lineWidth = this.#EXTRA_LINE_HEIGHT;

                this.#roll.beginPath();
                this.#roll.rect(0, 0, this.#W, drawHeight);
                this.#roll.stroke();

                this.#extraLineType = -1;
            }
        }

        const fontSize = bw * 0.9;

        for (let i = this.#MIN_NOTE; i <= this.#MAX_NOTE; i++) {
            const n = this.#status.getNote(i);
            const on = n.noteOn;
            const velocity = n.velocity;

            const color = this.getBarColor(velocity);
            const alpha = on ? 255 :
                (255 - (255 * (((time - n.offTime) / 1000.0) / ALPHA_DECAY_SEC)));

            if (alpha <= 0) {
                continue;
            }
            if (!on) {
                this.#needsAnimation = true;
            }

            const colorStr = rgbToStr(color, alpha);

            const bl = this.#W * (i - this.#MIN_NOTE) / (this.#MAX_NOTE - this.#MIN_NOTE + 1);
            const bh = this.#BAR_H * n.velocity / 127;

            this.#bar.fillStyle = colorStr;
            this.#bar.fillRect(bl, this.#BAR_H, bw, -bh);

            if (!on) {
                continue;
            }

            if (!this.#rollFrozen) {
                this.#barAreaChanged();

                this.#roll.fillStyle = colorStr;
                this.#roll.fillRect(bl, 0, bw, drawHeight);

                if (settings.isShowingNoteNames && this.#status.isJustPressed(i) && tonalLib?.Midi?.midiToNoteName) {
                    const noteOffAge = this.#status.getLastNoteOffAgeTick(i);
                    const lastDraw = this.#lastNoteNameDrawFrame[i] ?? -9999;
                    const sinceLastDraw = this.#currentFrame - lastDraw;

                    if ((noteOffAge > (NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD / scrollFactor))
                        || (sinceLastDraw > (NOTE_NAME_FRAME_THRESHOLD / scrollFactor))) {

                        this.#lastNoteNameDrawFrame[i] = this.#currentFrame;

                        const noteName = tonalLib.Midi.midiToNoteName(i, { sharps: settings.isSharpMode }).replace(/-?\d+$/, '');
                        this.#roll.font = '' + fontSize + 'px Roboto, sans-serif';
                        this.#roll.textAlign = 'center';
                        this.#roll.strokeStyle = 'rgba(0, 0, 0, 0.7)';
                        this.#roll.lineWidth = scaleValue(5, this.#scale);
                        this.#roll.strokeText(noteName, bl + bw / 2, drawHeight + fontSize);
                        this.#roll.fillStyle = '#ffff20';
                        this.#roll.fillText(noteName, bl + bw / 2, drawHeight + fontSize);
                    }
                }
            }
        }

        if (settings.isShowingOctaveLines) {
            this.drawOctaveLines(drawHeight);
        }
        if (this.#lastVlinesOn !== settings.isShowingOctaveLines) {
            this.#barAreaChanged();
            this.#lastVlinesOn = settings.isShowingOctaveLines;
        }

        // Base line.
        this.#bar.fillStyle = rgbToStr(this.#BAR_BASE_LINE_COLOR);
        this.#bar.fillRect(0, this.#BAR_H, this.#W, -this.#BAR_SUB_LINE_WIDTH);
    }

    flip(): void {
        this.#bar2.drawImage(this.#cbar, 0, 0);
        if (!this.#rollFrozen) {
            this.#roll2.drawImage(this.#croll, 0, 0);
        }
    }

    toggleMute(): void {
        $('#canvases').toggle();
    }

    show(): void {
        $('#canvases').show();
    }

    toggleRollFrozen(): void {
        this.#rollFrozen = !this.#rollFrozen;
        this.flip();
    }

    get isRollFrozen(): boolean {
        return this.#rollFrozen;
    }

    get isVideoMuted(): boolean {
        return $('#canvases').css('display') === 'none';
    }

    drawExtraLine(type: number): void {
        this.#extraLineType = Math.max(this.#extraLineType, type);
        this.#needsAnimation = true;
        this.#onRequestAnimation?.();
    }
}
