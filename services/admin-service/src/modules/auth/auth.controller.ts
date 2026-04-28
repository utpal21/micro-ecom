import { Controller, Post, Body, Get, UseGuards, Request, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { Public } from '../../common/decorators/public.decorator';
import { JwtService as JwtAuthService } from './jwt.service';
import { TwoFactorService } from './two-factor.service';
import { Permissions } from '../../common/decorators/permissions.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

interface LoginDto {
    email: string;
    password: string;
}

interface TwoFactorVerifyDto {
    code: string;
}

interface TwoFactorEnableDto {
    password: string;
}

interface AdminUser {
    id: string;
    email: string;
    role: string;
    permissions: string[];
}

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly jwtAuthService: JwtAuthService,
        private readonly twoFactorService: TwoFactorService,
    ) { }

    @Public()
    @Post('login')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Admin login' })
    @ApiResponse({ status: 200, description: 'Login successful' })
    @ApiResponse({ status: 401, description: 'Invalid credentials' })
    async login(@Body() loginDto: LoginDto) {
        return this.jwtAuthService.validateAndSignToken(loginDto.email, loginDto.password);
    }

    @Public()
    @Post('verify-2fa')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Verify two-factor authentication code' })
    @ApiResponse({ status: 200, description: '2FA verification successful' })
    @ApiResponse({ status: 401, description: 'Invalid 2FA code' })
    async verifyTwoFactor(@Body() twoFactorDto: TwoFactorVerifyDto, @Request() req: any) {
        return this.jwtAuthService.verifyTwoFactor(twoFactorDto.code, req.user);
    }

    @UseGuards(JwtAuthGuard)
    @Get('me')
    @ApiOperation({ summary: 'Get current admin user' })
    @ApiBearerAuth('JWT-auth')
    @ApiResponse({ status: 200, description: 'Returns current user' })
    async getCurrentUser(@CurrentUser() user: AdminUser) {
        return user;
    }

    @UseGuards(JwtAuthGuard)
    @Post('2fa/enable')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Enable two-factor authentication' })
    @ApiBearerAuth('JWT-auth')
    @ApiResponse({ status: 200, description: '2FA enabled' })
    async enableTwoFactor(@Body() dto: TwoFactorEnableDto, @CurrentUser() user: AdminUser) {
        return this.twoFactorService.enableTwoFactor(user.id, dto.password);
    }

    @UseGuards(JwtAuthGuard)
    @Post('2fa/disable')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Disable two-factor authentication' })
    @ApiBearerAuth('JWT-auth')
    @ApiResponse({ status: 200, description: '2FA disabled' })
    async disableTwoFactor(@Body() dto: TwoFactorEnableDto, @CurrentUser() user: AdminUser) {
        return this.twoFactorService.disableTwoFactor(user.id);
    }

    @Public()
    @Post('refresh')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed' })
    async refreshToken(@Body() dto: { refreshToken: string }) {
        return this.jwtAuthService.refreshToken(dto.refreshToken);
    }

    @UseGuards(JwtAuthGuard)
    @Post('logout')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Logout admin user' })
    @ApiBearerAuth('JWT-auth')
    @ApiResponse({ status: 200, description: 'Logout successful' })
    async logout(@CurrentUser() user: AdminUser) {
        return this.jwtAuthService.logout(user.id);
    }
}