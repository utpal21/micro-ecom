import { Module } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';
import { RabbitMQModule } from '../infrastructure/messaging/rabbitmq.module';
import { VendorEventConsumer } from './consumers/vendor.consumer';
import { ContentEventConsumer } from './consumers/content.consumer';
import { VendorEventPublisher } from './publishers/vendor.publisher';
import { ContentEventPublisher } from './publishers/content.publisher';

@Module({
    imports: [RabbitMQModule],
    providers: [
        EventPublisherService,
        VendorEventConsumer,
        ContentEventConsumer,
        VendorEventPublisher,
        ContentEventPublisher,
    ],
    exports: [
        EventPublisherService,
        VendorEventPublisher,
        ContentEventPublisher,
    ],
})
export class EventsModule { }