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
            passReqToCallback: true, // Enable passing request to callback
        });
    }

    async validate(req: any, payload: any) {
        // Log for debugging
        console.log('[JwtStrategy] Validate called');
        console.log('[JwtStrategy] Request headers:', Object.keys(req.headers));
        console.log('[JwtStrategy] Authorization header:', req.headers?.authorization ? 'Present' : 'Missing');

        // Token is already verified by passport-jwt
        return {
            id: payload.id,
            userId: payload.userId,
            email: payload.email,
            role: payload.role,
            permissions: payload.permissions || [],
        };
    }
}
