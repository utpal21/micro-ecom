import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { catchError, retryWhen, delay, tap, timeout } from 'rxjs/operators';

interface RetryConfig {
    maxRetries: number;
    initialDelay: number;
    maxDelay: number;
    backoffMultiplier: number;
}

interface CircuitBreakerConfig {
    failureThreshold: number;
    successThreshold: number;
    timeout: number;
    resetTimeout: number;
}

interface CircuitBreakerState {
    isOpen: boolean;
    failureCount: number;
    successCount: number;
    lastFailureTime?: Date;
}

@Injectable()
export class ResilienceHttpService {
    private readonly logger = new Logger(ResilienceHttpService.name);
    private circuitBreakers = new Map<string, CircuitBreakerState>();

    private readonly defaultRetryConfig: RetryConfig = {
        maxRetries: 3,
        initialDelay: 100,
        maxDelay: 5000,
        backoffMultiplier: 2,
    };

    private readonly defaultCircuitBreakerConfig: CircuitBreakerConfig = {
        failureThreshold: 5,
        successThreshold: 3,
        timeout: 10000,
        resetTimeout: 60000,
    };

    constructor(
        private readonly httpService: HttpService,
        private readonly configService: ConfigService,
    ) { }

    async get<T>(
        url: string,
        options?: any,
        retryConfig?: Partial<RetryConfig>,
        circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    ): Promise<T> {
        return this.makeRequest(
            () => this.httpService.get<T>(url, options),
            url,
            retryConfig,
            circuitBreakerConfig,
        );
    }

    async post<T>(
        url: string,
        data: any,
        options?: any,
        retryConfig?: Partial<RetryConfig>,
        circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    ): Promise<T> {
        return this.makeRequest(
            () => this.httpService.post<T>(url, data, options),
            url,
            retryConfig,
            circuitBreakerConfig,
        );
    }

    async patch<T>(
        url: string,
        data: any,
        options?: any,
        retryConfig?: Partial<RetryConfig>,
        circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    ): Promise<T> {
        return this.makeRequest(
            () => this.httpService.patch<T>(url, data, options),
            url,
            retryConfig,
            circuitBreakerConfig,
        );
    }

    private async makeRequest<T>(
        requestFn: () => ReturnType<typeof this.httpService.get<T>>,
        url: string,
        retryConfig?: Partial<RetryConfig>,
        circuitBreakerConfig?: Partial<CircuitBreakerConfig>,
    ): Promise<T> {
        const serviceName = this.extractServiceName(url);
        const config = { ...this.defaultRetryConfig, ...retryConfig };
        const cbConfig = { ...this.defaultCircuitBreakerConfig, ...circuitBreakerConfig };

        // Check circuit breaker
        if (this.isCircuitOpen(serviceName, cbConfig)) {
            this.logger.warn(`Circuit breaker is OPEN for service: ${serviceName}`);
            throw new HttpException(
                `${serviceName} is temporarily unavailable. Please try again later.`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        try {
            const response = await firstValueFrom(
                requestFn().pipe(
                    timeout(cbConfig.timeout),
                    catchError((error) => {
                        throw this.handleRequestError(error, serviceName);
                    }),
                ),
            );

            // Record success
            this.recordSuccess(serviceName, cbConfig);
            return response.data as T;
        } catch (error) {
            // Record failure
            this.recordFailure(serviceName, cbConfig);
            throw error;
        }
    }

    private isCircuitOpen(serviceName: string, config: CircuitBreakerConfig): boolean {
        const state = this.circuitBreakers.get(serviceName);

        if (!state || !state.isOpen) {
            return false;
        }

        // Check if circuit should be reset
        if (state.lastFailureTime) {
            const timeSinceFailure = Date.now() - state.lastFailureTime.getTime();
            if (timeSinceFailure > config.resetTimeout) {
                this.logger.log(`Circuit breaker reset for service: ${serviceName}`);
                this.circuitBreakers.set(serviceName, {
                    isOpen: false,
                    failureCount: 0,
                    successCount: 0,
                });
                return false;
            }
        }

        return true;
    }

    private recordFailure(serviceName: string, config: CircuitBreakerConfig): void {
        const state = this.circuitBreakers.get(serviceName) || {
            isOpen: false,
            failureCount: 0,
            successCount: 0,
        };

        state.failureCount++;
        state.lastFailureTime = new Date();
        state.successCount = 0;

        if (state.failureCount >= config.failureThreshold) {
            state.isOpen = true;
            this.logger.error(`Circuit breaker OPENED for service: ${serviceName}`);
        }

        this.circuitBreakers.set(serviceName, state);
    }

    private recordSuccess(serviceName: string, config: CircuitBreakerConfig): void {
        const state = this.circuitBreakers.get(serviceName);

        if (!state) {
            return;
        }

        state.successCount++;

        if (state.isOpen && state.successCount >= config.successThreshold) {
            state.isOpen = false;
            state.failureCount = 0;
            state.successCount = 0;
            this.logger.log(`Circuit breaker CLOSED for service: ${serviceName}`);
        }

        this.circuitBreakers.set(serviceName, state);
    }

    private handleRequestError(error: any, serviceName: string): HttpException {
        if (error.code === 'ECONNREFUSED') {
            return new HttpException(
                `${serviceName} is not responding. Service unavailable.`,
                HttpStatus.SERVICE_UNAVAILABLE,
            );
        }

        if (error.code === 'ETIMEDOUT') {
            return new HttpException(
                `${serviceName} request timed out.`,
                HttpStatus.REQUEST_TIMEOUT,
            );
        }

        if (error.response) {
            const status = error.response.status || HttpStatus.INTERNAL_SERVER_ERROR;
            const message = error.response.data?.message || error.message;
            return new HttpException(message, status);
        }

        return new HttpException(
            error.message || `An error occurred while communicating with ${serviceName}`,
            HttpStatus.INTERNAL_SERVER_ERROR,
        );
    }

    private extractServiceName(url: string): string {
        try {
            const urlObj = new URL(url);
            return urlObj.hostname.replace(/\./g, '-');
        } catch {
            return 'unknown-service';
        }
    }

    getCircuitBreakerStates(): Map<string, CircuitBreakerState> {
        return new Map(this.circuitBreakers);
    }
}