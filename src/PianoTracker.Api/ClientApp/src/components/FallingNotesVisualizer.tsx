import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Mic } from 'lucide-react';
import { usePitchDetection } from '../hooks/usePitchDetection';
import './FallingNotesVisualizer.css';

interface MidiNote {
  midi: number;
  time: number;
  duration: number;
  name: string;
}

interface Props {
  notes: MidiNote[];
  tempo?: number;
}

const isBlackKey = (midi: number): boolean => {
  const note = midi % 12;
  return [1, 3, 6, 8, 10].includes(note);
};

// Neon color palette
const NOTE_COLORS = {
  default: '#00d4ff',      // Cyan
  waiting: '#ffaa00',      // Amber
  correct: '#00ff88',      // Green
  wrong: '#ff4466',        // Red
  played: '#8855ff',       // Purple (already played)
};

export function FallingNotesVisualizer({ notes }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [waitingForNote, setWaitingForNote] = useState<number | null>(null);
  const [lastCorrect, setLastCorrect] = useState<boolean | null>(null);
  const [playedNotes, setPlayedNotes] = useState<Set<number>>(new Set());
  const [isLandscape, setIsLandscape] = useState(
    window.innerWidth > window.innerHeight
  );
  
  const { isListening, currentPitch, startListening, stopListening } = usePitchDetection();

  const minNote = Math.min(...notes.map(n => n.midi), 60) - 2;
  const maxNote = Math.max(...notes.map(n => n.midi), 72) + 2;
  const noteRange = maxNote - minNote + 1;
  const visibleTime = 4;
  const playLinePosition = 0.12;
  const pianoHeight = 50;

  useEffect(() => {
    const handleResize = () => {
      setIsLandscape(window.innerWidth > window.innerHeight);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Octave-tolerant note matching
  const notesMatch = (detected: number, expected: number): boolean => {
    // Same note = match
    if (Math.abs(detected - expected) <= 1) return true;
    // Octave equivalence (same note class)
    if (detected % 12 === expected % 12) return true;
    return false;
  };

  useEffect(() => {
    if (!isPlaying || waitingForNote === null || !currentPitch) return;
    
    if (notesMatch(currentPitch.midi, waitingForNote)) {
      setLastCorrect(true);
      setPlayedNotes(prev => new Set([...prev, waitingForNote]));
      setWaitingForNote(null);
      setTimeout(() => setLastCorrect(null), 300);
    } else if (currentPitch.confidence > 0.6) {
      setLastCorrect(false);
      setTimeout(() => setLastCorrect(null), 150);
    }
  }, [currentPitch, waitingForNote, isPlaying]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const playableHeight = height - pianoHeight;
    const playLineY = playableHeight * (1 - playLinePosition);
    const keyWidth = width / noteRange;

    // Dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Subtle vertical lines (piano lane guides)
    for (let i = 0; i < noteRange; i++) {
      const midi = minNote + i;
      const x = i * keyWidth;
      
      if (isBlackKey(midi)) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x, 0, keyWidth, playableHeight);
      }
      
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, playableHeight);
      ctx.stroke();
    }

    // Glowing play line
    ctx.shadowBlur = 20;
    ctx.shadowColor = '#00d4ff';
    ctx.strokeStyle = '#00d4ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, playLineY);
    ctx.lineTo(width, playLineY);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // Draw falling notes with glow
    const pixelsPerSecond = (playableHeight * (1 - playLinePosition)) / visibleTime;
    
    notes.forEach((note) => {
      const noteX = (note.midi - minNote) * keyWidth + 2;
      const noteWidth = keyWidth - 4;
      
      const relativeTime = note.time - currentTime;
      const noteTopY = playLineY - (relativeTime * pixelsPerSecond);
      const noteHeight = Math.max(note.duration * pixelsPerSecond, 15);
      const noteBottomY = noteTopY + noteHeight;
      
      if (noteBottomY < 0 || noteTopY > playableHeight) return;
      
      const isAtPlayLine = noteTopY <= playLineY && noteBottomY >= playLineY;
      const isWaiting = isAtPlayLine && waitingForNote === note.midi;
      const wasPlayed = playedNotes.has(note.midi) && note.time < currentTime;
      
      // Determine color
      let color = NOTE_COLORS.default;
      if (wasPlayed) {
        color = NOTE_COLORS.played;
      } else if (isWaiting) {
        color = lastCorrect === true ? NOTE_COLORS.correct 
              : lastCorrect === false ? NOTE_COLORS.wrong 
              : NOTE_COLORS.waiting;
      }
      
      // Glow effect
      ctx.shadowBlur = isWaiting ? 25 : 10;
      ctx.shadowColor = color;
      
      // Note rectangle with rounded corners
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.roundRect(noteX, noteTopY, noteWidth, noteHeight, 6);
      ctx.fill();
      
      // Inner highlight
      const grad = ctx.createLinearGradient(noteX, noteTopY, noteX + noteWidth, noteTopY);
      grad.addColorStop(0, 'rgba(255,255,255,0.3)');
      grad.addColorStop(0.5, 'rgba(255,255,255,0.1)');
      grad.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.roundRect(noteX, noteTopY, noteWidth, noteHeight * 0.4, [6, 6, 0, 0]);
      ctx.fill();
      
      ctx.shadowBlur = 0;
    });

    // Draw piano keyboard at bottom
    drawPianoKeyboard(ctx, width, height, playableHeight, keyWidth, currentPitch?.midi);

  }, [notes, minNote, noteRange, currentTime, waitingForNote, lastCorrect, currentPitch, playedNotes]);

  const drawPianoKeyboard = (
    ctx: CanvasRenderingContext2D, 
    _width: number, 
    _height: number, 
    playableHeight: number,
    keyWidth: number,
    detectedNote: number | undefined
  ) => {
    const keyboardY = playableHeight;
    
    // White keys first
    for (let i = 0; i < noteRange; i++) {
      const midi = minNote + i;
      if (isBlackKey(midi)) continue;
      
      const x = i * keyWidth;
      const isActive = detectedNote !== undefined && (detectedNote % 12 === midi % 12);
      
      ctx.fillStyle = isActive ? '#00ff88' : '#f0f0f0';
      ctx.fillRect(x, keyboardY, keyWidth - 1, pianoHeight);
      
      ctx.strokeStyle = '#333';
      ctx.strokeRect(x, keyboardY, keyWidth - 1, pianoHeight);
    }
    
    // Black keys on top
    for (let i = 0; i < noteRange; i++) {
      const midi = minNote + i;
      if (!isBlackKey(midi)) continue;
      
      const x = i * keyWidth;
      const isActive = detectedNote !== undefined && (detectedNote % 12 === midi % 12);
      
      ctx.fillStyle = isActive ? '#00ff88' : '#222';
      ctx.fillRect(x + 2, keyboardY, keyWidth - 4, pianoHeight * 0.65);
    }
  };

  useEffect(() => {
    if (!isPlaying) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      render();
      return;
    }

    let lastTimestamp: number | null = null;
    
    const animate = (timestamp: number) => {
      if (lastTimestamp === null) lastTimestamp = timestamp;
      
      if (waitingForNote === null) {
        const delta = (timestamp - lastTimestamp) / 1000;
        setCurrentTime(prev => {
          const newTime = prev + delta;
          
          const noteAtLine = notes.find(n => 
            n.time <= newTime && 
            n.time + n.duration >= newTime &&
            n.time > prev &&
            !playedNotes.has(n.midi)
          );
          
          if (noteAtLine) {
            setWaitingForNote(noteAtLine.midi);
          }
          
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
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isPlaying, waitingForNote, notes, render, playedNotes]);

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
    if (!isListening) await startListening();
    setIsPlaying(true);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentTime(0);
    setWaitingForNote(null);
    setPlayedNotes(new Set());
    stopListening();
  };

  if (!isLandscape) {
    return (
      <div className="landscape-prompt">
        <div className="rotate-icon">📱↻</div>
        <p>Rotate to landscape</p>
        <p className="sub">Piano works best horizontally</p>
      </div>
    );
  }

  return (
    <div className="falling-notes-container" ref={containerRef}>
      <canvas ref={canvasRef} className="falling-notes-canvas" />
      
      <div className="visualizer-controls">
        {!isPlaying ? (
          <button onClick={handlePlay} className="control-btn play">
            <Play size={18} /> Start
          </button>
        ) : (
          <button onClick={() => setIsPlaying(false)} className="control-btn pause">
            <Pause size={18} /> Pause
          </button>
        )}
        <button onClick={handleReset} className="control-btn reset">
          <RotateCcw size={18} />
        </button>
        
        <div className="status">
          {isListening && <Mic size={16} className="mic-indicator" />}
          {isListening && (
            <span className="detected-note">
              {currentPitch ? currentPitch.noteName : '—'}
            </span>
          )}
          {waitingForNote && (
            <span className="waiting-text">
              → {notes.find(n => n.midi === waitingForNote)?.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
