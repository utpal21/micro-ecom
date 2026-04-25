import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { AppModule } from '../src/app.module';

/**
 * Test setup utilities
 */
export class TestSetup {
    static async createTestingModule(): Promise<TestingModule> {
        return Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
                TypeOrmModule.forRoot({
                    type: 'postgres',
                    host: 'localhost',
                    port: 5432,
                    username: 'test_user',
                    password: 'test_password',
                    database: 'order_test_db',
                    entities: ['src/**/*.entity.ts'],
                    synchronize: true,
                    dropSchema: true,
                }),
                AppModule,
            ],
        }).compile();
    }

    static async createApp(): Promise<INestApplication> {
        const moduleFixture = await Test.createTestingModule({
            imports: [AppModule],
        }).compile();

        const app = moduleFixture.createNestApplication();
        await app.init();
        return app;
    }

    static async createTestingModuleWithMocks(): Promise<TestingModule> {
        return Test.createTestingModule({
            imports: [
                ConfigModule.forRoot({
                    isGlobal: true,
                    envFilePath: '.env.test',
                }),
            ],
        }).compile();
    }
}