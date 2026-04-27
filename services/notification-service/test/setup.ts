// Test setup file for Jest

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.REDIS_HOST = 'localhost';
process.env.REDIS_PORT = '6379';
process.env.RABBITMQ_HOST = 'localhost';
process.env.RABBITMQ_PORT = '5672';
process.env.RABBITMQ_USER = 'guest';
process.env.RABBITMQ_PASSWORD = 'guest';
process.env.SMTP_HOST = 'localhost';
process.env.SMTP_PORT = '1025';
process.env.SMTP_USER = 'test';
process.env.SMTP_PASSWORD = 'test';
process.env.EMAIL_FROM = 'test@example.com';
process.env.EMAIL_FROM_NAME = 'Test';
process.env.TWILIO_ACCOUNT_SID = 'test_sid';
process.env.TWILIO_AUTH_TOKEN = 'test_token';
process.env.TWILIO_FROM_NUMBER = '+1234567890';
process.env.LOG_LEVEL = 'error';

// Increase timeout for integration tests
jest.setTimeout(30000);

// Setup global mocks
global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
};

beforeAll(async () => {
    // Global test setup
    console.log('Test environment initialized');
});

afterAll(async () => {
    // Global cleanup
    console.log('Test environment cleaned up');
});