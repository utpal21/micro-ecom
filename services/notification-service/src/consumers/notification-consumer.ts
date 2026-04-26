import { EmailChannel } from '../channels/email-channel.js';
import { SmsChannel } from '../channels/sms-channel.js';
import { getTemplate, renderTemplate } from '../templates/template-registry.js';
import { isEventProcessed, markEventProcessed } from '../utils/redis.js';
import { logger } from '../utils/logger.js';

const emailChannel = new EmailChannel();
const smsChannel = new SmsChannel();

export async function handleEmailNotification(
    message: any,
    ack: () => void,
    nack: (requeue: boolean) => void
): Promise<void> {
    const { metadata, payload } = message;
    const { eventId, eventName, traceId, requestId } = metadata;

    logger.info('Processing email notification', { eventId, eventName, traceId });

    try {
        // Check idempotency
        if (await isEventProcessed(eventId)) {
            logger.info('Event already processed, skipping', { eventId });
            ack();
            return;
        }

        // Get template
        const template = getTemplate(eventName);
        if (!template) {
            logger.warn('No template found for event', { eventName });
            ack();
            return;
        }

        // Render template
        const { subject, body } = renderTemplate(template, payload);

        // Send email
        const result = await emailChannel.send({
            to: payload.to,
            subject,
            body,
        });

        if (result.success) {
            logger.info('Email notification sent successfully', {
                eventId,
                messageId: result.messageId,
            });
            await markEventProcessed(eventId);
            ack();
        } else {
            logger.error('Failed to send email notification', {
                eventId,
                error: result.error,
            });
            nack(false); // Move to DLQ
        }
    } catch (error) {
        logger.error('Error processing email notification', {
            eventId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        nack(false); // Move to DLQ
    }
}

export async function handleSmsNotification(
    message: any,
    ack: () => void,
    nack: (requeue: boolean) => void
): Promise<void> {
    const { metadata, payload } = message;
    const { eventId, eventName, traceId, requestId } = metadata;

    logger.info('Processing SMS notification', { eventId, eventName, traceId });

    try {
        // Check idempotency
        if (await isEventProcessed(eventId)) {
            logger.info('Event already processed, skipping', { eventId });
            ack();
            return;
        }

        // Get template
        const template = getTemplate(eventName);
        if (!template) {
            logger.warn('No template found for event', { eventName });
            ack();
            return;
        }

        // Render template
        const { body } = renderTemplate(template, payload);

        // Send SMS
        const result = await smsChannel.send({
            to: payload.to,
            body,
        });

        if (result.success) {
            logger.info('SMS notification sent successfully', {
                eventId,
                sid: result.sid,
            });
            await markEventProcessed(eventId);
            ack();
        } else {
            logger.error('Failed to send SMS notification', {
                eventId,
                error: result.error,
            });
            nack(false); // Move to DLQ
        }
    } catch (error) {
        logger.error('Error processing SMS notification', {
            eventId,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        nack(false); // Move to DLQ
    }
}

export async function handleDomainEvent(
    message: any,
    ack: () => void,
    nack: (requeue: boolean) => void
): Promise<void> {
    const { metadata, payload } = message;
    const { eventId, eventName, traceId, requestId } = metadata;

    logger.info('Processing domain event for notification', { eventId, eventName, traceId });

    try {
        // Check idempotency
        if (await isEventProcessed(eventId)) {
            logger.info('Event already processed, skipping', { eventId });
            ack();
            return;
        }

        // Get template
        const template = getTemplate(eventName);
        if (!template) {
            logger.warn('No template found for event', { eventName });
            ack();
            return;
        }

        // Render template
        const { subject, body } = renderTemplate(template, payload);

        // Send notification (email for now, can be extended to SMS based on preferences)
        const result = await emailChannel.send({
            to: payload.email || payload.to,
            subject,
            body,
        });

        if (result.success) {
            logger.info('Notification sent successfully', {
                eventId,
                eventName,
                messageId: result.messageId,
            });
            await markEventProcessed(eventId);
            ack();
        } else {
            logger.error('Failed to send notification', {
                eventId,
                eventName,
                error: result.error,
            });
            nack(false); // Move to DLQ
        }
    } catch (error) {
        logger.error('Error processing domain event for notification', {
            eventId,
            eventName,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        nack(false); // Move to DLQ
    }
}