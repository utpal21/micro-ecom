import { Module, forwardRef } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';
import { RabbitMQModule } from '../infrastructure/messaging/rabbitmq.module';
import { VendorEventConsumer } from './consumers/vendor.consumer';
import { VendorEventPublisher } from './publishers/vendor.publisher';
import { VendorModule } from '../modules/vendor/vendor.module';
import { AuditModule } from '../modules/audit/audit.module';

@Module({
    imports: [
        RabbitMQModule,
        forwardRef(() => VendorModule),
        AuditModule,
    ],
    providers: [
        EventPublisherService,
        VendorEventConsumer,
        VendorEventPublisher,
    ],
    exports: [
        EventPublisherService,
        VendorEventPublisher,
    ],
})
export class EventsModule { }