<?php

declare(strict_types=1);

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\HealthController;
use App\Http\Controllers\Api\JwksController;
use Illuminate\Support\Facades\Route;

// Health endpoints
Route::get('/health/live', [HealthController::class, 'live']);
Route::get('/health/ready', [HealthController::class, 'ready']);
Route::get('/.well-known/jwks.json', JwksController::class);

// Authentication endpoints
Route::prefix('/auth')->group(function (): void {
    Route::post('/register', [AuthController::class, 'register']);
    Route::post('/login', [AuthController::class, 'login']);
    Route::post('/refresh', [AuthController::class, 'refresh']);
    Route::post('/password/reset', [AuthController::class, 'sendPasswordResetLink']);
    Route::post('/service-token', [AuthController::class, 'serviceToken'])->middleware('service.api');

    Route::middleware('auth.jwt')->group(function (): void {
        Route::post('/logout', [AuthController::class, 'logout']);
        Route::get('/me', [AuthController::class, 'me']);
    });
});