import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUser {
    id: string;
    userId: string;
    role: string;
    permissions: string[];
    email: string;
}

export const CurrentUser = createParamDecorator(
    (data: unknown, ctx: ExecutionContext): CurrentUser => {
        const request = ctx.switchToHttp().getRequest();
        return request.user as CurrentUser;
    },
);