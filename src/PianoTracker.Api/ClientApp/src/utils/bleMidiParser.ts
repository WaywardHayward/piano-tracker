/**
 * BLE MIDI packet parser.
 * BLE MIDI format differs from standard MIDI - includes timestamps.
 */

export interface ParsedMidiMessage {
  status: number;
  data1: number;
  data2: number;
}

/**
 * Parse BLE MIDI packet into individual MIDI messages.
 * BLE MIDI format: [header, timestamp, status, data1, data2, ...]
 * Can contain multiple messages with interleaved timestamps.
 */
export function parseBleMidiPacket(data: DataView): ParsedMidiMessage[] {
  const messages: ParsedMidiMessage[] = [];
  
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
    // Control Change, Aftertouch, Pitch Bend (2 data bytes)
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
