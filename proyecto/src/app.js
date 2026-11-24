require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./db');
const { InverterService } = require('../server/servicio');

const app = express();

app.use(cors());
app.use(express.json());

// Variables en tiempo real alimentadas por el simulador/inversor
let currentPvWatts = 5420;
let currentBatterySoc = 88;
let currentInverterStatus = 'hybrid mode';

// Inicialización del servicio de inversor (modo 'sim' por defecto desde .env)
const inverter = new InverterService({
  mode: process.env.INVERTER_MODE || 'sim',
});

// Cada vez que el inversor/simulador entrega telemetría, se guarda en PostgreSQL
inverter.on('telemetry', async (packet) => {
  try {
    if (typeof packet.pvWatts === 'number') currentPvWatts = packet.pvWatts;
    if (typeof packet.batterySOC === 'number') currentBatterySoc = packet.batterySOC;

    const solarState = await buildSolarState();
    await db.insertTelemetry({
      solarPvW: solarState.solarPv,
      loadPowerW: solarState.loadPower,
      gridPowerW: solarState.gridPower,
      batterySoc: solarState.batteryCharge,
      inverterStatus: solarState.inverterStatus,
    });
  } catch (err) {
    console.error('[Error guardando telemetría en BD]:', err.message);
  }
});

inverter.on('error', (err) => {
  console.error('[Error del Inversor]:', err.message);
});

// Inicia la lectura periódica cada 5000 ms (5 segundos)
inverter.start(5000).catch((err) => {
  console.error('[No se pudo iniciar el servicio del inversor]:', err.message);
});

// Calcula el balance energético actual sumando los dispositivos activos en PostgreSQL
async function buildSolarState() {
  const { list } = await db.getAllDevices();
  let totalWatts = 0;

  for (const dev of list) {
    if (dev.active) {
      totalWatts += dev.power_watts;
    }
  }

  const surplus = currentPvWatts - totalWatts;

  return {
    loadPower: totalWatts,
    solarPv: currentPvWatts,
    gridPower: surplus > 0 ? surplus : 0,
    batteryCharge: currentBatterySoc,
    inverterStatus: currentInverterStatus,
  };
}

// ============================================================================
// RUTAS DE LA API REST
// ============================================================================

// 1. Verificación de estado del servidor y de la base de datos
app.get('/api/v1/health', async (req, res) => {
  try {
    await db.pool.query('SELECT 1');
    res.json({
      success: true,
      message: 'Backend Node.js y PostgreSQL en línea',
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: 'Sin conexión a PostgreSQL: ' + err.message,
    });
  }
});

// 2. Estado completo del tablero principal (READ)
app.get('/api/dashboard', async (req, res) => {
  try {
    const solarState = await buildSolarState();
    const { map } = await db.getAllDevices();
    res.json({
      success: true,
      solarState,
      devices: map,
    });
  } catch (err) {
    console.error('Error en GET /api/dashboard:', err.message);
    res.status(500).json({
      success: false,
      error: 'Error al obtener datos del tablero desde la base de datos',
    });
  }
});

// 3. Consultar configuración y tarifas de la planta (READ)
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await db.getSettings();
    if (!settings) {
      return res.status(404).json({ success: false, error: 'Configuración no encontrada' });
    }
    res.json({
      success: true,
      plantSettings: settings,
    });
  } catch (err) {
    console.error('Error en GET /api/settings:', err.message);
    res.status(500).json({ success: false, error: 'Error leyendo configuración de planta' });
  }
});

// 4. Actualizar tarifa eléctrica y calcular ahorro estimado (UPDATE)
app.post('/api/settings', async (req, res) => {
  const rate = Number(req.body.energyRateCLP);

  if (!rate || Number.isNaN(rate) || rate <= 0) {
    return res.status(400).json({
      success: false,
      error: 'El valor de energyRateCLP debe ser un número mayor a 0',
    });
  }

  try {
    const updated = await db.updateEnergyRate(Math.round(rate));
    // Cálculo referencial de ahorro diario basado en 17.6 kWh autoconsumidos
    const ahorro = Math.round(17.6 * updated.energy_rate_clp);

    res.json({
      success: true,
      plantSettings: updated,
      ahorro,
    });
  } catch (err) {
    console.error('Error en POST /api/settings:', err.message);
    res.status(500).json({ success: false, error: 'Error actualizando tarifa en base de datos' });
  }
});

// 5. Listar todos los dispositivos domóticos (READ)
app.get('/api/devices', async (req, res) => {
  try {
    const { map } = await db.getAllDevices();
    res.json({
      success: true,
      data: map,
    });
  } catch (err) {
    console.error('Error en GET /api/devices:', err.message);
    res.status(500).json({ success: false, error: 'Error al consultar dispositivos' });
  }
});

// 6. Registrar un nuevo dispositivo domótico (CREATE)
app.post('/api/devices', async (req, res) => {
  const { deviceCode, name, powerWatts } = req.body;

  if (!deviceCode || !name || typeof deviceCode !== 'string' || typeof name !== 'string') {
    return res.status(400).json({
      success: false,
      error: 'Los campos deviceCode y name son obligatorios',
    });
  }

  const watts = powerWatts !== undefined ? Number(powerWatts) : 1000;
  if (Number.isNaN(watts) || watts < 0) {
    return res.status(400).json({
      success: false,
      error: 'La potencia powerWatts debe ser un número mayor o igual a 0',
    });
  }

  try {
    const created = await db.createDevice({
      deviceCode: deviceCode.trim().toLowerCase(),
      name: name.trim(),
      powerWatts: Math.round(watts),
    });

    res.status(201).json({
      success: true,
      message: 'Dispositivo registrado correctamente',
      device: created,
    });
  } catch (err) {
    // Código 23505 en PostgreSQL significa clave única duplicada (device_code repetido)
    if (err.code === '23505') {
      return res.status(400).json({
        success: false,
        error: `Ya existe un dispositivo con el código '${deviceCode}'`,
      });
    }
    console.error('Error en POST /api/devices:', err.message);
    res.status(500).json({ success: false, error: 'Error al registrar el dispositivo' });
  }
});

// 7. Encender o apagar un dispositivo y recalcular balance (UPDATE)
app.post('/api/devices/toggle', async (req, res) => {
  const { deviceId, state, powerWatts } = req.body;

  if (!deviceId || typeof state !== 'boolean') {
    return res.status(400).json({
      success: false,
      error: 'Se requiere deviceId (string) y state (boolean true/false)',
    });
  }

  try {
    const updated = await db.toggleDevice(deviceId, state, Number(powerWatts));

    if (!updated) {
      return res.status(404).json({
        success: false,
        error: 'Dispositivo no encontrado',
      });
    }

    const solarState = await buildSolarState();

    return res.json({
      success: true,
      message: `Dispositivo ${deviceId} actualizado`,
      device: {
        name: updated.device_name,
        active: updated.active,
        power: updated.power_watts,
      },
      solarState,
    });
  } catch (err) {
    console.error('Error en POST /api/devices/toggle:', err.message);
    res.status(500).json({ success: false, error: 'Error actualizando estado del dispositivo' });
  }
});

// 8. Modificar nombre o potencia de un dispositivo (UPDATE)
app.put('/api/devices/:id', async (req, res) => {
  const { name, powerWatts } = req.body;

  if (powerWatts !== undefined && (Number.isNaN(Number(powerWatts)) || Number(powerWatts) < 0)) {
    return res.status(400).json({
      success: false,
      error: 'La potencia powerWatts debe ser un número mayor o igual a 0',
    });
  }

  try {
    const updated = await db.updateDevice(req.params.id, {
      name: name ? name.trim() : undefined,
      powerWatts: powerWatts !== undefined ? Math.round(Number(powerWatts)) : undefined,
    });

    if (!updated) {
      return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
    }

    res.json({
      success: true,
      message: 'Dispositivo modificado correctamente',
      device: updated,
    });
  } catch (err) {
    console.error('Error en PUT /api/devices/:id:', err.message);
    res.status(500).json({ success: false, error: 'Error modificando el dispositivo' });
  }
});

// 9. Eliminar un dispositivo (DELETE)
app.delete('/api/devices/:id', async (req, res) => {
  try {
    const deleted = await db.deleteDevice(req.params.id);

    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Dispositivo no encontrado' });
    }

    res.json({
      success: true,
      message: 'Dispositivo eliminado correctamente',
      deletedId: deleted.device_code,
    });
  } catch (err) {
    console.error('Error en DELETE /api/devices/:id:', err.message);
    res.status(500).json({ success: false, error: 'Error eliminando el dispositivo' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});
