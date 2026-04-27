import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../infrastructure/redis/redis.service';

@Injectable()
export class JwtService {
    constructor(
        private configService: ConfigService,
        private redisService: RedisService,
    ) { }

    async validateToken(token: string): Promise<any> {
        try {
            // In production, this would validate RS256 tokens from Auth Service
            // For now, we'll do basic validation

            const secret = this.configService.get<string>('JWT_SECRET');

            // For RS256 in production, we would:
            // 1. Fetch JWKS from Auth Service
            // 2. Verify token signature
            // 3. Check token expiration

            // Basic validation for development
            if (!token) {
                throw new UnauthorizedException('Token is required');
            }

            // TODO: Implement proper RS256 validation with JWKS
            // For now, return mock user data
            return {
                userId: 'mock-user-id',
                email: 'admin@example.com',
                role: 'SUPER_ADMIN',
                permissions: [],
            };
        } catch (error) {
            throw new UnauthorizedException('Invalid token');
        }
    }

    async generateToken(payload: any): Promise<string> {
        // This service is for validation only
        // Token generation happens in Auth Service
        throw new Error('Token generation should be done in Auth Service');
    }
}