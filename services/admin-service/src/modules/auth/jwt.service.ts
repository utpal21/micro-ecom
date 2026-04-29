import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';
import { PrismaService } from '../../infrastructure/database/prisma.service';

@Injectable()
export class JwtService {
    constructor(
        private configService: ConfigService,
        private redisService: RedisService,
        private jwtService: NestJwtService,
        private prisma: PrismaService,
    ) { }

    async validateToken(token: string): Promise<any> {
        try {
            return this.jwtService.verify(token);
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async generateTokens(payload: any): Promise<any> {
        const accessToken = this.jwtService.sign(payload);

        const refreshToken = this.jwtService.sign(payload);

        // Store refresh token in Redis
        await this.redisService.set(
            `token:${payload.id}`,
            refreshToken,
            7 * 24 * 60 * 60, // 7 days in seconds
        );

        return {
            accessToken,
            refreshToken,
            expiresIn: '15m',
            expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
        };
    }

    async validateAndSignToken(email: string, password: string): Promise<any> {
        // Validate credentials against database
        const admin = await this.prisma.admin.findFirst({
            where: {
                // For now, we'll use the userId as email lookup
                // In production, you'd have a separate email field or use auth service
                role: 'admin' // Get the admin user
            }
        });

        if (!admin) {
            throw new UnauthorizedException('Invalid credentials');
        }

        // In production, verify password hash here
        // For now, we accept any password for testing

        // Build user object with permissions
        // Flatten nested permissions to "resource:action" format
        const permissions: string[] = [];
        if (admin.permissions && typeof admin.permissions === 'object') {
            for (const [resource, actions] of Object.entries(admin.permissions)) {
                if (Array.isArray(actions)) {
                    for (const action of actions) {
                        permissions.push(`${resource}:${action}`);
                    }
                }
            }
        }

        const user = {
            id: admin.userId, // Use userId as the JWT id
            email: email,
            role: admin.role,
            permissions
        };

        const tokens = await this.generateTokens(user);

        return {
            ...tokens,
            user
        };
    }

    async verifyTwoFactor(code: string, user: any): Promise<any> {
        // Verify 2FA code
        return this.generateTokens(user);
    }

    async refreshToken(refreshToken: string): Promise<any> {
        // Validate and refresh token
        const payload = this.jwtService.verify(refreshToken);
        return this.generateTokens(payload);
    }

    async logout(userId: string): Promise<void> {
        // Add token to blacklist or invalidate
        await this.redisService.del(`token:${userId}`);
    }
}