import { ApiProperty } from '@nestjs/swagger';

export class TwoFactorVerifyDto {
    @ApiProperty({
        description: 'Two-factor authentication code',
        example: '123456',
        type: String,
        minLength: 6,
        maxLength: 6,
    })
    code: string;
}

export class TwoFactorEnableDto {
    @ApiProperty({
        description: 'Admin user password to enable 2FA',
        example: 'Admin@123',
        type: String,
        minLength: 8,
    })
    password: string;
}

export class RefreshTokenDto {
    @ApiProperty({
        description: 'Refresh token',
        example: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
        type: String,
    })
    refreshToken: string;
}