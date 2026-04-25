import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum OutboxStatus {
    PENDING = 'PENDING',
    PUBLISHED = 'PUBLISHED',
    FAILED = 'FAILED',
}

@Entity('outbox_events')
export class OutboxEvent {
    @PrimaryGeneratedColumn('uuid')
    id: string;

    @Column({ type: 'varchar', length: 255 })
    eventType: string;

    @Column({ type: 'jsonb' })
    payload: Record<string, unknown>;

    @Column({
        type: 'enum',
        enum: OutboxStatus,
        default: OutboxStatus.PENDING,
    })
    status: OutboxStatus;

    @Column({ type: 'int', default: 0 })
    attempts: number;

    @Column({ type: 'text', nullable: true })
    lastError: string | null;

    @CreateDateColumn({ type: 'timestamptz' })
    createdAt: Date;

    @Column({ type: 'timestamptz', nullable: true })
    publishedAt: Date | null;
}