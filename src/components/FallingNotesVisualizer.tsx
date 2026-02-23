import { useRef, useEffect, useState, useCallback } from 'react';
import { Play, Pause, RotateCcw, Mic, Minimize2 } from 'lucide-react';
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

const PIANO_HEIGHT = 50;
const VISIBLE_TIME = 4;
const PLAY_LINE_POSITION = 0.12;

const NOTE_COLORS = {
  default: '#00d4ff',
  waiting: '#ffaa00',
  correct: '#00ff88',
  wrong: '#ff4466',
  played: '#8855ff',
};

const isBlackKey = (midi: number): boolean => {
  const note = midi % 12;
  return [1, 3, 6, 8, 10].includes(note);
};

const notesMatch = (detected: number, expected: number): boolean => {
  if (Math.abs(detected - expected) <= 1) return true;
  if (detected % 12 === expected % 12) return true;
  return false;
};

const triggerHaptic = (type: 'light' | 'medium' | 'heavy' = 'light') => {
  if ('vibrate' in navigator) {
    const durations = { light: 10, medium: 25, heavy: 50 };
    navigator.vibrate(durations[type]);
  }
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
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  const { isListening, currentPitch, startListening, stopListening } = usePitchDetection();

  const minNote = Math.min(...notes.map(n => n.midi), 60) - 2;
  const maxNote = Math.max(...notes.map(n => n.midi), 72) + 2;
  const noteRange = maxNote - minNote + 1;

  // Handle orientation changes
  useEffect(() => {
    const handleResize = () => {
      const nowLandscape = window.innerWidth > window.innerHeight;
      setIsLandscape(nowLandscape);
      
      // Auto-enter fullscreen on landscape (mobile only)
      if (nowLandscape && !isFullscreen && window.innerHeight < 600) {
        enterFullscreen();
      }
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isFullscreen]);

  // Handle fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullscreen = async () => {
    try {
      await document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } catch (err) {
      console.warn('Fullscreen not supported:', err);
    }
  };

  const exitFullscreen = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullscreen(false);
    } catch (err) {
      console.warn('Exit fullscreen failed:', err);
    }
  };

  // Note detection logic
  useEffect(() => {
    if (!isPlaying || waitingForNote === null || !currentPitch) return;
    
    if (notesMatch(currentPitch.midi, waitingForNote)) {
      setLastCorrect(true);
      setPlayedNotes(prev => new Set([...prev, waitingForNote]));
      setWaitingForNote(null);
      triggerHaptic('medium');
      setTimeout(() => setLastCorrect(null), 300);
    } else if (currentPitch.confidence > 0.6) {
      setLastCorrect(false);
      triggerHaptic('light');
      setTimeout(() => setLastCorrect(null), 150);
    }
  }, [currentPitch, waitingForNote, isPlaying]);

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const playableHeight = height - PIANO_HEIGHT;
    const playLineY = playableHeight * (1 - PLAY_LINE_POSITION);
    const keyWidth = width / noteRange;

    // Dark gradient background
    const bgGrad = ctx.createLinearGradient(0, 0, 0, height);
    bgGrad.addColorStop(0, '#0a0a1a');
    bgGrad.addColorStop(1, '#1a1a2e');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, width, height);

    // Vertical lane guides
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

    // Draw falling notes
    const pixelsPerSecond = (playableHeight * (1 - PLAY_LINE_POSITION)) / VISIBLE_TIME;
    
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
      
      let color = NOTE_COLORS.default;
      if (wasPlayed) {
        color = NOTE_COLORS.played;
      } else if (isWaiting) {
        color = lastCorrect === true ? NOTE_COLORS.correct 
              : lastCorrect === false ? NOTE_COLORS.wrong 
              : NOTE_COLORS.waiting;
      }
      
      ctx.shadowBlur = isWaiting ? 25 : 10;
      ctx.shadowColor = color;
      
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

    // Draw piano keyboard
    drawPianoKeyboard(ctx, playableHeight, keyWidth, currentPitch?.midi);
  }, [notes, minNote, noteRange, currentTime, waitingForNote, lastCorrect, currentPitch, playedNotes]);

  const drawPianoKeyboard = (
    ctx: CanvasRenderingContext2D,
    playableHeight: number,
    keyWidth: number,
    detectedNote: number | undefined
  ) => {
    const keyboardY = playableHeight;
    
    // White keys
    for (let i = 0; i < noteRange; i++) {
      const midi = minNote + i;
      if (isBlackKey(midi)) continue;
      
      const x = i * keyWidth;
      const isActive = detectedNote !== undefined && (detectedNote % 12 === midi % 12);
      
      ctx.fillStyle = isActive ? '#00ff88' : '#f0f0f0';
      ctx.fillRect(x, keyboardY, keyWidth - 1, PIANO_HEIGHT);
      
      ctx.strokeStyle = '#333';
      ctx.strokeRect(x, keyboardY, keyWidth - 1, PIANO_HEIGHT);
    }
    
    // Black keys
    for (let i = 0; i < noteRange; i++) {
      const midi = minNote + i;
      if (!isBlackKey(midi)) continue;
      
      const x = i * keyWidth;
      const isActive = detectedNote !== undefined && (detectedNote % 12 === midi % 12);
      
      ctx.fillStyle = isActive ? '#00ff88' : '#222';
      ctx.fillRect(x + 2, keyboardY, keyWidth - 4, PIANO_HEIGHT * 0.65);
    }
  };

  // Animation loop
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

  // Canvas resize handler
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
    triggerHaptic('medium');
    setIsPlaying(true);
  };

  const handlePause = () => {
    triggerHaptic('light');
    setIsPlaying(false);
  };

  const handleReset = () => {
    triggerHaptic('medium');
    setIsPlaying(false);
    setCurrentTime(0);
    setWaitingForNote(null);
    setPlayedNotes(new Set());
    stopListening();
  };

  // Portrait mode - show rotate prompt
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
    <div 
      className={`falling-notes-container ${isFullscreen ? 'is-fullscreen' : ''}`} 
      ref={containerRef}
    >
      <canvas ref={canvasRef} className="falling-notes-canvas" />
      
      {/* Side panel controls for landscape */}
      <div className="side-controls">
        <button 
          onClick={exitFullscreen} 
          className="control-btn exit-btn"
          aria-label="Exit fullscreen"
        >
          <Minimize2 size={20} />
        </button>
        
        {!isPlaying ? (
          <button 
            onClick={handlePlay} 
            className="control-btn play-btn"
            aria-label="Play"
          >
            <Play size={22} />
          </button>
        ) : (
          <button 
            onClick={handlePause} 
            className="control-btn pause-btn"
            aria-label="Pause"
          >
            <Pause size={22} />
          </button>
        )}
        
        <button 
          onClick={handleReset} 
          className="control-btn reset-btn"
          aria-label="Reset"
        >
          <RotateCcw size={20} />
        </button>
        
        <div className={`mic-status ${isListening ? 'active' : ''}`}>
          <Mic size={18} />
        </div>
      </div>

      {/* Minimal note indicator (landscape) */}
      {isListening && currentPitch && (
        <div className="note-indicator">
          {currentPitch.noteName}
        </div>
      )}
    </div>
  );
}
