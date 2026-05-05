import { Injectable, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    constructor(private reflector: Reflector) {
        super();
    }

    canActivate(context: ExecutionContext) {
        // Check if route is marked as public
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);

        if (isPublic) {
            return true;
        }

        // Log authorization header for debugging
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'];

        if (authHeader) {
            this.logger.debug(`Authorization header present: ${authHeader.substring(0, 50)}...`);
        } else {
            this.logger.warn('Authorization header missing from request');
        }

        return super.canActivate(context);
    }

    handleRequest(err: any, user: any, info: any) {
        if (err) {
            this.logger.error(`JWT authentication error: ${err.message}`, err.stack);
            throw new UnauthorizedException('Invalid or expired token');
        }

        if (!user) {
            this.logger.warn('JWT authentication failed: no user extracted from token');
            this.logger.debug(`JWT info: ${info ? info.message : 'no info'}`);
            throw new UnauthorizedException('Invalid or expired token');
        }

        this.logger.debug(`JWT authentication successful for user: ${user.id || user.email}`);
        return user;
    }
}
