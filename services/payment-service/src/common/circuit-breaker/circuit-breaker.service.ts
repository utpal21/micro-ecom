import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export enum CircuitBreakerState {
    CLOSED = 'CLOSED',
    OPEN = 'OPEN',
    HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
    failureThreshold: number; // Number of failures before opening
    successThreshold: number; // Number of successes to close from half-open
    timeout: number; // Time in ms to wait before trying half-open
    monitoringPeriod: number; // Time in ms to consider for failure rate
}

export interface CircuitBreakerStats {
    state: CircuitBreakerState;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
    lastSuccessTime?: Date;
    totalRequests: number;
}

@Injectable()
export class CircuitBreakerService {
    private readonly logger = new Logger(CircuitBreakerService.name);
    private readonly circuitBreakers = new Map<string, CircuitBreakerState>();
    private readonly failureCounts = new Map<string, number>();
    private readonly successCounts = new Map<string, number>();
    private readonly lastFailureTimes = new Map<string, Date>();
    private readonly lastSuccessTimes = new Map<string, Date>();
    private readonly totalRequests = new Map<string, number>();

    private readonly defaultOptions: CircuitBreakerOptions = {
        failureThreshold: 5,
        successThreshold: 2,
        timeout: 60000, // 1 minute
        monitoringPeriod: 300000, // 5 minutes
    };

    constructor(private configService: ConfigService) { }

    async execute<T>(
        name: string,
        fn: () => Promise<T>,
        options?: Partial<CircuitBreakerOptions>,
    ): Promise<T> {
        const opts = { ...this.defaultOptions, ...options };
        const state = this.getState(name);

        if (state === CircuitBreakerState.OPEN) {
            const lastFailure = this.lastFailureTimes.get(name);
            if (lastFailure && Date.now() - lastFailure.getTime() > opts.timeout) {
                this.setState(name, CircuitBreakerState.HALF_OPEN);
                this.logger.warn(
                    `Circuit breaker ${name} transitioning to HALF_OPEN`,
                );
            } else {
                this.logger.warn(
                    `Circuit breaker ${name} is OPEN, rejecting request`,
                );
                throw new Error(
                    `Circuit breaker ${name} is OPEN - service unavailable`,
                );
            }
        }

        const requestCount = (this.totalRequests.get(name) || 0) + 1;
        this.totalRequests.set(name, requestCount);

        try {
            const result = await fn();

            this.recordSuccess(name, opts);
            return result;
        } catch (error) {
            this.recordFailure(name, opts);
            throw error;
        }
    }

    private recordSuccess(name: string, options: CircuitBreakerOptions): void {
        const state = this.getState(name);
        const successCount = (this.successCounts.get(name) || 0) + 1;
        this.successCounts.set(name, successCount);
        this.lastSuccessTimes.set(name, new Date());
        this.failureCounts.set(name, 0); // Reset failure count on success

        this.logger.debug(
            `Circuit breaker ${name}: Success recorded (${successCount}/${options.successThreshold})`,
        );

        if (state === CircuitBreakerState.HALF_OPEN) {
            if (successCount >= options.successThreshold) {
                this.setState(name, CircuitBreakerState.CLOSED);
                this.logger.log(`Circuit breaker ${name} reset to CLOSED`);
            }
        }
    }

    private recordFailure(name: string, options: CircuitBreakerOptions): void {
        const state = this.getState(name);
        const failureCount = (this.failureCounts.get(name) || 0) + 1;
        this.failureCounts.set(name, failureCount);
        this.lastFailureTimes.set(name, new Date());
        this.successCounts.set(name, 0); // Reset success count on failure

        this.logger.debug(
            `Circuit breaker ${name}: Failure recorded (${failureCount}/${options.failureThreshold})`,
        );

        if (state === CircuitBreakerState.HALF_OPEN ||
            (state === CircuitBreakerState.CLOSED && failureCount >= options.failureThreshold)) {
            this.setState(name, CircuitBreakerState.OPEN);
            this.logger.warn(`Circuit breaker ${name} opened due to ${failureCount} failures`);
        }
    }

    private getState(name: string): CircuitBreakerState {
        return (
            this.circuitBreakers.get(name) || CircuitBreakerState.CLOSED
        );
    }

    private setState(name: string, state: CircuitBreakerState): void {
        this.circuitBreakers.set(name, state);
        this.failureCounts.set(name, 0);
        this.successCounts.set(name, 0);
    }

    getStats(name: string): CircuitBreakerStats {
        return {
            state: this.getState(name),
            failureCount: this.failureCounts.get(name) || 0,
            successCount: this.successCounts.get(name) || 0,
            lastFailureTime: this.lastFailureTimes.get(name),
            lastSuccessTime: this.lastSuccessTimes.get(name),
            totalRequests: this.totalRequests.get(name) || 0,
        };
    }

    getAllStats(): Map<string, CircuitBreakerStats> {
        const stats = new Map<string, CircuitBreakerStats>();
        for (const [name] of this.circuitBreakers) {
            stats.set(name, this.getStats(name));
        }
        return stats;
    }

    reset(name: string): void {
        this.setState(name, CircuitBreakerState.CLOSED);
        this.totalRequests.set(name, 0);
        this.logger.log(`Circuit breaker ${name} manually reset to CLOSED`);
    }

    resetAll(): void {
        for (const [name] of this.circuitBreakers) {
            this.reset(name);
        }
    }
}