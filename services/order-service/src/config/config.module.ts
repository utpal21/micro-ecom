import { Module } from '@nestjs/common';
import { ConfigModule as NestConfigModule } from '@nestjs/config';
import { validateConfig } from './config.validation';

@Module({
    imports: [
        NestConfigModule.forRoot({
            isGlobal: true,
            envFilePath: ['.env.local', '.env'],
            validate: validateConfig,
        }),
    ],
    exports: [NestConfigModule],
})
export class ConfigModule { }
