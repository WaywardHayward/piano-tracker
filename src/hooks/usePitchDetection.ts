import { useState, useCallback, useRef, useEffect } from 'react';

// Frequency to MIDI note number
function frequencyToMidi(freq: number): number {
  return Math.round(12 * Math.log2(freq / 440) + 69);
}

// Note names for display
const NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

export function midiToNoteName(midi: number): string {
  const octave = Math.floor(midi / 12) - 1;
  const note = NOTE_NAMES[midi % 12];
  return `${note}${octave}`;
}

export interface PitchResult {
  frequency: number;
  midi: number;
  noteName: string;
  confidence: number;
}

export interface UsePitchDetectionResult {
  isListening: boolean;
  currentPitch: PitchResult | null;
  error: string | null;
  startListening: () => Promise<void>;
  stopListening: () => void;
  supported: boolean;
}

/**
 * YIN pitch detection algorithm (simplified)
 * Good for monophonic audio like single piano notes
 */
function detectPitch(buffer: Float32Array, sampleRate: number): { frequency: number; confidence: number } | null {
  const bufferSize = buffer.length;
  const minFreq = 80;  // ~E2
  const maxFreq = 1100; // ~C6
  
  const minPeriod = Math.floor(sampleRate / maxFreq);
  const maxPeriod = Math.floor(sampleRate / minFreq);
  
  // Autocorrelation
  let bestPeriod = 0;
  let bestCorrelation = 0;
  
  for (let period = minPeriod; period < maxPeriod; period++) {
    let correlation = 0;
    let norm1 = 0;
    let norm2 = 0;
    
    for (let i = 0; i < bufferSize - period; i++) {
      correlation += buffer[i] * buffer[i + period];
      norm1 += buffer[i] * buffer[i];
      norm2 += buffer[i + period] * buffer[i + period];
    }
    
    const normalizedCorrelation = correlation / Math.sqrt(norm1 * norm2 + 1e-10);
    
    if (normalizedCorrelation > bestCorrelation) {
      bestCorrelation = normalizedCorrelation;
      bestPeriod = period;
    }
  }
  
  // Confidence threshold
  if (bestCorrelation < 0.5 || bestPeriod === 0) {
    return null;
  }
  
  const frequency = sampleRate / bestPeriod;
  return { frequency, confidence: bestCorrelation };
}

export function usePitchDetection(): UsePitchDetectionResult {
  const [isListening, setIsListening] = useState(false);
  const [currentPitch, setCurrentPitch] = useState<PitchResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  
  const supported = typeof navigator !== 'undefined' && 
    'mediaDevices' in navigator && 
    'getUserMedia' in navigator.mediaDevices;

  const analyze = useCallback(() => {
    if (!analyserRef.current || !audioContextRef.current) return;
    
    const analyser = analyserRef.current;
    const bufferSize = analyser.fftSize;
    const buffer = new Float32Array(bufferSize);
    
    analyser.getFloatTimeDomainData(buffer);
    
    // Check if there's enough signal
    const rms = Math.sqrt(buffer.reduce((sum, x) => sum + x * x, 0) / bufferSize);
    
    if (rms > 0.002) { // Lower threshold for quiet playing
      const result = detectPitch(buffer, audioContextRef.current.sampleRate);
      
      if (result) {
        const midi = frequencyToMidi(result.frequency);
        if (midi >= 21 && midi <= 108) { // Piano range A0-C8
          setCurrentPitch({
            frequency: result.frequency,
            midi,
            noteName: midiToNoteName(midi),
            confidence: result.confidence
          });
        }
      }
    } else {
      setCurrentPitch(null);
    }
    
    rafRef.current = requestAnimationFrame(analyze);
  }, []);

  const startListening = useCallback(async () => {
    if (!supported) {
      setError('Microphone not supported in this browser');
      return;
    }
    
    try {
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false
        } 
      });
      
      streamRef.current = stream;
      
      const audioContext = new AudioContext();
      audioContextRef.current = audioContext;
      
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 4096; // Good balance of frequency resolution and latency
      
      source.connect(analyser);
      analyserRef.current = analyser;
      
      setIsListening(true);
      rafRef.current = requestAnimationFrame(analyze);
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to access microphone');
    }
  }, [supported, analyze]);

  const stopListening = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (audioContextRef.current) {
      audioContextRef.current.close();
      audioContextRef.current = null;
    }
    
    analyserRef.current = null;
    setIsListening(false);
    setCurrentPitch(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopListening();
    };
  }, [stopListening]);

  return {
    isListening,
    currentPitch,
    error,
    startListening,
    stopListening,
    supported
  };
}
