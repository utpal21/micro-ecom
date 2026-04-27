import { IsString, IsOptional, IsEnum, IsObject } from 'class-validator';

export enum ConfigCategory {
    GENERAL = 'general',
    PAYMENT = 'payment',
    SHIPPING = 'shipping',
    TAX = 'tax',
    NOTIFICATION = 'notification',
    SECURITY = 'security',
    INTEGRATION = 'integration',
}

export class CreateConfigDto {
    @IsString()
    key: string;

    @IsString()
    value: string;

    @IsEnum(ConfigCategory)
    category: ConfigCategory;

    @IsOptional()
    @IsString()
    description?: string;

    @IsOptional()
    @IsString()
    type?: 'string' | 'number' | 'boolean' | 'json';
}

export class UpdateConfigDto {
    @IsOptional()
    @IsString()
    value?: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class BulkUpdateConfigDto {
    @IsObject()
    configs: Record<string, any>;
}

export class ConfigQueryDto {
    @IsOptional()
    @IsEnum(ConfigCategory)
    category?: ConfigCategory;

    @IsOptional()
    @IsString()
    key?: string;

    @IsOptional()
    @IsString()
    search?: string;
}