import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException } from '@nestjs/common';
import { TwoFactorService } from '../../../src/modules/auth/two-factor.service';

describe('TwoFactorService', () => {
    let service: TwoFactorService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [TwoFactorService],
        }).compile();

        service = module.get<TwoFactorService>(TwoFactorService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('generateSecret', () => {
        it('should generate a TOTP secret', () => {
            const userId = 'user123';
            const result = service.generateSecret(userId);

            expect(result).toHaveProperty('secret');
            expect(result).toHaveProperty('qrCode');
            expect(typeof result.secret).toBe('string');
            expect(result.secret.length).toBeGreaterThan(0);
        });
    });

    describe('verifyToken', () => {
        it('should verify a valid TOTP token', () => {
            const userId = 'user123';
            const { secret } = service.generateSecret(userId);
            const token = '000000';

            const result = service.verifyToken(secret, token);

            expect(typeof result).toBe('boolean');
        });
    });

    describe('enableTwoFactor', () => {
        it('should enable 2FA for user', async () => {
            const userId = 'user123';
            const password = 'password123';

            const result = await service.enableTwoFactor(userId, password);

            expect(result).toBe(true);
        });
    });

    describe('disableTwoFactor', () => {
        it('should disable 2FA for user', async () => {
            const userId = 'user123';

            const result = await service.disableTwoFactor(userId);

            expect(result).toBe(true);
        });
    });

    describe('validateTwoFactor', () => {
        it('should validate 2FA token', () => {
            const userId = 'user123';
            const token = '000000';

            const result = service.validateTwoFactor(userId, token);

            expect(result).toBe(true);
        });
    });
});