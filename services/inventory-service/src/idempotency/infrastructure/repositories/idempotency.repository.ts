/**
 * Idempotency PostgreSQL Repository
 * 
 * Ensures events are processed only once for at-least-once delivery guarantees.
 */

import { Injectable, Logger } from '@nestjs/common';
import { Pool } from 'pg';
import { IdempotencyRepositoryInterface } from '../../domain';
import { ConfigService } from '../../../config/config.service';

@Injectable()
export class IdempotencyRepository implements IdempotencyRepositoryInterface {
    private readonly logger = new Logger(IdempotencyRepository.name);
    private readonly tableName = 'processed_events';
    private readonly pool: Pool;

    constructor(private readonly config: ConfigService) {
        // Initialize PostgreSQL pool from config
        this.pool = new Pool({
            host: config.dbHost,
            port: config.dbPort,
            database: config.dbName,
            user: config.dbUser,
            password: config.dbPassword,
            max: 10,
            idleTimeoutMillis: 30000,
            connectionTimeoutMillis: 2000,
        });

        this.pool.on('error', (err) => {
            this.logger.error('Unexpected error on idle client', err);
        });
    }

    async isProcessed(eventId: string): Promise<boolean> {
        const query = `SELECT COUNT(*) FROM ${this.tableName} WHERE event_id = $1`;
        const result = await this.pool.query(query, [eventId]);
        return parseInt(result.rows[0].count, 10) > 0;
    }

    async markAsProcessing(
        eventId: string,
        eventType: string,
        queueName: string,
        payload?: any,
    ): Promise<boolean> {
        const client = await this.pool.connect();
        try {
            await client.query('BEGIN');

            // Check if already processed
            const checkQuery = `SELECT status FROM ${this.tableName} WHERE event_id = $1 FOR UPDATE`;
            const checkResult = await client.query(checkQuery, [eventId]);

            if (checkResult.rows.length > 0) {
                // Event already exists
                const existingStatus = checkResult.rows[0].status;
                await client.query('ROLLBACK');

                // If it's completed, return false (already processed)
                // If it's processing, return false (already being processed)
                // If it's failed, we can retry it
                if (existingStatus === 'completed' || existingStatus === 'processing') {
                    return false;
                }
                // For failed events, we can retry - update to processing
            }

            // Insert or update as processing
            const query = `
                INSERT INTO ${this.tableName} (
                    event_id, event_type, queue_name, payload, status,
                    processed_at, updated_at, retry_count
                ) VALUES ($1, $2, $3, $4, 'processing', NOW(), NOW(), 0)
                ON CONFLICT (event_id) 
                DO UPDATE SET 
                    status = 'processing',
                    retry_count = 0,
                    updated_at = NOW()
                WHERE ${this.tableName}.status != 'completed'
            `;

            await client.query(query, [
                eventId,
                eventType,
                queueName,
                payload ? JSON.stringify(payload) : null,
            ]);

            await client.query('COMMIT');
            return true;
        } catch (error) {
            await client.query('ROLLBACK');
            this.logger.error(`Error marking event ${eventId} as processing:`, error);
            throw error;
        } finally {
            client.release();
        }
    }

    async markAsCompleted(eventId: string): Promise<void> {
        const query = `
            UPDATE ${this.tableName}
            SET status = 'completed', updated_at = NOW()
            WHERE event_id = $1
        `;
        await this.pool.query(query, [eventId]);
    }

    async markAsFailed(
        eventId: string,
        errorMessage: string,
        retryCount: number,
    ): Promise<void> {
        const query = `
            UPDATE ${this.tableName}
            SET status = 'failed', 
                error_message = $2,
                retry_count = $3,
                updated_at = NOW()
            WHERE event_id = $1
        `;
        await this.pool.query(query, [eventId, errorMessage, retryCount]);
    }

    async getStatus(
        eventId: string,
    ): Promise<'processing' | 'completed' | 'failed' | null> {
        const query = `SELECT status FROM ${this.tableName} WHERE event_id = $1`;
        const result = await this.pool.query(query, [eventId]);

        if (result.rows.length === 0) {
            return null;
        }

        return result.rows[0].status;
    }

    async incrementRetryCount(eventId: string): Promise<number> {
        const query = `
            UPDATE ${this.tableName}
            SET retry_count = retry_count + 1, updated_at = NOW()
            WHERE event_id = $1
            RETURNING retry_count
        `;
        const result = await this.pool.query(query, [eventId]);
        return result.rows[0].retry_count;
    }

    async cleanupOldEvents(daysOld: number): Promise<number> {
        const query = `
            DELETE FROM ${this.tableName}
            WHERE processed_at < NOW() - INTERVAL '${daysOld} days'
            AND status = 'completed'
            RETURNING event_id
        `;
        const result = await this.pool.query(query);
        return result.rowCount || 0;
    }

    async getRetryCount(eventId: string): Promise<number> {
        const query = `SELECT retry_count FROM ${this.tableName} WHERE event_id = $1`;
        const result = await this.pool.query(query, [eventId]);

        if (result.rows.length === 0) {
            return 0;
        }

        return result.rows[0].retry_count;
    }
}