import { Module } from '@nestjs/common';
import { EventPublisherService } from './event-publisher.service';
import { RabbitMQModule } from '../infrastructure/messaging/rabbitmq.module';

@Module({
    imports: [RabbitMQModule],
    providers: [EventPublisherService],
    exports: [EventPublisherService],
})
export class EventsModule { }