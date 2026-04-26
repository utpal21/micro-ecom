import { Module } from '@nestjs/common';
import { GatewayService } from './gateway.service';
import { SSLCommerzGateway } from './strategies/sslcommerz.gateway';
import { StripeGateway } from './strategies/stripe.gateway';

@Module({
    providers: [GatewayService, SSLCommerzGateway, StripeGateway],
    exports: [GatewayService],
})
export class GatewayModule { }
