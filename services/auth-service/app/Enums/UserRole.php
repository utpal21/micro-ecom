<?php

declare(strict_types=1);

namespace App\Enums;

enum UserRole: string
{
    case SUPER_ADMIN = 'super_admin';
    case ADMIN = 'admin';
    case FINANCE_MANAGER = 'finance_manager';
    case INVENTORY_MANAGER = 'inventory_manager';
    case SUPPORT_AGENT = 'support_agent';
    case VENDOR = 'vendor';
    case CUSTOMER = 'customer';
}

