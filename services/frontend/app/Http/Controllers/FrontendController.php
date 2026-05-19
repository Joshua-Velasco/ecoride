<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Laravel\Socialite\Facades\Socialite;

class FrontendController extends Controller
{
    public function home(Request $request)
    {
        if (!$request->session()->get('logged_in')) {
            return redirect()->route('login');
        }
        $name = $request->session()->get('name', 'Rider');
        return view('dashboard', ['name' => $name]);
    }

    public function scooter(Request $request)
    {
        if (!$request->session()->get('logged_in')) {
            return redirect()->route('login');
        }
        $name = $request->session()->get('name', 'Rider');
        return view('scooter', ['name' => $name]);
    }

    public function showLogin(Request $request)
    {
        if ($request->session()->get('logged_in')) {
            return redirect()->route('dashboard');
        }
        return view('login');
    }

    public function redirectToKeycloak()
    {
        return Socialite::driver('keycloak')->redirect();
    }

    public function handleKeycloakCallback(Request $request)
    {
        try {
            $user = Socialite::driver('keycloak')->user();
        } catch (\Exception $e) {
            logger()->error('Keycloak Callback Error: ' . $e->getMessage(), ['exception' => $e]);
            return redirect()->route('login')->withErrors(['login' => 'Error al autenticar con Keycloak: ' . $e->getMessage()]);
        }

        // Almacenar información de usuario y tokens en la sesión
        $request->session()->put('name', $user->getName() ?: ($user->getNickname() ?: 'EcoRider'));
        $request->session()->put('email', $user->getEmail());
        $request->session()->put('token', $user->token); // Este es el token JWT que el gateway validará
        $request->session()->put('logged_in', true);

        return redirect()->route('dashboard')->with('status', 'Sesión iniciada correctamente con Keycloak.');
    }

    public function logout(Request $request)
    {
        // 1. Destruir sesión local en Laravel
        $request->session()->flush();
        
        // 2. Destruir sesión SSO en Keycloak
        $keycloakBaseUrl = env('KEYCLOAK_BASE_URL', 'http://localhost:30005');
        $keycloakRealm = env('KEYCLOAK_REALM', 'ecoride');
        $clientId = env('KEYCLOAK_CLIENT_ID', 'ecoride-app');
        $redirectUri = urlencode(route('login'));
        
        $logoutUrl = "{$keycloakBaseUrl}/realms/{$keycloakRealm}/protocol/openid-connect/logout?client_id={$clientId}&post_logout_redirect_uri={$redirectUri}";
        
        return redirect($logoutUrl);
    }
}
