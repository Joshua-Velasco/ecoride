<?php

use App\Http\Controllers\FrontendController;
use Illuminate\Support\Facades\Route;

Route::get('/', [FrontendController::class, 'home'])->name('dashboard');
Route::get('/scooter', [FrontendController::class, 'scooter'])->name('scooter');
Route::get('/login', [FrontendController::class, 'showLogin'])->name('login');
Route::get('/login/redirect', [FrontendController::class, 'redirectToKeycloak'])->name('login.redirect');
Route::get('/login/callback', [FrontendController::class, 'handleKeycloakCallback'])->name('login.callback');
Route::post('/logout', [FrontendController::class, 'logout'])->name('logout');
