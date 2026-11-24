// inverter-service.js
const { EventEmitter } = require('events');
const { InverterSimulator } = require('./sim');
const { InverterSerialClient } = require('./cliente');
const { buildPI30Command, parseInverterResponse } = require('./protocolo');

class InverterService extends EventEmitter {
  constructor({ mode = 'sim', path = null, baudRate = 2400 } = {}) {
    super();
    this.mode = mode;
    this.lastCommand = '';
    this.pollTimer = null;

    this.transport =
      mode === 'real'
        ? new InverterSerialClient({ path, baudRate })
        : new InverterSimulator();

    this.transport.on('data', (rawBuffer) => {
      const parsed = parseInverterResponse(rawBuffer, this.lastCommand);
      this.emit('raw', rawBuffer);
      if (parsed) {
        this.emit('data', parsed);
        if (parsed.type === 'QPIGS') {
          this.emit('telemetry', parsed);
        }
      }
    });

    this.transport.on('error', (err) => this.emit('error', err));
  }

  async start(pollIntervalMs = 1000) {
    await this.transport.open();

    // Consulta inicial de identidad (Serial F4CD)
    this.sendCommand('QID');

    if (pollIntervalMs > 0) {
      this.pollTimer = setInterval(() => {
        this.sendCommand('QPIGS');
      }, pollIntervalMs);
    }
  }

  sendCommand(cmd) {
    this.lastCommand = cmd;
    const frame = cmd.startsWith('^')
      ? Buffer.from(`${cmd}\r`, 'ascii')
      : buildPI30Command(cmd);
    this.transport.write(frame);
  }

  async stop() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    await this.transport.close();
  }
}

// --- EJEMPLO DE USO DIRECTO ---
if (require.main === module) {
  // Cambia mode a 'real' y especifica path: 'COM4' cuando tengas el cable conectado
  const inverter = new InverterService({ mode: 'sim', path: 'COM4', baudRate: 2400 });

  inverter.on('data', (packet) => {
    if (packet.type === 'QID') {
      console.log(`[ID] Inversor conectado | Serial: ${packet.serial} (BLE: ${packet.bleId})`);
    } else if (packet.type === 'QPIGS') {
      console.log(
        `[DATA] PV: ${packet.pvWatts}W (${packet.pvVoltage}V) | Bat: ${packet.batteryVoltage}V (${packet.batterySOC}%) | Carga: ${packet.acOutWatts}W`
      );
    } else {
      console.log('[RX] Paquete:', packet);
    }
  });

  inverter.on('error', (err) => console.error('[ERROR] Error UART:', err.message));
  inverter.start(1000);
}

module.exports = { InverterService };