// inverter-simulator.js
const { EventEmitter } = require('events');
const { buildPI30Command } = require('./protocolo');

class InverterSimulator extends EventEmitter {
  constructor() {
    super();
    this.isOpen = false;
    this.nackCounter = 0;
    this.serial = '9293221010F4CD';
    this.state = {
      gridVoltage: 221.5,
      gridFreq: 50.0,
      acOutVoltage: 220.1,
      acOutFreq: 50.0,
      acOutWatts: 640,
      busVoltage: 386,
      batteryVoltage: 53.35, // Banco 48V LiFePO4 (JKBMSB1 + JKBMSB2)
      batteryChargeAmps: 15,
      batterySOC: 88,
      inverterTempC: 35,
      pvAmps: 5.2,
      pvVoltage: 248.4,
      batteryDischargeAmps: 0,
    };
  }

  async open() {
    this.isOpen = true;
    this.emit('open');
  }

  async close() {
    this.isOpen = false;
    this.emit('close');
  }

  _tickSensors() {
    const jitter = (range) => (Math.random() - 0.5) * range;
    this.state.acOutVoltage = +(220.0 + jitter(0.8)).toFixed(1);
    this.state.acOutWatts = Math.max(150, Math.round(640 + jitter(80)));
    this.state.pvVoltage = +(248.0 + jitter(3.5)).toFixed(1);
    this.state.pvAmps = +(5.2 + jitter(0.4)).toFixed(1);
    this.state.batteryVoltage = +(53.35 + jitter(0.08)).toFixed(2);
  }

  write(buffer) {
    if (!this.isOpen) return;
    this._tickSensors();

    const ascii = buffer.toString('ascii');

    setTimeout(() => {
      if (ascii.startsWith('QPI')) {
        return this.emit('data', buildPI30Command('(PI30'));
      }
      if (ascii.startsWith('QID')) {
        return this.emit('data', buildPI30Command(`(${this.serial}`));
      }
      if (ascii.startsWith('QMOD')) {
        return this.emit('data', buildPI30Command('(B'));
      }
      if (ascii.startsWith('QPIGS')) {
        const s = this.state;
        const va = Math.round(s.acOutWatts * 1.1);
        const pct = Math.round((s.acOutWatts / 5000) * 100);
        const pvW = Math.round(s.pvVoltage * s.pvAmps);

        const frame = [
          s.gridVoltage.toFixed(1),
          s.gridFreq.toFixed(1),
          s.acOutVoltage.toFixed(1),
          s.acOutFreq.toFixed(1),
          String(va).padStart(4, '0'),
          String(s.acOutWatts).padStart(4, '0'),
          String(pct).padStart(3, '0'),
          String(s.busVoltage),
          s.batteryVoltage.toFixed(2),
          String(s.batteryChargeAmps).padStart(3, '0'),
          String(s.batterySOC).padStart(3, '0'),
          String(s.inverterTempC).padStart(4, '0'),
          s.pvAmps.toFixed(1).padStart(4, '0'),
          s.pvVoltage.toFixed(1),
          '00.00',
          String(s.batteryDischargeAmps).padStart(5, '0'),
          '00010000',
          '00',
          '00',
          String(pvW).padStart(5, '0'),
          '010',
        ].join(' ');

        return this.emit('data', buildPI30Command(`(${frame}`));
      }

      // Replica exacta del rechazo UART capturado (49 04 XX 01 00 / 01 01)
      const tailByte = this.nackCounter % 4 === 3 ? 0x01 : 0x00;
      const nack = Buffer.from([0x49, 0x04, this.nackCounter & 0xff, 0x01, tailByte]);
      this.nackCounter++;
      this.emit('data', nack);
    }, 55);
  }
}

module.exports = { InverterSimulator };