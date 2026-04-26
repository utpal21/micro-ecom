import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createRemoteJWKSet, jwtVerify } from 'jose';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);
    private jwksCache: ReturnType<typeof createRemoteJWKSet>;

    constructor(private readonly configService: ConfigService) {
        const jwksUrl = this.configService.get<string>('JWKS_URL');
        if (!jwksUrl) {
            throw new Error('JWKS_URL environment variable is not set');
        }
        this.jwksCache = createRemoteJWKSet(new URL(jwksUrl));
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No JWT token provided');
        }

        try {
            const { payload } = await jwtVerify(token, this.jwksCache, {
                issuer: this.configService.get<string>('JWT_ISSUER'),
                audience: this.configService.get<string>('JWT_AUDIENCE'),
            });

            this.logger.debug({
                timestamp: new Date().toISOString(),
                level: 'debug',
                service: 'payment-service',
                traceId: request.traceId,
                requestId: request.id,
                userId: payload.sub,
                message: 'JWT token verified successfully',
            });

            request.user = payload;
            return true;
        } catch (error) {
            this.logger.error({
                timestamp: new Date().toISOString(),
                level: 'error',
                service: 'payment-service',
                traceId: request.traceId,
                requestId: request.id,
                message: 'JWT token verification failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });

            throw new UnauthorizedException('Invalid or expired JWT token');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}