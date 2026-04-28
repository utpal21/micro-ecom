import { Test, TestingModule } from '@nestjs/testing';
import { JwtService as NestJwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { JwtService } from '../../../src/modules/auth/jwt.service';
import { RedisService } from '../../../src/infrastructure/redis/redis.service';

describe('JwtService', () => {
    let service: JwtService;
    let jwtService: NestJwtService;
    let redisService: RedisService;
    let configService: ConfigService;

    const mockJwtService = {
        sign: jest.fn(),
        verify: jest.fn(),
    };

    const mockRedisService = {
        set: jest.fn(),
        del: jest.fn(),
    };

    const mockConfigService = {
        get: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                JwtService,
                {
                    provide: NestJwtService,
                    useValue: mockJwtService,
                },
                {
                    provide: RedisService,
                    useValue: mockRedisService,
                },
                {
                    provide: ConfigService,
                    useValue: mockConfigService,
                },
            ],
        }).compile();

        service = module.get<JwtService>(JwtService);
        jwtService = module.get<NestJwtService>(NestJwtService);
        redisService = module.get<RedisService>(RedisService);
        configService = module.get<ConfigService>(ConfigService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    describe('validateToken', () => {
        it('should validate token successfully', async () => {
            const token = 'valid.token';
            const payload = { userId: '123', email: 'test@example.com' };
            mockJwtService.verify.mockReturnValue(payload);

            const result = await service.validateToken(token);

            expect(jwtService.verify).toHaveBeenCalledWith(token);
            expect(result).toEqual(payload);
        });

        it('should throw UnauthorizedException for invalid token', async () => {
            const token = 'invalid.token';
            mockJwtService.verify.mockImplementation(() => {
                throw new Error('Invalid token');
            });

            await expect(service.validateToken(token)).rejects.toThrow(UnauthorizedException);
        });
    });

    describe('generateTokens', () => {
        it('should generate access and refresh tokens', async () => {
            const payload = { id: '1', email: 'test@example.com', role: 'admin' };
            const accessToken = 'access.token';
            const refreshToken = 'refresh.token';

            mockJwtService.sign.mockReturnValueOnce(accessToken);
            mockJwtService.sign.mockReturnValueOnce(refreshToken);
            mockRedisService.set.mockResolvedValueOnce('OK');

            const result = await service.generateTokens(payload);

            expect(jwtService.sign).toHaveBeenCalledTimes(2);
            expect(redisService.set).toHaveBeenCalledWith(
                `token:${payload.id}`,
                refreshToken,
                7 * 24 * 60 * 60,
            );
            expect(result).toEqual({
                accessToken,
                refreshToken,
                expiresIn: '15m',
            });
        });
    });

    describe('validateAndSignToken', () => {
        it('should validate credentials and return tokens', async () => {
            const email = 'test@example.com';
            const password = 'password123';
            const payload = { id: '1', email, role: 'admin' };
            const expectedTokens = {
                accessToken: 'access.token',
                refreshToken: 'refresh.token',
                expiresIn: '15m',
            };

            jest.spyOn(service, 'generateTokens').mockResolvedValueOnce(expectedTokens);

            const result = await service.validateAndSignToken(email, password);

            expect(service.generateTokens).toHaveBeenCalledWith(payload);
            expect(result).toEqual(expectedTokens);
        });
    });

    describe('verifyTwoFactor', () => {
        it('should verify 2FA code and return tokens', async () => {
            const code = '123456';
            const user = { id: '1', email: 'test@example.com' };
            const expectedTokens = {
                accessToken: 'access.token',
                refreshToken: 'refresh.token',
                expiresIn: '15m',
            };

            jest.spyOn(service, 'generateTokens').mockResolvedValueOnce(expectedTokens);

            const result = await service.verifyTwoFactor(code, user);

            expect(service.generateTokens).toHaveBeenCalledWith(user);
            expect(result).toEqual(expectedTokens);
        });
    });

    describe('refreshToken', () => {
        it('should refresh token successfully', async () => {
            const refreshToken = 'refresh.token';
            const payload = { id: '1', email: 'test@example.com' };
            const expectedTokens = {
                accessToken: 'access.token',
                refreshToken: 'refresh.token',
                expiresIn: '15m',
            };

            mockJwtService.verify.mockReturnValueOnce(payload);
            jest.spyOn(service, 'generateTokens').mockResolvedValueOnce(expectedTokens);

            const result = await service.refreshToken(refreshToken);

            expect(jwtService.verify).toHaveBeenCalledWith(refreshToken);
            expect(service.generateTokens).toHaveBeenCalledWith(payload);
            expect(result).toEqual(expectedTokens);
        });
    });

    describe('logout', () => {
        it('should logout user and invalidate token', async () => {
            const userId = '1';
            mockRedisService.del.mockResolvedValueOnce(1);

            await service.logout(userId);

            expect(redisService.del).toHaveBeenCalledWith(`token:${userId}`);
        });
    });
});