export const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://emp_admin:emp_admin_password@localhost:5432/emp_admin?schema=public';

export const REDIS_HOST = process.env.REDIS_HOST || 'localhost';
export const REDIS_PORT = parseInt(process.env.REDIS_PORT || '6379');
export const REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';
export const REDIS_DB = parseInt(process.env.REDIS_DB || '0');

export const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://admin:admin_password@localhost:5672/emp.admin';
export const RABBITMQ_QUEUE_PREFIX = process.env.RABBITMQ_QUEUE_PREFIX || 'admin';

export const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key';
export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '15m';
export const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || 'dev-jwt-refresh-secret-key';
export const JWT_REFRESH_EXPIRES_IN = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

export const PORT = parseInt(process.env.PORT || '8007');
export const NODE_ENV = process.env.NODE_ENV || 'development';
export const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS || 'http://localhost:3000';

export default () => ({
    DATABASE_URL,
    NODE_ENV,
    PORT,
    REDIS_HOST,
    REDIS_PORT,
    REDIS_PASSWORD,
    REDIS_DB,
    RABBITMQ_URL,
    RABBITMQ_QUEUE_PREFIX,
    JWT_SECRET,
    JWT_EXPIRES_IN,
    JWT_REFRESH_SECRET,
    JWT_REFRESH_EXPIRES_IN,
    ALLOWED_ORIGINS,
});