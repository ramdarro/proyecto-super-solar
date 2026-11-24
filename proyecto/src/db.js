const { Pool } = require('pg');
require('dotenv').config();

// Configuración del pool de conexiones leyendo credenciales desde .env
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  database: process.env.DB_NAME || 'sunlytics_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
});

// ============================================================================
// 1. OPERACIONES SOBRE CONFIGURACIÓN DE PLANTA (plant_settings)
// ============================================================================

// READ: Obtener configuración actual de la planta
async function getSettings() {
  const res = await pool.query('SELECT * FROM plant_settings WHERE id = 1');
  return res.rows[0];
}

// UPDATE: Actualizar tarifa eléctrica en CLP/kWh
async function updateEnergyRate(energyRateCLP) {
  const res = await pool.query(
    `UPDATE plant_settings
     SET energy_rate_clp = $1, updated_at = NOW()
     WHERE id = 1
     RETURNING *`,
    [energyRateCLP]
  );
  return res.rows[0];
}

// ============================================================================
// 2. OPERACIONES CRUD SOBRE DISPOSITIVOS DOMÓTICOS (domotic_devices)
// ============================================================================

// READ: Obtener todos los dispositivos (en formato lista y mapa por código)
async function getAllDevices() {
  const res = await pool.query('SELECT * FROM domotic_devices ORDER BY id ASC');
  const devicesMap = {};

  for (const row of res.rows) {
    devicesMap[row.device_code] = {
      id: row.id,
      code: row.device_code,
      name: row.device_name,
      active: row.active,
      power: row.power_watts,
    };
  }

  return { list: res.rows, map: devicesMap };
}

// CREATE: Registrar un nuevo dispositivo domótico
async function createDevice({ deviceCode, name, powerWatts = 1000 }) {
  const res = await pool.query(
    `INSERT INTO domotic_devices (device_code, plant_id, device_name, active, power_watts)
     VALUES ($1, 1, $2, FALSE, $3)
     RETURNING *`,
    [deviceCode, name, powerWatts]
  );
  return res.rows[0];
}

// UPDATE (Toggle): Encender o apagar un dispositivo existente
async function toggleDevice(identifier, active, powerWatts) {
  const watts = active ? (powerWatts || 1000) : 0;
  const res = await pool.query(
    `UPDATE domotic_devices
     SET active = $1, power_watts = $2, updated_at = NOW()
     WHERE device_code = $3 OR id::text = $3
     RETURNING *`,
    [active, watts, String(identifier)]
  );
  return res.rows[0];
}

// UPDATE (Edición): Modificar nombre o potencia nominal de un dispositivo
async function updateDevice(identifier, { name, powerWatts }) {
  const res = await pool.query(
    `UPDATE domotic_devices
     SET device_name = COALESCE($1, device_name),
         power_watts = COALESCE($2, power_watts),
         updated_at = NOW()
     WHERE device_code = $3 OR id::text = $3
     RETURNING *`,
    [name ?? null, powerWatts ?? null, String(identifier)]
  );
  return res.rows[0];
}

// DELETE: Eliminar un dispositivo de la base de datos
async function deleteDevice(identifier) {
  const res = await pool.query(
    `DELETE FROM domotic_devices
     WHERE device_code = $1 OR id::text = $1
     RETURNING *`,
    [String(identifier)]
  );
  return res.rows[0];
}

// ============================================================================
// 3. OPERACIONES SOBRE TELEMETRÍA ENERGÉTICA (telemetry_logs)
// ============================================================================

// CREATE: Guardar una nueva lectura del inversor/simulador
async function insertTelemetry({ solarPvW, loadPowerW, gridPowerW, batterySoc, inverterStatus }) {
  const res = await pool.query(
    `INSERT INTO telemetry_logs (plant_id, solar_pv_w, load_power_w, grid_power_w, battery_soc, inverter_status)
     VALUES (1, $1, $2, $3, $4, $5)
     RETURNING *`,
    [solarPvW, loadPowerW, gridPowerW, batterySoc, inverterStatus]
  );
  return res.rows[0];
}

// READ: Obtener la última lectura registrada
async function getLatestTelemetry() {
  const res = await pool.query(
    'SELECT * FROM telemetry_logs WHERE plant_id = 1 ORDER BY id DESC LIMIT 1'
  );
  return res.rows[0];
}

module.exports = {
  pool,
  getSettings,
  updateEnergyRate,
  getAllDevices,
  createDevice,
  toggleDevice,
  updateDevice,
  deleteDevice,
  insertTelemetry,
  getLatestTelemetry,
};