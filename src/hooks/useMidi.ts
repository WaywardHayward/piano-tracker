import { useState, useEffect, useCallback } from 'react';

export interface MidiDevice {
  id: string;
  name: string;
  manufacturer: string;
  state: 'connected' | 'disconnected';
}

export interface MidiNote {
  note: number;
  velocity: number;
  timestamp: number;
  channel: number;
}

export interface UseMidiResult {
  supported: boolean;
  devices: MidiDevice[];
  activeDevice: MidiDevice | null;
  lastNote: MidiNote | null;
  connect: (deviceId: string) => void;
  disconnect: () => void;
  error: string | null;
}

/**
 * Hook for connecting to MIDI devices via Web MIDI API.
 * Works with Bluetooth MIDI keyboards in Chrome/Edge.
 */
export function useMidi(): UseMidiResult {
  const [supported] = useState(() => 'requestMIDIAccess' in navigator);
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<MidiDevice | null>(null);
  const [lastNote, setLastNote] = useState<MidiNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [midiAccess, setMidiAccess] = useState<MIDIAccess | null>(null);

  // Request MIDI access on mount
  useEffect(() => {
    if (!supported) return;

    navigator.requestMIDIAccess({ sysex: false })
      .then((access) => {
        setMidiAccess(access);
        updateDevices(access);

        // Listen for device changes
        access.onstatechange = () => updateDevices(access);
      })
      .catch((err) => {
        setError(`MIDI access denied: ${err.message}`);
      });
  }, [supported]);

  const updateDevices = (access: MIDIAccess) => {
    const inputs: MidiDevice[] = [];
    access.inputs.forEach((input) => {
      inputs.push({
        id: input.id,
        name: input.name || 'Unknown Device',
        manufacturer: input.manufacturer || 'Unknown',
        state: input.state as 'connected' | 'disconnected',
      });
    });
    setDevices(inputs);
  };

  const handleMidiMessage = useCallback((event: MIDIMessageEvent) => {
    const [status, note, velocity] = event.data || [];
    const channel = status & 0x0f;
    const messageType = status & 0xf0;

    // Note On (144-159) with velocity > 0
    if (messageType === 0x90 && velocity > 0) {
      setLastNote({
        note,
        velocity,
        timestamp: event.timeStamp,
        channel,
      });
    }
    // Note Off (128-143) or Note On with velocity 0
    else if (messageType === 0x80 || (messageType === 0x90 && velocity === 0)) {
      // Could track note releases here if needed
    }
  }, []);

  const connect = useCallback((deviceId: string) => {
    if (!midiAccess) return;

    const input = midiAccess.inputs.get(deviceId);
    if (!input) {
      setError(`Device ${deviceId} not found`);
      return;
    }

    input.onmidimessage = handleMidiMessage;
    setActiveDevice({
      id: input.id,
      name: input.name || 'Unknown',
      manufacturer: input.manufacturer || 'Unknown',
      state: 'connected',
    });
    setError(null);
  }, [midiAccess, handleMidiMessage]);

  const disconnect = useCallback(() => {
    if (!midiAccess || !activeDevice) return;

    const input = midiAccess.inputs.get(activeDevice.id);
    if (input) {
      input.onmidimessage = null;
    }
    setActiveDevice(null);
  }, [midiAccess, activeDevice]);

  return {
    supported,
    devices,
    activeDevice,
    lastNote,
    connect,
    disconnect,
    error,
  };
}

/**
 * Convert MIDI note number to note name (e.g., 60 -> "C4")
 */
export function midiToNoteName(midi: number): string {
  const notes = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
  const octave = Math.floor(midi / 12) - 1;
  const note = notes[midi % 12];
  return `${note}${octave}`;
}
