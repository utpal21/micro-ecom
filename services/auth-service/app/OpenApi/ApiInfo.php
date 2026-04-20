<?php

declare(strict_types=1);

namespace App\OpenApi;

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
class ApiInfo
{
}