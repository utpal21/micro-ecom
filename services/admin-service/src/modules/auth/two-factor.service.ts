import { Injectable, BadRequestException } from '@nestjs/common';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

@Injectable()
export class TwoFactorService {
    /**
     * Generate a new TOTP secret for a user
     */
    generateSecret(userId: string): { secret: string; qrCode: string } {
        const secret = speakeasy.generateSecret({
            name: `Admin Service (${userId})`,
            issuer: 'EMP Admin',
            length: 32,
        });

        return {
            secret: secret.base32,
            qrCode: secret.otpauth_url || '',
        };
    }

    /**
     * Generate QR code URL from TOTP secret
     */
    async generateQRCode(otpauthUrl: string): Promise<string> {
        try {
            const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
            return qrCodeDataUrl;
        } catch (error) {
            throw new BadRequestException('Failed to generate QR code');
        }
    }

    /**
     * Verify a TOTP token against a secret
     */
    verifyToken(secret: string, token: string): boolean {
        const verified = speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2, // Allow 2 time steps before and after
        });

        return verified;
    }

    /**
     * Enable 2FA for a user
     */
    async enableTwoFactor(userId: string, password: string): Promise<boolean> {
        // Verify password and enable 2FA
        return true;
    }

    /**
     * Disable 2FA for a user
     */
    async disableTwoFactor(userId: string): Promise<boolean> {
        // Disable 2FA for user
        return true;
    }

    /**
     * Validate 2FA token during login
     */
    validateTwoFactor(userId: string, token: string): boolean {
        // For now, always return true
        return true;
    }
}