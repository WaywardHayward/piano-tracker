# Piano Tracker 🎹

**Strava for piano practice** - Track your progress, visualize music, and connect your MIDI keyboard.

## Vision

Learn any song, not just what's in someone else's catalog. Load MIDI files, connect your Bluetooth keyboard, and track your journey from first attempt to performance-ready.

## Core Features

### 🎵 Music Visualization
- Load MIDI files (standard format, widely available)
- Falling-note display (Synthesia-style)
- Sheet music view (stretch goal)
- Piano keyboard visualization showing what to play

### 🎹 MIDI Input
- Connect Bluetooth MIDI keyboards via Web MIDI API
- Real-time note detection
- Visual feedback: right note (green), wrong note (red), missed (grey)

### 📊 Practice Tracking (Strava-style)
- Log practice sessions automatically
- Track time spent per song
- Accuracy percentage per session
- Progress over time graphs
- Streaks and achievements
- "Performance ready" milestones (e.g., 95% accuracy at full speed)

### 🎯 Practice Modes
- Full playthrough
- Section loop (practice tricky parts)
- Slow down (50%, 75%, 100% speed)
- Hands separate (left/right only)
- Wait mode (waits for correct note)

## Tech Stack

- **Frontend:** React + TypeScript + Vite
- **MIDI:** Web MIDI API (native browser support)
- **Visualization:** Canvas or WebGL
- **Audio:** Tone.js for playback
- **Storage:** IndexedDB for local practice data
- **Future:** Cloud sync, social features

## Web MIDI API

Good news: Bluetooth MIDI works in browsers!

```typescript
// Request MIDI access
const midiAccess = await navigator.requestMIDIAccess();

// Listen to all inputs
midiAccess.inputs.forEach(input => {
  input.onmidimessage = (event) => {
    const [status, note, velocity] = event.data;
    // Note on: status 144-159, Note off: status 128-143
    if (status >= 144 && status <= 159 && velocity > 0) {
      console.log(`Note ${note} pressed`);
    }
  };
});
```

**Browser support:** Chrome, Edge, Opera (not Firefox/Safari yet)

## Getting Started

```bash
npm install
npm run dev
```

## Roadmap

### Phase 1: Core MVP
- [ ] MIDI file loader
- [ ] Basic falling-note visualization
- [ ] Web MIDI keyboard connection
- [ ] Note hit detection
- [ ] Simple accuracy tracking

### Phase 2: Practice Features
- [ ] Speed control
- [ ] Section looping
- [ ] Hands separate mode
- [ ] Session history

### Phase 3: Strava Features
- [ ] Practice calendar/heatmap
- [ ] Progress graphs per song
- [ ] Streaks
- [ ] Achievements/badges

### Phase 4: Social (Future)
- [ ] Cloud sync
- [ ] Share progress
- [ ] Compare with friends

## Why This Exists

Flowkey and similar apps lock you into their catalog. But MIDI files exist for virtually every song. This app lets you learn whatever you want, with modern practice tools and progress tracking.

---

*Built with 🎹 by Alex*
