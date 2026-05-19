@extends('layout')

@section('content')
<div class="dashboard-container">
    <!-- Fila Superior: Perfil del Usuario Activo y su Scooter -->
    <div class="dashboard-row">
        <!-- Panel del Usuario Activo -->
        <div class="card active-user-panel">
            <div class="panel-header">
                <h2>Usuario Activo en Sesión</h2>
                <span class="badge badge-primary" id="activeUserBadge">Usuario 1</span>
            </div>
            <p>Estás gestionando las peticiones de este usuario. Puedes cambiar el usuario activo arriba a la derecha para simular múltiples personas interactuando a la vez.</p>
            <div class="api-actions-pill">
                <button class="btn btn-secondary" onclick="triggerManualPayment()">Pagar $10 USD</button>
                <button class="btn btn-info" onclick="fetchTelemetry()">Refrescar Telemetría</button>
            </div>
        </div>

        <!-- Representación Gráfica del Scooter Alquilado -->
        <div class="card active-scooter-panel" id="activeScooterPanel">
            <!-- Cargado dinámicamente desde JS -->
            <div class="empty-scooter-state">
                <div class="scooter-icon-placeholder">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5v14"></path></svg>
                </div>
                <h3>Sin Scooter Activo</h3>
                <p>No tienes ningún viaje en curso. Selecciona un scooter de la flota para desbloquearlo.</p>
            </div>
        </div>
    </div>

    <!-- Fila Central: Flota de Scooters Disponibles -->
    <div class="dashboard-section">
        <h2>Flota EcoRide</h2>
        <p>Selecciona cualquiera de los scooters disponibles a continuación para alquilarlo o interactuar con él.</p>
        <div class="scooter-deck" id="scootersDeck">
            <!-- Cargado dinámicamente desde JS -->
        </div>
    </div>

    <!-- Fila Inferior: Dashboard de Telemetría Multiusuario -->
    <div class="dashboard-section">
        <div class="card telemetry-dashboard-card">
            <div class="telemetry-header">
                <h2>Panel de Telemetría Multiusuario (Flota Completa)</h2>
                <div class="live-indicator">
                    <span class="pulse-dot"></span>
                    <span>Transmisión en Vivo</span>
                </div>
            </div>
            <p class="section-desc">Monitoreo en tiempo real de ubicación GPS, nivel de batería y estados reportados por los scooters a través de MQTT/Kafka a PostgreSQL.</p>
            
            <div class="table-container">
                <table class="telemetry-table">
                    <thead>
                        <tr>
                            <th>Vehículo</th>
                            <th>Ubicación (Lat, Lng)</th>
                            <th>Nivel de Batería</th>
                            <th>Estado</th>
                            <th>Último Reporte</th>
                            <th>Acción Rápida</th>
                        </tr>
                    </thead>
                    <tbody id="telemetryTableBody">
                        <tr>
                            <td colspan="6" class="table-loading">Cargando datos de telemetría...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Caja de Respuestas de la API para depurar -->
    <div class="dashboard-section">
        <div class="card debug-card">
            <h3>Registro de Respuestas de API</h3>
            <div id="apiResponse" class="response-box">Inicializando...</div>
        </div>
    </div>
</div>
@endsection
