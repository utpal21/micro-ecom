import { Injectable, OnModuleInit } from '@nestjs/common';
import { Counter, Histogram, Registry, Summary, Gauge } from 'prom-client';

@Injectable()
export class MetricsService implements OnModuleInit {
    private readonly registry = new Registry();

    // Payment Metrics
    private paymentTotal: Counter;
    private paymentSuccess: Counter;
    private paymentFailed: Counter;
    private paymentDuration: Histogram;
    private paymentAmount: Summary;

    // Gateway Metrics
    private gatewayCalls: Counter;
    private gatewayErrors: Counter;
    private gatewayLatency: Histogram;

    // Ledger Metrics
    private ledgerTransactions: Counter;
    private ledgerBalance: Gauge;

    // Database Metrics
    private dbQueries: Counter;
    private dbQueryDuration: Histogram;

    // Cache Metrics
    private cacheHits: Counter;
    private cacheMisses: Counter;

    onModuleInit() {
        this.initializeMetrics();
    }

    private initializeMetrics() {
        // Payment Metrics
        this.paymentTotal = new Counter({
            name: 'payment_service_payments_total',
            help: 'Total number of payments created',
            labelNames: ['gateway', 'currency'],
            registers: [this.registry],
        });

        this.paymentSuccess = new Counter({
            name: 'payment_service_payments_success_total',
            help: 'Total number of successful payments',
            labelNames: ['gateway'],
            registers: [this.registry],
        });

        this.paymentFailed = new Counter({
            name: 'payment_service_payments_failed_total',
            help: 'Total number of failed payments',
            labelNames: ['gateway', 'error_type'],
            registers: [this.registry],
        });

        this.paymentDuration = new Histogram({
            name: 'payment_service_payment_duration_seconds',
            help: 'Payment processing duration in seconds',
            labelNames: ['gateway'],
            buckets: [0.1, 0.5, 1, 2, 5, 10],
            registers: [this.registry],
        });

        this.paymentAmount = new Summary({
            name: 'payment_service_payment_amount',
            help: 'Payment amounts',
            labelNames: ['currency', 'gateway'],
            percentiles: [0.5, 0.9, 0.95, 0.99],
            registers: [this.registry],
        });

        // Gateway Metrics
        this.gatewayCalls = new Counter({
            name: 'payment_service_gateway_calls_total',
            help: 'Total number of gateway API calls',
            labelNames: ['gateway', 'operation'],
            registers: [this.registry],
        });

        this.gatewayErrors = new Counter({
            name: 'payment_service_gateway_errors_total',
            help: 'Total number of gateway API errors',
            labelNames: ['gateway', 'operation', 'error_type'],
            registers: [this.registry],
        });

        this.gatewayLatency = new Histogram({
            name: 'payment_service_gateway_latency_seconds',
            help: 'Gateway API latency in seconds',
            labelNames: ['gateway', 'operation'],
            buckets: [0.01, 0.05, 0.1, 0.5, 1, 2],
            registers: [this.registry],
        });

        // Ledger Metrics
        this.ledgerTransactions = new Counter({
            name: 'payment_service_ledger_transactions_total',
            help: 'Total number of ledger transactions',
            labelNames: ['account_type', 'transaction_type'],
            registers: [this.registry],
        });

        this.ledgerBalance = new Gauge({
            name: 'payment_service_ledger_balance',
            help: 'Account balances',
            labelNames: ['account_id', 'account_type'],
            registers: [this.registry],
        });

        // Database Metrics
        this.dbQueries = new Counter({
            name: 'payment_service_db_queries_total',
            help: 'Total number of database queries',
            labelNames: ['operation', 'table'],
            registers: [this.registry],
        });

        this.dbQueryDuration = new Histogram({
            name: 'payment_service_db_query_duration_seconds',
            help: 'Database query duration in seconds',
            labelNames: ['operation', 'table'],
            buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5],
            registers: [this.registry],
        });

        // Cache Metrics
        this.cacheHits = new Counter({
            name: 'payment_service_cache_hits_total',
            help: 'Total number of cache hits',
            labelNames: ['cache_type'],
            registers: [this.registry],
        });

        this.cacheMisses = new Counter({
            name: 'payment_service_cache_misses_total',
            help: 'Total number of cache misses',
            labelNames: ['cache_type'],
            registers: [this.registry],
        });
    }

    // Payment Metrics Methods
    recordPaymentCreated(gateway: string, currency: string): void {
        this.paymentTotal.inc({ gateway, currency });
    }

    recordPaymentSuccess(gateway: string): void {
        this.paymentSuccess.inc({ gateway });
    }

    recordPaymentFailed(gateway: string, errorType: string): void {
        this.paymentFailed.inc({ gateway, error_type: errorType });
    }

    recordPaymentDuration(gateway: string, duration: number): void {
        this.paymentDuration.observe({ gateway }, duration);
    }

    recordPaymentAmount(currency: string, gateway: string, amount: number): void {
        this.paymentAmount.observe({ currency, gateway }, amount);
    }

    // Gateway Metrics Methods
    recordGatewayCall(gateway: string, operation: string): void {
        this.gatewayCalls.inc({ gateway, operation });
    }

    recordGatewayError(gateway: string, operation: string, errorType: string): void {
        this.gatewayErrors.inc({ gateway, operation, error_type: errorType });
    }

    recordGatewayLatency(gateway: string, operation: string, latency: number): void {
        this.gatewayLatency.observe({ gateway, operation }, latency);
    }

    // Ledger Metrics Methods
    recordLedgerTransaction(accountType: string, transactionType: string): void {
        this.ledgerTransactions.inc({ account_type: accountType, transaction_type: transactionType });
    }

    recordLedgerBalance(accountId: string, accountType: string, balance: number): void {
        this.ledgerBalance.set({ account_id: accountId, account_type: accountType }, balance);
    }

    // Database Metrics Methods
    recordDbQuery(operation: string, table: string): void {
        this.dbQueries.inc({ operation, table });
    }

    recordDbQueryDuration(operation: string, table: string, duration: number): void {
        this.dbQueryDuration.observe({ operation, table }, duration);
    }

    // Cache Metrics Methods
    recordCacheHit(cacheType: string): void {
        this.cacheHits.inc({ cache_type: cacheType });
    }

    recordCacheMiss(cacheType: string): void {
        this.cacheMisses.inc({ cache_type: cacheType });
    }

    // Get Metrics
    async getMetrics(): Promise<string> {
        return this.registry.metrics();
    }

    getContentType(): string {
        return this.registry.contentType;
    }
}