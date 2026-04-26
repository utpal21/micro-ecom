import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order, OrderStatus } from './order.entity';

@Entity('order_status_history')
export class OrderStatusHistory {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'order_id', type: 'uuid' })
    orderId!: string;

    @Column({
        name: 'from_status',
        type: 'enum',
        enum: OrderStatus,
        nullable: true,
    })
    fromStatus!: OrderStatus | null;

    @Column({
        name: 'to_status',
        type: 'enum',
        enum: OrderStatus,
    })
    toStatus!: OrderStatus;

    @Column({ name: 'changed_by_user_id', type: 'uuid', nullable: true })
    changedByUserId!: string | null;

    @CreateDateColumn({ name: 'changed_at', type: 'timestamptz' })
    changedAt!: Date;

    @Column({ name: 'reason', type: 'text', nullable: true })
    reason!: string | null;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order!: Order;
}
