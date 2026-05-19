<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>{{ $title ?? 'EcoRide' }}</title>
    <link rel="stylesheet" href="{{ asset('css/app.css') }}">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet">
    @if(session('token'))
        <meta name="jwt-token" content="{{ session('token') }}">
    @endif
</head>
<body>
    <div class="app-shell" id="app" 
         data-session-name="{{ session('name', '') }}" 
         data-session-email="{{ session('email', '') }}">
        
        <header class="app-header">
            <div class="brand">
                <span class="brand-dot"></span>
                EcoRide
            </div>
            
            <nav class="app-nav">
                <a href="{{ route('dashboard') }}" class="{{ Request::routeIs('dashboard') ? 'active' : '' }}">Inicio</a>
                <a href="{{ route('scooter') }}" class="{{ Request::routeIs('scooter') ? 'active' : '' }}">Telemetría & Mapa</a>
                @if(!session('logged_in'))
                    <a href="{{ route('login') }}" class="login-link">Login</a>
                @endif
            </nav>

            <div class="header-right">
                <!-- User profile only (demo selector removed) -->

                @if(session('logged_in'))
                    <div class="user-profile">
                        <div class="user-info">
                            <span class="user-name">{{ session('name') }}</span>
                            <span class="user-email">{{ session('email') }}</span>
                        </div>
                        <div class="user-avatar">
                            {{ strtoupper(substr(session('name', 'U'), 0, 1)) }}
                        </div>
                        <a href="{{ route('logout') }}" class="logout-btn" title="Cerrar sesión">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                        </a>
                    </div>
                @else
                    <div class="user-profile anonymous">
                        <div class="user-info">
                            <span class="user-name">Invitado</span>
                            <span class="user-email">Sin iniciar sesión</span>
                        </div>
                        <div class="user-avatar">?</div>
                    </div>
                @endif
            </div>
        </header>

        <main class="app-content">
            @if(session('status'))
                <div class="alert alert-success">
                    <span class="alert-icon">✨</span>
                    <span class="alert-msg">{{ session('status') }}</span>
                </div>
            @endif

            @yield('content')
        </main>
    </div>
    <script src="{{ asset('js/app.js') }}"></script>
</body>
</html>
