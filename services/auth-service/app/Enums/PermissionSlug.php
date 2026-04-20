<?php

declare(strict_types=1);

namespace App\Enums;

enum PermissionSlug: string
{
    case PRODUCTS_READ = 'products.read';
    case PRODUCTS_CREATE = 'products.create';
    case PRODUCTS_UPDATE = 'products.update';
    case PRODUCTS_DELETE = 'products.delete';
    case ORDERS_CREATE = 'orders.create';
    case ORDERS_READ = 'orders.read';
    case ORDERS_MANAGE = 'orders.manage';
    case INVENTORY_READ = 'inventory.read';
    case INVENTORY_ADJUST = 'inventory.adjust';
    case PAYMENTS_READ = 'payments.read';
    case PAYMENTS_REFUND = 'payments.refund';
    case REPORTS_FINANCIAL = 'reports.financial';
    case USERS_MANAGE = 'users.manage';
    case ROLES_MANAGE = 'roles.manage';
    case SYSTEM_CONFIG = 'system.config';
}

