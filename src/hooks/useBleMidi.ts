import { useState, useCallback, useRef } from 'react';
import type { MidiDevice, MidiNote, UseMidiResult } from './useMidi';
import { parseBleMidiPacket } from '../utils/bleMidiParser';

// BLE MIDI Service and Characteristic UUIDs (standard)
const BLE_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const BLE_MIDI_CHAR_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

/**
 * Check if Web Bluetooth is available (Safari, Chrome, etc.)
 * Also returns true on iOS Safari where we should try BLE MIDI
 */
export function isBleMidiSupported(): boolean {
  if (typeof navigator === 'undefined') return false;
  
  // Direct check
  if ('bluetooth' in navigator) return true;
  
  // iOS Safari detection - show button even if bluetooth not exposed yet
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  return isIOS || isSafari;
}

/**
 * Hook for connecting to BLE MIDI devices via Web Bluetooth.
 * Works on iOS Safari and other browsers with Web Bluetooth support.
 */
export function useBleMidi(): UseMidiResult & { requestDevice: () => Promise<void> } {
  const [devices, setDevices] = useState<MidiDevice[]>([]);
  const [activeDevice, setActiveDevice] = useState<MidiDevice | null>(null);
  const [lastNote, setLastNote] = useState<MidiNote | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const characteristicRef = useRef<BluetoothRemoteGATTCharacteristic | null>(null);
  const deviceRef = useRef<BluetoothDevice | null>(null);

  const handleNotification = useCallback((event: Event) => {
    const target = event.target as BluetoothRemoteGATTCharacteristic;
    const value = target.value;
    if (!value) return;
    
    const messages = parseBleMidiPacket(value);
    
    for (const msg of messages) {
      const messageType = msg.status & 0xf0;
      const channel = msg.status & 0x0f;
      
      // Note On with velocity > 0
      if (messageType === 0x90 && msg.data2 > 0) {
        setLastNote({
          note: msg.data1,
          velocity: msg.data2,
          timestamp: performance.now(),
          channel,
        });
      }
    }
  }, []);

  const requestDevice = useCallback(async () => {
    // Check for actual Web Bluetooth API
    if (!('bluetooth' in navigator)) {
      setError('Web Bluetooth not available. On iOS, ensure you\'re using Safari 15.4+ and have Bluetooth enabled.');
      return;
    }
    
    try {
      setError(null);
      
      const device = await navigator.bluetooth.requestDevice({
        filters: [{ services: [BLE_MIDI_SERVICE_UUID] }],
        optionalServices: [BLE_MIDI_SERVICE_UUID],
      });
      
      deviceRef.current = device;
      
      const midiDevice: MidiDevice = {
        id: device.id,
        name: device.name || 'BLE MIDI Device',
        manufacturer: 'Bluetooth',
        state: 'connected',
      };
      
      setDevices([midiDevice]);
      
      // Auto-connect after selection
      const server = await device.gatt?.connect();
      if (!server) throw new Error('Failed to connect to GATT server');
      
      const service = await server.getPrimaryService(BLE_MIDI_SERVICE_UUID);
      const characteristic = await service.getCharacteristic(BLE_MIDI_CHAR_UUID);
      
      characteristicRef.current = characteristic;
      await characteristic.startNotifications();
      characteristic.addEventListener('characteristicvaluechanged', handleNotification);
      
      setActiveDevice(midiDevice);
      
      // Handle disconnection
      device.addEventListener('gattserverdisconnected', () => {
        setActiveDevice(null);
        setDevices([]);
        characteristicRef.current = null;
      });
      
    } catch (err) {
      if (err instanceof Error) {
        if (err.name === 'NotFoundError') {
          setError('No BLE MIDI device selected');
        } else {
          setError(`BLE MIDI error: ${err.message}`);
        }
      }
    }
  }, [handleNotification]);

  const connect = useCallback((deviceId: string) => {
    // For BLE, connection happens during requestDevice
    // This is here for interface compatibility
    const device = devices.find(d => d.id === deviceId);
    if (device) {
      setActiveDevice(device);
    }
  }, [devices]);

  const disconnect = useCallback(() => {
    if (characteristicRef.current) {
      characteristicRef.current.removeEventListener(
        'characteristicvaluechanged', 
        handleNotification
      );
      characteristicRef.current.stopNotifications().catch(() => {});
    }
    
    if (deviceRef.current?.gatt?.connected) {
      deviceRef.current.gatt.disconnect();
    }
    
    setActiveDevice(null);
    characteristicRef.current = null;
    deviceRef.current = null;
  }, [handleNotification]);

  return {
    supported: isBleMidiSupported(),
    devices,
    activeDevice,
    lastNote,
    connect,
    disconnect,
    error,
    requestDevice,
  };
}
