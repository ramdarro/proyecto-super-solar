// =====================================================================
// SUNLYTICS PRO OS v2.4 - CONEXIÓN INTERACTIVA + PERSISTENCIA POSTGRESQL
// =====================================================================

const SIM_CONFIG = {
    intervalMs: 2500,
    maxInverterKw: 10.0,
    tariffClp: 145,
    co2Factor: 0.41,
    baseHouseLoadKw: 0.45
};

// Potencias nominales de referencia cuando un equipo está apagado (0 W en BD)
const nominalPowers = {
    ev: 3200,
    pool: 1100,
    heater: 1800,
    ac: 900
};

const voltronicState = {
    connected: false,
    timerId: null,
    batterySoc: 88.0,
    batteryVoltage: 53.4,
    busVoltage: 388,
    dailyEnergyKwh: 26.55,
    inverter: {
        temp: 42.5,
        efficiency: 98.2,
        acOutV: 220.4,
        acOutHz: 50.00,
        gridInV: 221.8,
        pf: 0.99,
        pv1: { v: 368.5, a: 8.41 },
        pv2: { v: 342.0, a: 7.11 }
    },
    devices: {}
};

function getApiBase() {
    const input = document.getElementById('node-url');
    let url = input ? input.value.trim() : 'http://localhost:3000/api';
    url = url.replace(/\/+$/, '');
    if (url.endsWith('/v1')) url = url.slice(0, -3);
    return url || 'http://localhost:3000/api';
}

function jitter(base, delta, min = -Infinity, max = Infinity) {
    const val = base + (Math.random() * 2 - 1) * delta;
    return Math.min(max, Math.max(min, val));
}

function getCurrentTimestamp() {
    return new Date().toTimeString().split(' ')[0];
}

// =====================================================================
// NOTIFICACIONES VISUALES (TOASTS DE ÉXITO Y ERROR)
// =====================================================================
function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const styles = {
        success: 'bg-emerald-950/95 border-emerald-500/50 text-emerald-200',
        error: 'bg-rose-950/95 border-rose-500/50 text-rose-200',
        info: 'bg-slate-900/95 border-amber-500/50 text-amber-200'
    };

    const icons = {
        success: 'ph-check-circle text-emerald-400',
        error: 'ph-warning-circle text-rose-400',
        info: 'ph-info text-amber-400'
    };

    const toast = document.createElement('div');
    toast.className = `pointer-events-auto flex items-center gap-2.5 px-4 py-3 rounded-xl border shadow-xl text-xs font-medium backdrop-blur-md transition-all duration-300 ${styles[type] || styles.info}`;
    toast.innerHTML = `
        <i class="ph-bold ${icons[type] || icons.info} text-base shrink-0"></i>
        <span>${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(8px)';
        setTimeout(() => toast.remove(), 300);
    }, 3500);
}

// =====================================================================
// 1. NAVEGACIÓN ENTRE PESTAÑAS
// =====================================================================
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

    const activeTab = document.getElementById('tab-' + tabId);
    const activeBtn = document.getElementById('btn-' + tabId);
    if (activeTab) activeTab.classList.add('active');
    if (activeBtn) activeBtn.classList.add('active');
}

// =====================================================================
// 2. CARGA INICIAL DE DATOS DESDE POSTGRESQL (READ)
// =====================================================================
async function loadInitialDataFromDB() {
    const apiBase = getApiBase();

    try {
        // 1. Cargar configuración de planta y tarifas (plant_settings)
        const settingsRes = await fetch(`${apiBase}/settings`);
        if (settingsRes.ok) {
            const settingsData = await settingsRes.json();
            if (settingsData.success && settingsData.plantSettings) {
                const ps = settingsData.plantSettings;
                SIM_CONFIG.tariffClp = Number(ps.energy_rate_clp) || 145;

                const nameInput = document.getElementById('config-plant-name');
                const kwpInput = document.getElementById('config-plant-kwp');
                const rateInput = document.getElementById('config-energy-rate');
                const sidePlant = document.getElementById('sidebar-plant-name');
                const tariffLabel = document.getElementById('kpi-tariff-label');

                if (nameInput) nameInput.value = ps.plant_name;
                if (kwpInput) kwpInput.value = `${ps.installed_power_kwp} kWp`;
                if (rateInput) rateInput.value = ps.energy_rate_clp;
                if (sidePlant) sidePlant.textContent = ps.plant_name.replace('Planta ', '');
                if (tariffLabel) tariffLabel.textContent = `Tarifa $${ps.energy_rate_clp}/kWh`;
            }
        }

        // 2. Cargar dispositivos domóticos desde PostgreSQL (domotic_devices)
        const dashRes = await fetch(`${apiBase}/dashboard`);
        if (!dashRes.ok) throw new Error('Error consultando /api/dashboard');

        const dashData = await dashRes.json();
        if (dashData.success && dashData.devices) {
            voltronicState.devices = dashData.devices;

            // Guardar potencia nominal conocida de cada equipo activo
            Object.values(voltronicState.devices).forEach(dev => {
                if (dev.power > 0) {
                    nominalPowers[dev.code] = dev.power;
                } else if (!nominalPowers[dev.code]) {
                    nominalPowers[dev.code] = 1000;
                }
            });

            renderDevicesGrid();
            if (dashData.solarState) {
                const surplusKw = (dashData.solarState.gridPower / 1000).toFixed(2);
                const domSurplus = document.getElementById('dom-surplus');
                if (domSurplus) domSurplus.textContent = `${surplusKw} kW`;
            }
        }
    } catch (err) {
        console.error('Error cargando datos iniciales desde BD:', err);
        showToast('No se pudo conectar con http://localhost:3000. Verifica que node src/app.js esté corriendo.', 'error');
    }
}

// =====================================================================
// 3. RENDERIZADO DINÁMICO Y CRUD DE DISPOSITIVOS DOMÓTICOS
// =====================================================================
function getDeviceVisualStyle(code, index) {
    const presets = {
        ev:     { icon: 'ph-car-profile',   color: 'purple', badge: 'PRIORIDAD 1', subtitle: 'Carga Inteligente 32A' },
        pool:   { icon: 'ph-waves',         color: 'blue',   badge: 'PRIORIDAD 2', subtitle: 'Filtrado Solar Programado' },
        heater: { icon: 'ph-thermometer-hot', color: 'amber', badge: 'PRIORIDAD 3', subtitle: 'Acumulador de Calor' },
        ac:     { icon: 'ph-snowflake',     color: 'teal',   badge: 'PRIORIDAD 4', subtitle: 'Climatización Inverter' }
    };

    if (presets[code]) return presets[code];
    return {
        icon: 'ph-plugs',
        color: 'emerald',
        badge: `PRIORIDAD ${index + 1}`,
        subtitle: 'Carga Gestionada por BD'
    };
}

function renderDevicesGrid() {
    const grid = document.getElementById('domotica-devices-grid');
    const sideCount = document.getElementById('sidebar-dom-count');
    if (!grid) return;

    const deviceList = Object.values(voltronicState.devices);
    const activeCount = deviceList.filter(d => d.active).length;

    if (sideCount) {
        sideCount.textContent = `${activeCount} ACT`;
    }

    if (deviceList.length === 0) {
        grid.innerHTML = `
            <div class="glass-panel p-6 text-xs text-slate-400 col-span-full text-center">
                No hay dispositivos registrados en PostgreSQL. Haz clic en <strong>"Agregar Dispositivo"</strong>.
            </div>
        `;
        return;
    }

    grid.innerHTML = deviceList.map((dev, idx) => {
        const style = getDeviceVisualStyle(dev.code, idx);
        const displayWatts = dev.active ? dev.power : (nominalPowers[dev.code] || 1000);
        const powerText = dev.active
            ? `Encendido @ ${(dev.power / 1000).toFixed(2)} kW`
            : `Apagado (Nominal: ${displayWatts} W)`;
        const powerClass = dev.active ? 'text-amber-400' : 'text-slate-400';

        return `
            <div class="glass-panel p-5 flex flex-col justify-between space-y-4">
                <div class="flex justify-between items-start">
                    <div class="p-3 rounded-xl bg-${style.color}-500/20 text-${style.color}-300 border border-${style.color}-500/30">
                        <i class="ph-fill ${style.icon} text-2xl"></i>
                    </div>
                    <div class="flex items-center gap-1.5">
                        <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-${style.color}-500/20 text-${style.color}-300">${style.badge}</span>
                        <button onclick="openEditDeviceModal('${dev.code}')" class="p-1.5 rounded-lg bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white transition-colors" title="Editar dispositivo">
                            <i class="ph-bold ph-pencil-simple text-xs"></i>
                        </button>
                        <button onclick="deleteDeviceFromDB('${dev.code}')" class="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/25 text-rose-300 transition-colors" title="Eliminar dispositivo">
                            <i class="ph-bold ph-trash text-xs"></i>
                        </button>
                    </div>
                </div>
                <div>
                    <h3 class="font-bold text-base text-white">${dev.name}</h3>
                    <p class="text-xs text-slate-400 font-mono">Código: ${dev.code}</p>
                    <div class="mt-2 text-sm font-mono font-bold ${powerClass}" id="power-${dev.code}">${powerText}</div>
                </div>
                <div class="flex items-center justify-between pt-2 border-t border-white/10">
                    <span class="text-xs text-slate-300 font-medium">Estado en BD</span>
                    <div class="relative">
                        <input type="checkbox" id="toggle-${dev.code}" class="hidden toggle-checkbox" ${dev.active ? 'checked' : ''} onchange="toggleDevice('${dev.code}')">
                        <label for="toggle-${dev.code}" class="toggle-label block"></label>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// UPDATE (Toggle): Encender/Apagar y guardar en PostgreSQL
async function toggleDevice(code) {
    const checkbox = document.getElementById('toggle-' + code);
    if (!checkbox) return;

    const newState = checkbox.checked;
    const wattsToUse = nominalPowers[code] || 1000;
    checkbox.disabled = true;

    try {
        const res = await fetch(`${getApiBase()}/devices/toggle`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                deviceId: code,
                state: newState,
                powerWatts: wattsToUse
            })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Error actualizando dispositivo en BD');
        }

        if (voltronicState.devices[code]) {
            voltronicState.devices[code].active = data.device.active;
            voltronicState.devices[code].power = data.device.power;
        }

        renderDevicesGrid();
        appendSystemEvent(`BD actualizada: [${code.toUpperCase()}] ${newState ? 'ENCENDIDO (' + wattsToUse + 'W)' : 'APAGADO'}.`, newState ? 'blue' : 'amber');
        showToast(`${data.device.name} ${newState ? 'encendido' : 'apagado'} y guardado en PostgreSQL`, 'success');

        if (voltronicState.connected) {
            runSimulationTick();
        } else if (data.solarState) {
            const domSurplus = document.getElementById('dom-surplus');
            if (domSurplus) domSurplus.textContent = `${(data.solarState.gridPower / 1000).toFixed(2)} kW`;
        }
    } catch (err) {
        // Revertir visualmente si falló la escritura en PostgreSQL
        checkbox.checked = !newState;
        showToast(err.message, 'error');
    } finally {
        checkbox.disabled = false;
    }
}

// Modal CREATE / UPDATE
function openCreateDeviceModal() {
    const modal = document.getElementById('device-form-modal');
    if (!modal) return;

    document.getElementById('device-modal-title').textContent = 'Nuevo Dispositivo Domótico';
    document.getElementById('device-form-mode').value = 'create';
    document.getElementById('device-form-edit-id').value = '';
    document.getElementById('device-code-group').classList.remove('hidden');

    const codeInput = document.getElementById('device-form-code');
    codeInput.value = '';
    codeInput.required = true;
    document.getElementById('device-form-name').value = '';
    document.getElementById('device-form-power').value = '';

    modal.classList.remove('hidden');
}

function openEditDeviceModal(code) {
    const dev = voltronicState.devices[code];
    const modal = document.getElementById('device-form-modal');
    if (!dev || !modal) return;

    document.getElementById('device-modal-title').textContent = `Editar: ${dev.name}`;
    document.getElementById('device-form-mode').value = 'edit';
    document.getElementById('device-form-edit-id').value = dev.code;
    document.getElementById('device-code-group').classList.add('hidden');

    const codeInput = document.getElementById('device-form-code');
    codeInput.required = false;
    document.getElementById('device-form-name').value = dev.name;
    document.getElementById('device-form-power').value = dev.active ? dev.power : (nominalPowers[code] || 1000);

    modal.classList.remove('hidden');
}

function closeDeviceModal() {
    const modal = document.getElementById('device-form-modal');
    if (modal) modal.classList.add('hidden');
}

async function submitDeviceForm(event) {
    event.preventDefault();

    const mode = document.getElementById('device-form-mode').value;
    const editId = document.getElementById('device-form-edit-id').value;
    const code = document.getElementById('device-form-code').value.trim().toLowerCase();
    const name = document.getElementById('device-form-name').value.trim();
    const powerWatts = Number(document.getElementById('device-form-power').value);
    const submitBtn = document.getElementById('btn-save-device');

    submitBtn.disabled = true;
    submitBtn.textContent = 'Guardando...';

    try {
        let res;
        if (mode === 'create') {
            res = await fetch(`${getApiBase()}/devices`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ deviceCode: code, name, powerWatts })
            });
        } else {
            res = await fetch(`${getApiBase()}/devices/${encodeURIComponent(editId)}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, powerWatts })
            });
        }

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Error guardando dispositivo en PostgreSQL');
        }

        const targetCode = mode === 'create' ? code : editId;
        nominalPowers[targetCode] = powerWatts;

        closeDeviceModal();
        await loadInitialDataFromDB();
        if (voltronicState.connected) runSimulationTick();

        showToast(mode === 'create' ? 'Dispositivo creado en PostgreSQL' : 'Dispositivo actualizado en PostgreSQL', 'success');
        appendSystemEvent(`Dispositivo [${targetCode.toUpperCase()}] ${mode === 'create' ? 'registrado' : 'modificado'} en BD.`, 'emerald');
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Guardar en BD';
    }
}

// DELETE: Eliminar dispositivo de PostgreSQL
async function deleteDeviceFromDB(code) {
    const dev = voltronicState.devices[code];
    if (!dev) return;

    const confirmed = window.confirm(`¿Seguro que deseas eliminar "${dev.name}" de la base de datos PostgreSQL?`);
    if (!confirmed) return;

    try {
        const res = await fetch(`${getApiBase()}/devices/${encodeURIComponent(code)}`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'No se pudo eliminar el dispositivo');
        }

        delete nominalPowers[code];
        await loadInitialDataFromDB();
        if (voltronicState.connected) runSimulationTick();

        showToast(`Dispositivo "${dev.name}" eliminado de PostgreSQL`, 'success');
        appendSystemEvent(`Dispositivo [${code.toUpperCase()}] eliminado de la base de datos.`, 'amber');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// =====================================================================
// 4. GUARDAR CONFIGURACIÓN DE TARIFA EN POSTGRESQL (UPDATE)
// =====================================================================
async function savePlantSettings() {
    const rateInput = document.getElementById('config-energy-rate');
    const statusSpan = document.getElementById('settings-save-status');
    const btn = document.getElementById('btn-save-settings');

    const rate = Number(rateInput ? rateInput.value : 0);
    if (!rate || rate <= 0) {
        showToast('Ingresa una tarifa eléctrica válida mayor a 0', 'error');
        return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const res = await fetch(`${getApiBase()}/settings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ energyRateCLP: rate })
        });

        const data = await res.json();
        if (!res.ok || !data.success) {
            throw new Error(data.error || 'Error guardando tarifa en PostgreSQL');
        }

        SIM_CONFIG.tariffClp = Number(data.plantSettings.energy_rate_clp);
        const tariffLabel = document.getElementById('kpi-tariff-label');
        if (tariffLabel) tariffLabel.textContent = `Tarifa $${SIM_CONFIG.tariffClp}/kWh`;

        if (statusSpan) {
            statusSpan.className = 'text-xs font-mono text-emerald-400';
            statusSpan.textContent = `✔ Guardado ($${SIM_CONFIG.tariffClp}/kWh)`;
        }

        if (voltronicState.connected) runSimulationTick();
        showToast(`Tarifa actualizada a $${SIM_CONFIG.tariffClp} CLP/kWh en PostgreSQL`, 'success');
        appendSystemEvent(`Tarifa eléctrica actualizada a $${SIM_CONFIG.tariffClp}/kWh en BD.`, 'emerald');
    } catch (err) {
        if (statusSpan) {
            statusSpan.className = 'text-xs font-mono text-rose-400';
            statusSpan.textContent = `✖ Error al guardar`;
        }
        showToast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Tarifa en BD';
    }
}

// =====================================================================
// 5. MODAL DE DETECCIÓN Y CONEXIÓN CON EL INVERSOR Y BACKEND
// =====================================================================
function openConnectionModal() {
    const modal = document.getElementById('inverter-connect-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (voltronicState.connected) {
        showModalDeviceState(true);
    } else {
        startDeviceDiscovery();
    }
}

function closeConnectionModal() {
    const modal = document.getElementById('inverter-connect-modal');
    if (modal) modal.classList.add('hidden');
}

function startDeviceDiscovery() {
    const scanningEl = document.getElementById('modal-scanning-state');
    const foundEl = document.getElementById('modal-device-found');
    const logEl = document.getElementById('modal-handshake-log');

    if (scanningEl) scanningEl.classList.remove('hidden');
    if (foundEl) foundEl.classList.add('hidden');

    setTimeout(() => {
        if (scanningEl) scanningEl.classList.add('hidden');
        if (foundEl) foundEl.classList.remove('hidden');
        if (logEl) {
            logEl.className = 'text-[11px] font-mono text-slate-400 text-center min-h-[16px]';
            logEl.textContent = 'Dispositivo Voltronic listo. Haz clic en "Conectar Inversor".';
        }
        showModalDeviceState(voltronicState.connected);
    }, 650);
}

function showModalDeviceState(isConnected) {
    const badge = document.getElementById('modal-device-badge');
    const actionArea = document.getElementById('modal-action-area');
    if (!badge || !actionArea) return;

    if (isConnected) {
        badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
        badge.textContent = 'CONECTADO';
        actionArea.innerHTML = `
            <button onclick="disconnectInverter()" class="w-full py-2.5 px-4 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 font-bold text-xs flex items-center justify-center gap-2 transition-all">
                <i class="ph-bold ph-plug-charging text-base"></i>
                <span>Desconectar Inversor</span>
            </button>
        `;
    } else {
        badge.className = 'text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30';
        badge.textContent = 'DETECTADO';
        actionArea.innerHTML = `
            <button id="btn-modal-connect" onclick="connectSelectedInverter()" class="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 hover:opacity-95 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all">
                <i class="ph-bold ph-plug text-base"></i>
                <span>Conectar Inversor</span>
            </button>
        `;
    }
}

async function connectSelectedInverter() {
    const btn = document.getElementById('btn-modal-connect');
    const logEl = document.getElementById('modal-handshake-log');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ph-bold ph-spinner-gap text-base animate-spin"></i><span>Verificando Backend y PostgreSQL...</span>`;
    }
    if (logEl) {
        logEl.className = 'text-[11px] font-mono text-amber-400 text-center min-h-[16px]';
        logEl.textContent = 'Consultando estado de Node.js + PostgreSQL...';
    }

    try {
        const healthRes = await fetch(`${getApiBase()}/v1/health`);
        const healthData = await healthRes.json();
        if (!healthRes.ok || !healthData.success) {
            throw new Error(healthData.error || 'El backend no responde');
        }

        await loadInitialDataFromDB();

        voltronicState.connected = true;
        updateGlobalConnectionUI(true);
        showModalDeviceState(true);

        if (logEl) {
            logEl.className = 'text-[11px] font-mono text-emerald-400 text-center min-h-[16px]';
            logEl.textContent = '¡Conectado a PostgreSQL e Inversor PI30!';
        }

        appendSystemEvent('Conexión establecida con Backend PostgreSQL e Inversor Voltronic VM II 10kW.', 'emerald');
        showToast('Conectado a PostgreSQL e Inversor', 'success');

        runSimulationTick();
        if (voltronicState.timerId) clearInterval(voltronicState.timerId);
        voltronicState.timerId = setInterval(runSimulationTick, SIM_CONFIG.intervalMs);

        setTimeout(() => {
            closeConnectionModal();
        }, 550);
    } catch (err) {
        if (btn) {
            btn.disabled = false;
            btn.innerHTML = `<i class="ph-bold ph-plug text-base"></i><span>Reintentar Conexión</span>`;
        }
        if (logEl) {
            logEl.className = 'text-[11px] font-mono text-rose-400 text-center min-h-[16px]';
            logEl.textContent = `Error: ${err.message}`;
        }
        showToast('Error conectando con el servidor: ' + err.message, 'error');
    }
}

function disconnectInverter() {
    voltronicState.connected = false;
    if (voltronicState.timerId) {
        clearInterval(voltronicState.timerId);
        voltronicState.timerId = null;
    }

    updateGlobalConnectionUI(false);
    resetDashboardToOffline();
    showModalDeviceState(false);

    const logEl = document.getElementById('modal-handshake-log');
    if (logEl) {
        logEl.className = 'text-[11px] font-mono text-rose-400 text-center min-h-[16px]';
        logEl.textContent = 'Enlace cerrado manualmente por el usuario.';
    }

    appendSystemEvent('Inversor Voltronic VM II 10kW desconectado.', 'amber');
}

function updateGlobalConnectionUI(isOnline) {
    const pill = document.getElementById('node-status-badge');
    const headerBadge = document.getElementById('header-mode-badge');
    const headerBtn = document.getElementById('btn-header-connect');
    const banner = document.getElementById('disconnected-banner');
    const invCount = document.getElementById('sidebar-inv-count');
    const invCardStatus = document.getElementById('inv-card-status');
    const configResult = document.getElementById('node-test-result');

    const lineSolar = document.getElementById('svg-line-solar');
    const lineHome = document.getElementById('svg-line-home');
    const lineBatt = document.getElementById('svg-line-batt');

    if (isOnline) {
        if (pill) {
            pill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:opacity-90 cursor-pointer';
            pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span id="node-status-text" class="hidden xl:inline text-[11px]">DB + LIVE</span>`;
        }
        if (headerBadge) {
            headerBadge.className = 'text-xs font-mono font-normal bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30';
            headerBadge.textContent = 'POSTGRESQL + SBU ACTIVO';
        }
        if (headerBtn) {
            headerBtn.className = 'px-3.5 py-2 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 hover:bg-emerald-500/30 transition-all';
            headerBtn.innerHTML = `<i class="ph-bold ph-plugs-connected"></i><span>Conectado</span>`;
        }
        if (banner) banner.classList.add('hidden');
        if (invCount) {
            invCount.className = 'bg-purple-500/20 text-purple-300 text-[10px] px-1.5 py-0.5 rounded font-mono';
            invCount.textContent = '1 / 1';
        }
        if (invCardStatus) {
            invCardStatus.className = 'bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30';
            invCardStatus.textContent = 'ONLINE • MODO B (SOLAR/BAT)';
        }
        if (configResult) {
            configResult.className = 'text-xs font-mono text-emerald-400';
            configResult.textContent = '● PostgreSQL y Voltronic VM II 10kW Conectados';
        }

        if (lineSolar) { lineSolar.setAttribute('stroke', '#f59e0b'); lineSolar.classList.add('flow-line'); }
        if (lineHome)  { lineHome.setAttribute('stroke', '#a855f7');  lineHome.classList.add('flow-line'); }
        if (lineBatt)  { lineBatt.setAttribute('stroke', '#10b981');  lineBatt.classList.add('flow-line'); }
    } else {
        if (pill) {
            pill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:opacity-90 cursor-pointer';
            pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-rose-400"></span><span id="node-status-text" class="hidden xl:inline text-[11px]">OFFLINE</span>`;
        }
        if (headerBadge) {
            headerBadge.className = 'text-xs font-mono font-normal bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded border border-rose-500/30';
            headerBadge.textContent = 'SIN CONEXIÓN';
        }
        if (headerBtn) {
            headerBtn.className = 'px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-purple-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 hover:opacity-90 transition-all';
            headerBtn.innerHTML = `<i class="ph-bold ph-plug"></i><span>Conectar Inversor</span>`;
        }
        if (banner) banner.classList.remove('hidden');
        if (invCount) {
            invCount.className = 'bg-slate-700/60 text-slate-300 text-[10px] px-1.5 py-0.5 rounded font-mono';
            invCount.textContent = '0 / 1';
        }
        if (invCardStatus) {
            invCardStatus.className = 'bg-rose-500/20 text-rose-300 text-[10px] font-mono font-bold px-2 py-0.5 rounded border border-rose-500/30';
            invCardStatus.textContent = 'DESCONECTADO';
        }
        if (configResult) {
            configResult.className = 'text-xs font-mono text-slate-400';
            configResult.textContent = '● Desconectado';
        }

        if (lineSolar) { lineSolar.setAttribute('stroke', '#475569'); lineSolar.classList.remove('flow-line'); }
        if (lineHome)  { lineHome.setAttribute('stroke', '#475569');  lineHome.classList.remove('flow-line'); }
        if (lineBatt)  { lineBatt.setAttribute('stroke', '#475569');  lineBatt.classList.remove('flow-line'); }
    }
}

function resetDashboardToOffline() {
    const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setHtml('kpi-gen', `-- <span class="text-xs font-normal text-slate-400">kW</span>`);
    setText('kpi-gen-sub', 'Esperando enlace');
    setHtml('kpi-cons', `-- <span class="text-xs font-normal text-slate-400">kW</span>`);
    setText('kpi-load-pct', '0% carga inversor');
    setHtml('kpi-exp', `-- <span class="text-xs font-normal text-slate-400">kW</span>`);
    setHtml('kpi-bat', `-- <span class="text-xs font-normal text-slate-400">%</span>`);
    setHtml('kpi-co2', `-- <span class="text-xs font-normal text-slate-400">kg</span>`);
    setHtml('kpi-clp', `$-- <span class="text-xs font-normal text-slate-400">CLP</span>`);

    const batBar = document.getElementById('kpi-bat-bar');
    if (batBar) batBar.style.width = '0%';
    const sideBar = document.getElementById('sidebar-load-bar');
    if (sideBar) sideBar.style.width = '0%';

    setText('flow-gen', '0.00 kW');
    setText('flow-cons', '0.00 kW');
    setText('flow-exp', '0.00 kW');
    setText('dom-surplus', '0.00 kW');

    setText('inv-out-kw', '-- kW');
    setText('inv-load-pct', 'Carga: 0%');
    setText('inv-batt-v', '-- V');
    setText('inv-batt-curr', 'Sin lectura');
    setText('inv-bus-v', '-- V');
    setText('inv-temp', '-- °C');
    setText('inv-pv-total', 'Total FV: 0.00 kW');
    setText('pv1-kw', '-- kW');
    setText('pv1-v', '-- V');
    setText('pv1-a', '-- A');
    setText('pv2-kw', '-- kW');
    setText('pv2-v', '-- V');
    setText('pv2-a', '-- A');
    setText('inv-ac-v', '-- V');
    setText('inv-ac-hz', '-- Hz');
    setText('inv-grid-v', '-- V');
    setText('inv-ac-pf', '--');
}

// =====================================================================
// 6. MOTOR DE TELEMETRÍA VOLTRONIC VM II 10KW
// =====================================================================
function runSimulationTick() {
    if (!voltronicState.connected) return;

    const inv = voltronicState.inverter;

    inv.pv1.v = jitter(368.5, 3.5, 340, 415);
    inv.pv1.a = jitter(8.41, 0.35, 5.0, 11.5);
    const pv1Kw = (inv.pv1.v * inv.pv1.a) / 1000;

    inv.pv2.v = jitter(342.0, 3.0, 315, 395);
    inv.pv2.a = jitter(7.11, 0.30, 4.5, 10.5);
    const pv2Kw = (inv.pv2.v * inv.pv2.a) / 1000;

    const totalPvKw = pv1Kw + pv2Kw;
    const availableSolarAcKw = totalPvKw * (inv.efficiency / 100);

    let domoticsWatts = 0;
    Object.values(voltronicState.devices).forEach(dev => {
        if (dev.active) domoticsWatts += Number(dev.power) || 0;
    });
    const domoticsKw = domoticsWatts / 1000;
    const acLoadKw = jitter(SIM_CONFIG.baseHouseLoadKw + domoticsKw, 0.04, 0.2, 9.8);
    const loadPct = Math.min(100, Math.round((acLoadKw / SIM_CONFIG.maxInverterKw) * 100));

    const surplusKw = Math.max(0, availableSolarAcKw - acLoadKw);
    const battChargeAmps = ((availableSolarAcKw - acLoadKw) * 1000) / voltronicState.batteryVoltage;

    if (battChargeAmps > 0 && voltronicState.batterySoc < 100) {
        voltronicState.batterySoc = Math.min(100, voltronicState.batterySoc + 0.04);
        voltronicState.batteryVoltage = jitter(53.5, 0.15, 52.8, 54.4);
    } else if (battChargeAmps < 0 && voltronicState.batterySoc > 20) {
        voltronicState.batterySoc = Math.max(20, voltronicState.batterySoc - 0.04);
        voltronicState.batteryVoltage = jitter(51.8, 0.15, 49.5, 52.6);
    }

    inv.temp = jitter(inv.temp, 0.3, 36.0, 56.0);
    inv.acOutV = jitter(220.4, 0.6, 218.0, 223.0);
    inv.acOutHz = jitter(50.00, 0.02, 49.95, 50.05);
    inv.gridInV = jitter(221.8, 1.1, 216.0, 227.0);
    voltronicState.busVoltage = Math.round(jitter(388, 3, 375, 405));
    voltronicState.dailyEnergyKwh += (availableSolarAcKw * (SIM_CONFIG.intervalMs / 3600000));

    renderGeneralView({
        pvKw: totalPvKw,
        acLoadKw,
        loadPct,
        surplusKw,
        batPct: Math.round(voltronicState.batterySoc),
        dailyKwh: voltronicState.dailyEnergyKwh
    });

    renderVoltronicCard({
        inv,
        pv1Kw,
        pv2Kw,
        totalPvKw,
        acLoadKw,
        loadPct,
        battChargeAmps
    });

    appendVoltronicLog(inv, acLoadKw, pv1Kw);
}

function renderGeneralView({ pvKw, acLoadKw, loadPct, surplusKw, batPct, dailyKwh }) {
    const pvStr = pvKw.toFixed(2);
    const loadStr = acLoadKw.toFixed(2);
    const expStr = surplusKw.toFixed(2);

    const setHtml = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = html; };
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setHtml('kpi-gen', `${pvStr} <span class="text-xs font-normal text-slate-400">kW</span>`);
    setText('kpi-gen-sub', 'MPPT Óptimo');
    setHtml('kpi-cons', `${loadStr} <span class="text-xs font-normal text-slate-400">kW</span>`);
    setText('kpi-load-pct', `${loadPct}% carga inversor`);
    setHtml('kpi-exp', `${expStr} <span class="text-xs font-normal text-slate-400">kW</span>`);
    setHtml('kpi-bat', `${batPct} <span class="text-xs font-normal text-slate-400">%</span>`);

    const batBar = document.getElementById('kpi-bat-bar');
    if (batBar) batBar.style.width = `${batPct}%`;

    const sideBar = document.getElementById('sidebar-load-bar');
    if (sideBar) sideBar.style.width = `${Math.min(100, Math.round((pvKw / SIM_CONFIG.maxInverterKw) * 100))}%`;

    setHtml('kpi-co2', `${(dailyKwh * SIM_CONFIG.co2Factor).toFixed(1)} <span class="text-xs font-normal text-slate-400">kg</span>`);
    setHtml('kpi-clp', `$${Math.round(dailyKwh * SIM_CONFIG.tariffClp).toLocaleString('es-CL')} <span class="text-xs font-normal text-slate-400">CLP</span>`);

    setText('flow-gen', `${pvStr} kW`);
    setText('flow-cons', `${loadStr} kW`);
    setText('flow-exp', `${expStr} kW`);
    setText('dom-surplus', `${expStr} kW`);
}

function renderVoltronicCard({ inv, pv1Kw, pv2Kw, totalPvKw, acLoadKw, loadPct, battChargeAmps }) {
    const setText = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

    setText('inv-out-kw', `${acLoadKw.toFixed(2)} kW`);
    setText('inv-load-pct', `Carga: ${loadPct}%`);
    setText('inv-batt-v', `${voltronicState.batteryVoltage.toFixed(1)} V`);

    const battCurrEl = document.getElementById('inv-batt-curr');
    if (battCurrEl) {
        if (battChargeAmps >= 0) {
            battCurrEl.textContent = `Cargando: +${battChargeAmps.toFixed(1)} A`;
            battCurrEl.className = 'text-[10px] font-mono text-emerald-400 block mt-0.5';
        } else {
            battCurrEl.textContent = `Descargando: ${battChargeAmps.toFixed(1)} A`;
            battCurrEl.className = 'text-[10px] font-mono text-amber-400 block mt-0.5';
        }
    }

    setText('inv-bus-v', `${voltronicState.busVoltage} V`);
    setText('inv-temp', `${inv.temp.toFixed(1)} °C`);
    setText('inv-pv-total', `Total FV: ${totalPvKw.toFixed(2)} kW`);

    setText('pv1-kw', `${pv1Kw.toFixed(2)} kW`);
    setText('pv1-v', `${inv.pv1.v.toFixed(1)} V`);
    setText('pv1-a', `${inv.pv1.a.toFixed(2)} A`);

    setText('pv2-kw', `${pv2Kw.toFixed(2)} kW`);
    setText('pv2-v', `${inv.pv2.v.toFixed(1)} V`);
    setText('pv2-a', `${inv.pv2.a.toFixed(2)} A`);

    setText('inv-ac-v', `${inv.acOutV.toFixed(1)} V`);
    setText('inv-ac-hz', `${inv.acOutHz.toFixed(2)} Hz`);
    setText('inv-grid-v', `${inv.gridInV.toFixed(1)} V`);
    setText('inv-ac-pf', inv.pf.toFixed(2));
}

function appendVoltronicLog(inv, acLoadKw, pv1Kw) {
    const tbody = document.getElementById('voltronic-logs-body');
    if (!tbody) return;

    const wattsOut = Math.round(acLoadKw * 1000);
    const frames = [
        {
            cmd: 'QPIGS',
            desc: 'Parámetros Generales AC/DC',
            raw: `${inv.gridInV.toFixed(1)} ${inv.acOutHz.toFixed(1)} ${inv.acOutV.toFixed(1)} ${wattsOut} ${voltronicState.batteryVoltage.toFixed(2)} ${inv.pv1.v.toFixed(1)}`,
            crc: 'VALID'
        },
        {
            cmd: 'QMOD',
            desc: 'Modo de Operación Actual',
            raw: `(B — Battery / Solar SBU Priority`,
            crc: 'VALID'
        },
        {
            cmd: 'QPIGS2',
            desc: 'Telemetría String FV2 (HV)',
            raw: `PV2: ${inv.pv2.v.toFixed(1)}V / ${inv.pv2.a.toFixed(2)}A | PV1: ${pv1Kw.toFixed(2)}kW`,
            crc: 'VALID'
        }
    ];

    const f = frames[Math.floor(Math.random() * frames.length)];
    const row = document.createElement('tr');
    row.innerHTML = `
        <td class="py-2 text-slate-500">${getCurrentTimestamp()}</td>
        <td class="text-purple-300 font-semibold">${f.cmd}</td>
        <td>${f.desc}</td>
        <td>${f.raw}</td>
        <td class="text-emerald-400">${f.crc}</td>
    `;

    tbody.prepend(row);
    while (tbody.children.length > 6) {
        tbody.removeChild(tbody.lastChild);
    }
}

function appendSystemEvent(message, color = 'emerald') {
    const container = document.getElementById('system-events-list');
    if (!container) return;

    const dotColors = { emerald: 'bg-emerald-400', amber: 'bg-amber-400', blue: 'bg-blue-400' };
    const item = document.createElement('div');
    item.className = 'flex items-center justify-between p-2.5 rounded-lg bg-white/5 border border-white/5';
    item.innerHTML = `
        <div class="flex items-center gap-3">
            <span class="w-2 h-2 rounded-full ${dotColors[color] || 'bg-emerald-400'}"></span>
            <span class="text-slate-300">${message}</span>
        </div>
        <span class="font-mono text-slate-500">${getCurrentTimestamp()}</span>
    `;

    container.prepend(item);
    while (container.children.length > 4) {
        container.removeChild(container.lastChild);
    }
}

async function refreshGeneralData() {
    if (!voltronicState.connected) {
        openConnectionModal();
        return;
    }
    await loadInitialDataFromDB();
    runSimulationTick();
    appendSystemEvent('Datos sincronizados con PostgreSQL y Voltronic VM II 10kW.', 'emerald');
    showToast('Tablero actualizado desde PostgreSQL', 'info');
}

function refreshInverters() {
    if (!voltronicState.connected) {
        openConnectionModal();
        return;
    }
    runSimulationTick();
    appendSystemEvent('Respuesta PI30 recibida desde Voltronic VM II 10kW.', 'emerald');
}

// Al cargar la página: leer PostgreSQL inmediatamente y abrir asistente de conexión
document.addEventListener('DOMContentLoaded', async () => {
    await loadInitialDataFromDB();
    openConnectionModal();
});