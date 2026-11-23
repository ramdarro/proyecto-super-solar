const express = require('express');
const cors = require('cors');
const inverterService = require('./InverterService');

const app = express();

app.use(cors());
app.use(express.json());

let solarState = {
    loadPower: 2100,
    solarPv: 5420,
    gridPower: 3320,
    batteryCharge: 88,
    inverterStatus: "hybrid mode"
};

let devices = {
    ev: { name: "Cargador EV (Wallbox)", active: true, power: 3200 },
    pool: { name: "Bomba de Piscina", active: false, power: 0 },
    heater: { name: "Termoeléctrico 200L", active: true, power: 1800 },
    ac: { name: "Climatización Inverter", active: true, power: 900 }
};

setInterval(async () => {
    const realSolarPower = await inverterService.readSolarData();
    solarState.solarPv = realSolarPower;
    recalculateLoad();
}, 5000);

app.get('/api/v1/health', (req, res) => {
    res.json({ success: true, message: "Backend Node.js API en línea" });
});

app.get('/api/dashboard', (req, res) => {
    res.json({
        success: true,
        solarState,
        devices
    });
});

app.get('/api/devices', (req, res) => {
    res.json({ success: true, data: devices });
});

app.post('/api/devices/toggle', (req, res) => {
    const { deviceId, state, powerWatts } = req.body;

    if (devices[deviceId]) {
        devices[deviceId].active = state;
        devices[deviceId].power = state ? (powerWatts || devices[deviceId].power || 1000) : 0;
        
        recalculateLoad();

        return res.json({
            success: true,
            message: `Dispositivo ${deviceId} actualizado`,
            device: devices[deviceId],
            solarState
        });
    }

    res.status(404).json({ success: false, error: "Dispositivo no encontrado" });
});

function recalculateLoad() {
    let totalWatts = 0;
    Object.values(devices).forEach(dev => {
        if (dev.active) totalWatts += dev.power;
    });

    solarState.loadPower = totalWatts;
    const surplus = solarState.solarPv - solarState.loadPower;
    solarState.gridPower = surplus > 0 ? surplus : 0;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Servidor backend escuchando en http://localhost:${PORT}`);
});