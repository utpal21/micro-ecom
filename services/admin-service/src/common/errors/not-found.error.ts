import { BaseError } from './base.error';

export class NotFoundError extends BaseError {
    constructor(message: string, context?: Record<string, any>) {
        super(message, 'NOT_FOUND', 404, true, context);
    }
}

export class AdminNotFoundError extends NotFoundError {
    constructor(adminId: string) {
        super(`Admin with ID ${adminId} not found`, { adminId });
    }
}

export class ApprovalNotFoundError extends NotFoundError {
    constructor(approvalId: string) {
        super(`Product approval with ID ${approvalId} not found`, { approvalId });
    }
}

export class AlertNotFoundError extends NotFoundError {
    constructor(alertId: string) {
        super(`Inventory alert with ID ${alertId} not found`, { alertId });
    }
}

export class ReportNotFoundError extends NotFoundError {
    constructor(reportId: string) {
        super(`Saved report with ID ${reportId} not found`, { reportId });
    }
}

export class BannerNotFoundError extends NotFoundError {
    constructor(bannerId: string) {
        super(`Banner with ID ${bannerId} not found`, { bannerId });
    }
}

export class SettlementNotFoundError extends NotFoundError {
    constructor(settlementId: string) {
        super(`Vendor settlement with ID ${settlementId} not found`, { settlementId });
    }
}