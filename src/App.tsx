import { Music, AlertTriangle, Check, Sparkles, BarChart3, Flame, Bluetooth } from 'lucide-react';
import { useUnifiedMidi } from './hooks/useUnifiedMidi';
import { midiToNoteName } from './hooks/useMidi';
import { MidiFileLoader } from './components/MidiFileLoader';
import './App.css';

function App() {
  const { 
    supported, devices, activeDevice, lastNote, 
    connect, disconnect, error, mode, requestBleMidi, hasBleMidi 
  } = useUnifiedMidi();

  const showBleMidiButton = hasBleMidi && !activeDevice;
  const isBleMidiMode = mode === 'ble-midi';

  return (
    <div className="app">
      <h1><Music size={32} className="icon-inline" /> Piano Tracker</h1>
      
      {!supported && (
        <p className="warning">
          <AlertTriangle size={18} className="icon-inline" /> 
          MIDI not supported in this browser.
          <br />
          You can still load and view MIDI files.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <MidiFileLoader />

      {supported && (
        <section className="devices">
          <h2>
            MIDI Devices
            {isBleMidiMode && <span className="mode-badge">Bluetooth</span>}
          </h2>
          
          {showBleMidiButton && (
            <button className="ble-connect-btn" onClick={requestBleMidi}>
              <Bluetooth size={18} className="icon-inline" />
              Connect Bluetooth MIDI
            </button>
          )}
          
          {devices.length === 0 && !showBleMidiButton && (
            <p className="muted">No MIDI devices found. Connect a keyboard and refresh.</p>
          )}
          
          {devices.length === 0 && showBleMidiButton && (
            <p className="muted">
              Click the button above to pair a Bluetooth MIDI keyboard.
            </p>
          )}
          
          {devices.length > 0 && (
            <ul>
              {devices.map((device) => (
                <li key={device.id}>
                  <span>{device.name}</span>
                  <span className="manufacturer">({device.manufacturer})</span>
                  {activeDevice?.id === device.id ? (
                    <button onClick={disconnect}>Disconnect</button>
                  ) : (
                    <button onClick={() => connect(device.id)}>Connect</button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {activeDevice && (
        <section className="status connected">
          <h2>
            <Check size={20} className="icon-inline icon-success" />
            Connected: {activeDevice.name}
          </h2>
          <p>Play some notes to test the connection!</p>
        </section>
      )}

      {lastNote && (
        <section className="note-display">
          <h2>Last Note</h2>
          <div className="note">
            <span className="note-name">{midiToNoteName(lastNote.note)}</span>
            <span className="note-number">MIDI: {lastNote.note}</span>
            <span className="velocity">Velocity: {lastNote.velocity}</span>
          </div>
        </section>
      )}

      <section className="roadmap">
        <h2>Coming Soon</h2>
        <ul>
          <li><Check size={16} className="icon-inline icon-success" /> Load MIDI files</li>
          <li><Sparkles size={16} className="icon-inline" /> Falling-note visualization</li>
          <li><Check size={16} className="icon-inline icon-success" /> Note accuracy tracking</li>
          <li><BarChart3 size={16} className="icon-inline" /> Practice session logging</li>
          <li><Flame size={16} className="icon-inline" /> Streaks and achievements</li>
        </ul>
      </section>
    </div>
  );
}

export default App;
