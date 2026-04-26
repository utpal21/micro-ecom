import { describe, expect, it } from 'vitest';
import { InvalidOrderTransitionException, OrderStateMachine } from '../../src/modules/orders/domain/order-state-machine';
import { OrderStatus } from '../../src/modules/orders/infrastructure/entities/order.entity';

describe('OrderStateMachine', () => {
    const machine = new OrderStateMachine();

    it('allows documented forward transitions', () => {
        expect(machine.canTransition(OrderStatus.PENDING, OrderStatus.CONFIRMED)).toBe(true);
        expect(machine.canTransition(OrderStatus.CONFIRMED, OrderStatus.PAID)).toBe(true);
        expect(machine.canTransition(OrderStatus.PAID, OrderStatus.SHIPPED)).toBe(true);
        expect(machine.canTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED)).toBe(true);
    });

    it('allows cancellation only from supported states', () => {
        expect(machine.canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED)).toBe(true);
        expect(machine.canTransition(OrderStatus.CONFIRMED, OrderStatus.CANCELLED)).toBe(true);
        expect(machine.canTransition(OrderStatus.PAID, OrderStatus.CANCELLED)).toBe(true);
        expect(machine.canTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED)).toBe(false);
    });

    it('returns allowed transitions for a status', () => {
        expect(machine.getAllowedTransitions(OrderStatus.PENDING)).toEqual([
            OrderStatus.CONFIRMED,
            OrderStatus.CANCELLED,
        ]);
    });

    it('throws on invalid transitions', () => {
        expect(() => machine.transition(OrderStatus.PENDING, OrderStatus.SHIPPED)).toThrow(
            InvalidOrderTransitionException,
        );
        expect(() => machine.transition(OrderStatus.DELIVERED, OrderStatus.PAID)).toThrow(
            InvalidOrderTransitionException,
        );
    });
});
