import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Mic } from 'lucide-react';
import { usePitchDetection } from '../hooks/usePitchDetection';
import './FallingNotesVisualizer.css';

interface MidiNote {
  midi: number;
  time: number;      // Start time in seconds
  duration: number;  // Duration in seconds
  name: string;
}

interface FallingNotesVisualizerProps {
  notes: MidiNote[];
  tempo?: number;  // For future use (playback speed adjustment)
}

// Piano key colors
const isBlackKey = (midi: number): boolean => {
  const note = midi % 12;
  return [1, 3, 6, 8, 10].includes(note);
};

// Note colors by octave for variety
const getNoteColor = (midi: number, isPlaying: boolean, isCorrect: boolean | null): string => {
  if (isCorrect === true) return '#4ade80';  // Green - correct
  if (isCorrect === false) return '#f87171'; // Red - wrong
  if (isPlaying) return '#fbbf24';           // Yellow - waiting
  
  const octave = Math.floor(midi / 12);
  const colors = ['#60a5fa', '#a78bfa', '#f472b6', '#34d399', '#fbbf24', '#fb923c'];
  return colors[octave % colors.length];
};

export function FallingNotesVisualizer({ notes }: FallingNotesVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waitingForNote, setWaitingForNote] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [isLandscape, setIsLandscape] = useState(window.innerWidth > window.innerHeight);
  
  const { isListening, currentPitch, startListening, stopListening } = usePitchDetection();

  // Find note range for proper scaling
  const minNote = Math.min(...notes.map(n => n.midi), 60) - 2;
  const maxNote = Math.max(...notes.map(n => n.midi), 72) + 2;
  const noteRange = maxNote - minNote + 1;

  // Time window to show (seconds visible on screen)
  const visibleTime = 4;
  
  // Play line position (from bottom, as fraction)
  const playLinePosition = 0.15;

  // Check orientation
  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Handle detected pitch
  useEffect(() => {
    if (!isPlaying || waitingForNote === null || !currentPitch) return;
    
    // Check if detected note matches expected note (within 1 semitone tolerance)
    const detected = currentPitch.midi;
    const expected = waitingForNote;
    
    if (Math.abs(detected - expected) <= 1) {
      // Correct note!
      setLastCorrect(true);
      setWaitingForNote(null);
      setTimeout(() => setLastCorrect(null), 300);
    } else if (currentPitch.confidence > 0.85) {
      // Wrong note (only if confident)
      setLastCorrect(false);
      setTimeout(() => setLastCorrect(null), 200);
    }
  }, [currentPitch, waitingForNote, isPlaying]);

  // Main render loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const playLineY = height * (1 - playLinePosition);
    
    // Clear
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, width, height);

    // Draw piano key guides (subtle)
    const keyWidth = width / noteRange;
    for (let i = 0; i < noteRange; i++) {
      const midi = minNote + i;
      const x = i * keyWidth;
      
      if (isBlackKey(midi)) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, 0, keyWidth, height);
      }
      
      // Key separator lines
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw play line
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, playLineY);
    ctx.lineTo(width, playLineY);
    ctx.stroke();
    
    // "Play here" label
    ctx.fillStyle = '#888';
    ctx.font = '12px sans-serif';
    ctx.fillText('▶ PLAY', 10, playLineY - 5);

    // Draw falling notes
    const pixelsPerSecond = (height * (1 - playLinePosition)) / visibleTime;
    
    notes.forEach(note => {
      const noteX = (note.midi - minNote) * keyWidth;
      const noteWidth = keyWidth - 2;
      
      // Calculate Y position based on time
      // Note at currentTime should be at playLineY
      const relativeTime = note.time - currentTime;
      const noteTopY = playLineY - (relativeTime * pixelsPerSecond);
      const noteHeight = Math.max(note.duration * pixelsPerSecond, 20);
      const noteBottomY = noteTopY + noteHeight;
      
      // Only draw if visible
      if (noteBottomY < 0 || noteTopY > height) return;
      
      // Check if this note is at the play line (waiting)
      const isAtPlayLine = noteTopY <= playLineY && noteBottomY >= playLineY;
      const isWaiting = isAtPlayLine && waitingForNote === note.midi;
      
      // Draw note rectangle
      const color = getNoteColor(note.midi, isWaiting, isWaiting ? lastCorrect : null);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(noteX + 1, noteTopY, noteWidth, noteHeight, 4);
      ctx.fill();
      
      // Note label
      if (noteHeight > 25) {
        ctx.fillStyle = '#000';
        ctx.font = 'bold 11px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(note.name, noteX + noteWidth / 2 + 1, noteTopY + 15);
      }
    });

    // Draw detected pitch indicator
    if (currentPitch && isListening) {
      const detectedX = (currentPitch.midi - minNote) * keyWidth;
      ctx.strokeStyle = '#4ade80';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(detectedX, playLineY - 10);
      ctx.lineTo(detectedX + keyWidth, playLineY - 10);
      ctx.stroke();
    }

  }, [notes, minNote, noteRange, currentTime, waitingForNote, lastCorrect, currentPitch, isListening]);

  // Animation loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      render();
      return;
    }

    let lastTimestamp: number | null = null;
    
    const animate = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      
      // If waiting for a note, don't advance time
      if (waitingForNote === null) {
        const delta = (timestamp - lastTimestamp) / 1000;
        setCurrentTime(prev => {
          const newTime = prev + delta;
          
          // Check if any note just crossed the play line
          const noteAtLine = notes.find(n => 
            n.time <= newTime && 
            n.time + n.duration >= newTime &&
            n.time > prev
          );
          
          if (noteAtLine) {
            setWaitingForNote(noteAtLine.midi);
          }
          
          // Check if song is done
          const lastNoteEnd = Math.max(...notes.map(n => n.time + n.duration));
          if (newTime > lastNoteEnd + 1) {
            setIsPlaying(false);
            return 0;
          }
          
          return newTime;
        });
      }
      
      lastTimestamp = timestamp;
      render();
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isPlaying, waitingForNote, notes, render]);

  // Handle canvas resize
  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const resize = () => {
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      render();
    };

    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  const handlePlay = async () => {
    if (!isListening) {
      await startListening();
    }
    setIsPlaying(true);
  };

  const handlePause = () => {
    setIsPlaying(false);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setWaitingForNote(null);
    stopListening();
  };

  if (!isLandscape) {
    return (
      <div className="landscape-prompt">
        <div className="rotate-icon">📱↻</div>
        <p>Rotate your device to landscape mode</p>
        <p className="sub">The piano visualization works best horizontally</p>
      </div>
    );
  }

  return (
    <div className="falling-notes-container" ref={containerRef}>
      <canvas ref={canvasRef} className="falling-notes-canvas" />
      
      <div className="visualizer-controls">
        {!isPlaying ? (
          <button onClick={handlePlay} className="control-btn play">
            <Play size={20} /> {isListening ? 'Resume' : 'Start'}
          </button>
        ) : (
          <button onClick={handlePause} className="control-btn pause">
            <Pause size={20} /> Pause
          </button>
        )}
        <button onClick={handleReset} className="control-btn reset">
          <RotateCcw size={20} /> Reset
        </button>
        
        <div className="status">
          {isListening && <Mic size={16} className="mic-indicator" />}
          {waitingForNote && (
            <span className="waiting-text">
              Play: {notes.find(n => n.midi === waitingForNote)?.name || '?'}
            </span>
          )}
        </div>
      </div>

      {/* Detected note display */}
      {isListening && (
        <div className="detected-note-display">
          {currentPitch ? (
            <>
              <span className="detected-label">Heard:</span>
              <span className={`detected-note ${lastCorrect === true ? 'correct' : lastCorrect === false ? 'wrong' : ''}`}>
                {currentPitch.noteName}
              </span>
            </>
          ) : (
            <span className="detected-waiting">🎤 Listening...</span>
          )}
        </div>
      )}
    </div>
  );
}
