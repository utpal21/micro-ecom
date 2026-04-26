import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { OrderItem } from './order-item.entity';

export enum OrderStatus {
    PENDING = 'PENDING',
    CONFIRMED = 'CONFIRMED',
    PAID = 'PAID',
    SHIPPED = 'SHIPPED',
    DELIVERED = 'DELIVERED',
    CANCELLED = 'CANCELLED',
}

export enum PaymentMethod {
    SSLCOMMERZ = 'sslcommerz',
    COD = 'cod',
}

@Entity('orders')
export class Order {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'user_id', type: 'uuid' })
    userId!: string;

    @Column({
        name: 'status',
        type: 'enum',
        enum: OrderStatus,
        default: OrderStatus.PENDING,
    })
    status!: OrderStatus;

    @Column({
        name: 'payment_method',
        type: 'enum',
        enum: PaymentMethod,
    })
    paymentMethod!: PaymentMethod;

    @Column({ name: 'currency', type: 'varchar', length: 3, default: 'BDT' })
    currency!: string;

    @Column({ name: 'total_amount_paisa', type: 'bigint' })
    totalAmountPaisa!: number;

    @Column({ name: 'idempotency_key', type: 'varchar', length: 255, unique: true })
    idempotencyKey!: string;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @UpdateDateColumn({ name: 'updated_at', type: 'timestamptz' })
    updatedAt!: Date;

    @OneToMany(() => OrderItem, (item) => item.order, { cascade: true })
    items!: OrderItem[];
}
