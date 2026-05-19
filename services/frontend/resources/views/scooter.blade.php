@extends('layout')

@section('content')
<div class="scooter-page-container">
    <div class="dashboard-row">
        <!-- Mapa de Simulación de la Flota (Mock Visual) -->
        <div class="card map-card">
            <h2>Mapa de Flota en Tiempo Real</h2>
            <p>Representación espacial de los scooters en Ciudad de México basándose en las coordenadas GPS de la telemetría.</p>
            
            <div class="mock-map-canvas" id="mockMapCanvas">
                <!-- Se poblará dinámicamente con marcadores posicionados de manera absoluta -->
                <div class="map-grid-overlay"></div>
                <div id="mapMarkers"></div>
            </div>
            
            <div class="map-legend">
                <div class="legend-item"><span class="legend-dot available"></span> Disponible</div>
                <div class="legend-item"><span class="legend-dot active"></span> En Uso (Alquilado)</div>
                <div class="legend-item"><span class="legend-dot low-battery"></span> Batería Baja (&lt; 30%)</div>
            </div>
        </div>

        <!-- Registro de Viajes Activos (Multiusuario) -->
        <div class="card trips-card">
            <h2>Monitoreo de Viajes Activos</h2>
            <p>Lista de usuarios y vehículos con alquileres activos registrados en PostgreSQL.</p>
            
            <div class="table-container">
                <table class="trips-table">
                    <thead>
                        <tr>
                            <th>ID Viaje</th>
                            <th>Usuario</th>
                            <th>Vehículo</th>
                            <th>Estado</th>
                            <th>Hora Inicio</th>
                        </tr>
                    </thead>
                    <tbody id="activeTripsTableBody">
                        <tr>
                            <td colspan="5" class="table-loading">Cargando viajes registrados...</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- Registro de Eventos MQTT en Tiempo Real -->
    <div class="dashboard-section">
        <div class="card event-log-card">
            <div class="card-header">
                <h2>Historial de Eventos IoT (MQTT/Kafka Ingestion)</h2>
                <button class="btn btn-sm btn-clear" onclick="clearEventLogs()">Limpiar Registro</button>
            </div>
            <p>Se muestran los últimos eventos de telemetría reportados por los scooters al broker MQTT EMQX y procesados por el pipeline.</p>
            <div class="event-log-console" id="eventLogConsole">
                <div class="console-line system">[SISTEMA] Escuchando eventos del pipeline de telemetría...</div>
            </div>
        </div>
    </div>
</div>
@endsection
