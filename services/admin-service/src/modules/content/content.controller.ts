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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ContentService } from './content.service';
import {
    CreateBannerDto,
    UpdateBannerDto,
    QueryBannersDto,
} from './dto/content.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('Content')
@Controller('content/banners')
@UseGuards(JwtAuthGuard, RbacGuard)
@ApiBearerAuth()
export class ContentController {
    constructor(private readonly contentService: ContentService) { }

    @Get()
    @ApiOperation({ summary: 'Get all banners' })
    @Permissions('banners:read')
    async getBanners(@Query() query: QueryBannersDto) {
        return this.contentService.getBanners(query);
    }

    @Get('active')
    @ApiOperation({ summary: 'Get active banners (public endpoint)' })
    @Public()
    async getActiveBanners() {
        return this.contentService.getActiveBanners();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get banner by ID' })
    @Permissions('banners:read')
    async getBannerById(@Param('id') id: string) {
        return this.contentService.getBannerById(id);
    }

    @Post()
    @ApiOperation({ summary: 'Create a new banner' })
    @Permissions('banners:create')
    async createBanner(
        @Body() createDto: CreateBannerDto,
        @CurrentUser() user: any,
    ) {
        return this.contentService.createBanner(createDto, user.id);
    }

    @Put(':id')
    @ApiOperation({ summary: 'Update banner' })
    @Permissions('banners:update')
    async updateBanner(
        @Param('id') id: string,
        @Body() updateDto: UpdateBannerDto,
        @CurrentUser() user: any,
    ) {
        return this.contentService.updateBanner(id, updateDto, user.id);
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete banner' })
    @Permissions('banners:delete')
    async deleteBanner(@Param('id') id: string, @CurrentUser() user: any) {
        return this.contentService.deleteBanner(id, user.id);
    }

    @Put(':id/toggle-status')
    @ApiOperation({ summary: 'Toggle banner status (active/inactive)' })
    @Permissions('banners:update')
    async toggleBannerStatus(@Param('id') id: string, @CurrentUser() user: any) {
        return this.contentService.toggleBannerStatus(id, user.id);
    }

    @Post('reorder')
    @ApiOperation({ summary: 'Reorder banners' })
    @Permissions('banners:update')
    async reorderBanners(
        @Body() body: { bannerIds: string[] },
        @CurrentUser() user: any,
    ) {
        return this.contentService.reorderBanners(body.bannerIds, user.id);
    }
}