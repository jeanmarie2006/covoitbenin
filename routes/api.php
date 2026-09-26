<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\ReservationController;
use App\Http\Controllers\TrajetController;
use Illuminate\Support\Facades\Route;

Route::post('/auth/register', [AuthController::class, 'register'])->middleware('throttle:10,1');
Route::post('/auth/login', [AuthController::class, 'login'])->middleware('throttle:10,1');

// Public
Route::get('/lieux', [TrajetController::class, 'lieux']);
Route::get('/trajets', [TrajetController::class, 'index']);
Route::get('/trajets/{trajet}', [TrajetController::class, 'show'])->whereNumber('trajet');
Route::get('/membres/{user}', [TrajetController::class, 'profil'])->whereNumber('user');

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/auth/me', [AuthController::class, 'me']);
    Route::post('/auth/logout', [AuthController::class, 'logout']);

    // Conducteur
    Route::post('/trajets', [TrajetController::class, 'store']);
    Route::get('/mes-trajets', [TrajetController::class, 'mesTrajets']);
    Route::post('/trajets/{trajet}/annuler', [TrajetController::class, 'annuler']);
    Route::post('/trajets/{trajet}/terminer', [TrajetController::class, 'terminer']);
    Route::post('/reservations/{reservation}/decision', [ReservationController::class, 'decision']);

    // Passager
    Route::post('/trajets/{trajet}/reservations', [ReservationController::class, 'store'])->middleware('throttle:20,1');
    Route::get('/mes-reservations', [ReservationController::class, 'mine']);
    Route::post('/reservations/{reservation}/annuler', [ReservationController::class, 'annuler']);
    Route::post('/reservations/{reservation}/payer', [ReservationController::class, 'payer']);

    // Communs
    Route::get('/reservations/{reservation}/messages', [ReservationController::class, 'messages']);
    Route::post('/reservations/{reservation}/messages', [ReservationController::class, 'envoyer'])->middleware('throttle:30,1');
    Route::post('/reservations/{reservation}/avis', [ReservationController::class, 'noter']);
});
