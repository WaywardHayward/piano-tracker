const { Midi } = require('@tonejs/midi');
const fs = require('fs');

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

// PPQ is 480 by default, so eighth note = 240 ticks
const eighth = 240;

// Left hand arpeggio pattern (repeating E minor)
// The iconic Glass pattern: E-B-E-G-B-E in bass
const leftPattern = [E3, B3, E4, G3, B3, E4];

// Right hand melody (simplified opening)
const rightNotes = [
  { note: E5, measure: 4, beat: 0 },
  { note: G4, measure: 5, beat: 0 },
  { note: B4, measure: 6, beat: 0 },
  { note: E5, measure: 7, beat: 0 },
  { note: G4, measure: 8, beat: 0 },
  { note: B4, measure: 9, beat: 0 },
  { note: E5, measure: 10, beat: 0 },
  { note: G4, measure: 11, beat: 0 },
];

const measures = 24;
const ticksPerMeasure = 6 * eighth; // 6/8 time

// Generate left hand arpeggios for all measures
for (let m = 0; m < measures; m++) {
  const measureStart = m * ticksPerMeasure;
  for (let i = 0; i < 6; i++) {
    track.addNote({
      midi: leftPattern[i],
      ticks: measureStart + i * eighth,
      durationTicks: eighth - 20,
      velocity: 0.55
    });
  }
}

// Add right hand melody (held notes)
for (const { note, measure } of rightNotes) {
  track.addNote({
    midi: note,
    ticks: measure * ticksPerMeasure,
    durationTicks: ticksPerMeasure * 2, // Hold for 2 measures
    velocity: 0.7
  });
}

// Write the file
const outputPath = 'public/midi/metamorphosis-1-opening.mid';
fs.writeFileSync(outputPath, Buffer.from(midi.toArray()));
console.log(`Created ${outputPath}`);

const durationSec = (measures * ticksPerMeasure) / 480 * (60/110);
console.log(`Duration: ~${durationSec.toFixed(1)}s`);
console.log(`Notes: ${track.notes.length}`);
