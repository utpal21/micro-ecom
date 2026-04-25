import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { OrdersController } from './interfaces/orders.controller';
import { OrderService } from './application/order.service';
import { OrderRepository } from './infrastructure/repositories/order.repository';
import { OrderStateMachine } from './domain/order-state-machine';
import { Order } from './infrastructure/entities/order.entity';
import { OrderItem } from './infrastructure/entities/order-item.entity';
import { OrderStatusHistory } from './infrastructure/entities/order-status-history.entity';
import { OutboxEvent } from './infrastructure/outbox/outbox.entity';

@Module({
    imports: [
        TypeOrmModule.forFeature([
            Order,
            OrderItem,
            OrderStatusHistory,
            OutboxEvent,
        ]),
        ConfigModule,
    ],
    controllers: [OrdersController],
    providers: [
        OrderService,
        OrderRepository,
        OrderStateMachine,
    ],
    exports: [
        OrderService,
        OrderRepository,
    ],
})
export class OrdersModule { }