const express = require('express');
const cors = require('cors');
const { getEnvironmentData } = require('node:worker_threads');
const app = express();

app.use (cors());
app.use (express.json());

let solarState = {
    loadPower: 337,
    solarPv: 2150,
    gridPower: 0,
    batteryCharge: 78,
    inverterStatus: "hybrid mode"
};

let devices = {
    pump: { name: "bomba de piscina", active: true, power: 750},
    ac: { name: "Aire Acondicionado", active: true, power: 600, targetTemp:22 },
    ev: { name: "cargador EV", active: false, power: 0},
    lights: { name: "luces jardín", active: true, power: 50}
};

app.get('/api/devices', (req, res) => {
    res.json({succes: true, data: devices});
});

app.post('/api/devices/toggle', (req, res) => {
    const { deviceId, state} = req.body;
    if (device[deviceId]){
        devices[deviceId].active = state;

    if (!state) devices[deviceId].power = 0;

    return res.json({
        succes: true,
        message: 'dispositivo ${deviceId} actualizado',
        device: devices[deviceId]
    });
    }

res.status(404).json({ success: false, error: "Dispositivo no encontrado" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});