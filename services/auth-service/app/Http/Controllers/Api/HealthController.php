<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Redis;

/**
 * @OA\Info(
 *     title="EMP Auth Service API",
 *     version="0.1.0",
 *     description="Authentication and authorization service for Enterprise Marketplace platform",
 *     @OA\Contact(
 *         name="Engineering Team",
 *         email="engineering@enterprise-marketplace.com"
 *     )
 * )
 * 
 * @OA\Server(
 *     url="http://localhost:8001/api",
 *     description="Local development server"
 * )
 * 
 * @OA\Server(
 *     url="https://auth.emp-marketplace.com/api",
 *     description="Production server"
 * )
 * 
 * @OA\Tag(
 *     name="Health",
 *     description="Health check endpoints"
 * )
 * 
 * @OA\Tag(
 *     name="Auth",
 *     description="Authentication endpoints"
 * )
 * 
 * @OA\Tag(
 *     name="JWKS",
 *     description="JWT public keys"
 * )
 * 
 * @OA\SecurityScheme(
 *     securityScheme="bearerAuth",
 *     type="http",
 *     scheme="bearer",
 *     bearerFormat="JWT",
 *     description="JWT token obtained from login endpoint"
 * )
 */
final class HealthController extends Controller
{
    public function live(): JsonResponse
    {
        return response()->json([
            'status' => 'ok',
            'service' => 'auth-service',
        ]);
    }

    public function ready(): JsonResponse
    {
        try {
            DB::connection()->getPdo();
            Redis::ping();

            return response()->json([
                'status' => 'ready',
                'service' => 'auth-service',
            ]);
        } catch (\Throwable) {
            return response()->json([
                'status' => 'not_ready',
                'service' => 'auth-service',
            ], 503);
        }
    }
}