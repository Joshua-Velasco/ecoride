// Configuración y Endpoints
const API_GATEWAY_URL = window.location.origin;

const gatewayEndpoints = {
    paymentCheckout: `${API_GATEWAY_URL}/api/payment/checkout`,
    unlockScooter: `${API_GATEWAY_URL}/api/unlock`,
    telemetry: `${API_GATEWAY_URL}/api/telemetry/scooters`,
};

// Estado General de la Aplicación
const appState = {
    currentUser: 1, // Fijo en 1
    activeScooters: {}, // Guarda qué scooter tiene alquilado cada usuario: { "1": scooterId }
    scooters: [],
    previousPositions: {},
    modalScooterId: null, // Scooter actualmente inspeccionado
    modalMqttInterval: null // Intervalo para simular pings MQTT visualmente en el modal
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Recuperar estado previo del LocalStorage
    const savedActive = localStorage.getItem('ecoride_active_scooters');
    if (savedActive) {
        appState.activeScooters = JSON.parse(savedActive);
    }
    
    // Iniciar consulta de telemetría automática cada 3 segundos
    fetchTelemetry();
    setInterval(fetchTelemetry, 3000);
});

// Obtener cabeceras de autenticación JWT
function getAuthHeaders() {
    const tokenMeta = document.querySelector('meta[name="jwt-token"]');
    const token = tokenMeta ? tokenMeta.getAttribute('content') : null;
    const headers = {
        'Content-Type': 'application/json',
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
}

// ==========================================================================
// Acciones de UI (Stripe & Modales)
// ==========================================================================

async function checkoutPayment(amount, scooterId = null) {
    // Abrir Modal de Stripe UI
    const modal = document.getElementById('stripeModal');
    const spinner = document.getElementById('stripeSpinner');
    const success = document.getElementById('stripeSuccess');
    if(modal) {
        modal.style.display = 'flex';
        spinner.style.display = 'flex';
        success.style.display = 'none';
    }

    try {
        const response = await fetch(gatewayEndpoints.paymentCheckout, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ amount: amount, userId: appState.currentUser }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error en pago');
        
        // Simular un delay de UI para que el usuario vea la conexión segura
        setTimeout(() => {
            spinner.style.display = 'none';
            success.style.display = 'flex';
            
            // Cerrar automáticamente tras 2 segundos si es desde un viaje
            setTimeout(() => {
                closeStripeModal();
                if(scooterId) lockScooter(scooterId);
            }, 2500);
        }, 1200);

    } catch (error) {
        alert('Error de pago: ' + error.message);
        closeStripeModal();
    }
}

function closeStripeModal() {
    const modal = document.getElementById('stripeModal');
    if(modal) modal.style.display = 'none';
}

// ==========================================================================
// IoT / MQTT Modal Simulation
// ==========================================================================

function openScooterModal(scooterId) {
    appState.modalScooterId = scooterId;
    const scooter = appState.scooters.find(s => s.id === scooterId);
    if(!scooter) return;
    
    const modal = document.getElementById('scooterModal');
    document.getElementById('modalScooterTitle').innerText = `Scooter #${scooterId}`;
    document.getElementById('modalBattery').innerText = `${scooter.battery}%`;
    document.getElementById('modalStatus').innerText = scooter.status;
    
    // Configurar el log MQTT visual
    const consoleBox = document.getElementById('modalMqttConsole');
    consoleBox.innerHTML = '<div class="console-line system">Conectando al broker MQTT EMQX...</div><div class="console-line system">Suscrito a ecoride/scooters/SCOOT-' + scooterId.toString().padStart(2, '0') + '/telemetry</div>';
    
    if(appState.modalMqttInterval) clearInterval(appState.modalMqttInterval);
    
    // Generar pings simulados cada 1.5s de la telemetría recibida
    appState.modalMqttInterval = setInterval(() => {
        const currentData = appState.scooters.find(s => s.id === scooterId) || scooter;
        addMqttModalLog(`📡 [RECIBIDO] Lat=${currentData.lat.toFixed(5)}, Lng=${currentData.lng.toFixed(5)}, Bat=${currentData.battery}%`);
    }, 1500);

    // Botones de acción dinámica en el modal
    const isRentedByMe = appState.activeScooters[appState.currentUser] === scooterId;
    const isRentedByOthers = Object.values(appState.activeScooters).includes(scooterId) && !isRentedByMe;
    
    const footer = document.getElementById('modalFooterActions');
    if(isRentedByMe) {
        footer.innerHTML = `
            <button class="btn btn-danger" style="flex: 1;" onclick="checkoutPayment(10, ${scooterId})">Terminar Viaje & Pagar</button>
        `;
    } else if(isRentedByOthers) {
        footer.innerHTML = `
            <button class="btn btn-secondary" style="flex: 1;" disabled>Ocupado</button>
        `;
    } else {
        footer.innerHTML = `
            <button class="btn btn-primary" style="flex: 1;" onclick="unlockScooter(${scooterId})">Desbloquear Ahora</button>
        `;
    }

    modal.style.display = 'flex';
}

function closeScooterModal() {
    const modal = document.getElementById('scooterModal');
    if(modal) modal.style.display = 'none';
    if(appState.modalMqttInterval) clearInterval(appState.modalMqttInterval);
    appState.modalScooterId = null;
}

function addMqttModalLog(message) {
    const consoleBox = document.getElementById('modalMqttConsole');
    if (!consoleBox) return;
    const timeStr = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = 'console-line mqtt';
    line.textContent = `[${timeStr}] ${message}`;
    consoleBox.appendChild(line);
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

// ==========================================================================
// Interacción con API Backend
// ==========================================================================

async function unlockScooter(scooterId) {
    const numericId = parseInt(scooterId);
    closeScooterModal();
    
    try {
        const response = await fetch(`${gatewayEndpoints.unlockScooter}/${numericId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId: appState.currentUser }),
        });

        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error en desbloqueo');

        appState.activeScooters[appState.currentUser] = numericId;
        localStorage.setItem('ecoride_active_scooters', JSON.stringify(appState.activeScooters));
        
        renderUI();
    } catch (error) {
        alert('Error: ' + error.message);
    }
}

function lockScooter(scooterId) {
    delete appState.activeScooters[appState.currentUser];
    localStorage.setItem('ecoride_active_scooters', JSON.stringify(appState.activeScooters));
    renderUI();
}

// Obtener telemetría en tiempo real
async function fetchTelemetry() {
    try {
        const response = await fetch(gatewayEndpoints.telemetry, {
            method: 'GET',
            headers: getAuthHeaders(),
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Error de telemetría');

        appState.scooters = result.scooters || [];
        
        if(appState.modalScooterId) {
            const sc = appState.scooters.find(s => s.id === appState.modalScooterId);
            if(sc) {
                document.getElementById('modalBattery').innerText = `${sc.battery}%`;
            }
        }
        
        renderUI();
        
    } catch (error) {
        console.error("Error en telemetría:", error);
    }
}

// ==========================================================================
// RENDERIZADO DINÁMICO DE INTERFAZ
// ==========================================================================

function renderUI() {
    renderActiveScooter();
    renderScootersFleet();
    renderTelemetryTable();
    renderMockMap();
    renderTripsRegistry();
}

function renderActiveScooter() {
    const container = document.getElementById('activeScooterPanel');
    if (!container) return;

    const rentedId = appState.activeScooters[appState.currentUser];
    if (!rentedId) {
        container.innerHTML = `
            <div class="empty-scooter-state">
                <div class="scooter-icon-placeholder">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5v14"></path></svg>
                </div>
                <h3>Sin Viaje Activo</h3>
                <p>Selecciona un scooter del mapa para rodar.</p>
            </div>
        `;
        return;
    }

    const scooterInfo = appState.scooters.find(s => s.id === rentedId) || { id: rentedId, battery: 100, lat: 0, lng: 0 };
    let batColor = "var(--success)";
    if (scooterInfo.battery < 30) batColor = "var(--danger)";
    else if (scooterInfo.battery < 60) batColor = "var(--warning)";

    container.innerHTML = `
        <div class="active-scooter-card" onclick="openScooterModal(${scooterInfo.id})" style="cursor: pointer;">
            <div class="scooter-visual">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.8 16 10 16 10l-1.5-3h-4L9 10H5v3h14v4zM5 13H3v3c0 .6.4 1 1 1h1"></path><circle cx="6.5" cy="17.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
            </div>
            <div class="scooter-details">
                <span class="scooter-status-pill">Viaje Activo</span>
                <h3>Scooter #${scooterInfo.id}</h3>
                
                <div class="battery-status">
                    <div class="battery-text">
                        <span>Batería</span>
                        <span>${scooterInfo.battery}%</span>
                    </div>
                    <div class="battery-bar-bg">
                        <div class="battery-bar-fill" style="width: ${scooterInfo.battery}%; background-color: ${batColor};"></div>
                    </div>
                </div>
            </div>
        </div>
        <div class="api-actions-pill" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
            <button class="btn btn-danger" style="flex: 1; padding: 0.75rem;" onclick="checkoutPayment(10, ${scooterInfo.id})">Terminar & Pagar</button>
        </div>
    `;
}

function renderScootersFleet() {
    const deck = document.getElementById('scootersDeck');
    if (!deck) return;

    if (appState.scooters.length === 0) {
        deck.innerHTML = `<p class="table-loading">Buscando flota de vehículos...</p>`;
        return;
    }

    deck.innerHTML = appState.scooters.map(s => {
        let batteryColor = "var(--success)";
        if (s.battery < 30) batteryColor = "var(--danger)";
        else if (s.battery < 60) batteryColor = "var(--warning)";

        return `
            <div class="scooter-card-mini" onclick="openScooterModal(${s.id})">
                <div class="card-mini-header">
                    <h4>#${s.id}</h4>
                    <div class="battery-pill" style="color: ${batteryColor};">
                        <div class="battery-icon"><div class="battery-level-fill" style="height: ${s.battery}%"></div></div>
                        <span>${s.battery}%</span>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderTelemetryTable() {
    const tableBody = document.getElementById('telemetryTableBody');
    if (!tableBody) return;

    if (appState.scooters.length === 0) return;

    tableBody.innerHTML = appState.scooters.map(s => {
        const isRented = Object.values(appState.activeScooters).includes(s.id);
        const statusHTML = isRented ? `<span class="badge badge-danger">OCUPADO</span>` : `<span class="badge badge-success">LIBRE</span>`;

        return `
            <tr>
                <td><strong>#${s.id}</strong></td>
                <td style="font-size: 0.75rem; color: var(--text-secondary);">${s.lat.toFixed(4)},<br/>${s.lng.toFixed(4)}</td>
                <td><span style="font-weight: bold; color: ${s.battery > 50 ? 'var(--success)' : s.battery > 20 ? 'var(--warning)' : 'var(--danger)'}">${s.battery}%</span></td>
                <td>${statusHTML}</td>
                <td><button class="btn btn-sm btn-info" onclick="openScooterModal(${s.id})">Ver</button></td>
            </tr>
        `;
    }).join('');
}

function renderMockMap() {
    const markersContainer = document.getElementById('mapMarkers');
    if (!markersContainer) return;

    const latMin = 19.4200, latMax = 19.4500;
    const lngMin = -99.1550, lngMax = -99.1200;

    markersContainer.innerHTML = appState.scooters.map(s => {
        const isRented = Object.values(appState.activeScooters).includes(s.id);
        let markerClass = "marker-available";
        if (isRented) markerClass = "marker-active";
        else if (s.battery < 30) markerClass = "marker-low";

        const pctX = ((s.lng - lngMin) / (lngMax - lngMin)) * 90 + 5;
        const pctY = ((latMax - s.lat) / (latMax - latMin)) * 90 + 5;

        return `
            <div class="map-marker ${markerClass}" 
                 style="left: ${pctX}%; top: ${pctY}%;"
                 onclick="openScooterModal(${s.id})">
                ${s.id}
            </div>
        `;
    }).join('');
}

function renderTripsRegistry() {
    const tableBody = document.getElementById('activeTripsTableBody');
    if (!tableBody) return;

    const activeUsers = Object.keys(appState.activeScooters);
    if (activeUsers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="4" class="table-loading">No hay viajes activos.</td></tr>`;
        return;
    }

    tableBody.innerHTML = activeUsers.map((userId, index) => {
        return `
            <tr>
                <td><strong>TRIP-0${index+1}</strong></td>
                <td>Scooter #${appState.activeScooters[userId]}</td>
                <td><span class="badge badge-primary">Activo</span></td>
                <td>${new Date().toLocaleTimeString()}</td>
            </tr>
        `;
    }).join('');
}
