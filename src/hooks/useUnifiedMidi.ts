import { useMidi, type UseMidiResult } from './useMidi';
import { useBleMidi, isBleMidiSupported } from './useBleMidi';

export type ConnectionMode = 'web-midi' | 'ble-midi' | 'none';

export interface UseUnifiedMidiResult extends UseMidiResult {
  mode: ConnectionMode;
  requestBleMidi: () => Promise<void>;
  hasBleMidi: boolean;
}

/**
 * Detect if we should prefer BLE MIDI (iOS Safari, or Web MIDI unsupported)
 */
function detectPreferredMode(): ConnectionMode {
  const hasWebMidi = 'requestMIDIAccess' in navigator;
  const hasBleMidi = isBleMidiSupported();
  
  // iOS Safari: no Web MIDI, but has Web Bluetooth
  if (!hasWebMidi && hasBleMidi) return 'ble-midi';
  
  // Chrome/Edge: Web MIDI available
  if (hasWebMidi) return 'web-midi';
  
  // Neither available
  return 'none';
}

/**
 * Unified MIDI hook that works across browsers.
 * - Chrome/Edge: Uses Web MIDI API
 * - Safari/iOS: Uses Web Bluetooth BLE MIDI
 * 
 * On browsers that support both, defaults to Web MIDI but offers BLE as option.
 */
export function useUnifiedMidi(): UseUnifiedMidiResult {
  const webMidi = useMidi();
  const bleMidi = useBleMidi();
  
  const preferredMode = detectPreferredMode();
  const hasBleMidi = isBleMidiSupported();
  
  // Determine active mode based on what's connected
  let activeMode: ConnectionMode = 'none';
  if (bleMidi.activeDevice) {
    activeMode = 'ble-midi';
  } else if (webMidi.activeDevice) {
    activeMode = 'web-midi';
  } else if (preferredMode !== 'none') {
    activeMode = preferredMode;
  }
  
  // Use BLE MIDI if that's what's active or preferred
  const useBle = activeMode === 'ble-midi' || 
    (preferredMode === 'ble-midi' && !webMidi.activeDevice);
  
  const primary = useBle ? bleMidi : webMidi;
  
  return {
    supported: webMidi.supported || hasBleMidi,
    devices: [...webMidi.devices, ...bleMidi.devices],
    activeDevice: bleMidi.activeDevice || webMidi.activeDevice,
    lastNote: bleMidi.lastNote || webMidi.lastNote,
    connect: primary.connect,
    disconnect: () => {
      webMidi.disconnect();
      bleMidi.disconnect();
    },
    error: bleMidi.error || webMidi.error,
    mode: activeMode,
    requestBleMidi: bleMidi.requestDevice,
    hasBleMidi,
  };
}
