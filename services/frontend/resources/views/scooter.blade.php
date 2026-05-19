@extends('layout')

@section('content')
<div class="scooter-page-container">
    <div class="mobile-header">
        <h1 class="page-title">Red Activa</h1>
    </div>

    <!-- Registro de Viajes Activos (Multiusuario) -->
    <div class="card trips-card">
        <div class="section-header">
            <h2>Viajes en Curso</h2>
            <p>Lista de usuarios y vehículos con alquileres activos en la base de datos.</p>
        </div>
        
        <div class="table-container">
            <table class="trips-table">
                <thead>
                    <tr>
                        <th>Viaje</th>
                        <th>Vehículo</th>
                        <th>Estado</th>
                        <th>Inicio</th>
                    </tr>
                </thead>
                <tbody id="activeTripsTableBody">
                    <tr>
                        <td colspan="4" class="table-loading">Cargando viajes registrados...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>

    <!-- Panel de Telemetría Completo -->
    <div class="card telemetry-dashboard-card">
        <div class="telemetry-header">
            <h2>Panel de Telemetría (Flota Completa)</h2>
            <div class="live-indicator">
                <span class="pulse-dot"></span>
                <span>En Vivo</span>
            </div>
        </div>
        <div class="table-container">
            <table class="telemetry-table">
                <thead>
                    <tr>
                        <th>ID</th>
                        <th>GPS</th>
                        <th>Batería</th>
                        <th>Estado</th>
                        <th>Acción</th>
                    </tr>
                </thead>
                <tbody id="telemetryTableBody">
                    <tr>
                        <td colspan="5" class="table-loading">Cargando datos de telemetría...</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</div>
@endsection
