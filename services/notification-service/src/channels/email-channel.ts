import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../config/config.js';
import { logger } from '../utils/logger.js';

export interface EmailMessage {
    to: string;
    subject: string;
    body: string;
    html?: boolean;
}

export class EmailChannel {
    private transporter: Transporter;

    constructor() {
        this.transporter = nodemailer.createTransport({
            host: config.smtp.host,
            port: config.smtp.port,
            secure: config.smtp.secure,
            auth: {
                user: config.smtp.user,
                pass: config.smtp.password,
            },
        });
    }

    async send(message: EmailMessage): Promise<{ success: boolean; messageId?: string; error?: string }> {
        try {
            const info = await this.transporter.sendMail({
                from: `"${config.smtp.fromName}" <${config.smtp.from}>`,
                to: message.to,
                subject: message.subject,
                text: message.body,
                html: message.html ? message.body : undefined,
            });

            logger.info('Email sent successfully', {
                to: message.to,
                messageId: info.messageId,
                subject: message.subject,
            });

            return {
                success: true,
                messageId: info.messageId,
            };
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            logger.error('Failed to send email', {
                to: message.to,
                subject: message.subject,
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
            await this.transporter.verify();
            return true;
        } catch (error) {
            logger.error('SMTP connection verification failed', {
                error: error instanceof Error ? error.message : 'Unknown error',
            });
            return false;
        }
    }
}