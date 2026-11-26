/**
 * @file renderer.ts
 * @description Implements the double-buffered 2D canvas Renderer for the velocity bar graph
 * and scrolling piano roll, including pedals, octave lines, note-off markers, and note names.
 */
'use strict';
import { ALPHA_DECAY_SEC, BAR_RATIO, NOTES_COUNT, NOTE_NAME_FORCE_DRAW_AGE_THRESHOLD, NOTE_NAME_FRAME_THRESHOLD, int, scaleValue, } from './config.js';
import { RGB_OCTAVE_LINES, getBarColor, getOnColor, getPedalColor, getSostenutoPedalColor, mixRgb, rgbToInt, rgbToStr, } from './color.js';
const DEFAULT_SETTINGS = {
    scrollSpeedPx: 2,
    scrollSpeedFactor: 1,
    isShowingNoteOffLines: true,
    isShowingNoteNames: true,
    isShowingOctaveLines: true,
    isSharpMode: true,
};
export class Renderer {
    #scale;
    #BAR_SUB_LINE_WIDTH;
    #BAR_BASE_LINE_COLOR = [200, 255, 200];
    #W;
    #H;
    #BAR_H;
    #ROLL_H;
    #MIN_NOTE = 21;
    #MAX_NOTE = 108;
    #cbar;
    #bar;
    #croll;
    #roll;
    #cbar2;
    #bar2;
    #croll2;
    #roll2;
    #rollFrozen = false;
    #drewOffLine = false;
    #currentFrame = -1;
    #subpixelScroll = 0;
    #lastDrawY = 0;
    #lastPedalColorInt = -1;
    #lastVlinesOn = false;
    #lastNoteNameDrawFrame = [];
    #needsAnimation = false;
    #extraLineType = -1;
    #EXTRA_LINE_COLORS = [
        "#FF9090",
        "#FFC0FF",
        "#C0C0FF",
        "#FFFFC0",
        "#C0FFFF",
    ];
    #EXTRA_LINE_HEIGHT;
    #EXTRA_LINE_DASH;
    #status;
    #getSettings;
    #onRequestAnimation;
    #tonalOverride;
    static getCanvas(name) {
        const canvas = document.getElementById(name);
        const context = canvas.getContext("2d");
        return [canvas, context];
    }
    constructor(deps) {
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
    setGetSettings(getSettings) {
        this.#getSettings = getSettings;
    }
    setOnRequestAnimation(callback) {
        this.#onRequestAnimation = callback;
    }
    drawSubLine(percent) {
        this.#bar.fillStyle = rgbToStr(getBarColor(127 * (1 - percent)));
        this.#bar.fillRect(0, this.#BAR_H * percent, this.#W, this.#BAR_SUB_LINE_WIDTH);
    }
    // Draws vertical lines between octaves (between B and C).
    drawOctaveLines(rollDrawHeight) {
        this.#roll.fillStyle = rgbToStr(RGB_OCTAVE_LINES);
        this.#bar.fillStyle = this.#roll.fillStyle;
        const OCTAVE_LINE_WIDTH = 2;
        for (let i = this.#MIN_NOTE; i <= this.#MAX_NOTE; i++) {
            if (i % 12 === 0 && i > this.#MIN_NOTE) {
                const x = this.#W * (i - this.#MIN_NOTE) / (this.#MAX_NOTE - this.#MIN_NOTE + 1);
                if (!this.#rollFrozen && rollDrawHeight > 0) {
                    this.#roll.fillRect(x, 0, OCTAVE_LINE_WIDTH, rollDrawHeight);
                }
                this.#bar.fillRect(x, 0, OCTAVE_LINE_WIDTH, this.#BAR_H);
            }
        }
    }
    #barAreaChanged() {
        this.#lastDrawY = 0;
    }
    needsAnimation() {
        return this.#needsAnimation ||
            (!this.#rollFrozen && this.#lastDrawY <= (this.#ROLL_H + 64));
    }
    onDraw(time) {
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
        let scrollAmount = 0;
        let drawHeight = 0;
        const scrollPx = settings.scrollSpeedPx;
        const scrollFactor = settings.scrollSpeedFactor;
        if (!this.#rollFrozen) {
            this.#subpixelScroll += scrollPx;
            scrollAmount = int(this.#subpixelScroll);
            this.#subpixelScroll -= scrollAmount;
            const hlineHeight = scaleValue(2, this.#scale);
            drawHeight = Math.max(scrollAmount, hlineHeight);
            const sustainColor = getPedalColor(this.#status.damperPedal);
            const sostenutoColor = getSostenutoPedalColor(this.#status.sostenuto);
            const pedalColor = mixRgb(sustainColor, sostenutoColor);
            const pedalColorInt = rgbToInt(pedalColor);
            // Shift the roll and paint only the newly exposed strip so lines drawn on
            // zero-scroll frames (e.g. 0.25px slowest mode) are never overwritten.
            if (scrollAmount >= 1) {
                this.#roll.drawImage(this.#croll, 0, scrollAmount);
                this.#lastDrawY += scrollAmount;
                this.#roll.fillStyle = rgbToStr(pedalColor);
                this.#roll.fillRect(0, 0, this.#W, scrollAmount);
            }
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
            }
            else {
                this.#drewOffLine = false;
            }
            // "On" line
            if (this.#status.onNoteCountInTick > 0) {
                this.#barAreaChanged();
                this.#roll.fillStyle = rgbToStr(getOnColor(this.#status.onNoteCountInTick));
                this.#roll.fillRect(0, Math.max(0, drawHeight - hlineHeight), this.#W, hlineHeight);
            }
            // Extra (metronome / audio attack) line
            if (this.#extraLineType >= 0) {
                this.#barAreaChanged();
                this.#roll.strokeStyle = this.#EXTRA_LINE_COLORS[this.#extraLineType];
                this.#roll.setLineDash(this.#EXTRA_LINE_DASH);
                this.#roll.lineWidth = this.#EXTRA_LINE_HEIGHT;
                this.#roll.beginPath();
                this.#roll.rect(0, 0, this.#W, drawHeight);
                this.#roll.stroke();
                this.#roll.setLineDash([]);
                this.#extraLineType = -1;
            }
        }
        const fontSize = bw * 0.9;
        for (let i = this.#MIN_NOTE; i <= this.#MAX_NOTE; i++) {
            const n = this.#status.getNote(i);
            const on = n.noteOn;
            const velocity = n.velocity;
            const color = getBarColor(velocity);
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
            this.drawOctaveLines(scrollAmount);
        }
        if (this.#lastVlinesOn !== settings.isShowingOctaveLines) {
            this.#barAreaChanged();
            this.#lastVlinesOn = settings.isShowingOctaveLines;
        }
        // Base line.
        this.#bar.fillStyle = rgbToStr(this.#BAR_BASE_LINE_COLOR);
        this.#bar.fillRect(0, this.#BAR_H, this.#W, -this.#BAR_SUB_LINE_WIDTH);
    }
    flip() {
        this.#bar2.drawImage(this.#cbar, 0, 0);
        if (!this.#rollFrozen) {
            this.#roll2.drawImage(this.#croll, 0, 0);
        }
    }
    toggleMute() {
        $('#canvases').toggle();
    }
    show() {
        $('#canvases').show();
    }
    toggleRollFrozen() {
        this.#rollFrozen = !this.#rollFrozen;
        this.flip();
    }
    get isRollFrozen() {
        return this.#rollFrozen;
    }
    get isVideoMuted() {
        return $('#canvases').css('display') === 'none';
    }
    drawExtraLine(type) {
        this.#extraLineType = Math.max(this.#extraLineType, type);
        this.#needsAnimation = true;
        this.#onRequestAnimation?.();
    }
}
//# sourceMappingURL=renderer.js.map