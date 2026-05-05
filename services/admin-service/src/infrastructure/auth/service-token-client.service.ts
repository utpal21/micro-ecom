import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../redis/redis.service';
import { sign, SignOptions } from 'jsonwebtoken';

@Injectable()
export class ServiceTokenClient {
    private readonly logger = new Logger(ServiceTokenClient.name);
    private readonly privateKey: string | null = null;
    private readonly serviceName: string;
    private readonly tokenTTL: number;

    constructor(
        private readonly configService: ConfigService,
        private readonly redisService: RedisService,
    ) {
        this.serviceName = this.configService.get<string>('SERVICE_NAME', 'admin-service');
        this.tokenTTL = this.configService.get<number>('SERVICE_TOKEN_TTL', 3600); // 1 hour default

        // Load private key from environment
        // Convert \n to actual newlines for docker-compose compatibility
        const privateKey = this.configService.get<string>('JWT_PRIVATE_KEY');

        // Handle multiple escape sequences
        this.privateKey = privateKey
            ? privateKey.replace(/\\n/g, '\n').replace(/\n\n/g, '\n')
            : null;

        if (!this.privateKey) {
            this.logger.warn(
                'JWT_PRIVATE_KEY not configured. Service tokens will not work. ' +
                'Generate RSA key pair and add JWT_PRIVATE_KEY to .env file.'
            );
        } else {
            this.logger.log('Service token client initialized successfully');
            this.logger.debug(`Private key length: ${this.privateKey.length} chars`);
            this.logger.debug(`Private key starts with: ${this.privateKey.substring(0, 50)}...`);
        }
    }

    /**
     * Get service token for a target service
     * Returns cached token if available, generates new one otherwise
     */
    async getServiceToken(targetService: string): Promise<string> {
        if (!this.privateKey) {
            throw new Error(
                'JWT_PRIVATE_KEY not configured. Cannot generate service tokens. ' +
                'Please configure JWT_PRIVATE_KEY in environment variables.'
            );
        }

        // Try to get from cache first
        const cacheKey = `service_token:${targetService}`;
        const cachedToken = await this.redisService.get(cacheKey);

        if (cachedToken) {
            this.logger.debug(`[getServiceToken] Cache hit for ${targetService}`);
            return cachedToken;
        }

        // Generate new token
        this.logger.debug(`[getServiceToken] Cache miss, generating new token for ${targetService}`);
        return this.generateAndCacheToken(targetService);
    }

    /**
     * Generate new service token and cache it
     */
    private async generateAndCacheToken(targetService: string): Promise<string> {
        const now = Math.floor(Date.now() / 1000);
        const payload = {
            service_name: this.serviceName,
            target_audience: targetService,
            scopes: ['read', 'write', 'update', 'delete'],
            iat: now,
            exp: now + this.tokenTTL,
        };

        const signOptions: SignOptions = {
            algorithm: 'RS256',
        };

        try {
            // Debug: Log private key details before signing
            this.logger.debug(`Attempting to sign with RS256 algorithm`);
            this.logger.debug(`Private key type: ${typeof this.privateKey}`);
            this.logger.debug(`Private key length: ${this.privateKey!.length}`);
            this.logger.debug(`Private key starts with: ${this.privateKey!.substring(0, 50)}...`);
            this.logger.debug(`Private key ends with: ...${this.privateKey!.substring(this.privateKey!.length - 30)}`);

            // Sign with private key (we've already validated it's not null)
            const token = sign(payload, this.privateKey!, signOptions);

            // Cache token in Redis
            const cacheKey = `service_token:${targetService}`;
            await this.redisService.set(cacheKey, token, this.tokenTTL);

            this.logger.log(`Generated new service token for ${targetService} (expires in ${this.tokenTTL}s)`);
            return token;
        } catch (error) {
            this.logger.error(`Failed to generate service token for ${targetService}`);
            this.logger.error(`Error type: ${error.name}`);
            this.logger.error(`Error message: ${error.message}`);
            this.logger.error(`Private key in use: ${this.privateKey!.substring(0, 50)}...`);
            throw new Error(`Failed to generate service token: ${error.message}`);
        }
    }

    /**
     * Clear token cache for a specific service
     */
    async clearTokenCache(targetService: string): Promise<void> {
        const cacheKey = `service_token:${targetService}`;
        await this.redisService.del(cacheKey);
        this.logger.log(`Cleared token cache for ${targetService}`);
    }

    /**
     * Clear all service token caches
     */
    async clearAllTokenCaches(): Promise<void> {
        const keys = await this.redisService.keys('service_token:*');
        if (keys.length > 0) {
            await Promise.all(keys.map(key => this.redisService.del(key)));
            this.logger.log(`Cleared ${keys.length} service token caches`);
        }
    }

    /**
     * Refresh service token for a specific target service
     */
    async refreshServiceToken(targetService: string): Promise<string> {
        await this.clearTokenCache(targetService);
        return this.getServiceToken(targetService);
    }
}