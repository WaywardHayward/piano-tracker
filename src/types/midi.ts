/**
 * TypeScript types for parsed MIDI data.
 * Based on @tonejs/midi structure but simplified for our use case.
 */

export interface MidiNote {
  /** MIDI note number (0-127) */
  midi: number;
  /** Note name with octave (e.g., "C4") */
  name: string;
  /** Start time in seconds */
  time: number;
  /** Duration in seconds */
  duration: number;
  /** Velocity (0-1) */
  velocity: number;
  /** Start time in ticks */
  ticks: number;
  /** Duration in ticks */
  durationTicks: number;
}

export interface MidiTrack {
  /** Track name from the MIDI file */
  name: string;
  /** Instrument name if available */
  instrument: string;
  /** MIDI channel (0-15) */
  channel: number;
  /** All notes in this track */
  notes: MidiNote[];
  /** Track duration in seconds */
  duration: number;
}

export interface MidiHeader {
  /** Tempo in BPM */
  bpm: number;
  /** Time signature numerator */
  timeSignatureNumerator: number;
  /** Time signature denominator */
  timeSignatureDenominator: number;
  /** Ticks per quarter note (PPQ) */
  ppq: number;
  /** Song name if available */
  name: string;
}

export interface ParsedMidiFile {
  /** Original filename */
  filename: string;
  /** MIDI header info */
  header: MidiHeader;
  /** All tracks with notes */
  tracks: MidiTrack[];
  /** Total duration in seconds */
  duration: number;
  /** Total note count across all tracks */
  noteCount: number;
}

export interface MidiFileStats {
  /** Number of tracks with notes */
  trackCount: number;
  /** Total notes */
  noteCount: number;
  /** Duration in seconds */
  duration: number;
  /** Tempo in BPM */
  bpm: number;
  /** Lowest note played */
  lowestNote: number;
  /** Highest note played */
  highestNote: number;
}
