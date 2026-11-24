import { describe, it, expect, vi, afterEach } from 'vitest';
import * as TonalPkg from 'tonal';
import {
    analyzeChord,
    analyzeChordFallback,
    analyzeChordTonal,
    findChordInDictionary,
    getCombinations,
    getNoteFullName,
    getNoteName,
} from '../src/chords.js';

describe('chords', () => {
    afterEach(() => {
        delete (globalThis as any).Tonal;
    });

    describe('getNoteName', () => {
        it('formats pitch classes in sharp and flat modes', () => {
            expect(getNoteName(0, true)).toBe('C');
            expect(getNoteName(1, true)).toBe('C#');
            expect(getNoteName(1, false)).toBe('Db');
            expect(getNoteName(10, true)).toBe('A#');
            expect(getNoteName(10, false)).toBe('Bb');
            expect(getNoteName(61, true)).toBe('C#');
            expect(getNoteName(61, false)).toBe('Db');
        });

        it('handles negative note numbers by normalizing modulo 12', () => {
            expect(getNoteName(-1, true)).toBe('B');
            expect(getNoteName(-2, false)).toBe('Bb');
        });
    });

    describe('getNoteFullName', () => {
        it('returns note name with octave for valid MIDI notes (0..127)', () => {
            expect(getNoteFullName(0, true)).toBe('C-1');
            expect(getNoteFullName(21, true)).toBe('A0');
            expect(getNoteFullName(60, true)).toBe('C4');
            expect(getNoteFullName(61, true)).toBe('C#4');
            expect(getNoteFullName(61, false)).toBe('Db4');
            expect(getNoteFullName(69, true)).toBe('A4');
            expect(getNoteFullName(127, true)).toBe('G9');
        });

        it('returns empty string for out-of-range MIDI notes', () => {
            expect(getNoteFullName(-1, true)).toBe('');
            expect(getNoteFullName(128, true)).toBe('');
            expect(getNoteFullName(200, false)).toBe('');
        });
    });

    describe('getCombinations', () => {
        it('returns empty array for invalid sizes', () => {
            expect(getCombinations([1, 2, 3], 0)).toEqual([]);
            expect(getCombinations([1, 2, 3], -1)).toEqual([]);
            expect(getCombinations([1, 2, 3], 4)).toEqual([]);
        });

        it('generates exact k-combinations', () => {
            expect(getCombinations([1, 2, 3], 3)).toEqual([[1, 2, 3]]);
            expect(getCombinations([1, 2, 3], 1)).toEqual([[1], [2], [3]]);
            expect(getCombinations([1, 2, 3, 4], 2)).toEqual([
                [1, 2], [1, 3], [1, 4], [2, 3], [2, 4], [3, 4],
            ]);
            expect(getCombinations([1, 2, 3, 4], 3)).toHaveLength(4);
        });
    });

    describe('findChordInDictionary', () => {
        it('returns null when fewer than 2 pitch classes are passed', () => {
            expect(findChordInDictionary([0], { M: [0, 4, 7] }, true)).toBeNull();
        });

        it('recognizes inversions by rotating potential roots', () => {
            // First inversion of C major: E, G, C -> pitch classes [4, 7, 0]
            expect(findChordInDictionary([4, 7, 0], { M: [0, 4, 7] }, true)).toBe('CM');
        });
    });

    describe('analyzeChordFallback', () => {
        it('returns null for fewer than 2 notes or octave duplicates only', () => {
            expect(analyzeChordFallback([], true)).toBeNull();
            expect(analyzeChordFallback([60], true)).toBeNull();
            expect(analyzeChordFallback([60, 72, 84], true)).toBeNull();
        });

        it('detects primary triads and inversions', () => {
            expect(analyzeChordFallback([60, 64, 67], true)).toBe('CM');       // C major
            expect(analyzeChordFallback([64, 67, 72], true)).toBe('CM');       // C major 1st inv
            expect(analyzeChordFallback([60, 63, 67], true)).toBe('Cm');       // C minor
            expect(analyzeChordFallback([60, 63, 66], true)).toBe('Cdim');     // C diminished
        });

        it('detects seventh chords', () => {
            expect(analyzeChordFallback([60, 64, 67, 70], true)).toBe('C7');
            expect(analyzeChordFallback([60, 64, 67, 71], true)).toBe('CM7');
            expect(analyzeChordFallback([60, 63, 67, 70], true)).toBe('Cm7');
            expect(analyzeChordFallback([60, 63, 66, 69], true)).toBe('Cdim7');
            expect(analyzeChordFallback([60, 63, 66, 70], true)).toBe('Cm7♭5');
        });

        it('detects omit-3rd/5th, suspended chords, and dyads', () => {
            expect(analyzeChordFallback([60, 67, 70], true)).toBe('C7(omit3rd)');
            expect(analyzeChordFallback([60, 64, 71], true)).toBe('CM7(omit5th)');
            expect(analyzeChordFallback([60, 65, 67], true)).toBe('Csus4');
            expect(analyzeChordFallback([60, 62, 67], true)).toBe('Csus2');
            expect(analyzeChordFallback([60, 67], true)).toBe('CP5');
            expect(analyzeChordFallback([60, 64], true)).toBe('CM3');
            expect(analyzeChordFallback([60, 63], true)).toBe('Cm3');
        });

        it('respects sharp vs flat preference', () => {
            expect(analyzeChordFallback([61, 65, 68], true)).toBe('C#M');
            expect(analyzeChordFallback([61, 65, 68], false)).toBe('DbM');
        });

        it('returns null when more than 7 distinct pitch classes are pressed', () => {
            expect(analyzeChordFallback([60, 61, 62, 63, 64, 65, 66, 67], true)).toBeNull();
        });
    });

    describe('analyzeChord with and without Tonal.js', () => {
        it('uses fallback dictionary when Tonal global is absent', () => {
            expect(analyzeChord([60, 64, 67], true)).toEqual(['CM']);
            expect(analyzeChord([60], true)).toEqual([]);
        });

        it('uses Tonal.js when available without mutating input array', () => {
            (globalThis as any).Tonal = TonalPkg;
            const input = [67, 60, 64]; // unsorted C major
            const chords = analyzeChord(input, true);
            expect(chords.length).toBeGreaterThan(0);
            expect(chords[0]).toMatch(/^C/);
            expect(input).toEqual([67, 60, 64]); // not mutated

            expect(analyzeChordTonal([60], true)).toEqual([]);
        });

        it('falls back to local dictionary when Tonal throws an error', () => {
            const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
            (globalThis as any).Tonal = {
                Midi: { midiToNoteName: () => { throw new Error('boom'); } },
                Chord: { detect: () => [] },
            };

            expect(analyzeChord([60, 64, 67], true)).toEqual(['CM']);
            expect(warnSpy).toHaveBeenCalled();
        });

        it('falls back to local dictionary when Tonal returns empty array', () => {
            (globalThis as any).Tonal = {
                Midi: TonalPkg.Midi,
                Chord: { detect: () => [] },
            };

            // Dyad P5 is recognized by fallback dictionary even when Tonal returns []
            expect(analyzeChord([60, 67], true)).toEqual(['CP5']);
        });
    });
});
