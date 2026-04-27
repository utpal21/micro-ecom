import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { JwtService } from './jwt.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(
        private configService: ConfigService,
        private jwtService: JwtService,
    ) {
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: configService.get<string>('JWT_SECRET', 'default-secret-key'),
        });
    }

    async validate(payload: any) {
        // Validate token with custom logic
        const user = await this.jwtService.validateToken(payload);

        if (!user) {
            throw new UnauthorizedException('Invalid token');
        }

        return {
            id: payload.sub,
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            permissions: payload.permissions || [],
        };
    }
}