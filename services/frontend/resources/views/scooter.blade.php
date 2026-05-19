@extends('layout')

@section('content')
<div class="scooter-page-container">
    <div class="mobile-header" style="display: flex; justify-content: space-between; align-items: center;">
        <h1 class="page-title">Red Activa</h1>
        <div class="user-pill">
            <div class="avatar">U</div>
            <span>Usuario Demo</span>
            <form method="POST" action="{{ route('logout') }}" style="margin: 0; display: flex; align-items: center;">
                @csrf
                <button type="submit" style="background: none; border: none; color: var(--danger); cursor: pointer; padding: 0 0.5rem;" title="Cerrar sesión">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
            </form>
        </div>
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
