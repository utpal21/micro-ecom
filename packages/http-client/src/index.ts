import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import CircuitBreaker from 'opossum';
import { createLogger, Logger } from '@emp/utils';

export interface HttpClientConfig {
    baseURL: string;
    timeout?: number;
    retries?: number;
    circuitBreaker?: {
        timeout: number;
        errorThresholdPercentage: number;
        resetTimeout: number;
    };
    logger?: Logger;
}

export class HttpClient {
    private axios: AxiosInstance;
    private circuitBreaker?: CircuitBreaker;
    private logger: Logger;
    private maxRetries: number;

    constructor(config: HttpClientConfig) {
        this.logger = config.logger || createLogger('http-client');
        this.maxRetries = config.retries || 3;

        // Create Axios instance
        this.axios = axios.create({
            baseURL: config.baseURL,
            timeout: config.timeout || 5000,
        });

        // Request interceptor: add trace headers
        this.axios.interceptors.request.use((requestConfig) => {
            const requestId = requestConfig.headers['x-request-id'] || crypto.randomUUID();
            const traceId = requestConfig.headers['x-trace-id'] || crypto.randomUUID();

            requestConfig.headers['x-request-id'] = requestId;
            requestConfig.headers['x-trace-id'] = traceId;

            return requestConfig;
        });

        // Response interceptor: handle errors and retries
        this.axios.interceptors.response.use(
            (response) => response,
            async (error) => {
                if (this.maxRetries > 0 && error.config && !error.config.__isRetry) {
                    const retryCount = error.config.__retryCount || 0;

                    if (retryCount < this.maxRetries) {
                        error.config.__retryCount = retryCount + 1;
                        error.config.__isRetry = true;

                        // Exponential backoff: 1s, 2s, 4s
                        const delay = Math.pow(2, retryCount) * 1000;

                        this.logger.warn('Retrying request', {
                            url: error.config.url,
                            retryCount: retryCount + 1,
                            delay
                        });

                        await new Promise(resolve => setTimeout(resolve, delay));
                        return this.axios.request(error.config);
                    }
                }

                return Promise.reject(error);
            }
        );

        // Circuit breaker configuration
        if (config.circuitBreaker) {
            this.circuitBreaker = new CircuitBreaker(
                (options: AxiosRequestConfig) => this.axios.request(options),
                {
                    timeout: config.circuitBreaker.timeout,
                    errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
                    resetTimeout: config.circuitBreaker.resetTimeout,
                }
            );

            this.circuitBreaker.on('open', () => {
                this.logger.error('Circuit breaker opened', { url: config.baseURL });
            });

            this.circuitBreaker.on('halfOpen', () => {
                this.logger.warn('Circuit breaker half-open', { url: config.baseURL });
            });

            this.circuitBreaker.on('close', () => {
                this.logger.info('Circuit breaker closed', { url: config.baseURL });
            });
        }
    }

    async get<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        if (this.circuitBreaker) {
            return this.circuitBreaker.fire({ ...config, method: 'GET', url });
        }
        return this.axios.get<T>(url, config);
    }

    async post<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        if (this.circuitBreaker) {
            return this.circuitBreaker.fire({ ...config, method: 'POST', url, data });
        }
        return this.axios.post<T>(url, data, config);
    }

    async put<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        if (this.circuitBreaker) {
            return this.circuitBreaker.fire({ ...config, method: 'PUT', url, data });
        }
        return this.axios.put<T>(url, data, config);
    }

    async patch<T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        if (this.circuitBreaker) {
            return this.circuitBreaker.fire({ ...config, method: 'PATCH', url, data });
        }
        return this.axios.patch<T>(url, data, config);
    }

    async delete<T>(url: string, config?: AxiosRequestConfig): Promise<AxiosResponse<T>> {
        if (this.circuitBreaker) {
            return this.circuitBreaker.fire({ ...config, method: 'DELETE', url });
        }
        return this.axios.delete<T>(url, config);
    }

    /**
     * Get circuit breaker state for monitoring
     */
    getCircuitBreakerState(): { state: string; stats: any } | null {
        if (!this.circuitBreaker) {
            return null;
        }

        return {
            state: this.circuitBreaker.opened ? 'OPEN' : (this.circuitBreaker.halfOpen ? 'HALF_OPEN' : 'CLOSED'),
            stats: this.circuitBreaker.stats
        };
    }

    /**
     * Reset circuit breaker manually
     */
    resetCircuitBreaker(): void {
        if (this.circuitBreaker) {
            this.circuitBreaker.open();
            setTimeout(() => this.circuitBreaker?.close(), 1000);
            this.logger.info('Circuit breaker manually reset');
        }
    }
}