<?php

declare(strict_types=1);

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Services\Auth\JwksService;
use Illuminate\Http\JsonResponse;

final class JwksController extends Controller
{
    public function __construct(
        private readonly JwksService $jwksService,
    ) {
    }

    public function __invoke(): JsonResponse
    {
        return response()
            ->json($this->jwksService->document())
            ->header('Cache-Control', 'public, max-age=3600');
    }
}

