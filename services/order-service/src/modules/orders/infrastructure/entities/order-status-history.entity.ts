import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order, OrderStatus } from './order.entity';

@Entity('order_status_history')
export class OrderStatusHistory {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    orderId: string;

    @Column({
        type: 'enum',
        enum: OrderStatus,
        nullable: true,
    })
    fromStatus: OrderStatus | null;

    @Column({
        type: 'enum',
        enum: OrderStatus,
    })
    toStatus: OrderStatus;

    @Column({ type: 'uuid', nullable: true })
    changedByUserId: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    changedAt: Date;

    @Column({ type: 'text', nullable: true })
    reason: string | null;

    @ManyToOne(() => Order, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;
}