// Configuración y Endpoints de la Arquitectura
const API_GATEWAY_URL = window.location.origin;

const gatewayEndpoints = {
    paymentCheckout: `${API_GATEWAY_URL}/api/payment/checkout`,
    unlockScooter: `${API_GATEWAY_URL}/api/unlock`,
    telemetry: `${API_GATEWAY_URL}/api/telemetry/scooters`,
};

// Estado General de la Aplicación en el Frontend
const appState = {
    currentUser: 1, // Por defecto User 1
    users: {
        1: { name: "User 1", email: "user1@ecoride.com" },
        2: { name: "User 2", email: "user2@ecoride.com" },
        3: { name: "User 3", email: "user3@ecoride.com" }
    },
    // Guarda qué scooter tiene alquilado cada usuario: { "1": scooterId, "2": scooterId }
    activeScooters: {},
    scooters: [],
    previousPositions: {} // Para registrar cambios en la telemetría e imprimir logs
};

// Inicialización
document.addEventListener('DOMContentLoaded', () => {
    // Recuperar estado previo del LocalStorage para persistir alquileres entre recargas
    const savedActive = localStorage.getItem('ecoride_active_scooters');
    if (savedActive) {
        appState.activeScooters = JSON.parse(savedActive);
    }

    const savedUser = localStorage.getItem('ecoride_current_user');
    if (savedUser) {
        appState.currentUser = parseInt(savedUser);
    }

    // Configurar el selector visual si existe en la página
    const userSelect = document.getElementById('simulatedUserSelect');
    if (userSelect) {
        userSelect.value = appState.currentUser;
    }

    // Sincronizar OIDC: si el backend inició sesión con un usuario real, usar ese correo/nombre en vez del mockup
    const appEl = document.getElementById('app');
    if (appEl) {
        const sessionName = appEl.getAttribute('data-session-name');
        const sessionEmail = appEl.getAttribute('data-session-email');
        if (sessionName && sessionEmail) {
            appState.users[appState.currentUser] = { name: sessionName, email: sessionEmail };
        }
    }

    updateActiveUserDisplay();
    
    // Iniciar consulta de telemetría automática cada 3 segundos
    fetchTelemetry();
    setInterval(fetchTelemetry, 3000);
});

// Cambiar de usuario en sesión simulada (Demo)
function onUserChange(userId) {
    appState.currentUser = parseInt(userId);
    localStorage.setItem('ecoride_current_user', appState.currentUser);
    
    updateActiveUserDisplay();
    renderUI();
    
    setResponse(`Usuario simulado cambiado a: ${appState.users[appState.currentUser].name}`);
}

function updateActiveUserDisplay() {
    const badge = document.getElementById('activeUserBadge');
    if (badge) {
        badge.textContent = appState.users[appState.currentUser].name;
    }
}

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

// Mostrar respuesta de depuración
function setResponse(message) {
    const responseBox = document.getElementById('apiResponse');
    if (responseBox) {
        responseBox.textContent = message;
    }
}

// ==========================================================================
// Acciones del API Gateway
// ==========================================================================

async function triggerManualPayment() {
    await checkoutPayment(10);
}

async function checkoutPayment(amount, scooterId = null) {
    setResponse(`Enviando cargo de $${amount} USD para ${appState.users[appState.currentUser].name}...`);

    try {
        const response = await fetch(gatewayEndpoints.paymentCheckout, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ 
                amount: amount, 
                userId: appState.currentUser 
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Error en el servicio de pago');
        }
        
        setResponse(`Pago Exitoso. ID Transacción: ${result.paymentId}\nToken Stripe: ${result.clientSecret}`);
        addConsoleLog(`[PAGO] Pago de $${amount} USD procesado para el Usuario ${appState.currentUser}. ID: ${result.paymentId}`, 'http');
    } catch (error) {
        setResponse('Error de pago: ' + error.message);
    }
}

async function unlockScooter(scooterId) {
    const numericId = parseInt(scooterId);
    setResponse(`Solicitando desbloqueo del Scooter #${numericId} para el Usuario ${appState.currentUser}...`);

    try {
        const response = await fetch(`${gatewayEndpoints.unlockScooter}/${numericId}`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({ userId: appState.currentUser }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Error en el servicio de desbloqueo');
        }

        // Registrar scooter alquilado para este usuario
        appState.activeScooters[appState.currentUser] = numericId;
        localStorage.setItem('ecoride_active_scooters', JSON.stringify(appState.activeScooters));
        
        setResponse(`Scooter #${numericId} Desbloqueado. Viaje ID: ${result.trip_id}`);
        addConsoleLog(`[DESBLOQUEO] Usuario ${appState.currentUser} inició Viaje ID ${result.trip_id} en Scooter #${numericId}`, 'http');
        
        renderUI();
    } catch (error) {
        setResponse('Error de desbloqueo: ' + error.message);
    }
}

// Simulación de bloqueo/fin de viaje en el frontend
function lockScooter(scooterId) {
    const numericId = parseInt(scooterId);
    delete appState.activeScooters[appState.currentUser];
    localStorage.setItem('ecoride_active_scooters', JSON.stringify(appState.activeScooters));
    
    setResponse(`Scooter #${numericId} bloqueado con éxito. Paseo finalizado.`);
    addConsoleLog(`[BLOQUEO] Usuario ${appState.currentUser} finalizó viaje en Scooter #${numericId}`, 'http');
    
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
        if (!response.ok) {
            throw new Error(result.error || 'Error de telemetría');
        }

        appState.scooters = result.scooters || [];
        
        // Evaluar cambios en telemetría para imprimir logs estilo MQTT
        processTelemetryChanges();
        
        // Actualizar componentes UI
        renderUI();
        
    } catch (error) {
        console.error("Error en telemetría:", error);
    }
}

// Comparar posiciones anteriores para gatillar eventos de log simulados
function processTelemetryChanges() {
    appState.scooters.forEach(s => {
        const id = s.id;
        const prev = appState.previousPositions[id];
        
        if (!prev || prev.lat !== s.lat || prev.lng !== s.lng || prev.battery !== s.battery) {
            // Generar log simulado de MQTT
            addConsoleLog(`[MQTT] Evento en ecoride/scooters/SCOOT-0${id}/telemetry: Lat=${s.lat}, Lng=${s.lng}, Batería=${s.battery}%, Estado=${s.status}`, 'mqtt');
        }
        
        appState.previousPositions[id] = { lat: s.lat, lng: s.lng, battery: s.battery };
    });
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

// 1. Mostrar gráficamente el scooter que tiene el usuario actual
function renderActiveScooter() {
    const container = document.getElementById('activeScooterPanel');
    if (!container) return;

    const rentedId = appState.activeScooters[appState.currentUser];
    
    if (!rentedId) {
        container.innerHTML = `
            <div class="empty-scooter-state">
                <div class="scooter-icon-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5v14"></path></svg>
                </div>
                <h3>Sin Scooter Activo</h3>
                <p>No tienes ningún viaje en curso. Selecciona un scooter de la flota para desbloquearlo.</p>
            </div>
        `;
        return;
    }

    // Buscar la telemetría en vivo del scooter alquilado
    const scooterInfo = appState.scooters.find(s => s.id === rentedId) || {
        id: rentedId,
        battery: 100,
        lat: 19.433,
        lng: -99.133,
        status: "RENTED"
    };

    // Color de batería
    let batColor = "var(--success)";
    if (scooterInfo.battery < 30) batColor = "var(--danger)";
    else if (scooterInfo.battery < 60) batColor = "var(--warning)";

    container.innerHTML = `
        <div class="active-scooter-card">
            <div class="scooter-visual">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.8 16 10 16 10l-1.5-3h-4L9 10H5v3h14v4zM5 13H3v3c0 .6.4 1 1 1h1"></path><circle cx="6.5" cy="17.5" r="2.5"></circle><circle cx="17.5" cy="17.5" r="2.5"></circle></svg>
            </div>
            <div class="scooter-details">
                <span class="scooter-status-pill">Viaje Activo</span>
                <h3>Scooter #${scooterInfo.id}</h3>
                <p>Ubicación GPS: <strong>${scooterInfo.lat.toFixed(4)}, ${scooterInfo.lng.toFixed(4)}</strong></p>
                
                <div class="battery-status">
                    <div class="battery-text">
                        <span>Nivel de Batería</span>
                        <span>${scooterInfo.battery}%</span>
                    </div>
                    <div class="battery-bar-bg">
                        <div class="battery-bar-fill" style="width: ${scooterInfo.battery}%; background-color: ${batColor};"></div>
                    </div>
                </div>
                
                <div class="api-actions-pill">
                    <button class="btn btn-sm btn-danger" onclick="lockScooter(${scooterInfo.id})">Terminar Viaje</button>
                    <button class="btn btn-sm btn-secondary" onclick="checkoutPayment(10, ${scooterInfo.id})">Pagar paseo</button>
                </div>
            </div>
        </div>
    `;
}

// 2. Mostrar la baraja de scooters disponibles
function renderScootersFleet() {
    const deck = document.getElementById('scootersDeck');
    if (!deck) return;

    if (appState.scooters.length === 0) {
        deck.innerHTML = `<p class="table-loading">Cargando flota de vehículos...</p>`;
        return;
    }

    deck.innerHTML = appState.scooters.map(s => {
        const isRentedByMe = appState.activeScooters[appState.currentUser] === s.id;
        const isRentedByOthers = Object.values(appState.activeScooters).includes(s.id) && !isRentedByMe;
        
        let statusText = "Disponible";
        let statusClass = "badge-success";
        if (isRentedByMe) {
            statusText = "Tu Alquiler";
            statusClass = "badge-primary";
        } else if (isRentedByOthers) {
            statusText = "Ocupado";
            statusClass = "badge-danger";
        }

        let batteryColor = "var(--success)";
        if (s.battery < 30) batteryColor = "var(--danger)";
        else if (s.battery < 60) batteryColor = "var(--warning)";

        return `
            <div class="scooter-card">
                <div class="scooter-card-header">
                    <span class="scooter-card-title">Scooter #${s.id}</span>
                    <span class="badge ${statusClass}">${statusText}</span>
                </div>
                
                <div class="scooter-card-battery" style="color: ${batteryColor};">
                    <div class="battery-icon">
                        <div class="battery-level-fill" style="height: ${s.battery}%"></div>
                    </div>
                    <span>${s.battery}%</span>
                </div>

                <div class="scooter-card-gps">
                    GPS: ${s.lat.toFixed(4)}, ${s.lng.toFixed(4)}
                </div>

                <div class="scooter-card-actions">
                    ${isRentedByMe ? `
                        <button class="btn btn-danger" style="width: 100%" onclick="lockScooter(${s.id})">Bloquear</button>
                    ` : `
                        <button class="btn" style="width: 100%" ${isRentedByOthers ? 'disabled' : ''} onclick="unlockScooter(${s.id})">Alquilar</button>
                    `}
                </div>
            </div>
        `;
    }).join('');
}

// 3. Rellenar la tabla de telemetría
function renderTelemetryTable() {
    const tableBody = document.getElementById('telemetryTableBody');
    if (!tableBody) return;

    if (appState.scooters.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="table-loading">Buscando datos de telemetría de scooters...</td></tr>`;
        return;
    }

    tableBody.innerHTML = appState.scooters.map(s => {
        const isRented = Object.values(appState.activeScooters).includes(s.id);
        const statusHTML = isRented 
            ? `<span class="badge badge-danger">OCUPADO</span>` 
            : `<span class="badge badge-success">DISPONIBLE</span>`;

        return `
            <tr>
                <td><strong>Scooter #${s.id}</strong></td>
                <td style="font-family: monospace;">${s.lat.toFixed(5)}, ${s.lng.toFixed(5)}</td>
                <td>
                    <span style="font-weight: bold; color: ${s.battery > 50 ? 'var(--success)' : s.battery > 20 ? 'var(--warning)' : 'var(--danger)'}">
                        ${s.battery}%
                    </span>
                </td>
                <td>${statusHTML}</td>
                <td>${new Date().toLocaleTimeString()}</td>
                <td>
                    <button class="btn btn-sm btn-clear" onclick="unlockScooter(${s.id})" ${isRented ? 'disabled' : ''}>Desbloquear</button>
                </td>
            </tr>
        `;
    }).join('');
}

// 4. Mapa Mock de Coordenadas GPS
function renderMockMap() {
    const markersContainer = document.getElementById('mapMarkers');
    if (!markersContainer) return;

    // Límites espaciales definidos en CDMX
    const latMin = 19.4310;
    const latMax = 19.4360;
    const lngMin = -99.1360;
    const lngMax = -99.1310;

    markersContainer.innerHTML = appState.scooters.map(s => {
        const isRentedByMe = appState.activeScooters[appState.currentUser] === s.id;
        const isRentedByOthers = Object.values(appState.activeScooters).includes(s.id) && !isRentedByMe;
        
        let markerClass = "marker-available";
        if (isRentedByMe || isRentedByOthers) {
            markerClass = "marker-active";
        } else if (s.battery < 30) {
            markerClass = "marker-low";
        }

        // Mapear coordenadas a porcentajes CSS relativos (entre 10% y 90% para no salir del borde)
        const pctX = ((s.lng - lngMin) / (lngMax - lngMin)) * 80 + 10;
        const pctY = ((latMax - s.lat) / (latMax - latMin)) * 80 + 10;

        return `
            <div class="map-marker ${markerClass}" 
                 style="left: ${pctX}%; top: ${pctY}%;"
                 data-tooltip="Scooter #${s.id} (Batería: ${s.battery}%)"
                 onclick="unlockScooter(${s.id})">
                ${s.id}
            </div>
        `;
    }).join('');
}

// 5. Historial de viajes activos en la red
function renderTripsRegistry() {
    const tableBody = document.getElementById('activeTripsTableBody');
    if (!tableBody) return;

    const activeUsers = Object.keys(appState.activeScooters);
    
    if (activeUsers.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" class="table-loading">No hay viajes en curso actualmente en el sistema.</td></tr>`;
        return;
    }

    tableBody.innerHTML = activeUsers.map((userId, index) => {
        const uId = parseInt(userId);
        const userName = appState.users[uId]?.name || `Rider #${uId}`;
        const scooterId = appState.activeScooters[uId];
        
        return `
            <tr>
                <td><strong>TRIP-0${index+1}</strong></td>
                <td>${userName}</td>
                <td>Scooter #${scooterId}</td>
                <td><span class="badge badge-primary">Activo</span></td>
                <td>${new Date().toLocaleTimeString()}</td>
            </tr>
        `;
    }).join('');
}

// ==========================================================================
// Consola de Eventos IoT (Logs)
// ==========================================================================

function addConsoleLog(message, type = 'system') {
    const consoleBox = document.getElementById('eventLogConsole');
    if (!consoleBox) return;

    const timeStr = new Date().toLocaleTimeString();
    const line = document.createElement('div');
    line.className = `console-line ${type}`;
    line.textContent = `[${timeStr}] ${message}`;

    consoleBox.appendChild(line);

    // Auto-scroll al final (que es arriba por la dirección flex-reverse)
    consoleBox.scrollTop = consoleBox.scrollHeight;
}

function clearEventLogs() {
    const consoleBox = document.getElementById('eventLogConsole');
    if (consoleBox) {
        consoleBox.innerHTML = '<div class="console-line system">[SISTEMA] Registro limpio. Escuchando nuevos eventos de telemetría...</div>';
    }
}
