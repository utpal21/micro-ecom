import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum OutboxStatus {
    PENDING = 'PENDING',
    PUBLISHED = 'PUBLISHED',
    FAILED = 'FAILED',
}

@Entity('outbox_events')
export class OutboxEvent {
    @PrimaryGeneratedColumn('uuid')
    id!: string;

    @Column({ name: 'event_type', type: 'varchar', length: 255 })
    eventType!: string;

    @Column({ name: 'payload', type: 'jsonb' })
    payload!: Record<string, unknown>;

    @Column({
        type: 'enum',
        enum: OutboxStatus,
        default: OutboxStatus.PENDING,
    })
    status!: OutboxStatus;

    @Column({ name: 'attempts', type: 'int', default: 0 })
    attempts!: number;

    @Column({ name: 'last_error', type: 'text', nullable: true })
    lastError!: string | null;

    @CreateDateColumn({ name: 'created_at', type: 'timestamptz' })
    createdAt!: Date;

    @Column({ name: 'published_at', type: 'timestamptz', nullable: true })
    publishedAt!: Date | null;
}
