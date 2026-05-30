/**
 * @file chords.ts
 * @description Provides chord detection and note name formatting utilities using both
 * a lightweight fallback dictionary and the Tonal.js library for advanced analysis.
 */
'use strict';
const NOTE_NAMES_SHARPS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const NOTE_NAMES_FLATS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];
/**
 * Converts a MIDI note number (0-11) to its pitch class name.
 */
function getNoteName(note, sharp) {
    const normalized = ((note % 12) + 12) % 12;
    return (sharp ? NOTE_NAMES_SHARPS : NOTE_NAMES_FLATS)[normalized];
}
/**
 * Converts a MIDI note number to its common English name with its octave.
 * @param note The MIDI note number (0-127).
 * @param sharp Whether to use sharp notation.
 * @returns The note name string (e.g., "C4") or empty string if invalid.
 */
function getNoteFullName(note, sharp) {
    if (note < 0 || note >= 128) {
        return "";
    }
    const octave = Math.floor(note / 12) - 1;
    return getNoteName(note, sharp) + octave;
}
// Chord definitions split into groups for prioritized fallback detection
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
const CHORD_DEFINITIONS_SECONDARY = {
    '7(omit3rd)': [0, 7, 10], // Dominant 7th (no 3rd)
    'M7(omit3rd)': [0, 7, 11], // Major 7th (no 3rd)
    'dim7(omit3rd)': [0, 6, 9], // Diminished 7th (no 3rd)
    '7(omit5th)': [0, 4, 10], // Dominant 7th (no 5th)
    'M7(omit5th)': [0, 4, 11], // Major 7th (no 5th)
    'dim7(omit5th)': [0, 3, 9], // Diminished 7th (no 5th)
};
const CHORD_DEFINITIONS_SUS = {
    'sus4': [0, 5, 7], // Sustained 4th
    'sus2': [0, 2, 7], // Sustained 2nd
};
const CHORD_DEFINITIONS_DYADS = {
    'm3': [0, 3], // Minor 3rd interval
    'M3': [0, 4], // Major 3rd interval
    'P5': [0, 7], // Perfect 5th (Power chord)
};
const ALL_CHORDS = [
    CHORD_DEFINITIONS_PRIMARY,
    CHORD_DEFINITIONS_SECONDARY,
    CHORD_DEFINITIONS_SUS,
    CHORD_DEFINITIONS_DYADS
];
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
 * Checks a combination of notes against a dictionary of chord definitions.
 * Handles inversions by rotating the root note of the pitch classes.
 */
function findChordInDictionary(pitchClasses, definitions, sharp) {
    if (pitchClasses.length < 2) {
        return null;
    }
    // Try each note as a potential root to handle inversions
    for (let i = 0; i < pitchClasses.length; i++) {
        const root = pitchClasses[i];
        const intervals = pitchClasses
            .map(pc => (pc - root + 12) % 12)
            .sort((a, b) => a - b);
        for (const chordType in definitions) {
            const definedIntervals = definitions[chordType];
            if (definedIntervals.length === intervals.length &&
                definedIntervals.every((val, index) => val === intervals[index])) {
                return getNoteName(root, sharp) + chordType;
            }
        }
    }
    return null;
}
/**
 * Analyzes an array of MIDI notes using the lightweight fallback dictionaries.
 */
function analyzeChordFallback(notes, sharp) {
    if (notes.length < 2) {
        return null;
    }
    const pitchClasses = [...new Set(notes.map(note => note % 12))].sort((a, b) => a - b);
    if (pitchClasses.length < 2) {
        return null;
    }
    // Performance guardrail: avoid combinatorial explosion with overly complex clusters
    if (pitchClasses.length > 7) {
        return null;
    }
    for (const chords of ALL_CHORDS) {
        for (let size = pitchClasses.length; size >= 2; size--) {
            const combinations = getCombinations(pitchClasses, size);
            for (const combo of combinations) {
                const chord = findChordInDictionary(combo, chords, sharp);
                if (chord) {
                    return chord;
                }
            }
        }
    }
    return null;
}
/**
 * Analyzes an array of MIDI notes to identify possible chords using the Tonal.js library.
 */
function analyzeChordTonalInner(notes, sharp, assumePerfectFifth) {
    if (notes.length < 2) {
        return [];
    }
    // Create a sorted copy of the notes to avoid mutating the original array
    const sortedNotes = [...notes].sort((a, b) => a - b);
    const noteNames = sortedNotes.map(pc => Tonal.Midi.midiToNoteName(pc, { sharps: sharp }));
    const chords = Tonal.Chord.detect(noteNames, { assumePerfectFifth });
    return chords || [];
}
function analyzeChordTonal(notes, sharp) {
    return analyzeChordTonalInner(notes, sharp, true);
}
/**
 * Analyzes an array of MIDI notes and returns identified chord names.
 * Uses Tonal.js if available, falling back to the local dictionaries if Tonal.js fails or is not loaded.
 * @param notes An array of MIDI note numbers.
 * @param sharp Whether to use sharp notation.
 * @returns An array of recognized chord strings.
 */
function analyzeChord(notes, sharp) {
    // Attempt Tonal.js analysis if loaded
    if (typeof Tonal !== "undefined" && Tonal.Chord && Tonal.Chord.detect) {
        try {
            const tonalChords = analyzeChordTonal(notes, sharp);
            if (tonalChords.length > 0) {
                return tonalChords;
            }
        }
        catch (e) {
            console.warn("Tonal.js analysis failed, falling back to local dictionary:", e);
        }
    }
    // Fall back to local dictionary analysis
    const fallbackChord = analyzeChordFallback(notes, sharp);
    return fallbackChord ? [fallbackChord] : [];
}
export { getNoteFullName, analyzeChord };
//# sourceMappingURL=chords.js.map