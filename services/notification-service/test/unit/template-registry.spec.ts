import { renderTemplate } from '../../src/templates/template-registry.js';

describe('Template Registry', () => {
    describe('renderTemplate', () => {
        it('should render simple template with variables', () => {
            const template = {
                subject: 'Hello {{name}}',
                body: 'Your order #{{orderId}} has been confirmed.',
                variables: ['name', 'orderId'],
            };

            const result = renderTemplate('test.template', template, {
                name: 'John Doe',
                orderId: 'ORD-123',
            });

            expect(result.subject).toBe('Hello John Doe');
            expect(result.body).toBe('Your order #ORD-123 has been confirmed.');
        });

        it('should handle missing variables gracefully', () => {
            const template = {
                subject: 'Order #{{orderId}}',
                body: 'Total: {{amount}}',
                variables: ['orderId', 'amount'],
            };

            const result = renderTemplate('test.template', template, {
                orderId: 'ORD-123',
                // amount is missing
            });

            expect(result.subject).toBe('Order #ORD-123');
            expect(result.body).toBe('Total: {{amount}}');
        });

        it('should handle empty variables object', () => {
            const template = {
                subject: 'Hello {{name}}',
                body: 'Welcome!',
                variables: ['name'],
            };

            const result = renderTemplate('test.template', template, {});

            expect(result.subject).toBe('Hello {{name}}');
            expect(result.body).toBe('Welcome!');
        });

        it('should handle multiple occurrences of same variable', () => {
            const template = {
                subject: 'Order {{orderId}}',
                body: 'Order {{orderId}} for {{customer}} has been processed. Order {{orderId}} total: ${{total}}',
                variables: ['orderId', 'customer', 'total'],
            };

            const result = renderTemplate('test.template', template, {
                orderId: 'ORD-123',
                customer: 'John',
                total: '99.99',
            });

            expect(result.subject).toBe('Order ORD-123');
            expect(result.body).toBe('Order ORD-123 for John has been processed. Order ORD-123 total: $99.99');
        });

        it('should handle special characters in variables', () => {
            const template = {
                subject: 'Confirmation',
                body: 'Email: {{email}}, Phone: {{phone}}',
                variables: ['email', 'phone'],
            };

            const result = renderTemplate('test.template', template, {
                email: 'test+special@example.com',
                phone: '+1-234-567-8900',
            });

            expect(result.body).toBe('Email: test+special@example.com, Phone: +1-234-567-8900');
        });

        it('should handle unicode characters', () => {
            const template = {
                subject: 'Order {{orderId}}',
                body: 'Thank you {{name}}! 你好! مرحبا!',
                variables: ['orderId', 'name'],
            };

            const result = renderTemplate('test.template', template, {
                orderId: 'ORD-123',
                name: '张三',
            });

            expect(result.body).toContain('张三');
            expect(result.body).toContain('你好!');
            expect(result.body).toContain('مربا');
        });

        it('should preserve whitespace in templates', () => {
            const template = {
                subject: 'Order {{orderId}}',
                body: `
          Dear {{name}},

          Your order #{{orderId}} has been shipped.

          Tracking: {{trackingNumber}}

          Thank you!
        `,
                variables: ['orderId', 'name', 'trackingNumber'],
            };

            const result = renderTemplate('test.template', template, {
                orderId: 'ORD-123',
                name: 'John',
                trackingNumber: 'TRK-789',
            });

            expect(result.body).toContain('Dear John,');
            expect(result.body).toContain('Tracking: TRK-789');
            expect(result.body).toContain('Thank you!');
        });
    });

    describe('Predefined Templates', () => {
        it('should have order.created template', () => {
            const { getTemplate } = require('../../src/templates/template-registry.js');
            const template = getTemplate('order.created');

            expect(template).toBeDefined();
            expect(template.variables).toContain('orderId');
            expect(template.variables).toContain('customerName');
            expect(template.variables).toContain('amount');
        });

        it('should have payment.completed template', () => {
            const { getTemplate } = require('../../src/templates/template-registry.js');
            const template = getTemplate('payment.completed');

            expect(template).toBeDefined();
            expect(template.variables).toContain('orderId');
            expect(template.variables).toContain('amount');
            expect(template.variables).toContain('paymentMethod');
        });

        it('should have inventory.low_stock template', () => {
            const { getTemplate } = require('../../src/templates/template-registry.js');
            const template = getTemplate('inventory.low_stock');

            expect(template).toBeDefined();
            expect(template.variables).toContain('productName');
            expect(template.variables).toContain('currentStock');
            expect(template.variables).toContain('threshold');
        });
    });
});