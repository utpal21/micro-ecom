import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../../infrastructure/database/prisma.service';
import {
    CreateConfigurationDto,
    UpdateConfigurationDto,
    BulkUpdateConfigurationDto,
    ConfigurationResponseDto
} from './dto/configuration.dto';

@Injectable()
export class ConfigurationService {
    private readonly logger = new Logger(ConfigurationService.name);

    constructor(private prisma: PrismaService) { }

    async findAll(category?: string): Promise<ConfigurationResponseDto[]> {
        const where = category ? { category } : {};

        const configurations = await this.prisma.configuration.findMany({
            where,
            orderBy: { category: 'asc' },
        });

        return configurations.map(this.mapToResponse);
    }

    async findOne(key: string): Promise<ConfigurationResponseDto> {
        const configuration = await this.prisma.configuration.findUnique({
            where: { key },
        });

        if (!configuration) {
            throw new NotFoundException(`Configuration with key "${key}" not found`);
        }

        return this.mapToResponse(configuration);
    }

    async findByCategory(category: string): Promise<ConfigurationResponseDto[]> {
        const configurations = await this.prisma.configuration.findMany({
            where: { category },
            orderBy: { key: 'asc' },
        });

        return configurations.map(this.mapToResponse);
    }

    async create(
        createConfigurationDto: CreateConfigurationDto,
        userId?: string
    ): Promise<ConfigurationResponseDto> {
        try {
            const configuration = await this.prisma.configuration.create({
                data: {
                    ...createConfigurationDto,
                    createdBy: userId,
                },
            });

            this.logger.log(`Configuration "${configuration.key}" created by ${userId || 'system'}`);

            return this.mapToResponse(configuration);
        } catch (error) {
            if (error.code === 'P2002') {
                throw new Error(`Configuration with key "${createConfigurationDto.key}" already exists`);
            }
            throw error;
        }
    }

    async update(
        key: string,
        updateConfigurationDto: UpdateConfigurationDto,
        userId?: string
    ): Promise<ConfigurationResponseDto> {
        const configuration = await this.prisma.configuration.findUnique({
            where: { key },
        });

        if (!configuration) {
            throw new NotFoundException(`Configuration with key "${key}" not found`);
        }

        const updated = await this.prisma.configuration.update({
            where: { key },
            data: {
                ...updateConfigurationDto,
                updatedBy: userId,
            },
        });

        this.logger.log(`Configuration "${key}" updated by ${userId || 'system'}`);

        return this.mapToResponse(updated);
    }

    async bulkUpdate(
        bulkUpdateDto: BulkUpdateConfigurationDto,
        userId?: string
    ): Promise<ConfigurationResponseDto[]> {
        const results: ConfigurationResponseDto[] = [];

        for (const [key, value] of Object.entries(bulkUpdateDto.configurations)) {
            try {
                const updateDto: UpdateConfigurationDto = { value: String(value) };
                const updated = await this.update(key, updateDto, userId);
                results.push(updated);
            } catch (error) {
                this.logger.error(`Failed to update configuration "${key}": ${error.message}`);
                // Continue with other configurations
            }
        }

        return results;
    }

    async remove(key: string, userId?: string): Promise<void> {
        const configuration = await this.prisma.configuration.findUnique({
            where: { key },
        });

        if (!configuration) {
            throw new NotFoundException(`Configuration with key "${key}" not found`);
        }

        await this.prisma.configuration.delete({
            where: { key },
        });

        this.logger.log(`Configuration "${key}" deleted by ${userId || 'system'}`);
    }

    async resetToDefault(category: string, userId?: string): Promise<ConfigurationResponseDto[]> {
        // Get all configurations in the category
        const configurations = await this.prisma.configuration.findMany({
            where: { category },
        });

        // Reset to default values (stored in jsonValue.default)
        const results: ConfigurationResponseDto[] = [];

        for (const config of configurations) {
            try {
                // Safely access default value from jsonValue
                const jsonValue = config.jsonValue as any;
                const defaultValue = jsonValue?.default;
                if (defaultValue !== undefined) {
                    const updateDto: UpdateConfigurationDto = { value: String(defaultValue) };
                    const updated = await this.update(config.key, updateDto, userId);
                    results.push(updated);
                }
            } catch (error) {
                this.logger.error(`Failed to reset configuration "${config.key}": ${error.message}`);
            }
        }

        return results;
    }

    private mapToResponse(config: any): ConfigurationResponseDto {
        // Determine which value field to use
        let value: string | number | boolean | Record<string, any>;

        if (config.numberValue !== null) {
            value = config.numberValue;
        } else if (config.booleanValue !== null) {
            value = config.booleanValue;
        } else if (config.jsonValue !== null) {
            value = config.jsonValue;
        } else {
            value = config.value;
        }

        return {
            key: config.key,
            value,
            category: config.category,
            description: config.description,
            updatedAt: config.updatedAt,
            createdAt: config.createdAt,
        };
    }
}