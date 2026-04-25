import { Injectable } from '@nestjs/common';
import { createLogger, Logger } from '@emp/utils';

export type OrderStatus = 'PENDING' | 'CONFIRMED' | 'PAID' | 'SHIPPED' | 'DELIVERED' | 'CANCELLED';

/**
 * Allowed state transitions for orders.
 * Forbidden transitions MUST throw InvalidOrderTransitionException.
 */
const ALLOWED_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
    PENDING: ['CONFIRMED', 'CANCELLED'],
    CONFIRMED: ['PAID', 'CANCELLED'],
    PAID: ['SHIPPED', 'CANCELLED'],
    SHIPPED: ['DELIVERED'],
    DELIVERED: [],
    CANCELLED: [],
};

@Injectable()
export class OrderStateMachine {
    private logger = createLogger('order-state-machine');

    /**
     * Check if a transition from `fromStatus` to `toStatus` is allowed.
     * @throws InvalidOrderTransitionException if transition is not allowed
     */
    canTransition(fromStatus: OrderStatus, toStatus: OrderStatus): boolean {
        const allowed = ALLOWED_TRANSITIONS[fromStatus]?.includes(toStatus);

        if (!allowed) {
            this.logger.warn('Invalid order transition attempted', {
                fromStatus,
                toStatus,
                allowedTransitions: ALLOWED_TRANSITIONS[fromStatus],
            });
        }

        return allowed;
    }

    /**
     * Validate and execute a state transition.
     * @throws InvalidOrderTransitionException if transition is not allowed
     */
    transition(fromStatus: OrderStatus, toStatus: OrderStatus): void {
        if (!this.canTransition(fromStatus, toStatus)) {
            throw new InvalidOrderTransitionException(fromStatus, toStatus);
        }

        this.logger.info('Order status transition', {
            fromStatus,
            toStatus,
        });
    }

    /**
     * Get all allowed transitions from a given status.
     */
    getAllowedTransitions(fromStatus: OrderStatus): OrderStatus[] {
        return [...(ALLOWED_TRANSITIONS[fromStatus] || [])];
    }
}

/**
 * Custom exception for invalid order transitions.
 */
export class InvalidOrderTransitionException extends Error {
    constructor(
        public readonly fromStatus: OrderStatus,
        public readonly toStatus: OrderStatus,
    ) {
        super(
            `Invalid order transition: cannot change from ${fromStatus} to ${toStatus}`,
        );
        this.name = 'InvalidOrderTransitionException';
    }
}