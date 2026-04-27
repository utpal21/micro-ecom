import { Injectable, Logger } from '@nestjs/common';
import { ClientProxy, ClientProxyFactory, Transport } from '@nestjs/microservices';

@Injectable()
export class VendorEventPublisher {
    private readonly logger = new Logger(VendorEventPublisher.name);
    private readonly client: ClientProxy;

    constructor() {
        this.client = ClientProxyFactory.create({
            transport: Transport.RMQ,
            options: {
                urls: [process.env.RABBITMQ_URL || 'amqp://localhost:5672'],
                queue: 'admin-events',
                queueOptions: {
                    durable: true,
                },
            },
        });
    }

    /**
     * Publish settlement created event
     */
    async publishSettlementCreated(settlement: any) {
        try {
            await this.client.emit('settlement.created', {
                settlementId: settlement.id,
                vendorId: settlement.vendorId,
                totalRevenue: settlement.totalRevenuePaisa,
                commission: settlement.commissionPaisa,
                netPayout: settlement.netPayoutPaisa,
                settlementPeriod: {
                    start: settlement.settlementPeriodStart,
                    end: settlement.settlementPeriodEnd,
                },
                createdAt: settlement.createdAt,
            }).toPromise();

            this.logger.log(`Settlement created event published: ${settlement.id}`);
        } catch (error) {
            this.logger.error(`Error publishing settlement created event: ${error.message}`, error.stack);
            // Don't throw - events should be non-blocking
        }
    }

    /**
     * Publish settlement paid event
     */
    async publishSettlementPaid(settlement: any) {
        try {
            await this.client.emit('settlement.paid', {
                settlementId: settlement.id,
                vendorId: settlement.vendorId,
                netPayout: settlement.netPayoutPaisa,
                processedBy: settlement.processedBy,
                processedAt: settlement.processedAt,
            }).toPromise();

            this.logger.log(`Settlement paid event published: ${settlement.id}`);
        } catch (error) {
            this.logger.error(`Error publishing settlement paid event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish settlement failed event
     */
    async publishSettlementFailed(settlement: any, reason: string) {
        try {
            await this.client.emit('settlement.failed', {
                settlementId: settlement.id,
                vendorId: settlement.vendorId,
                reason,
                failedAt: new Date(),
            }).toPromise();

            this.logger.log(`Settlement failed event published: ${settlement.id}`);
        } catch (error) {
            this.logger.error(`Error publishing settlement failed event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish vendor performance updated event
     */
    async publishVendorPerformanceUpdated(vendorId: string, performance: any) {
        try {
            await this.client.emit('vendor.performance.updated', {
                vendorId,
                performance,
                updatedAt: new Date(),
            }).toPromise();

            this.logger.log(`Vendor performance updated event published: ${vendorId}`);
        } catch (error) {
            this.logger.error(`Error publishing vendor performance updated event: ${error.message}`, error.stack);
        }
    }

    /**
     * Publish settlement calculation triggered event
     */
    async publishSettlementCalculationTriggered(vendorId: string, period: any) {
        try {
            await this.client.emit('settlement.calculation.triggered', {
                vendorId,
                period,
                triggeredAt: new Date(),
            }).toPromise();

            this.logger.log(`Settlement calculation triggered event published: ${vendorId}`);
        } catch (error) {
            this.logger.error(`Error publishing settlement calculation triggered event: ${error.message}`, error.stack);
        }
    }

    async onModuleDestroy() {
        await this.client.close();
    }
}