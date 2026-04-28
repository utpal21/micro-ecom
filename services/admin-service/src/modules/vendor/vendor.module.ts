import { Module, forwardRef } from '@nestjs/common';
import { VendorService } from './vendor.service';
import { VendorController } from './vendor.controller';
import { AuditModule } from '../audit/audit.module';
import { CacheModule } from '../../infrastructure/cache/cache.module';
import { EventsModule } from '../../events/events.module';

@Module({
    imports: [
        AuditModule,
        CacheModule,
        forwardRef(() => EventsModule),
    ],
    controllers: [VendorController],
    providers: [VendorService],
    exports: [VendorService],
})
export class VendorModule { }