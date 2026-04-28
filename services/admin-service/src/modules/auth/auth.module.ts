import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from './jwt.strategy';
import { JwtService } from './jwt.service';
import { TwoFactorService } from './two-factor.service';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { RedisModule } from '../../infrastructure/redis/redis.module';
import { AuthController } from './auth.controller';

@Module({
    imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.registerAsync({
            imports: [ConfigModule],
            useFactory: async (configService: ConfigService) => ({
                secret: configService.get<string>('JWT_SECRET', 'default-secret-key'),
                signOptions: {
                    expiresIn: configService.get<string>('JWT_EXPIRES_IN', '15m') as any,
                },
            }),
            inject: [ConfigService],
        }),
        RedisModule,
    ],
    controllers: [AuthController],
    providers: [JwtStrategy, JwtService, TwoFactorService],
    exports: [JwtService, TwoFactorService, JwtModule],
})
export class AuthModule { }