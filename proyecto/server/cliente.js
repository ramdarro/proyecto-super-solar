// inverter-client.js
const { EventEmitter } = require('events');

class InverterSerialClient extends EventEmitter {
  constructor({ path, baudRate = 2400 } = {}) {
    super();
    this.path = path;
    this.baudRate = baudRate;
    this.port = null;
    this.rxBuffer = Buffer.alloc(0);
  }

  async open() {
    const { SerialPort } = require('serialport');

    // Autodetección si no se especificó un puerto COM fijo
    if (!this.path) {
      const ports = await SerialPort.list();
      if (ports.length === 0) {
        throw new Error('No se detectó ningún puerto COM conectado en Windows.');
      }
      this.path = ports[0].path;
    }

    return new Promise((resolve, reject) => {
      this.port = new SerialPort({
        path: this.path,
        baudRate: this.baudRate,
        dataBits: 8,
        stopBits: 1,
        parity: 'none',
        autoOpen: false,
      });

      this.port.on('data', (chunk) => this._onChunk(chunk));
      this.port.on('error', (err) => this.emit('error', err));
      this.port.on('close', () => this.emit('close'));

      this.port.open((err) => {
        if (err) return reject(err);
        this.emit('open', this.path);
        resolve(this.path);
      });
    });
  }

  _onChunk(chunk) {
    this.rxBuffer = Buffer.concat([this.rxBuffer, chunk]);

    // Caso A: Trama propietaria de 5 bytes (0x49 0x04 ...)
    if (this.rxBuffer.length >= 5 && this.rxBuffer[0] === 0x49 && this.rxBuffer[1] === 0x04) {
      const frame = this.rxBuffer.subarray(0, 5);
      this.rxBuffer = this.rxBuffer.subarray(5);
      this.emit('data', frame);
      return;
    }

    // Caso B: Trama PI30 terminada en Carriage Return (0x0D)
    const crIndex = this.rxBuffer.indexOf(0x0d);
    if (crIndex !== -1) {
      const frame = this.rxBuffer.subarray(0, crIndex + 1);
      this.rxBuffer = this.rxBuffer.subarray(crIndex + 1);
      this.emit('data', frame);
    }
  }

  write(buffer) {
    if (this.port && this.port.isOpen) {
      this.rxBuffer = Buffer.alloc(0);
      this.port.write(buffer);
    }
  }

  async close() {
    if (!this.port || !this.port.isOpen) return;
    return new Promise((resolve) => this.port.close(() => resolve()));
  }
}

module.exports = { InverterSerialClient };