import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PERMISSIONS_KEY, PERMISSIONS_KEY_OPTIONAL } from '../decorators/permissions.decorator';
import { AdminRole } from '../constants';

@Injectable()
export class RbacGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY,
            [context.getHandler(), context.getClass()],
        );

        const optionalPermissions = this.reflector.getAllAndOverride<string[]>(
            PERMISSIONS_KEY_OPTIONAL,
            [context.getHandler(), context.getClass()],
        );

        // If no permissions required, allow access
        if (!requiredPermissions && !optionalPermissions) {
            return true;
        }

        const request = context.switchToHttp().getRequest();
        const user = request.user;

        // If no user, deny access
        if (!user) {
            throw new ForbiddenException('Access denied');
        }

        const userRole = user.role as string;
        const userPermissions = user.permissions || [];

        // Allow admin role to access everything
        if (userRole.toLowerCase() === 'admin') {
            return true;
        }

        // Check required permissions
        if (requiredPermissions) {
            const hasAllRequired = requiredPermissions.every((permission) =>
                userPermissions.includes(permission),
            );

            if (!hasAllRequired) {
                throw new ForbiddenException(
                    'You do not have permission to access this resource',
                );
            }
        }

        // Check optional permissions (at least one)
        if (optionalPermissions && optionalPermissions.length > 0) {
            const hasAnyOptional = optionalPermissions.some((permission) =>
                userPermissions.includes(permission),
            );

            if (!hasAnyOptional) {
                throw new ForbiddenException(
                    'You do not have permission to access this resource',
                );
            }
        }

        return true;
    }
}