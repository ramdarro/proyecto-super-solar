// ==================== LÓGICA DE IDIOMAs (ES, EN, PT, FR) ====================
const translations = {
    es: {
        nav_dashboard: "Dashboard", nav_charts: "Gráficos", nav_totals: "Totales", nav_power: "Flujo Energético", nav_domotica: "Domótica WiFi", nav_config: "Configuración",
        card_inv_status: "Estado del Inversor", card_inv_mode: "Modo Híbrido", card_pv_prod: "Producción Solar", card_grid_net: "Red Eléctrica", card_batt_status: "Carga",
        gauge_title: "Potencia en Tiempo Real", gauge_update: "Actualizado hace 2s", gauge_load: "Consumo Casa", gauge_solar: "Energía Solar", gauge_grid: "Energía de Red", gauge_batt: "Carga de Batería",
        chart_title: "Gráfico General (24 Horas)", chart_leg_load: "Consumo", chart_leg_solar: "Solar", chart_leg_grid: "Red",
        hist_title: "Análisis Histórico de Energía", hist_subtitle: "Comparativa de consumo y generación solar acumulada", filter_day: "Día", filter_week: "Semana", filter_month: "Mes",
        total_solar: "Generación Solar Total", total_solar_sub: "+12% este mes", total_home: "Consumo Total Casa", total_home_sub: "Acumulado anual", total_savings: "Ahorro Red Estimado", total_savings_sub: "82% Autoconsumo", total_co2: "Huella CO2 Evitada", total_co2_sub: "Eq. a ~52 árboles",
        flow_title: "Diagrama de Flujo Energético", flow_status: "Inversor Híbrido Activo", node_solar: "PLACA SOLAR", node_batt: "BATERÍA", node_inv: "INVERSOR", node_inv_sub: "Autoconsumo", node_grid: "RED ELÉCTRICA", node_home: "CONSUMO CASA",
        dom_title: "Control Domótico WiFi Solar", dom_subtitle: "Gestión inteligente de cargas acoplada a la generación excedente fotovoltaica", dom_networks: "4 Redes WiFi", dom_loads: "Cargas WiFi:",
        dev_pump: "Bomba de Piscina", dev_ac: "Aire Acondicionado", dev_ev: "Cargador Vehículo EV", dev_lights: "Luces Jardín Exterior", dev_auto: "Automatización:", dev_pump_auto: "Excedente > 1.5kW", dev_power: "Potencia Actual:", dev_target_temp: "Temperatura Objetivo:", dev_charge_mode: "Modo Carga:", dev_schedule: "Horario:",
        dev_add: "Vincular Dispositivo WiFi", dev_add_sub: "Añadir Tuya, Sonoff, Shelly o MQTT",
        config_title: "Ajustes de Sistema e Inversor", config_name: "Nombre de la Planta Solar", config_auto: "Corte por Excedente Automático", config_auto_sub: "Encender dispositivos WiFi automáticamente con exceso solar", config_save: "Guardar Cambios",
        modal_title: "Vincular Dispositivo WiFi", modal_name: "Nombre del Dispositivo", modal_protocol: "Protocolo / Marca", modal_ip: "Dirección IP o Tópico MQTT", modal_cancel: "Cancelar", modal_search: "Buscar"
    },
    en: {
        nav_dashboard: "Dashboard", nav_charts: "Charts", nav_totals: "Totals", nav_power: "Power Flow", nav_domotica: "Smart Home", nav_config: "Configuration",
        card_inv_status: "Inverter Status", card_inv_mode: "Hybrid Mode", card_pv_prod: "Solar PV Production", card_grid_net: "Grid Network", card_batt_status: "Charging",
        gauge_title: "Real-Time Power", gauge_update: "Updated 2s ago", gauge_load: "Load Power", gauge_solar: "Solar Power", gauge_grid: "Grid Power", gauge_batt: "Battery Charge",
        chart_title: "Overview Graph (24 Hours)", chart_leg_load: "Load", chart_leg_solar: "Solar", chart_leg_grid: "Grid",
        hist_title: "Historical Energy Analysis", hist_subtitle: "Comparison of consumption and accumulated solar generation", filter_day: "Day", filter_week: "Week", filter_month: "Month",
        total_solar: "Total Solar Generation", total_solar_sub: "+12% this month", total_home: "Total Home Consumption", total_home_sub: "Yearly accumulated", total_savings: "Estimated Grid Savings", total_savings_sub: "82% Self-consumption", total_co2: "Avoided CO2 Footprint", total_co2_sub: "Eq. to ~52 trees",
        flow_title: "Energy Flow Diagram", flow_status: "Hybrid Inverter Active", node_solar: "SOLAR PANELS", node_batt: "BATTERY", node_inv: "INVERTER", node_inv_sub: "Self-consumption", node_grid: "POWER GRID", node_home: "HOME LOAD",
        dom_title: "Solar Smart Home Control", dom_subtitle: "Smart load management coupled with surplus photovoltaic generation", dom_networks: "4 WiFi Networks", dom_loads: "WiFi Loads:",
        dev_pump: "Pool Pump", dev_ac: "Air Conditioner", dev_ev: "EV Charger", dev_lights: "Outdoor Garden Lights", dev_auto: "Automation:", dev_pump_auto: "Surplus > 1.5kW", dev_power: "Current Power:", dev_target_temp: "Target Temperature:", dev_charge_mode: "Charge Mode:", dev_schedule: "Schedule:",
        dev_add: "Pair WiFi Device", dev_add_sub: "Add Tuya, Sonoff, Shelly or MQTT",
        config_title: "System & Inverter Settings", config_name: "Solar Plant Name", config_auto: "Auto Surplus Cutoff", config_auto_sub: "Automatically turn on WiFi devices with solar excess", config_save: "Save Changes",
        modal_title: "Pair WiFi Device", modal_name: "Device Name", modal_protocol: "Protocol / Brand", modal_ip: "IP Address or MQTT Topic", modal_cancel: "Cancel", modal_search: "Search"
    },
    pt: {
        nav_dashboard: "Painel", nav_charts: "Gráficos", nav_totals: "Totais", nav_power: "Fluxo de Energia", nav_domotica: "Casa Inteligente", nav_config: "Configuração",
        card_inv_status: "Estado do Inversor", card_inv_mode: "Modo Híbrido", card_pv_prod: "Produção Solar FV", card_grid_net: "Rede Elétrica", card_batt_status: "Carregando",
        gauge_title: "Potência em Tempo Real", gauge_update: "Atualizado há 2s", gauge_load: "Carga da Casa", gauge_solar: "Energia Solar", gauge_grid: "Energia da Rede", gauge_batt: "Carga da Bateria",
        chart_title: "Gráfico Geral (24 Horas)", chart_leg_load: "Consumo", chart_leg_solar: "Solar", chart_leg_grid: "Rede",
        hist_title: "Análise Histórica de Energia", hist_subtitle: "Comparativo de consumo e geração solar acumulada", filter_day: "Dia", filter_week: "Semana", filter_month: "Mês",
        total_solar: "Geração Solar Total", total_solar_sub: "+12% este mês", total_home: "Consumo Total Casa", total_home_sub: "Acumulado anual", total_savings: "Economia Estimada da Rede", total_savings_sub: "82% Autoconsumo", total_co2: "Pegada de CO2 Evitada", total_co2_sub: "Eq. a ~52 árvores",
        flow_title: "Diagrama de Fluxo de Energia", flow_status: "Inversor Híbrido Ativo", node_solar: "PAINEL SOLAR", node_batt: "BATERIA", node_inv: "INVERSOR", node_inv_sub: "Autoconsumo", node_grid: "REDE ELÉTRICA", node_home: "CONSUMO DA CASA",
        dom_title: "Controle Domótico WiFi Solar", dom_subtitle: "Gestão inteligente de cargas acoplada à geração excedente fotovoltaica", dom_networks: "4 Redes WiFi", dom_loads: "Cargas WiFi:",
        dev_pump: "Bomba de Piscina", dev_ac: "Ar Condicionado", dev_ev: "Carregador Veicular EV", dev_lights: "Luzes de Jardim Externas", dev_auto: "Automação:", dev_pump_auto: "Excedente > 1.5kW", dev_power: "Potência Atual:", dev_target_temp: "Temperatura Alvo:", dev_charge_mode: "Modo de Carga:", dev_schedule: "Agenda:",
        dev_add: "Vincular Dispositivo WiFi", dev_add_sub: "Adicionar Tuya, Sonoff, Shelly ou MQTT",
        config_title: "Configurações do Sistema e Inversor", config_name: "Nome da Usina Solar", config_auto: "Corte Automático por Excedente", config_auto_sub: "Ligar dispositivos WiFi automaticamente com excesso solar", config_save: "Salvar Alterações",
        modal_title: "Vincular Dispositivo WiFi", modal_name: "Nome do Dispositivo", modal_protocol: "Protocolo / Marca", modal_ip: "Endereço IP ou Tópico MQTT", modal_cancel: "Cancelar", modal_search: "Pesquisar"
    },
    fr: {
        nav_dashboard: "Tableau de Bord", nav_charts: "Graphiques", nav_totals: "Totaux", nav_power: "Flux Énergétique", nav_domotica: "Domotique WiFi", nav_config: "Configuration",
        card_inv_status: "État de l'Onduleur", card_inv_mode: "Mode Hybride", card_pv_prod: "Production Solaire PV", card_grid_net: "Réseau Électrique", card_batt_status: "Charge",
        gauge_title: "Puissance en Temps Réel", gauge_update: "Mis à jour il y a 2s", gauge_load: "Consommation Maison", gauge_solar: "Énergie Solaire", gauge_grid: "Énergie Réseau", gauge_batt: "Charge Batterie",
        chart_title: "Graphique Global (24 Heures)", chart_leg_load: "Charge", chart_leg_solar: "Solaire", chart_leg_grid: "Réseau",
        hist_title: "Analyse Historique de l'Énergie", hist_subtitle: "Comparaison de la consommation et de la production solaire accumulée", filter_day: "Jour", filter_week: "Semaine", filter_month: "Mois",
        total_solar: "Production Solaire Totale", total_solar_sub: "+12% ce mois-ci", total_home: "Consommation Totale Maison", total_home_sub: "Cumul annuel", total_savings: "Économies Réseau Estimées", total_savings_sub: "82% Autoconsommation", total_co2: "Empreinte CO2 Évitée", total_co2_sub: "Éq. à ~52 arbres",
        flow_title: "Schéma de Flux Énergétique", flow_status: "Onduleur Hybride Actif", node_solar: "PANNEAU SOLAIRE", node_batt: "BATTERIE", node_inv: "ONDULEUR", node_inv_sub: "Autoconsommation", node_grid: "RÉSEAU ÉLECTRIQUE", node_home: "CONSOMMATION MAISON",
        dom_title: "Contrôle Domotique WiFi Solaire", dom_subtitle: "Gestion intelligente des charges couplée à la production photovoltaïque excédentaire", dom_networks: "4 Réseaux WiFi", dom_loads: "Charges WiFi:",
        dev_pump: "Pompe de Piscine", dev_ac: "Climatiseur", dev_ev: "Chargeur Véhicule EV", dev_lights: "Lumières de Jardin Extérieures", dev_auto: "Automatisation:", dev_pump_auto: "Excédent > 1.5kW", dev_power: "Puissance Actuelle:", dev_target_temp: "Température Cible:", dev_charge_mode: "Mode de Charge:", dev_schedule: "Horaire:",
        dev_add: "Associer un Appareil WiFi", dev_add_sub: "Ajouter Tuya, Sonoff, Shelly ou MQTT",
        config_title: "Paramètres Système et Onduleur", config_name: "Nom de la Centrale Solaire", config_auto: "Coupure Automatique par Excédent", config_auto_sub: "Allumer automatiquement les appareils WiFi en cas d'excédent solaire", config_save: "Enregistrer",
        modal_title: "Associer un Appareil WiFi", modal_name: "Nom de l'Appareil", modal_protocol: "Protocole / Marque", modal_ip: "Adresse IP ou Topic MQTT", modal_cancel: "Annuler", modal_search: "Rechercher"
    }
};

function changeLanguage(lang) {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        if (translations[lang] && translations[lang][key]) {
            el.innerHTML = translations[lang][key];
        }
    });
}

// ==================== LÓGICA DE DESCARGA (CSV) ====================
function exportData() {
    const headers = "Dia,Generacion Solar (kWh),Consumo Casa (kWh)\n";
    const dataRows = [
        "Lunes,22.0,15.0",
        "Martes,25.0,18.0",
        "Miercoles,19.0,16.0",
        "Jueves,28.0,20.0",
        "Viernes,24.0,17.0",
        "Sabado,30.0,22.0",
        "Domingo,21.2,16.5"
    ];
    
    const csvContent = headers + dataRows.join("\n");
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    link.setAttribute("href", url);
    link.setAttribute("download", "historico_energia_solar.csv");
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ==================== JAVASCRIPT APP LOGIC ORIGINAL ====================
function switchTab(tabId) {
    document.querySelectorAll('.tab-view').forEach(view => view.classList.add('hidden'));

    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active', 'bg-white', 'text-slate-800');
        tab.classList.add('text-white/90');
    });

    const selectedView = document.getElementById('view-' + tabId);
    if (selectedView) selectedView.classList.remove('hidden');

    const selectedTab = document.getElementById('tab-' + tabId);
    if (selectedTab) {
        selectedTab.classList.add('active');
    }
}

const themeToggleBtn = document.getElementById('theme-toggle');
const themeIcon = document.getElementById('theme-icon');

themeToggleBtn.addEventListener('click', () => {
    document.documentElement.classList.toggle('dark');
    if (document.documentElement.classList.contains('dark')) {
        themeIcon.classList.remove('fa-moon');
        themeIcon.classList.add('fa-sun');
    } else {
        themeIcon.classList.remove('fa-sun');
        themeIcon.classList.add('fa-moon');
    }
});

let currentTemp = 22;
function adjustTemp(delta) {
    currentTemp += delta;
    document.getElementById('temp-val').innerText = currentTemp + '°C';
}

function toggleDevice(device) {
    const checkbox = document.getElementById('toggle-' + device);
    const powerLabel = document.getElementById('power-' + device);
    const iconBg = document.getElementById('icon-bg-' + device);

    let powerVal = '0 W';
    if (checkbox.checked) {
        if (device === 'pump') powerVal = '750 W';
        if (device === 'ac') powerVal = '600 W';
        if (device === 'ev') powerVal = '3,700 W';
        if (device === 'lights') powerVal = '50 W';

        if (iconBg) iconBg.classList.remove('bg-slate-100', 'dark:bg-slate-700', 'text-slate-400');
    } else {
        if (iconBg) iconBg.classList.add('bg-slate-100', 'dark:bg-slate-700', 'text-slate-400');
    }

    if (powerLabel) powerLabel.innerText = powerVal;
}

function openAddDeviceModal() {
    document.getElementById('add-device-modal').classList.remove('hidden');
}
function closeAddDeviceModal() {
    document.getElementById('add-device-modal').classList.add('hidden');
}
function confirmAddDevice() {
    closeAddDeviceModal();
}

function saveSettings() {}

function updateClock() {
    const now = new Date();
    document.getElementById('live-time').innerText = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();

function setChartFilter(filter) {
    ['day', 'week', 'month'].forEach(f => {
        const btn = document.getElementById('filter-' + f);
        if (f === filter) {
            btn.className = "px-3 py-1.5 bg-amber-500 text-white rounded-lg text-xs font-semibold shadow-sm";
        } else {
            btn.className = "px-3 py-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold hover:bg-slate-300";
        }
    });
}

window.onload = function() {
    const ctxOverview = document.getElementById('overviewChart').getContext('2d');
    new Chart(ctxOverview, {
        type: 'line',
        data: {
            labels: ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
            datasets: [
                {
                    label: 'Consumo Casa (W)',
                    data: [400, 350, 1800, 2200, 1500, 2800, 500],
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.12)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Solar PV (W)',
                    data: [0, 0, 1200, 4100, 2500, 100, 0],
                    borderColor: '#f59e0b',
                    backgroundColor: 'rgba(245, 158, 11, 0.2)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Red Eléctrica (W)',
                    data: [0, 0, 0, 0, 0, 800, 0],
                    borderColor: '#ef4444',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { grid: { color: 'rgba(148, 163, 184, 0.1)' } },
                x: { grid: { color: 'rgba(148, 163, 184, 0.1)' } }
            }
        }
    });

    const ctxDetailed = document.getElementById('detailedChart').getContext('2d');
    new Chart(ctxDetailed, {
        type: 'bar',
        data: {
            labels: ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
            datasets: [
                {
                    label: 'Solar Generada (kWh)',
                    data: [22, 25, 19, 28, 24, 30, 21.2],
                    backgroundColor: '#fbbf24',
                    borderRadius: 6
                },
                {
                    label: 'Consumo Casa (kWh)',
                    data: [15, 18, 16, 20, 17, 22, 16.5],
                    backgroundColor: '#3b82f6',
                    borderRadius: 6
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'top' } }
        }
    });
};