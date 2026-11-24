DROP TABLE IF EXISTS telemetry_logs;
DROP TABLE IF EXISTS domotic_devices;
DROP TABLE IF EXISTS plant_settings;

CREATE TABLE plant_settings (
    id SERIAL PRIMARY KEY,
    plant_name VARCHAR(100) NOT NULL,
    installed_power_kwp DECIMAL(5,2) NOT NULL CHECK (installed_power_kwp > 0),
    energy_rate_clp INTEGER NOT NULL CHECK (energy_rate_clp > 0),
    injection_rate_clp INTEGER NOT NULL DEFAULT 0 CHECK (injection_rate_clp >= 0),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE domotic_devices (
    id SERIAL PRIMARY KEY,
    device_code VARCHAR(30) UNIQUE NOT NULL,
    plant_id INTEGER NOT NULL REFERENCES plant_settings(id) ON DELETE CASCADE,
    device_name VARCHAR(80) NOT NULL,
    active BOOLEAN NOT NULL DEFAULT FALSE,
    power_watts INTEGER NOT NULL DEFAULT 0 CHECK (power_watts >= 0),
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE telemetry_logs (
    id SERIAL PRIMARY KEY,
    plant_id INTEGER NOT NULL REFERENCES plant_settings(id) ON DELETE CASCADE,
    solar_pv_w DECIMAL(8,2) NOT NULL CHECK (solar_pv_w >= 0),
    load_power_w DECIMAL(8,2) NOT NULL CHECK (load_power_w >= 0),
    grid_power_w DECIMAL(8,2) NOT NULL DEFAULT 0,
    battery_soc INTEGER NOT NULL CHECK (battery_soc BETWEEN 0 AND 100),
    inverter_status VARCHAR(30) NOT NULL DEFAULT 'hybrid mode',
    recorded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Carga inicial de datos (Seed Data)
INSERT INTO plant_settings (plant_name, installed_power_kwp, energy_rate_clp, injection_rate_clp)
VALUES ('Planta Sol de Lampa', 8.50, 145, 72);

INSERT INTO domotic_devices (device_code, plant_id, device_name, active, power_watts)
VALUES 
    ('ev', 1, 'Cargador EV (Wallbox)', TRUE, 3200),
    ('pool', 1, 'Bomba de Piscina', FALSE, 0),
    ('heater', 1, 'Termoeléctrico 200L', TRUE, 1800),
    ('ac', 1, 'Climatización Inverter', TRUE, 900);

INSERT INTO telemetry_logs (plant_id, solar_pv_w, load_power_w, grid_power_w, battery_soc, inverter_status)
VALUES (1, 5420.00, 2100.00, 3320.00, 88, 'hybrid mode');