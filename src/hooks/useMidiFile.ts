import { useState, useCallback } from 'react';
import { Midi } from '@tonejs/midi';
import type { ParsedMidiFile, MidiTrack, MidiNote, MidiFileStats } from '../types/midi';

export interface UseMidiFileResult {
  /** The parsed MIDI file, or null if none loaded */
  midiFile: ParsedMidiFile | null;
  /** Loading state */
  isLoading: boolean;
  /** Error message if parsing failed */
  error: string | null;
  /** Load a MIDI file from a File object */
  loadFile: (file: File) => Promise<void>;
  /** Clear the current file */
  clear: () => void;
  /** Get statistics about the loaded file */
  stats: MidiFileStats | null;
}

/**
 * Hook for loading and parsing MIDI files using @tonejs/midi.
 */
export function useMidiFile(): UseMidiFileResult {
  const [midiFile, setMidiFile] = useState<ParsedMidiFile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadFile = useCallback(async (file: File) => {
    if (!file.name.toLowerCase().endsWith('.mid') && !file.name.toLowerCase().endsWith('.midi')) {
      setError('Please select a MIDI file (.mid or .midi)');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const midi = new Midi(arrayBuffer);

      const tracks: MidiTrack[] = midi.tracks
        .filter(track => track.notes.length > 0)
        .map(track => ({
          name: track.name || 'Unnamed Track',
          instrument: track.instrument?.name || 'Piano',
          channel: track.channel,
          notes: track.notes.map((note): MidiNote => ({
            midi: note.midi,
            name: note.name,
            time: note.time,
            duration: note.duration,
            velocity: note.velocity,
            ticks: note.ticks,
            durationTicks: note.durationTicks,
          })),
          duration: track.duration,
        }));

      const noteCount = tracks.reduce((sum, track) => sum + track.notes.length, 0);

      const parsed: ParsedMidiFile = {
        filename: file.name,
        header: {
          bpm: midi.header.tempos[0]?.bpm || 120,
          timeSignatureNumerator: midi.header.timeSignatures[0]?.timeSignature[0] || 4,
          timeSignatureDenominator: midi.header.timeSignatures[0]?.timeSignature[1] || 4,
          ppq: midi.header.ppq,
          name: midi.header.name || file.name.replace(/\.(mid|midi)$/i, ''),
        },
        tracks,
        duration: midi.duration,
        noteCount,
      };

      setMidiFile(parsed);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to parse MIDI file';
      setError(message);
      setMidiFile(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clear = useCallback(() => {
    setMidiFile(null);
    setError(null);
  }, []);

  const stats: MidiFileStats | null = midiFile ? calculateStats(midiFile) : null;

  return { midiFile, isLoading, error, loadFile, clear, stats };
}

function calculateStats(midi: ParsedMidiFile): MidiFileStats {
  const allNotes = midi.tracks.flatMap(t => t.notes);
  const midiNumbers = allNotes.map(n => n.midi);

  return {
    trackCount: midi.tracks.length,
    noteCount: midi.noteCount,
    duration: midi.duration,
    bpm: midi.header.bpm,
    lowestNote: Math.min(...midiNumbers),
    highestNote: Math.max(...midiNumbers),
  };
}

/**
 * Format duration in seconds to MM:SS format
 */
export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}
