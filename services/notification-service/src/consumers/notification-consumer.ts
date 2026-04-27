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
    const { eventId, eventName, traceId } = metadata;

    logger.info({
        msg: 'Processing email notification',
        eventId,
        eventName,
        traceId
    });

    try {
        // Check idempotency
        if (await isEventProcessed(eventId)) {
            logger.info({ msg: 'Event already processed, skipping', eventId });
            ack();
            return;
        }

        // Get template
        const template = getTemplate(eventName);
        if (!template) {
            logger.warn({ msg: 'No template found for event', eventName });
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
            logger.info({
                msg: 'Email notification sent successfully',
                eventId,
                messageId: result.messageId,
            });
            await markEventProcessed(eventId);
            ack();
        } else {
            logger.error({
                msg: 'Failed to send email notification',
                eventId,
                error: result.error,
            });
            nack(false); // Move to DLQ
        }
    } catch (error) {
        logger.error({
            msg: 'Error processing email notification',
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
    const { eventId, eventName, traceId } = metadata;

    logger.info({
        msg: 'Processing SMS notification',
        eventId,
        eventName,
        traceId
    });

    try {
        // Check idempotency
        if (await isEventProcessed(eventId)) {
            logger.info({ msg: 'Event already processed, skipping', eventId });
            ack();
            return;
        }

        // Get template
        const template = getTemplate(eventName);
        if (!template) {
            logger.warn({ msg: 'No template found for event', eventName });
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
            logger.info({
                msg: 'SMS notification sent successfully',
                eventId,
                sid: result.sid,
            });
            await markEventProcessed(eventId);
            ack();
        } else {
            logger.error({
                msg: 'Failed to send SMS notification',
                eventId,
                error: result.error,
            });
            nack(false); // Move to DLQ
        }
    } catch (error) {
        logger.error({
            msg: 'Error processing SMS notification',
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
    const { eventId, eventName, traceId } = metadata;

    logger.info({
        msg: 'Processing domain event for notification',
        eventId,
        eventName,
        traceId
    });

    try {
        // Check idempotency
        if (await isEventProcessed(eventId)) {
            logger.info({ msg: 'Event already processed, skipping', eventId });
            ack();
            return;
        }

        // Get template
        const template = getTemplate(eventName);
        if (!template) {
            logger.warn({ msg: 'No template found for event', eventName });
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
            logger.info({
                msg: 'Notification sent successfully',
                eventId,
                eventName,
                messageId: result.messageId,
            });
            await markEventProcessed(eventId);
            ack();
        } else {
            logger.error({
                msg: 'Failed to send notification',
                eventId,
                eventName,
                error: result.error,
            });
            nack(false); // Move to DLQ
        }
    } catch (error) {
        logger.error({
            msg: 'Error processing domain event for notification',
            eventId,
            eventName,
            error: error instanceof Error ? error.message : 'Unknown error',
            stack: error instanceof Error ? error.stack : undefined,
        });
        nack(false); // Move to DLQ
    }
}