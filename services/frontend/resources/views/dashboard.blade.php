@extends('layout')

@section('content')
<div class="dashboard-container">
    <!-- Header Móvil del Dashboard -->
    <div class="mobile-header">
        <h1 class="page-title">Mi EcoRide</h1>
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

    <!-- Active Scooter Card (Mobile friendly) -->
    <div class="card active-scooter-panel" id="activeScooterPanel">
        <!-- Cargado dinámicamente desde JS -->
        <div class="empty-scooter-state">
            <div class="scooter-icon-placeholder">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M5 12h14M12 5v14"></path></svg>
            </div>
            <h3>Sin Viaje Activo</h3>
            <p>Selecciona un scooter del mapa o de la lista para empezar a rodar.</p>
        </div>
    </div>

    <!-- Fleet / Map Section -->
    <div class="dashboard-section">
        <div class="section-header">
            <h2>Scooters Cerca de Ti</h2>
            <div class="live-indicator">
                <span class="pulse-dot"></span>
                <span>En Vivo</span>
            </div>
        </div>
        
        <!-- Mobile Map Mock -->
        <div class="card map-card-mobile">
            <div class="mock-map-canvas" id="mockMapCanvas">
                <div class="map-grid-overlay"></div>
                <div id="mapMarkers"></div>
            </div>
        </div>

        <!-- Horizontal Scrollable Scooter Deck -->
        <div class="scooter-deck-scroll" id="scootersDeck">
            <!-- Cargado dinámicamente desde JS -->
            <p class="table-loading">Cargando flota de vehículos...</p>
        </div>
    </div>
</div>

<!-- Modal para Detalles del Scooter y Simulación MQTT -->
<div class="modal-overlay" id="scooterModal" style="display: none;">
    <div class="modal-card">
        <div class="modal-header">
            <h3 id="modalScooterTitle">Scooter #--</h3>
            <button class="btn-close" onclick="closeScooterModal()">×</button>
        </div>
        <div class="modal-body">
            <div class="scooter-stats-grid">
                <div class="stat-box">
                    <span class="stat-label">Batería</span>
                    <span class="stat-value" id="modalBattery">--%</span>
                </div>
                <div class="stat-box">
                    <span class="stat-label">Estado</span>
                    <span class="stat-value" id="modalStatus">--</span>
                </div>
            </div>
            
            <div class="mqtt-console-container">
                <div class="console-header">
                    <span>📡 Stream MQTT en Vivo</span>
                </div>
                <div class="event-log-console" id="modalMqttConsole">
                    <div class="console-line system">Conectando al broker MQTT EMQX...</div>
                </div>
            </div>
        </div>
        <div class="modal-footer" id="modalFooterActions">
            <!-- Botones dinámicos -->
        </div>
    </div>
</div>

<!-- Modal para Simulación de Stripe -->
<div class="modal-overlay" id="stripeModal" style="display: none;">
    <div class="modal-card stripe-card">
        <div class="stripe-header">
            <svg viewBox="0 0 60 25" width="60" height="25" fill="#635bff"><path d="M59.64 14.28h-8.06c.19-2.53 1.84-3.65 3.73-3.65 1.35 0 2.7.54 3.65 1.54l1.68-2.73a7.38 7.38 0 0 0-5.4-2.16c-4.41 0-7.72 2.73-7.72 8.01 0 4.84 3 7.82 7.77 7.82 2.89 0 5.3-1.15 6.74-3.36l-2.07-2.3a4.7 4.7 0 0 1-4.47 1.87c-2.4 0-4-1.39-4.27-3.93h8.54c3.08 0 4.14-1.54 4.14-3.8l-.05-1.59zM48.1 12.06c0-1.05.62-2.11 2.21-2.11 1.44 0 2.2.91 2.3 2.11h-4.5zm-15.35 6.4c-1.88 0-3.17-1.1-3.17-3.07 0-2.3 1.73-3.36 4.37-3.36 1.1 0 2.25.19 3.07.43v5.09a3.86 3.86 0 0 1-4.27.91zm1.15-9.35c-1.63 0-3.3.48-4.7 1.34l-1.35-2.73a9.75 9.75 0 0 1 6.24-1.68c4.32 0 7.34 2.26 7.34 7.2v8.92h-3.41v-2.06a7 7 0 0 1-5.61 2.44c-3.65 0-6.43-2.11-6.43-6.24 0-4.8 3.55-6.81 9.5-6.81.96 0 1.97.1 2.93.29v-.86c0-1.83-1.25-2.94-3.26-2.94h-.05zM22.56 22.36l3.5-14.73h-3.65l-2.07 8.68-4.17-8.68H12.3l6.57 13.06-2.5 7.15h3.9l2.29-6.52v.04zm-14.3-13.8a6.07 6.07 0 0 1-4.46-1.54L2.07 9.84a9.7 9.7 0 0 0 6.43 2.02c3.5 0 5.61-1.68 5.61-4.85 0-2.88-2-4.13-5.28-4.89-2.35-.53-3.36-.96-3.36-2.02 0-.81.67-1.53 1.97-1.53a5.55 5.55 0 0 1 3.74 1.3l1.58-2.65A9 9 0 0 0 6.64 0C3.33 0 1.45 1.73 1.45 4.65c0 2.93 2.21 4.18 5.38 4.9 2.5.57 3.26 1.05 3.26 1.97 0 .96-.86 1.63-2.11 1.63h-.05l.33-.2z"/></svg>
            <button class="btn-close" onclick="closeStripeModal()">×</button>
        </div>
        <div class="stripe-body" id="stripeCheckoutBody">
            <h4 class="checkout-amount">Total: $10.00 USD</h4>
            <div class="checkout-spinner" id="stripeSpinner">
                <div class="spinner"></div>
                <p>Conectando con Stripe de forma segura...</p>
            </div>
            <div class="checkout-success" id="stripeSuccess" style="display: none;">
                <div class="success-icon">✓</div>
                <p>¡Pago procesado con éxito!</p>
                <p class="small-text">Transacción aprobada simulada localmente (Modo Demo).</p>
            </div>
        </div>
    </div>
</div>
@endsection
