import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private jwksCache: ReturnType<typeof createRemoteJWKSet>;

    constructor(private readonly configService: ConfigService) {
        // Initialize JWKS cache
        this.jwksCache = createRemoteJWKSet(new URL(this.configService.jwksUrl));
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No JWT token provided');
        }

        try {
            const { payload } = await jwtVerify(token, this.jwksCache, {
                issuer: this.configService.jwtIssuer,
                audience: this.configService.jwtAudience,
            });

            // Attach user info to request
            request.user = payload;
            return true;
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired JWT token');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}