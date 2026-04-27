/**
 * User roles as enum - single source of truth.
 */
export enum UserRole {
    SUPER_ADMIN = 'super_admin',
    ADMIN = 'admin',
    FINANCE_MANAGER = 'finance_manager',
    INVENTORY_MANAGER = 'inventory_manager',
    CONTENT_MANAGER = 'content_manager',
    SUPPORT_MANAGER = 'support_manager',
    PRODUCT_MANAGER = 'product_manager',
    VENDOR = 'vendor',
    CUSTOMER = 'customer',
}

/**
 * Permissions as enum - single source of truth.
 */
export enum Permission {
    // Product permissions
    PRODUCTS_READ = 'products.read',
    PRODUCTS_CREATE = 'products.create',
    PRODUCTS_UPDATE = 'products.update',
    PRODUCTS_DELETE = 'products.delete',
    PRODUCTS_APPROVE = 'products.approve',
    PRODUCTS_REJECT = 'products.reject',

    // Order permissions
    ORDERS_READ = 'orders.read',
    ORDERS_CREATE = 'orders.create',
    ORDERS_MANAGE = 'orders.manage',
    ORDERS_CANCEL = 'orders.cancel',
    ORDERS_REFUND = 'orders.refund',

    // Inventory permissions
    INVENTORY_READ = 'inventory.read',
    INVENTORY_ADJUST = 'inventory.adjust',
    INVENTORY_MANAGE = 'inventory.manage',

    // Payment permissions
    PAYMENTS_READ = 'payments.read',
    PAYMENTS_REFUND = 'payments.refund',
    PAYMENTS_MANAGE = 'payments.manage',

    // Customer permissions
    CUSTOMERS_READ = 'customers.read',
    CUSTOMERS_MANAGE = 'customers.manage',
    CUSTOMERS_BLOCK = 'customers.block',

    // Vendor permissions
    VENDORS_READ = 'vendors.read',
    VENDORS_MANAGE = 'vendors.manage',
    VENDORS_APPROVE = 'vendors.approve',
    VENDORS_PERFORMANCE_READ = 'vendors.performance.read',

    // Vendor Settlement permissions
    SETTLEMENTS_READ = 'settlements.read',
    SETTLEMENTS_CREATE = 'settlements.create',
    SETTLEMENTS_UPDATE = 'settlements.update',
    SETTLEMENTS_PROCESS = 'settlements.process',

    // Banner permissions
    BANNERS_READ = 'banners.read',
    BANNERS_CREATE = 'banners.create',
    BANNERS_UPDATE = 'banners.update',
    BANNERS_DELETE = 'banners.delete',
    BANNERS_MANAGE = 'banners.manage',

    // Report permissions
    REPORTS_FINANCIAL = 'reports.financial',
    REPORTS_SALES = 'reports.sales',
    REPORTS_INVENTORY = 'reports.inventory',
    REPORTS_CUSTOM = 'reports.custom',

    // Content permissions
    CONTENT_MANAGE = 'content.manage',

    // System permissions
    USERS_MANAGE = 'users.manage',
    ROLES_MANAGE = 'roles.manage',
    SYSTEM_CONFIG = 'system.config',
    AUDIT_LOGS_READ = 'audit.logs.read',
}

/**
 * Role to Permission mapping - enforced at code level.
 */
export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
    [UserRole.SUPER_ADMIN]: Object.values(Permission), // All permissions

    [UserRole.ADMIN]: [
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_CREATE,
        Permission.PRODUCTS_UPDATE,
        Permission.PRODUCTS_APPROVE,
        Permission.ORDERS_READ,
        Permission.ORDERS_MANAGE,
        Permission.INVENTORY_READ,
        Permission.INVENTORY_ADJUST,
        Permission.PAYMENTS_READ,
        Permission.CUSTOMERS_READ,
        Permission.CUSTOMERS_MANAGE,
        Permission.VENDORS_READ,
        Permission.SETTLEMENTS_READ,
        Permission.SETTLEMENTS_CREATE,
        Permission.SETTLEMENTS_UPDATE,
        Permission.SETTLEMENTS_PROCESS,
        Permission.BANNERS_READ,
        Permission.BANNERS_CREATE,
        Permission.BANNERS_UPDATE,
        Permission.BANNERS_DELETE,
        Permission.BANNERS_MANAGE,
        Permission.REPORTS_FINANCIAL,
        Permission.REPORTS_SALES,
        Permission.CONTENT_MANAGE,
        Permission.USERS_MANAGE,
        Permission.AUDIT_LOGS_READ,
    ],

    [UserRole.FINANCE_MANAGER]: [
        Permission.ORDERS_READ,
        Permission.PAYMENTS_READ,
        Permission.PAYMENTS_REFUND,
        Permission.SETTLEMENTS_READ,
        Permission.SETTLEMENTS_CREATE,
        Permission.SETTLEMENTS_UPDATE,
        Permission.SETTLEMENTS_PROCESS,
        Permission.VENDORS_PERFORMANCE_READ,
        Permission.REPORTS_FINANCIAL,
        Permission.REPORTS_SALES,
        Permission.CUSTOMERS_READ,
        Permission.AUDIT_LOGS_READ,
    ],

    [UserRole.INVENTORY_MANAGER]: [
        Permission.INVENTORY_READ,
        Permission.INVENTORY_ADJUST,
        Permission.INVENTORY_MANAGE,
        Permission.REPORTS_INVENTORY,
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_APPROVE,
    ],

    [UserRole.CONTENT_MANAGER]: [
        Permission.BANNERS_READ,
        Permission.BANNERS_CREATE,
        Permission.BANNERS_UPDATE,
        Permission.BANNERS_DELETE,
        Permission.BANNERS_MANAGE,
        Permission.CONTENT_MANAGE,
        Permission.PRODUCTS_READ,
    ],

    [UserRole.SUPPORT_MANAGER]: [
        Permission.ORDERS_READ,
        Permission.CUSTOMERS_READ,
        Permission.CUSTOMERS_MANAGE,
        Permission.AUDIT_LOGS_READ,
    ],

    [UserRole.PRODUCT_MANAGER]: [
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_CREATE,
        Permission.PRODUCTS_UPDATE,
        Permission.INVENTORY_READ,
    ],

    [UserRole.VENDOR]: [
        Permission.PRODUCTS_READ,
        Permission.PRODUCTS_CREATE,
        Permission.PRODUCTS_UPDATE,
        Permission.ORDERS_READ,
        Permission.VENDORS_READ,
        Permission.VENDORS_PERFORMANCE_READ,
    ],

    [UserRole.CUSTOMER]: [
        Permission.PRODUCTS_READ,
        Permission.ORDERS_READ,
        Permission.ORDERS_CREATE,
    ],
};

/**
 * Check if a role has a specific permission.
 */
export function roleHasPermission(role: UserRole, permission: Permission): boolean {
    return ROLE_PERMISSIONS[role]?.includes(permission) || false;
}

/**
 * Get all permissions for a role.
 */
export function getPermissionsForRole(role: UserRole): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}

/**
 * Check if a user has any of the required permissions.
 */
export function hasAnyPermission(userPermissions: Permission[], required: Permission[]): boolean {
    return required.some(perm => userPermissions.includes(perm));
}

/**
 * Check if a user has all required permissions.
 */
export function hasAllPermissions(userPermissions: Permission[], required: Permission[]): boolean {
    return required.every(perm => userPermissions.includes(perm));
}

/**
 * Get all roles that have a specific permission.
 */
export function getRolesWithPermission(permission: Permission): UserRole[] {
    return Object.entries(ROLE_PERMISSIONS)
        .filter(([_, permissions]) => permissions.includes(permission))
        .map(([role]) => role as UserRole);
}