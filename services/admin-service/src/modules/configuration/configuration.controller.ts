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
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { ConfigurationService } from './configuration.service';
import {
    CreateConfigurationDto,
    UpdateConfigurationDto,
    BulkUpdateConfigurationDto,
    ConfigurationResponseDto,
} from './dto/configuration.dto';

@ApiTags('Configuration')
@Controller('configuration')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class ConfigurationController {
    constructor(private readonly configurationService: ConfigurationService) { }

    @Get()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get all configurations' })
    @ApiResponse({ status: HttpStatus.OK, type: [ConfigurationResponseDto] })
    @RequirePermissions('configuration:read')
    async findAll(@Query('category') category?: string) {
        const data = await this.configurationService.findAll(category);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data,
        };
    }

    @Get(':key')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get configuration by key' })
    @ApiResponse({ status: HttpStatus.OK, type: ConfigurationResponseDto })
    @RequirePermissions('configuration:read')
    async findOne(@Param('key') key: string) {
        const data = await this.configurationService.findOne(key);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data,
        };
    }

    @Get('category/:category')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get configurations by category' })
    @ApiResponse({ status: HttpStatus.OK, type: [ConfigurationResponseDto] })
    @RequirePermissions('configuration:read')
    async findByCategory(@Param('category') category: string) {
        const data = await this.configurationService.findByCategory(category);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data,
        };
    }

    @Get('system/settings')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Get system settings' })
    @ApiResponse({ status: HttpStatus.OK, type: [ConfigurationResponseDto] })
    @RequirePermissions('configuration:read')
    async getSystemSettings() {
        const data = await this.configurationService.findByCategory('system');
        return {
            statusCode: HttpStatus.OK,
            success: true,
            data,
        };
    }

    @Post()
    @HttpCode(HttpStatus.CREATED)
    @ApiOperation({ summary: 'Create new configuration' })
    @ApiResponse({ status: HttpStatus.CREATED, type: ConfigurationResponseDto })
    @RequirePermissions('configuration:create')
    async create(
        @Body() createConfigurationDto: CreateConfigurationDto,
        @CurrentUser() user: any,
    ) {
        const data = await this.configurationService.create(
            createConfigurationDto,
            user?.userId,
        );
        return {
            statusCode: HttpStatus.CREATED,
            success: true,
            message: 'Configuration created successfully',
            data,
        };
    }

    @Put(':key')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update configuration' })
    @ApiResponse({ status: HttpStatus.OK, type: ConfigurationResponseDto })
    @RequirePermissions('configuration:update')
    async update(
        @Param('key') key: string,
        @Body() updateConfigurationDto: UpdateConfigurationDto,
        @CurrentUser() user: any,
    ) {
        const data = await this.configurationService.update(
            key,
            updateConfigurationDto,
            user?.userId,
        );
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configuration updated successfully',
            data,
        };
    }

    @Put('bulk/update')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Bulk update configurations' })
    @ApiResponse({ status: HttpStatus.OK, type: [ConfigurationResponseDto] })
    @RequirePermissions('configuration:update')
    async bulkUpdate(
        @Body() bulkUpdateDto: BulkUpdateConfigurationDto,
        @CurrentUser() user: any,
    ) {
        const data = await this.configurationService.bulkUpdate(bulkUpdateDto, user?.userId);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configurations updated successfully',
            data,
        };
    }

    @Delete(':key')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Delete configuration' })
    @ApiResponse({ status: HttpStatus.OK })
    @RequirePermissions('configuration:delete')
    async remove(@Param('key') key: string, @CurrentUser() user: any) {
        await this.configurationService.remove(key, user?.userId);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configuration deleted successfully',
        };
    }

    @Put('category/:category/reset')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Reset category to default values' })
    @ApiResponse({ status: HttpStatus.OK, type: [ConfigurationResponseDto] })
    @RequirePermissions('configuration:update')
    async resetToDefault(
        @Param('category') category: string,
        @CurrentUser() user: any,
    ) {
        const data = await this.configurationService.resetToDefault(category, user?.userId);
        return {
            statusCode: HttpStatus.OK,
            success: true,
            message: 'Configurations reset to default',
            data,
        };
    }
}