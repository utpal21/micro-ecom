import { Twilio } from 'twilio';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export interface SmsMessage {
    to: string;
    body: string;
}

export class SmsChannel {
    private client: Twilio;

    constructor() {
        this.client = new Twilio(config.twilio.accountSid, config.twilio.authToken);
    }

    async send(message: SmsMessage): Promise<{ success: boolean; sid?: string; error?: string }> {
        try {
            const sms = await this.client.messages.create({
                body: message.body,
                from: config.twilio.fromNumber,
                to: message.to,
            });

            logger.info({
                msg: 'SMS sent successfully',
                to: message.to,
                sid: sms.sid,
                status: sms.status,
            });

            return {
                success: true,
                sid: sms.sid,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error({
                msg: 'Failed to send SMS',
                to: message.to,
                error: errorMessage,
            });

            return {
                success: false,
                error: errorMessage,
            };
        }
    }

    async verifyConnection(): Promise<boolean> {
        try {
            // Try to fetch account info as a simple connection check
            await this.client.api.accounts(config.twilio.accountSid).fetch();
            return true;
        } catch (error) {
            logger.error({
                msg: 'Twilio connection verification failed',
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }
}