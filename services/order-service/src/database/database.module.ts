import { Module, Global } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { URL } from 'node:url';

@Global()
@Module({
    imports: [
        TypeOrmModule.forRootAsync({
            imports: [ConfigModule],
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                const databaseUrl = configService.get<string>('DATABASE_URL');
                const databaseSsl = configService.get<boolean>('DATABASE_SSL') ?? configService.get('NODE_ENV') === 'production';

                if (databaseUrl) {
                    const parsed = new URL(databaseUrl);

                    return {
                        type: 'postgres' as const,
                        host: parsed.hostname,
                        port: Number(parsed.port || 5432),
                        username: decodeURIComponent(parsed.username),
                        password: decodeURIComponent(parsed.password),
                        database: parsed.pathname.replace(/^\//, ''),
                        autoLoadEntities: true,
                        entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
                        synchronize: false,
                        logging: configService.get('NODE_ENV') === 'development',
                        ssl: databaseSsl ? { rejectUnauthorized: false } : false,
                    };
                }

                return {
                    type: 'postgres' as const,
                    host: configService.get<string>('DATABASE_HOST'),
                    port: configService.get<number>('DATABASE_PORT'),
                    username: configService.get<string>('DATABASE_USERNAME'),
                    password: configService.get<string>('DATABASE_PASSWORD'),
                    database: configService.get<string>('DATABASE_NAME'),
                    autoLoadEntities: true,
                    entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
                    synchronize: false,
                    logging: configService.get('NODE_ENV') === 'development',
                    ssl: databaseSsl ? { rejectUnauthorized: false } : false,
                };
            },
        }),
    ],
    exports: [TypeOrmModule],
})
export class DatabaseModule { }
