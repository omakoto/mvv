"use strict";
// Note names
// const NOTE_NAMES = ["C", "C♯/D♭", "D", "D♯/E♭", "E", "F", "F♯/G♭", "G", "G♯/A♭", "A", "A♯/B♭", "B"];
const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"];
/**
 * Converts a MIDI note number to its common English name.
 * @param note The MIDI note number (0-127).
 * @returns The note name string (e.g., "C4").
 */
function midiNoteToName(note) {
    if (note < 0 || note >= 128) {
        return "";
    }
    const octave = Math.floor(note / 12) - 1;
    const name = NOTE_NAMES[note % 12];
    return name + octave;
}
/**
 * Chord definitions are split into three groups for prioritization.
 * Primary chords.
 */
const CHORD_DEFINITIONS_PRIMARY = {
    'M': [0, 4, 7], // Major
    'm': [0, 3, 7], // Minor
    'dim': [0, 3, 6], // Diminished
    '7': [0, 4, 7, 10], // Dominant 7th
    'M7': [0, 4, 7, 11], // Major 7th
    'm7': [0, 3, 7, 10], // Minor 7th
    'dim7': [0, 3, 6, 9], // Diminished 7th
    'm7♭5': [0, 3, 6, 10], // Half-diminished 7th (Minor 7th flat 5)
};
/**
 * Secondary.
 */
const CHORD_DEFINITIONS_SECONDARY = {
    '7(omit3rd)': [0, 7, 10], // Dominant 7th
    'M7(omit3rd)': [0, 7, 11], // Major 7th
    'dim7(omit3rd)': [0, 6, 9], // Diminished 7th
    '7(omit5th)': [0, 4, 10], // Dominant 7th
    'M7(omit5th)': [0, 4, 11], // Major 7th
    'dim7(omit5th)': [0, 3, 9], // Diminished 7th
};
/**
 * Sus chords are checked only if no other chords matches.
 */
const CHORD_DEFINITIONS_SUS = {
    'sus4': [0, 5, 7], // Sustained 4th
    'sus2': [0, 2, 7], // Sustained 2nd
};
const ALL_CHORDS = [CHORD_DEFINITIONS_PRIMARY, CHORD_DEFINITIONS_SECONDARY, CHORD_DEFINITIONS_SUS];
/**
 * Generates all combinations of a given size from an array.
 * @param array The source array.
 * @param size The size of each combination.
 * @returns An array of arrays, where each inner array is a combination.
 */
function getCombinations(array, size) {
    if (size > array.length || size <= 0) {
        return [];
    }
    if (size === array.length) {
        return [array];
    }
    if (size === 1) {
        return array.map(item => [item]);
    }
    const combinations = [];
    for (let i = 0; i < array.length - size + 1; i++) {
        const head = array.slice(i, i + 1);
        const tailCombinations = getCombinations(array.slice(i + 1), size - 1);
        for (const tail of tailCombinations) {
            combinations.push(head.concat(tail));
        }
    }
    return combinations;
}
/**
 * A helper that checks a given combination of notes against a dictionary of chord definitions.
 * @param pitchClasses A single combination of notes.
 * @param definitions The chord dictionary to use for matching.
 * @returns The name of the chord if a match is found, otherwise null.
 */
function findChordInDictionary(pitchClasses, definitions) {
    if (pitchClasses.length < 3) {
        return null;
    }
    // Try each note as a potential root to handle inversions.
    for (let i = 0; i < pitchClasses.length; i++) {
        const root = pitchClasses[i];
        const intervals = pitchClasses.map(pc => (pc - root + 12) % 12).sort((a, b) => a - b);
        for (const chordType in definitions) {
            const definedIntervals = definitions[chordType];
            if (definedIntervals.length === intervals.length &&
                definedIntervals.every((val, index) => val === intervals[index])) {
                return NOTE_NAMES[root] + chordType;
            }
        }
    }
    return null;
}
/**
 * Analyzes an array of MIDI notes to identify the best-fit chord.
 * It prioritizes primary chords over suspended chords, and larger chords over smaller ones.
 * @param notes An array of MIDI note numbers.
 * @returns The name of the chord (e.g., "CM", "Dm7") or null if no chord is recognized.
 */
function analyzeChord(notes) {
    if (notes.length < 3) {
        return null;
    }
    const pitchClasses = [...new Set(notes.map(note => note % 12))].sort((a, b) => a - b);
    // Performance guardrail: Don't analyze overly complex note clusters.
    if (pitchClasses.length > 7) {
        return null;
    }
    for (const chords of ALL_CHORDS) {
        for (let size = pitchClasses.length; size >= 3; size--) {
            const combinations = getCombinations(pitchClasses, size);
            for (const combo of combinations) {
                const chord = findChordInDictionary(combo, chords);
                if (chord) {
                    return chord;
                }
            }
        }
    }
    return null; // No matching chord found.
}
