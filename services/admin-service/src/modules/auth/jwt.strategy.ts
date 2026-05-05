import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        const jwtSecret = configService.get<string>('JWT_SECRET', 'dev-jwt-secret-key-change-in-production');

        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
        });
    }

    async validate(payload: any) {
        // Token is already verified by passport-jwt using the configured secret
        return {
            id: payload.id,
            userId: payload.userId || payload.id,
            email: payload.email,
            role: payload.role,
            permissions: payload.permissions || [],
            // Add service context if this is a service token
            isService: !!payload.service,
            serviceName: payload.serviceName,
        };
    }
}