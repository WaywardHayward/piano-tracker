import { useState, useCallback, useRef } from 'react';
import type { MidiDevice, MidiNote, UseMidiResult } from './useMidi';

// BLE MIDI Service and Characteristic UUIDs (standard)
const BLE_MIDI_SERVICE_UUID = '03b80e5a-ede8-4b33-a751-6ce34ec4c700';
const BLE_MIDI_CHAR_UUID = '7772e5db-3868-4112-a1a9-f2669d106bf3';

/**
 * Check if Web Bluetooth is available (Safari, Chrome, etc.)
 */
export function isBleMidiSupported(): boolean {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
}

/**
 * Parse BLE MIDI packet into individual MIDI messages.
 * BLE MIDI format: [header, timestamp, status, data1, data2, ...]
 * Can contain multiple messages with interleaved timestamps.
 */
function parseBleMidiPacket(data: DataView): Array<{ status: number; data1: number; data2: number }> {
  const messages: Array<{ status: number; data1: number; data2: number }> = [];
  
  if (data.byteLength < 3) return messages;
  
  let i = 0;
  const header = data.getUint8(i++);
  
  // Header must have bit 7 set
  if (!(header & 0x80)) return messages;
  
  let runningStatus = 0;
  
  while (i < data.byteLength) {
    const byte = data.getUint8(i);
    
    // Timestamp byte (bit 7 set, but not a status byte)
    if ((byte & 0x80) && i + 1 < data.byteLength) {
      const nextByte = data.getUint8(i + 1);
      
      // If next byte is a status byte (0x80-0xFF), this is a timestamp
      if (nextByte & 0x80) {
        i++; // Skip timestamp
        runningStatus = nextByte;
        i++; // Skip status
        continue;
      }
    }
    
    // Status byte
    if (byte & 0x80) {
      runningStatus = byte;
      i++;
      continue;
    }
    
    // Data bytes - interpret based on running status
    const messageType = runningStatus & 0xf0;
    
    // Note On/Off (2 data bytes)
    if (messageType === 0x80 || messageType === 0x90) {
      if (i + 1 < data.byteLength) {
        const data1 = data.getUint8(i++);
        const data2 = data.getUint8(i++);
        messages.push({ status: runningStatus, data1, data2 });
      } else {
        break;
      }
    }
    // Control Change, Aftertouch (2 data bytes)
    else if (messageType === 0xa0 || messageType === 0xb0 || messageType === 0xe0) {
      if (i + 1 < data.byteLength) {
        i += 2; // Skip these for now
      } else {
        break;
      }
    }
    // Program Change, Channel Pressure (1 data byte)
    else if (messageType === 0xc0 || messageType === 0xd0) {
      i++; // Skip
    }
    else {
      i++; // Unknown, skip
    }
  }
  
  return messages;
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
    if (!isBleMidiSupported()) {
      setError('Web Bluetooth not supported in this browser');
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
      characteristicRef.current.removeEventListener('characteristicvaluechanged', handleNotification);
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
