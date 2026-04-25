import { OrderStateMachine, InvalidOrderTransitionException } from '../../src/modules/orders/domain/order-state-machine';
import { OrderStatus } from '../../src/modules/orders/infrastructure/entities/order.entity';

describe('OrderStateMachine', () => {
    describe('Allowed Transitions', () => {
        it('should allow transition from PENDING to PAID', () => {
            const machine = new OrderStateMachine();
            machine.canTransition(OrderStatus.PENDING, OrderStatus.PAID);
        });

        it('should allow transition from PAID to PROCESSING', () => {
            const machine = new OrderStateMachine();
            machine.canTransition(OrderStatus.PAID, OrderStatus.PROCESSING);
        });

        it('should allow transition from PROCESSING to SHIPPED', () => {
            const machine = new OrderStateMachine();
            machine.canTransition(OrderStatus.PROCESSING, OrderStatus.SHIPPED);
        });

        it('should allow transition from SHIPPED to DELIVERED', () => {
            const machine = new OrderStateMachine();
            machine.canTransition(OrderStatus.SHIPPED, OrderStatus.DELIVERED);
        });

        it('should allow transition from any status to CANCELLED', () => {
            const machine = new OrderStateMachine();

            machine.canTransition(OrderStatus.PENDING, OrderStatus.CANCELLED);
            machine.canTransition(OrderStatus.PAID, OrderStatus.CANCELLED);
            machine.canTransition(OrderStatus.PROCESSING, OrderStatus.CANCELLED);
            machine.canTransition(OrderStatus.SHIPPED, OrderStatus.CANCELLED);
        });

        it('should allow transition from DELIVERED to RETURNED', () => {
            const machine = new OrderStateMachine();
            machine.canTransition(OrderStatus.DELIVERED, OrderStatus.RETURNED);
        });
    });

    describe('Forbidden Transitions', () => {
        it('should not allow transition from PAID to PENDING', () => {
            const machine = new OrderStateMachine();

            expect(() => {
                machine.canTransition(OrderStatus.PAID, OrderStatus.PENDING);
            }).toThrow(InvalidOrderTransitionException);
        });

        it('should not allow transition from DELIVERED to PAID', () => {
            const machine = new OrderStateMachine();

            expect(() => {
                machine.canTransition(OrderStatus.DELIVERED, OrderStatus.PAID);
            }).toThrow(InvalidOrderTransitionException);
        });

        it('should not allow transition from CANCELLED to any other status', () => {
            const machine = new OrderStateMachine();

            expect(() => {
                machine.canTransition(OrderStatus.CANCELLED, OrderStatus.PAID);
            }).toThrow(InvalidOrderTransitionException);
        });

        it('should not allow transition from PENDING to SHIPPED', () => {
            const machine = new OrderStateMachine();

            expect(() => {
                machine.canTransition(OrderStatus.PENDING, OrderStatus.SHIPPED);
            }).toThrow(InvalidOrderTransitionException);
        });
    });

    describe('InvalidOrderTransitionException', () => {
        it('should have correct error message', () => {
            const machine = new OrderStateMachine();

            try {
                machine.canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING);
                fail('Should have thrown InvalidOrderTransitionException');
            } catch (error) {
                expect(error).toBeInstanceOf(InvalidOrderTransitionException);
                expect((error as InvalidOrderTransitionException).message).toContain(
                    'Cannot transition order from DELIVERED to PENDING'
                );
            }
        });
    });

    describe('Edge Cases', () => {
        it('should throw error for unknown from status', () => {
            const machine = new OrderStateMachine();

            expect(() => {
                // @ts-expect-error - Testing invalid status
                machine.canTransition('UNKNOWN_STATUS' as OrderStatus, OrderStatus.PAID);
            }).toThrow(InvalidOrderTransitionException);
        });

        it('should throw error for unknown to status', () => {
            const machine = new OrderStateMachine();

            expect(() => {
                // @ts-expect-error - Testing invalid status
                machine.canTransition(OrderStatus.PENDING, 'UNKNOWN_STATUS' as OrderStatus);
            }).toThrow(InvalidOrderTransitionException);
        });

        it('should allow same status transition (idempotent)', () => {
            const machine = new OrderStateMachine();

            machine.canTransition(OrderStatus.PENDING, OrderStatus.PENDING);
            machine.canTransition(OrderStatus.PAID, OrderStatus.PAID);
        });
    });
});