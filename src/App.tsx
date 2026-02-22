import { useMidi, midiToNoteName } from './hooks/useMidi';
import { MidiFileLoader } from './components/MidiFileLoader';
import './App.css';

function App() {
  const { supported, devices, activeDevice, lastNote, connect, disconnect, error } = useMidi();

  return (
    <div className="app">
      <h1>🎹 Piano Tracker</h1>
      
      {!supported && (
        <p className="warning">
          ⚠️ MIDI keyboard input not supported in this browser (Safari/Firefox).
          <br />
          You can still load and view MIDI files. For keyboard input, use Chrome or Edge.
        </p>
      )}

      {error && <p className="error">{error}</p>}

      <MidiFileLoader />

      {supported && (
        <section className="devices">
          <h2>MIDI Devices</h2>
          {devices.length === 0 ? (
            <p className="muted">No MIDI devices found. Connect a keyboard and refresh.</p>
          ) : (
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
        <section className="status">
          <h2>Connected: {activeDevice.name}</h2>
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
          <li>✅ Load MIDI files</li>
          <li>🎵 Falling-note visualization</li>
          <li>✅ Note accuracy tracking</li>
          <li>📊 Practice session logging</li>
          <li>🔥 Streaks and achievements</li>
        </ul>
      </section>
    </div>
  );
}

export default App;
