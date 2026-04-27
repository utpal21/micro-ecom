import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';
export const PERMISSIONS_KEY_OPTIONAL = 'permissionsOptional';

/**
 * Decorator to specify required permissions for a route
 * User must have ALL specified permissions
 * @param permissions Array of permission strings
 */
export const RequirePermissions = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);

/**
 * Decorator to specify optional permissions for a route
 * User must have AT LEAST ONE of the specified permissions
 * @param permissions Array of permission strings
 */
export const RequireAnyPermission = (...permissions: string[]) =>
    SetMetadata(PERMISSIONS_KEY_OPTIONAL, permissions);