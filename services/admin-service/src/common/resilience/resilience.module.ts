import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { ResilienceHttpService } from './resilience-http.service';

@Module({
    imports: [HttpModule, ConfigModule],
    providers: [ResilienceHttpService],
    exports: [ResilienceHttpService],
})
export class ResilienceModule { }