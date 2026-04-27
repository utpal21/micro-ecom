import { IsString, IsOptional, IsInt, IsEnum, IsUrl, IsDateString } from 'class-validator';

export enum BannerStatus {
    ACTIVE = 'active',
    INACTIVE = 'inactive',
}

export class CreateBannerDto {
    @IsString()
    title: string;

    @IsUrl()
    imageUrl: string;

    @IsUrl()
    @IsOptional()
    linkUrl?: string;

    @IsInt()
    position: number;

    @IsEnum(BannerStatus)
    status: BannerStatus;

    @IsDateString()
    displayFrom: string;

    @IsDateString()
    @IsOptional()
    displayUntil?: string;
}

export class UpdateBannerDto {
    @IsString()
    @IsOptional()
    title?: string;

    @IsUrl()
    @IsOptional()
    imageUrl?: string;

    @IsUrl()
    @IsOptional()
    linkUrl?: string;

    @IsInt()
    @IsOptional()
    position?: number;

    @IsEnum(BannerStatus)
    @IsOptional()
    status?: BannerStatus;

    @IsDateString()
    @IsOptional()
    displayFrom?: string;

    @IsDateString()
    @IsOptional()
    displayUntil?: string;
}

export class QueryBannersDto {
    @IsEnum(BannerStatus)
    @IsOptional()
    status?: BannerStatus;

    @IsString()
    @IsOptional()
    activeOnly?: string;

    @IsInt()
    @IsOptional()
    page?: number;

    @IsInt()
    @IsOptional()
    limit?: number;
}