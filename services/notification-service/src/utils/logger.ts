import pino from 'pino';
import { config } from '../config/config.js';

export const logger = pino({
    level: config.logLevel,
    formatters: {
        level: (label) => {
            return { level: label };
        },
    },
    timestamp: pino.stdTimeFunctions.isoTime,
    serializers: {
        err: pino.stdSerializers.err,
        error: pino.stdSerializers.err,
    },
});