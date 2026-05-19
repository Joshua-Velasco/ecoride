@extends('layout')

@section('content')
<div class="auth-panel">
    <h1>Iniciar sesión</h1>
    <p>Inicia sesión de forma segura utilizando Keycloak e integrando tu cuenta de Google.</p>

    <div class="auth-actions" style="margin-top: 2rem; text-align: center;">
        <a href="{{ route('login.redirect') }}" class="button" style="display: inline-block; padding: 0.8rem 2rem; background: #4f46e5; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            Entrar con EcoRide ID
        </a>
    </div>

    @if($errors->any())
        <div class="form-errors" style="margin-top: 1.5rem; color: #ef4444;">
            @foreach($errors->all() as $error)
                <p>{{ $error }}</p>
            @endforeach
        </div>
    @endif
</div>
@endsection
