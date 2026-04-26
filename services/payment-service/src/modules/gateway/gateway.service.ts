import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SSLCommerzGateway } from './strategies/sslcommerz.gateway';
import { IPaymentGateway } from './interfaces/payment-gateway.interface';
import { GatewayProvider } from '../../shared/dto/payment.dto';

@Injectable()
export class GatewayService {
    private readonly logger = new Logger(GatewayService.name);
    private readonly gateways: Map<string, IPaymentGateway> = new Map();

    constructor(
        private readonly sslcommerzGateway: SSLCommerzGateway,
    ) {
        this.registerGateway(this.sslcommerzGateway);
    }

    private registerGateway(gateway: IPaymentGateway): void {
        this.gateways.set(gateway.getName(), gateway);
        this.logger.log(`Registered payment gateway: ${gateway.getName()}`);
    }

    getGateway(provider: string): IPaymentGateway {
        const gateway = this.gateways.get(provider);

        if (!gateway) {
            throw new BadRequestException(`Payment gateway '${provider}' not found`);
        }

        return gateway;
    }

    getAvailableGateways(): string[] {
        return Array.from(this.gateways.keys());
    }
}