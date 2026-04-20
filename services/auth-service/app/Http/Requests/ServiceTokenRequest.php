<?php

declare(strict_types=1);

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

final class ServiceTokenRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'service_name' => ['required', 'string'],
            'target_audience' => ['required', 'string'],
            'scopes' => ['sometimes', 'array'],
            'scopes.*' => ['string'],
        ];
    }
}

