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
     * First generates secret, then user must verify with token
     */
    enableTwoFactor(userId: string, secret: string, token: string): boolean {
        const isValid = this.verifyToken(secret, token);

        if (!isValid) {
            throw new BadRequestException('Invalid verification token');
        }

        // TODO: Save secret to database for user
        // await this.adminRepository.update(userId, { twoFactorSecret: secret });

        return true;
    }

    /**
     * Disable 2FA for a user
     */
    disableTwoFactor(userId: string): boolean {
        // TODO: Remove secret from database
        // await this.adminRepository.update(userId, { twoFactorSecret: null });

        return true;
    }

    /**
     * Validate 2FA token during login
     */
    validateTwoFactor(userId: string, token: string): boolean {
        // TODO: Fetch user's secret from database
        // const user = await this.adminRepository.findById(userId);
        // return this.verifyToken(user.twoFactorSecret, token);

        // For now, always return true
        return true;
    }
}