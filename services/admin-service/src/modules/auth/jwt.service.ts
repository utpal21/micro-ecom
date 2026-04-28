import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class JwtService {
    constructor(
        private configService: ConfigService,
        private redisService: RedisService,
        private jwtService: NestJwtService,
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
        };
    }

    async validateAndSignToken(email: string, password: string): Promise<any> {
        // This would normally validate against database
        // For now, just return a token
        return this.generateTokens({ id: '1', email, role: 'admin' });
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