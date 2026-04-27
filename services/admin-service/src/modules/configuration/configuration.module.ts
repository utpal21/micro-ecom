import { Module } from '@nestjs/common';
import { ConfigurationController } from './configuration.controller';
import { ConfigurationService } from './configuration.service';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { DatabaseModule } from '../../infrastructure/database/database.module';
import { AuditModule } from '../audit/audit.module';
import { EventsModule } from '../../events/events.module';

@Module({
    imports: [
        DatabaseModule,
        CacheModule,
        AuditModule,
        EventsModule,
    ],
    controllers: [ConfigurationController],
    providers: [ConfigurationService],
    exports: [ConfigurationService],
})
export class ConfigurationModule { }