import { Mic, MicOff } from 'lucide-react';
import { usePitchDetection } from '../hooks/usePitchDetection';
import './PitchDetector.css';

interface PitchDetectorProps {
  onNoteDetected?: (midi: number, noteName: string) => void;
}

export function PitchDetector({ onNoteDetected }: PitchDetectorProps) {
  const { 
    isListening, currentPitch, error, 
    startListening, stopListening, supported 
  } = usePitchDetection();

  // Notify parent when note changes
  if (currentPitch && onNoteDetected) {
    onNoteDetected(currentPitch.midi, currentPitch.noteName);
  }

  if (!supported) {
    return (
      <div className="pitch-detector unsupported">
        <p>Microphone not available</p>
      </div>
    );
  }

  return (
    <div className="pitch-detector">
      <div className="pitch-controls">
        {!isListening ? (
          <button className="mic-btn" onClick={startListening}>
            <Mic size={18} />
            Enable Microphone
          </button>
        ) : (
          <button className="mic-btn active" onClick={stopListening}>
            <MicOff size={18} />
            Stop Listening
          </button>
        )}
      </div>

      {error && <p className="error">{error}</p>}

      {isListening && (
        <div className="pitch-display">
          {currentPitch ? (
            <>
              <span className="note-name">{currentPitch.noteName}</span>
              <span className="frequency">{currentPitch.frequency.toFixed(1)} Hz</span>
              <span className="confidence">
                {Math.round(currentPitch.confidence * 100)}% confidence
              </span>
            </>
          ) : (
            <span className="waiting">Play a note...</span>
          )}
        </div>
      )}
    </div>
  );
}
