<?php

declare(strict_types=1);

namespace App\Support\Auth;

use App\Enums\PermissionSlug;
use App\Enums\UserRole;

final class PermissionMatrix
{
    /**
     * @return list<string>
     */
    public static function permissions(): array
    {
        return array_map(
            static fn (PermissionSlug $permission): string => $permission->value,
            PermissionSlug::cases(),
        );
    }

    /**
     * @return array<string, list<string>>
     */
    public static function rolePermissions(): array
    {
        return [
            UserRole::CUSTOMER->value => [
                PermissionSlug::PRODUCTS_READ->value,
                PermissionSlug::ORDERS_CREATE->value,
                PermissionSlug::ORDERS_READ->value,
                PermissionSlug::PAYMENTS_READ->value,
            ],
            UserRole::VENDOR->value => [
                PermissionSlug::PRODUCTS_READ->value,
                PermissionSlug::PRODUCTS_CREATE->value,
                PermissionSlug::PRODUCTS_UPDATE->value,
                PermissionSlug::PRODUCTS_DELETE->value,
                PermissionSlug::ORDERS_READ->value,
                PermissionSlug::INVENTORY_READ->value,
                PermissionSlug::PAYMENTS_READ->value,
            ],
            UserRole::SUPPORT_AGENT->value => [
                PermissionSlug::PRODUCTS_READ->value,
                PermissionSlug::ORDERS_READ->value,
                PermissionSlug::ORDERS_MANAGE->value,
                PermissionSlug::INVENTORY_READ->value,
                PermissionSlug::PAYMENTS_READ->value,
                PermissionSlug::USERS_MANAGE->value,
            ],
            UserRole::INVENTORY_MANAGER->value => [
                PermissionSlug::PRODUCTS_READ->value,
                PermissionSlug::ORDERS_READ->value,
                PermissionSlug::INVENTORY_READ->value,
                PermissionSlug::INVENTORY_ADJUST->value,
                PermissionSlug::PAYMENTS_READ->value,
            ],
            UserRole::FINANCE_MANAGER->value => [
                PermissionSlug::PRODUCTS_READ->value,
                PermissionSlug::ORDERS_READ->value,
                PermissionSlug::PAYMENTS_READ->value,
                PermissionSlug::PAYMENTS_REFUND->value,
                PermissionSlug::REPORTS_FINANCIAL->value,
            ],
            UserRole::ADMIN->value => self::permissions(),
            UserRole::SUPER_ADMIN->value => self::permissions(),
        ];
    }
}

