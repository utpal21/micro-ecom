import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './order.entity';

@Entity('order_items')
export class OrderItem {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'uuid' })
    orderId: string;

    @Column({ type: 'varchar', length: 255 })
    sku: string;

    @Column({ type: 'uuid' })
    productId: string;

    @Column({ type: 'int' })
    quantity: number;

    @Column({ type: 'bigint' })
    unitPricePaisa: number;

    @Column({ type: 'bigint' })
    lineTotalPaisa: number;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @ManyToOne(() => Order, (order) => order.items, { onDelete: 'CASCADE' })
    @JoinColumn({ name: 'order_id' })
    order: Order;
}