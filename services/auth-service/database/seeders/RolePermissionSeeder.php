<?php

declare(strict_types=1);

namespace Database\Seeders;

use App\Enums\UserRole;
use App\Support\Auth\PermissionMatrix;
use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;
use Spatie\Permission\PermissionRegistrar;

final class RolePermissionSeeder extends Seeder
{
    public function run(): void
    {
        app(PermissionRegistrar::class)->forgetCachedPermissions();

        foreach (PermissionMatrix::permissions() as $permission) {
            Permission::query()->firstOrCreate([
                'name' => $permission,
                'guard_name' => 'api',
            ]);
        }

        foreach (UserRole::cases() as $roleCase) {
            $role = Role::query()->firstOrCreate([
                'name' => $roleCase->value,
                'guard_name' => 'api',
            ]);

            $role->syncPermissions(PermissionMatrix::rolePermissions()[$roleCase->value] ?? []);
        }
    }
}

