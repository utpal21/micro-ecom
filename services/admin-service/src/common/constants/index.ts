// Admin Roles
export enum AdminRole {
    SUPER_ADMIN = 'SUPER_ADMIN',
    ADMIN = 'ADMIN',
    MODERATOR = 'MODERATOR',
    SUPPORT = 'SUPPORT',
}

// Approval Status
export enum ApprovalStatus {
    PENDING = 'PENDING',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    UNDER_REVIEW = 'UNDER_REVIEW',
}

// Alert Severity
export enum AlertSeverity {
    LOW = 'LOW',
    MEDIUM = 'MEDIUM',
    HIGH = 'HIGH',
    CRITICAL = 'CRITICAL',
}

// Alert Type
export enum AlertType {
    LOW_STOCK = 'LOW_STOCK',
    OUT_OF_STOCK = 'OUT_OF_STOCK',
    OVERSTOCK = 'OVERSTOCK',
    DISCONTINUED = 'DISCONTINUED',
}

// Banner Position
export enum BannerPosition {
    HERO = 'HERO',
    SIDEBAR = 'SIDEBAR',
    FOOTER = 'FOOTER',
    MODAL = 'MODAL',
}

// Settlement Status
export enum SettlementStatus {
    PENDING = 'PENDING',
    PROCESSED = 'PROCESSED',
    FAILED = 'FAILED',
}

// Report Type
export enum ReportType {
    SALES = 'SALES',
    INVENTORY = 'INVENTORY',
    ORDERS = 'ORDERS',
    VENDORS = 'VENDORS',
    PRODUCTS = 'PRODUCTS',
}

// Report Format
export enum ReportFormat {
    PDF = 'PDF',
    CSV = 'CSV',
    EXCEL = 'EXCEL',
}

// Cache TTLs (in seconds)
export const CACHE_TTL = {
    SHORT: 300, // 5 minutes
    MEDIUM: 1800, // 30 minutes
    LONG: 3600, // 1 hour
    VERY_LONG: 86400, // 24 hours
} as const;

// Pagination defaults
export const PAGINATION = {
    DEFAULT_PAGE: 1,
    DEFAULT_LIMIT: 20,
    MAX_LIMIT: 100,
} as const;

// Redis keys
export const REDIS_KEYS = {
    ADMIN: (adminId: string) => `admin:${adminId}`,
    ADMINS_LIST: 'admins:list',
    APPROVAL: (approvalId: string) => `approval:${approvalId}`,
    APPROVALS_LIST: 'approvals:list',
    ALERT: (alertId: string) => `alert:${alertId}`,
    ALERTS_LIST: 'alerts:list',
    REPORT: (reportId: string) => `report:${reportId}`,
    REPORTS_LIST: 'reports:list',
    BANNER: (bannerId: string) => `banner:${bannerId}`,
    BANNERS_LIST: 'banners:list',
    SETTLEMENT: (settlementId: string) => `settlement:${settlementId}`,
    SETTLEMENTS_LIST: 'settlements:list',
} as const;

// RabbitMQ queues and exchanges
export const RABBITMQ = {
    QUEUES: {
        ADMIN_EVENTS: 'admin.events',
        APPROVAL_EVENTS: 'approval.events',
        ALERT_EVENTS: 'alert.events',
    },
    EXCHANGES: {
        ADMIN: 'admin.exchange',
        REPORTS: 'reports.exchange',
        NOTIFICATIONS: 'notifications.exchange',
    },
    ROUTING_KEYS: {
        ADMIN_CREATED: 'admin.created',
        ADMIN_UPDATED: 'admin.updated',
        PRODUCT_APPROVED: 'product.approved',
        PRODUCT_REJECTED: 'product.rejected',
        ALERT_TRIGGERED: 'alert.triggered',
        ALERT_RESOLVED: 'alert.resolved',
    },
} as const;

// Audit actions
export enum AuditAction {
    CREATE = 'CREATE',
    UPDATE = 'UPDATE',
    DELETE = 'DELETE',
    APPROVE = 'APPROVE',
    REJECT = 'REJECT',
    LOGIN = 'LOGIN',
    LOGOUT = 'LOGOUT',
}

// Permissions
export const PERMISSIONS = {
    // Admin management
    CREATE_ADMIN: 'admin:create',
    UPDATE_ADMIN: 'admin:update',
    DELETE_ADMIN: 'admin:delete',
    VIEW_ADMIN: 'admin:view',

    // Product approvals
    APPROVE_PRODUCT: 'product:approve',
    REJECT_PRODUCT: 'product:reject',
    VIEW_APPROVALS: 'product:approvals:view',

    // Inventory alerts
    MANAGE_ALERTS: 'inventory:alerts:manage',
    VIEW_ALERTS: 'inventory:alerts:view',

    // Reports
    GENERATE_REPORTS: 'reports:generate',
    VIEW_REPORTS: 'reports:view',
    DELETE_REPORTS: 'reports:delete',

    // Banners
    MANAGE_BANNERS: 'banners:manage',
    VIEW_BANNERS: 'banners:view',

    // Settlements
    PROCESS_SETTLEMENTS: 'settlements:process',
    VIEW_SETTLEMENTS: 'settlements:view',

    // Audit logs
    VIEW_AUDIT_LOGS: 'audit:logs:view',
} as const;

// Role permissions mapping
export const ROLE_PERMISSIONS = {
    [AdminRole.SUPER_ADMIN]: Object.values(PERMISSIONS),
    [AdminRole.ADMIN]: [
        PERMISSIONS.VIEW_ADMIN,
        PERMISSIONS.APPROVE_PRODUCT,
        PERMISSIONS.REJECT_PRODUCT,
        PERMISSIONS.VIEW_APPROVALS,
        PERMISSIONS.MANAGE_ALERTS,
        PERMISSIONS.VIEW_ALERTS,
        PERMISSIONS.GENERATE_REPORTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.MANAGE_BANNERS,
        PERMISSIONS.VIEW_BANNERS,
        PERMISSIONS.PROCESS_SETTLEMENTS,
        PERMISSIONS.VIEW_SETTLEMENTS,
        PERMISSIONS.VIEW_AUDIT_LOGS,
    ],
    [AdminRole.MODERATOR]: [
        PERMISSIONS.VIEW_APPROVALS,
        PERMISSIONS.VIEW_ALERTS,
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.VIEW_BANNERS,
        PERMISSIONS.VIEW_SETTLEMENTS,
    ],
    [AdminRole.SUPPORT]: [
        PERMISSIONS.VIEW_APPROVALS,
        PERMISSIONS.VIEW_ALERTS,
        PERMISSIONS.VIEW_REPORTS,
    ],
} as const;