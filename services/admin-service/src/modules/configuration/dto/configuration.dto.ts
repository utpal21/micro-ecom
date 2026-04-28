import { IsString, IsOptional, IsBoolean, IsNumber, IsObject, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateConfigurationDto {
    @IsString()
    key: string;

    @IsOptional()
    @IsString()
    value?: string;

    @IsOptional()
    @IsNumber()
    numberValue?: number;

    @IsOptional()
    @IsBoolean()
    booleanValue?: boolean;

    @IsOptional()
    @IsObject()
    jsonValue?: Record<string, any>;

    @IsString()
    category: string;

    @IsOptional()
    @IsString()
    description?: string;
}

export class UpdateConfigurationDto {
    @IsOptional()
    @IsString()
    value?: string;

    @IsOptional()
    @IsNumber()
    numberValue?: number;

    @IsOptional()
    @IsBoolean()
    booleanValue?: boolean;

    @IsOptional()
    @IsObject()
    jsonValue?: Record<string, any>;

    @IsOptional()
    @IsString()
    description?: string;
}

export class BulkUpdateConfigurationDto {
    @IsString()
    category: string;

    @IsObject()
    configurations: Record<string, any>;
}

export class ConfigurationResponseDto {
    key: string;
    value: string | number | boolean | Record<string, any>;
    category: string;
    description: string;
    updatedAt: Date;
    createdAt: Date;
}