import { useRef, type ChangeEvent, type DragEvent, useState } from 'react';
import { FileMusic, Upload, Loader2, Play } from 'lucide-react';
import { useMidiFile, formatDuration } from '../hooks/useMidiFile';
import { midiToNoteName } from '../hooks/useMidi';
import { FallingNotesVisualizer } from './FallingNotesVisualizer';
import './MidiFileLoader.css';

/**
 * Component for loading and displaying MIDI file information.
 * Supports drag-and-drop and file picker.
 */
export function MidiFileLoader() {
  const { midiFile, isLoading, error, loadFile, clear, stats } = useMidiFile();
  const [isDragging, setIsDragging] = useState(false);
  const [isPracticing, setIsPracticing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) loadFile(file);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) loadFile(file);
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => setIsDragging(false);

  const handleClick = () => inputRef.current?.click();

  if (isLoading) {
    return (
      <section className="midi-loader">
        <h2><FileMusic size={20} className="icon-inline" /> MIDI File</h2>
        <div className="loading"><Loader2 size={20} className="spin" /> Loading MIDI file...</div>
      </section>
    );
  }

  if (midiFile && stats) {
    return (
      <section className="midi-loader">
        <h2><FileMusic size={20} className="icon-inline" /> MIDI File</h2>
        <div className="midi-info">
          <h3>{midiFile.header.name}</h3>
          <div className="stats-grid">
            <div className="stat">
              <span className="stat-label">Duration</span>
              <span className="stat-value">{formatDuration(stats.duration)}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Notes</span>
              <span className="stat-value">{stats.noteCount.toLocaleString()}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Tempo</span>
              <span className="stat-value">{Math.round(stats.bpm)} BPM</span>
            </div>
            <div className="stat">
              <span className="stat-label">Tracks</span>
              <span className="stat-value">{stats.trackCount}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Range</span>
              <span className="stat-value">
                {midiToNoteName(stats.lowestNote)} – {midiToNoteName(stats.highestNote)}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Time Sig</span>
              <span className="stat-value">
                {midiFile.header.timeSignatureNumerator}/{midiFile.header.timeSignatureDenominator}
              </span>
            </div>
          </div>
          <div className="tracks-list">
            <h4>Tracks</h4>
            <ul>
              {midiFile.tracks.map((track, i) => (
                <li key={i}>
                  <span className="track-name">{track.name}</span>
                  <span className="track-notes">{track.notes.length} notes</span>
                </li>
              ))}
            </ul>
          </div>
          
          <div className="action-buttons">
            <button 
              className="practice-btn" 
              onClick={() => setIsPracticing(!isPracticing)}
            >
              <Play size={18} className="icon-inline" />
              {isPracticing ? 'Hide Practice Mode' : 'Practice'}
            </button>
            <button className="clear-btn" onClick={() => { clear(); setIsPracticing(false); }}>
              Load Different File
            </button>
          </div>

          {isPracticing && midiFile.tracks.length > 0 && (
            <FallingNotesVisualizer 
              notes={midiFile.tracks.flatMap(t => t.notes)}
              tempo={stats.bpm}
            />
          )}
        </div>
      </section>
    );
  }

  return (
    <section className="midi-loader">
      <h2><FileMusic size={20} className="icon-inline" /> MIDI File</h2>
      {error && <p className="error">{error}</p>}
      <div
        className={`drop-zone ${isDragging ? 'dragging' : ''}`}
        onClick={handleClick}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".mid,.midi"
          onChange={handleFileChange}
          hidden
        />
        <p><Upload size={24} className="icon-inline" /> Drop a MIDI file here or click to browse</p>
      </div>
    </section>
  );
}
