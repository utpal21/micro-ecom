import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import { CacheService } from '../../infrastructure/cache/cache.service';
import { AuditService } from '../audit/audit.service';
import { EventPublisherService } from '../../events/event-publisher.service';
import {
    CreateConfigDto,
    UpdateConfigDto,
    BulkUpdateConfigDto,
    ConfigQueryDto,
} from './dto/configuration.dto';

@Injectable()
export class ConfigurationService {
    constructor(
        private prisma: PrismaService,
        private cache: CacheService,
        private audit: AuditService,
        private eventPublisher: EventPublisherService,
    ) { }

    /**
     * Get all configurations
     */
    async findAll(query: ConfigQueryDto) {
        const cacheKey = `configs:${JSON.stringify(query)}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        const where: any = {};
        if (query.category) where.category = query.category;
        if (query.key) where.key = query.key;
        if (query.search) {
            where.OR = [
                { key: { contains: query.search, mode: 'insensitive' } },
                { description: { contains: query.search, mode: 'insensitive' } },
            ];
        }

        const configs = await this.prisma.configuration.findMany({
            where,
            orderBy: { category: 'asc' },
        });

        await this.cache.set(cacheKey, configs, { ttl: 300 }); // Cache for 5 minutes
        return configs;
    }

    /**
     * Get configuration by key
     */
    async findOne(key: string) {
        const cacheKey = `config:${key}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        const config = await this.prisma.configuration.findUnique({
            where: { key },
        });

        if (!config) {
            throw new NotFoundException(`Configuration ${key} not found`);
        }

        await this.cache.set(cacheKey, config, { ttl: 300 });
        return config;
    }

    /**
     * Get configuration value by key
     */
    async getValue(key: string) {
        const config = await this.findOne(key);
        return this.parseValue(config.value, config.type);
    }

    /**
     * Get configurations by category
     */
    async findByCategory(category: string) {
        const cacheKey = `configs:category:${category}`;
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        const configs = await this.prisma.configuration.findMany({
            where: { category },
            orderBy: { key: 'asc' },
        });

        await this.cache.set(cacheKey, configs, { ttl: 300 });
        return configs;
    }

    /**
     * Create new configuration
     */
    async create(dto: CreateConfigDto, userId: string) {
        // Check if key already exists
        const existing = await this.prisma.configuration.findUnique({
            where: { key: dto.key },
        });

        if (existing) {
            throw new ConflictException(`Configuration key ${dto.key} already exists`);
        }

        const config = await this.prisma.configuration.create({
            data: {
                key: dto.key,
                value: dto.value,
                category: dto.category,
                description: dto.description,
                type: dto.type || 'string',
                createdBy: userId,
            },
        });

        // Clear cache
        await this.clearConfigCache();

        // Audit log
        await this.audit.createLog({
            adminId: userId,
            action: 'config.created',
            resourceType: 'configuration',
            resourceId: config.id,
            newValues: { key: config.key, category: config.category },
        });

        // Publish event
        await this.eventPublisher.publishEvent('config.created', {
            config,
            userId,
        });

        return config;
    }

    /**
     * Update configuration
     */
    async update(key: string, dto: UpdateConfigDto, userId: string) {
        const existing = await this.findOne(key);
        const oldValue = existing.value;

        const config = await this.prisma.configuration.update({
            where: { key },
            data: {
                ...(dto.value && { value: dto.value }),
                ...(dto.description && { description: dto.description }),
                updatedBy: userId,
            },
        });

        // Clear cache
        await this.clearConfigCache();

        // Audit log
        await this.audit.createLog({
            adminId: userId,
            action: 'config.updated',
            resourceType: 'configuration',
            resourceId: config.id,
            oldValues: { value: oldValue },
            newValues: { value: config.value },
        });

        return config;
    }

    /**
     * Bulk update configurations
     */
    async bulkUpdate(dto: BulkUpdateConfigDto, userId: string) {
        const updates = Object.entries(dto.configs).map(([key, value]) =>
            this.update(key, { value: String(value) }, userId),
        );

        const results = await Promise.all(updates);
        return results;
    }

    /**
     * Delete configuration
     */
    async delete(key: string, userId: string) {
        const config = await this.findOne(key);

        await this.prisma.configuration.delete({
            where: { key },
        });

        // Clear cache
        await this.clearConfigCache();

        // Audit log
        await this.audit.createLog({
            adminId: userId,
            action: 'config.deleted',
            resourceType: 'configuration',
            resourceId: config.id,
            oldValues: { key: config.key, value: config.value },
        });

        return { message: 'Configuration deleted successfully' };
    }

    /**
     * Get all system settings as key-value pairs
     */
    async getSystemSettings() {
        const cacheKey = 'system:settings';
        const cached = await this.cache.get(cacheKey);
        if (cached) return cached;

        const configs = await this.prisma.configuration.findMany();

        const settings = configs.reduce((acc, config) => {
            acc[config.key] = this.parseValue(config.value, config.type);
            return acc;
        }, {} as Record<string, any>);

        await this.cache.set(cacheKey, settings, { ttl: 600 }); // Cache for 10 minutes
        return settings;
    }

    /**
     * Reset configuration to default
     */
    async resetToDefault(key: string, userId: string) {
        const config = await this.findOne(key);
        const oldValue = config.value;

        const defaultValue = this.getDefaultValue(config.category, key);

        const updated = await this.prisma.configuration.update({
            where: { key },
            data: {
                value: defaultValue,
                updatedBy: userId,
            },
        });

        // Clear cache
        await this.clearConfigCache();

        // Audit log
        await this.audit.createLog({
            adminId: userId,
            action: 'config.reset',
            resourceType: 'configuration',
            resourceId: config.id,
            oldValues: { value: oldValue },
            newValues: { value: defaultValue },
        });

        return updated;
    }

    /**
     * Get default value for configuration
     */
    private getDefaultValue(category: string, key: string): string {
        const defaults: Record<string, any> = {
            general: {
                site_name: 'Micro E-Commerce',
                site_description: 'A modern e-commerce platform',
                contact_email: 'contact@example.com',
                contact_phone: '+1234567890',
            },
            payment: {
                default_payment_method: 'stripe',
                enable_cod: 'true',
                minimum_order_amount: '0',
            },
            shipping: {
                free_shipping_threshold: '100',
                default_shipping_cost: '10',
            },
            tax: {
                tax_rate: '0',
                enable_tax: 'false',
            },
            notification: {
                email_notifications: 'true',
                sms_notifications: 'false',
            },
            security: {
                session_timeout: '3600',
                max_login_attempts: '5',
            },
        };

        return defaults[category]?.[key] || '';
    }

    /**
     * Parse value based on type
     */
    private parseValue(value: string, type: string): any {
        switch (type) {
            case 'number':
                return Number(value);
            case 'boolean':
                return value === 'true';
            case 'json':
                try {
                    return JSON.parse(value);
                } catch {
                    return value;
                }
            default:
                return value;
        }
    }

    /**
     * Clear configuration cache
     */
    private async clearConfigCache() {
        await this.cache.delete('system:settings');
        await this.cache.invalidatePattern('config:*');
        await this.cache.invalidatePattern('configs:*');
    }
}