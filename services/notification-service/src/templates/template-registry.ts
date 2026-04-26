import { z } from 'zod';

export interface Template {
    subject: string;
    body: string;
    variables: string[];
}

export const TEMPLATES: Record<string, Template> = {
    'order.created': {
        subject: 'Order Confirmation - Order #{{orderId}}',
        body: `
Dear {{customerName}},

Thank you for your order! Your order #{{orderId}} has been successfully placed and is being processed.

Order Details:
- Order ID: {{orderId}}
- Total Amount: {{amount}}
- Payment Method: {{paymentMethod}}
- Shipping Address: {{shippingAddress}}

We will send you another notification when your order ships.

Best regards,
Enterprise Marketplace Team
    `.trim(),
        variables: ['orderId', 'customerName', 'amount', 'paymentMethod', 'shippingAddress'],
    },

    'order.cancelled': {
        subject: 'Order Cancelled - Order #{{orderId}}',
        body: `
Dear {{customerName}},

Your order #{{orderId}} has been cancelled.

{{#if reason}}
Reason: {{reason}}
{{/if}}

If you have any questions, please contact our support team.

Best regards,
Enterprise Marketplace Team
    `.trim(),
        variables: ['orderId', 'customerName', 'reason'],
    },

    'payment.completed': {
        subject: 'Payment Successful - Order #{{orderId}}',
        body: `
Dear {{customerName}},

Your payment has been successfully processed for order #{{orderId}}.

Payment Details:
- Order ID: {{orderId}}
- Amount Paid: {{amount}}
- Transaction ID: {{transactionId}}
- Payment Method: {{paymentMethod}}

Your order will now be processed for shipment.

Best regards,
Enterprise Marketplace Team
    `.trim(),
        variables: ['orderId', 'customerName', 'amount', 'transactionId', 'paymentMethod'],
    },

    'payment.failed': {
        subject: 'Payment Failed - Order #{{orderId}}',
        body: `
Dear {{customerName}},

We were unable to process your payment for order #{{orderId}}.

Failure Reason: {{reason}}

Please try again or use a different payment method. If you continue to experience issues, please contact our support team.

Best regards,
Enterprise Marketplace Team
    `.trim(),
        variables: ['orderId', 'customerName', 'reason'],
    },

    'payment.cod_placed': {
        subject: 'Order Placed (Cash on Delivery) - Order #{{orderId}}',
        body: `
Dear {{customerName}},

Your order #{{orderId}} has been successfully placed with Cash on Delivery payment method.

Order Details:
- Order ID: {{orderId}}
- Total Amount: {{amount}}
- Payment Method: Cash on Delivery
- Shipping Address: {{shippingAddress}}

Please keep the exact amount ({{amount}}) ready when the delivery arrives.

Best regards,
Enterprise Marketplace Team
    `.trim(),
        variables: ['orderId', 'customerName', 'amount', 'shippingAddress'],
    },

    'payment.cod_collected': {
        subject: 'Payment Collected - Order #{{orderId}}',
        body: `
Dear {{customerName}},

Cash payment has been successfully collected for order #{{orderId}}.

Payment Details:
- Order ID: {{orderId}}
- Amount Collected: {{collectedAmount}}
- Collected At: {{collectedAt}}

Your order will now be processed for shipment.

Best regards,
Enterprise Marketplace Team
    `.trim(),
        variables: ['orderId', 'customerName', 'collectedAmount', 'collectedAt'],
    },

    'inventory.low_stock': {
        subject: 'Low Stock Alert - Product SKU: {{sku}}',
        body: `
Attention: Inventory Team

Low stock alert for product SKU: {{sku}}

Current Stock: {{availableQuantity}}
Threshold: {{thresholdQuantity}}

Please restock this item soon to prevent stockouts.

Best regards,
Inventory Management System
    `.trim(),
        variables: ['sku', 'availableQuantity', 'thresholdQuantity'],
    },
};

export function getTemplate(eventName: string): Template | undefined {
    return TEMPLATES[eventName];
}

export function renderTemplate(template: Template, variables: Record<string, unknown>): {
    subject: string;
    body: string;
} {
    let subject = template.subject;
    let body = template.body;

    // Simple template variable replacement
    Object.entries(variables).forEach(([key, value]) => {
        const placeholder = `{{${key}}}`;
        const regex = new RegExp(placeholder, 'g');
        const replacement = value != null ? String(value) : '';

        subject = subject.replace(regex, replacement);
        body = body.replace(regex, replacement);
    });

    // Handle conditional blocks (simple implementation)
    body = body.replace(/{{#if\s+(\w+)}}(.*?){{\/if}}/gs, (match, varName, content) => {
        const value = variables[varName];
        return value ? content : '';
    });

    return { subject, body };
}