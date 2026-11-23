// =====================================================================
// SUNLYTICS PRO OS v2.4 - CONEXIÓN INTERACTIVA VOLTRONIC VM II 10kW
// =====================================================================

const SIM_CONFIG = {
    intervalMs: 2500,
    maxInverterKw: 10.0,
    tariffClp: 145,
    co2Factor: 0.41,
    baseHouseLoadKw: 0.45
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
    devices: {
        ev:     { active: true,  watts: 3200, activeLabel: 'Cargando' },
        pool:   { active: false, watts: 1100, activeLabel: 'Encendido' },
        heater: { active: true,  watts: 1800, activeLabel: 'Encendido' },
        ac:     { active: true,  watts: 900,  activeLabel: 'Encendido' }
    }
};

function jitter(base, delta, min = -Infinity, max = Infinity) {
    const val = base + (Math.random() * 2 - 1) * delta;
    return Math.min(max, Math.max(min, val));
}

function getCurrentTimestamp() {
    return new Date().toTimeString().split(' ')[0];
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
// 2. MODAL DE DETECCIÓN Y CONEXIÓN MANUAL CON EL INVERSOR
// =====================================================================
function openConnectionModal() {
    const modal = document.getElementById('inverter-connect-modal');
    if (!modal) return;
    modal.classList.remove('hidden');

    if (voltronicState.connected) {
        // Si ya está conectado, mostrar tarjeta activa con opción de desconectar
        showModalDeviceState(true);
    } else {
        // Si está desconectado, simular búsqueda del inversor y mostrar botón Conectar
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
    }, 850);
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

function connectSelectedInverter() {
    const btn = document.getElementById('btn-modal-connect');
    const logEl = document.getElementById('modal-handshake-log');

    if (btn) {
        btn.disabled = true;
        btn.innerHTML = `<i class="ph-bold ph-spinner-gap text-base animate-spin"></i><span>Enlazando (Handshake PI30)...</span>`;
    }
    if (logEl) {
        logEl.className = 'text-[11px] font-mono text-amber-400 text-center min-h-[16px]';
        logEl.textContent = 'Enviando comando QPI / QPIRI a /dev/ttyUSB0...';
    }

    setTimeout(() => {
        voltronicState.connected = true;
        updateGlobalConnectionUI(true);
        showModalDeviceState(true);

        if (logEl) {
            logEl.className = 'text-[11px] font-mono text-emerald-400 text-center min-h-[16px]';
            logEl.textContent = '¡Conectado! Recibiendo telemetría en vivo...';
        }

        appendSystemEvent('Conexión establecida con Voltronic Axpert VM II 10kW (PI30 OK).', 'emerald');

        // Primera lectura inmediata y arranque de intervalo
        runSimulationTick();
        if (voltronicState.timerId) clearInterval(voltronicState.timerId);
        voltronicState.timerId = setInterval(runSimulationTick, SIM_CONFIG.intervalMs);

        // Cerrar modal automáticamente tras confirmar conexión
        setTimeout(() => {
            closeConnectionModal();
        }, 650);
    }, 800);
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

    // Líneas del diagrama SVG
    const lineSolar = document.getElementById('svg-line-solar');
    const lineHome = document.getElementById('svg-line-home');
    const lineBatt = document.getElementById('svg-line-batt');

    if (isOnline) {
        if (pill) {
            pill.className = 'flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:opacity-90 cursor-pointer';
            pill.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span><span id="node-status-text" class="hidden xl:inline text-[11px]">VM II LIVE</span>`;
        }
        if (headerBadge) {
            headerBadge.className = 'text-xs font-mono font-normal bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded border border-emerald-500/30';
            headerBadge.textContent = 'MODO SBU ACTIVO';
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
            configResult.textContent = '● Voltronic VM II 10kW Conectado (PI30 OK)';
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
// 3. MOTOR DE TELEMETRÍA VOLTRONIC VM II 10KW
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

    let domoticsKw = 0;
    Object.values(voltronicState.devices).forEach(dev => {
        if (dev.active) domoticsKw += (dev.watts / 1000) * 0.28;
    });
    const acLoadKw = jitter(SIM_CONFIG.baseHouseLoadKw + domoticsKw, 0.08, 0.4, 9.5);
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

// =====================================================================
// 4. ACCIONES DE USUARIO
// =====================================================================
function toggleDevice(device, watts) {
    const checkbox = document.getElementById('toggle-' + device);
    const powerLabel = document.getElementById('power-' + device);
    const isChecked = checkbox ? checkbox.checked : false;

    if (voltronicState.devices[device]) {
        voltronicState.devices[device].active = isChecked;
        voltronicState.devices[device].watts = watts;
    }

    if (powerLabel) {
        if (isChecked) {
            const prefix = voltronicState.devices[device]?.activeLabel || 'Encendido';
            powerLabel.textContent = `${prefix} @ ${(watts / 1000).toFixed(1)} kW`;
            powerLabel.classList.remove('text-slate-400');
            powerLabel.classList.add('text-amber-400');
        } else {
            powerLabel.textContent = 'Apagado (0 W)';
            powerLabel.classList.remove('text-amber-400');
            powerLabel.classList.add('text-slate-400');
        }
    }

    appendSystemEvent(`Carga domótica [${device.toUpperCase()}] ${isChecked ? 'activada (' + watts + 'W)' : 'apagada'}.`, isChecked ? 'blue' : 'amber');
    if (voltronicState.connected) runSimulationTick();
}

function refreshGeneralData() {
    if (!voltronicState.connected) {
        openConnectionModal();
        return;
    }
    runSimulationTick();
    appendSystemEvent('Consulta manual QPIGS ejecutada sobre Voltronic VM II 10kW.', 'emerald');
}

function refreshInverters() {
    if (!voltronicState.connected) {
        openConnectionModal();
        return;
    }
    runSimulationTick();
    appendSystemEvent('Respuesta PI30 recibida desde Voltronic VM II 10kW.', 'emerald');
}

// Al cargar la página, abrir el asistente para detectar el inversor y permitir darle a "Conectar"
document.addEventListener('DOMContentLoaded', () => {
    openConnectionModal();
});