// inverter-protocol.js

function crc16Voltronic(buf) {
  let crc = 0;
  for (const b of buf) {
    crc ^= b << 8;
    for (let i = 0; i < 8; i++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xffff;
    }
  }
  let hi = (crc >> 8) & 0xff;
  let lo = crc & 0xff;
  // Caracteres reservados por el protocolo Voltronic ('(', '\r', '\n')
  if ([0x28, 0x0d, 0x0a].includes(hi)) hi += 1;
  if ([0x28, 0x0d, 0x0a].includes(lo)) lo += 1;
  return Buffer.from([hi, lo]);
}

function crc16Modbus(buf) {
  let crc = 0xffff;
  for (const b of buf) {
    crc ^= b;
    for (let i = 0; i < 8; i++) {
      crc = crc & 1 ? (crc >> 1) ^ 0xa001 : crc >> 1;
    }
  }
  return Buffer.from([crc & 0xff, (crc >> 8) & 0xff]);
}

function buildPI30Command(cmd) {
  const payload = Buffer.from(cmd, 'ascii');
  return Buffer.concat([payload, crc16Voltronic(payload), Buffer.from([0x0d])]);
}

function buildModbusRead(slaveId, funcCode, startReg, count) {
  const pdu = Buffer.from([
    slaveId,
    funcCode,
    (startReg >> 8) & 0xff,
    startReg & 0xff,
    (count >> 8) & 0xff,
    count & 0xff,
  ]);
  return Buffer.concat([pdu, crc16Modbus(pdu)]);
}

function parseInverterResponse(buffer, lastCommand = '') {
  if (!buffer || buffer.length === 0) return null;

  // 1. Detectar trama de rechazo propietaria capturada en UART (49 04 XX 01 00/01)
  if (buffer.length === 5 && buffer[0] === 0x49 && buffer[1] === 0x04) {
    return {
      type: 'NACK',
      counter: buffer[2],
      statusHex: buffer.subarray(3).toString('hex'),
      rawHex: buffer.toString('hex'),
    };
  }

  // 2. Respuesta ASCII PI30 (inicia con '(' y termina con 2 bytes CRC + 0x0D)
  const cleanAscii = buffer.subarray(0, Math.max(0, buffer.length - 3)).toString('ascii');
  if (cleanAscii.startsWith('(')) {
    const body = cleanAscii.slice(1).trim();

    if (lastCommand === 'QID') {
      return { type: 'QID', serial: body, bleId: body.slice(-4), rawHex: buffer.toString('hex') };
    }

    if (lastCommand === 'QMOD') {
      const modos = { P: 'Power On', S: 'Standby', L: 'Red (Line)', B: 'Batería/Solar', F: 'Falla', H: 'Ahorro' };
      return { type: 'QMOD', code: body, mode: modos[body] || body, rawHex: buffer.toString('hex') };
    }

    if (lastCommand === 'QPIGS') {
      const p = body.split(/\s+/);
      if (p.length >= 16) {
        return {
          type: 'QPIGS',
          timestamp: new Date().toISOString(),
          gridVoltage: parseFloat(p[0]),
          gridFreq: parseFloat(p[1]),
          acOutVoltage: parseFloat(p[2]),
          acOutFreq: parseFloat(p[3]),
          acOutVA: parseInt(p[4], 10),
          acOutWatts: parseInt(p[5], 10),
          loadPercent: parseInt(p[6], 10),
          busVoltage: parseInt(p[7], 10),
          batteryVoltage: parseFloat(p[8]),
          batteryChargeAmps: parseInt(p[9], 10),
          batterySOC: parseInt(p[10], 10),
          inverterTempC: parseInt(p[11], 10),
          pvAmps: parseFloat(p[12]),
          pvVoltage: parseFloat(p[13]),
          batteryDischargeAmps: parseInt(p[15], 10),
          pvWatts: p[19] ? parseInt(p[19], 10) : Math.round(parseFloat(p[12]) * parseFloat(p[13])),
          rawHex: buffer.toString('hex'),
        };
      }
    }

    return { type: 'PI30_RAW', data: body, rawHex: buffer.toString('hex') };
  }

  return {
    type: 'UNKNOWN',
    rawHex: buffer.toString('hex'),
    rawTxt: buffer.toString('ascii').replace(/[^\x20-\x7E]/g, '.'),
  };
}

module.exports = {
  crc16Voltronic,
  crc16Modbus,
  buildPI30Command,
  buildModbusRead,
  parseInverterResponse,
};