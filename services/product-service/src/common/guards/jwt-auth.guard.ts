import {
    Injectable,
    CanActivate,
    ExecutionContext,
    UnauthorizedException,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '../../config/config.service';
import { createRemoteJWKSet, jwtVerify, importJWK } from 'jose';
import { verify as jwtVerifyLegacy } from 'jsonwebtoken';

@Injectable()
export class JwtAuthGuard implements CanActivate {
    private readonly logger = new Logger(JwtAuthGuard.name);
    private jwksCache: ReturnType<typeof createRemoteJWKSet>;
    private adminPublicKey: string | null = null;

    constructor(private readonly configService: ConfigService) {
        // Initialize JWKS cache for auth-service tokens
        this.jwksCache = createRemoteJWKSet(new URL(this.configService.jwksUrl));

        // Load admin-service public key for service token verification
        // Convert \n to actual newlines for docker-compose compatibility
        const publicKey = this.configService.adminServicePublicKey;
        this.adminPublicKey = publicKey ? publicKey.replace(/\\n/g, '\n').replace(/\n\n/g, '\n') : null;

        if (this.adminPublicKey) {
            this.logger.log('Admin service public key loaded - service token verification enabled');
            this.logger.debug(`Public key length: ${this.adminPublicKey.length} chars`);
        } else {
            this.logger.warn('Admin service public key not configured - service tokens will not be accepted');
        }
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);

        if (!token) {
            throw new UnauthorizedException('No JWT token provided');
        }

        try {
            // First, try to verify as auth-service user token (JWKS)
            try {
                const { payload } = await jwtVerify(token, this.jwksCache, {
                    issuer: this.configService.jwtIssuer,
                    audience: this.configService.jwtAudience,
                });

                // Attach user info to request
                request.user = payload;
                request.authType = 'user';
                return true;
            } catch (userTokenError) {
                // User token validation failed, try service token
                this.logger.debug('User token validation failed, trying service token');
            }

            // Try to verify as admin-service service token (RSA public key)
            if (this.adminPublicKey) {
                try {
                    const decoded = jwtVerifyLegacy(token, this.adminPublicKey, {
                        algorithms: ['RS256'],
                    }) as any;

                    // Verify it's a service token
                    if (decoded.service_name === 'admin-service' && decoded.target_audience === 'product-service') {
                        this.logger.debug('Service token verified successfully');
                        request.user = decoded;
                        request.authType = 'service';
                        request.service = {
                            name: decoded.service_name,
                            scopes: decoded.scopes,
                        };
                        return true;
                    } else {
                        this.logger.warn('Invalid service token: wrong service or audience');
                    }
                } catch (serviceTokenError) {
                    this.logger.debug('Service token validation failed', serviceTokenError.message);
                }
            }

            // If we get here, both validations failed
            throw new UnauthorizedException('Invalid or expired JWT token');
        } catch (error) {
            throw new UnauthorizedException('Invalid or expired JWT token');
        }
    }

    private extractTokenFromHeader(request: any): string | undefined {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
    }
}
