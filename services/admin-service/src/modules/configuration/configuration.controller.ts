import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigurationService } from './configuration.service';
import {
    CreateConfigDto,
    UpdateConfigDto,
    BulkUpdateConfigDto,
    ConfigQueryDto,
} from './dto/configuration.dto';

@Controller('configuration')
@UseGuards(JwtAuthGuard, RbacGuard)
export class ConfigurationController {
    constructor(private readonly configurationService: ConfigurationService) { }

    /**
     * Get all configurations
     */
    @Get()
    @RequirePermissions('read:configuration')
    async findAll(@Query() query: ConfigQueryDto) {
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data: await this.configurationService.findAll(query),
        };
    }

    /**
     * Get configuration by key
     */
    @Get(':key')
    @RequirePermissions('read:configuration')
    async findOne(@Param('key') key: string) {
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data: await this.configurationService.findOne(key),
        };
    }

    /**
     * Get configuration value by key
     */
    @Get(':key/value')
    @RequirePermissions('read:configuration')
    async getValue(@Param('key') key: string) {
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data: await this.configurationService.getValue(key),
        };
    }

    /**
     * Get configurations by category
     */
    @Get('category/:category')
    @RequirePermissions('read:configuration')
    async findByCategory(@Param('category') category: string) {
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data: await this.configurationService.findByCategory(category),
        };
    }

    /**
     * Get all system settings
     */
    @Get('system/settings')
    @RequirePermissions('read:configuration')
    async getSystemSettings() {
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data: await this.configurationService.getSystemSettings(),
        };
    }

    /**
     * Create new configuration
     */
    @Post()
    @RequirePermissions('write:configuration')
    async create(@Body() dto: CreateConfigDto, @CurrentUser() user: any) {
        const config = await this.configurationService.create(dto, user.userId);
        return {
            statusCode: HttpStatus.CREATED,
            success: true,
            message: 'Configuration created successfully',
            data: config,
        };
    }

    /**
     * Update configuration
     */
    @Put(':key')
    @RequirePermissions('write:configuration')
    async update(
        @Param('key') key: string,
        @Body() dto: UpdateConfigDto,
        @CurrentUser() user: any,
    ) {
        const config = await this.configurationService.update(key, dto, user.userId);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configuration updated successfully',
            data: config,
        };
    }

    /**
     * Bulk update configurations
     */
    @Post('bulk-update')
    @RequirePermissions('write:configuration')
    async bulkUpdate(
        @Body() dto: BulkUpdateConfigDto,
        @CurrentUser() user: any,
    ) {
        const results = await this.configurationService.bulkUpdate(dto, user.userId);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configurations updated successfully',
            data: results,
        };
    }

    /**
     * Delete configuration
     */
    @Delete(':key')
    @RequirePermissions('delete:configuration')
    async delete(@Param('key') key: string, @CurrentUser() user: any) {
        await this.configurationService.delete(key, user.userId);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configuration deleted successfully',
        };
    }

    /**
     * Reset configuration to default
     */
    @Post(':key/reset')
    @RequirePermissions('write:configuration')
    async resetToDefault(@Param('key') key: string, @CurrentUser() user: any) {
        const config = await this.configurationService.resetToDefault(key, user.userId);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configuration reset to default',
            data: config,
        };
    }
}