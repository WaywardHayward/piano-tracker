import { Midi } from '@tonejs/midi';
import * as fs from 'fs';

// Metamorphosis 1 - Philip Glass
// Opening pattern in E minor, 6/8 time, q = 108-112

const midi = new Midi();
midi.header.setTempo(110);
midi.header.timeSignatures.push({ ticks: 0, timeSignature: [6, 8] });

const track = midi.addTrack();
track.name = 'Piano';
track.channel = 0;

// Note mappings (MIDI note numbers)
const E3 = 52, G3 = 55, B3 = 59;
const E4 = 64, G4 = 67, B4 = 71;
const E5 = 76;

// Basic duration (eighth note at 110 BPM)
const eighth = 60 / 110 / 2; // half a beat

// Left hand arpeggio pattern (repeating E minor)
// The iconic Glass pattern: E-B-E-G-B-E in bass
const leftPattern = [E3, B3, E4, G3, B3, E4];

// Right hand melody (simplified opening)
// Enters with sustained notes over the arpeggios
const rightNotes = [
  { note: E5, start: 4, duration: 2 },
  { note: G4, start: 6, duration: 2 },
  { note: B4, start: 8, duration: 2 },
  { note: E5, start: 10, duration: 2 },
  { note: G4, start: 12, duration: 2 },
  { note: B4, start: 14, duration: 2 },
];

const measures = 24;

// Generate left hand arpeggios for all measures
for (let m = 0; m < measures; m++) {
  const measureStart = m * 6 * eighth;
  for (let i = 0; i < 6; i++) {
    track.addNote({
      midi: leftPattern[i],
      time: measureStart + i * eighth,
      duration: eighth * 0.9,
      velocity: 0.55
    });
  }
}

// Add right hand melody (repeating pattern)
for (let rep = 0; rep < 4; rep++) {
  const offset = rep * 6 * 6 * eighth; // Every 6 measures
  for (const { note, start, duration } of rightNotes) {
    track.addNote({
      midi: note,
      time: offset + start * eighth,
      duration: duration * eighth,
      velocity: 0.7
    });
  }
}

// Write the file
const outputPath = 'public/midi/metamorphosis-1-opening.mid';
fs.writeFileSync(outputPath, Buffer.from(midi.toArray()));
console.log(`Created ${outputPath}`);
console.log(`Duration: ~${(measures * 6 * eighth).toFixed(1)}s`);
