export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export type LogContext = {
  service: string;
  traceId?: string;
  spanId?: string;
  requestId?: string;
  userId?: string;
  eventId?: string;
  statusCode?: number;
  durationMs?: number;
  [key: string]: unknown;
};

export type JsonLogEntry = LogContext & {
  timestamp: string;
  level: LogLevel;
  message: string;
};

export interface Logger {
  debug(message: string, context?: Omit<LogContext, "service">): void;
  info(message: string, context?: Omit<LogContext, "service">): void;
  warn(message: string, context?: Omit<LogContext, "service">): void;
  error(message: string, context?: Omit<LogContext, "service">): void;
  child(context: Omit<LogContext, "service">): Logger;
}

const createEntry = (
  level: LogLevel,
  service: string,
  message: string,
  context: Omit<LogContext, "service">
): JsonLogEntry => ({
  timestamp: new Date().toISOString(),
  level,
  service,
  message,
  ...context
});

/**
 * Emits structured JSON logs with EMP-required fields and child-context support.
 */
export const createLogger = (service: string, baseContext: Omit<LogContext, "service"> = {}): Logger => {
  const log = (level: LogLevel, message: string, context: Omit<LogContext, "service"> = {}) => {
    const entry = createEntry(level, service, message, { ...baseContext, ...context });
    const target = level === "ERROR" ? process.stderr : process.stdout;
    target.write(`${JSON.stringify(entry)}\n`);
  };

  return {
    debug(message, context) {
      log("DEBUG", message, context);
    },
    info(message, context) {
      log("INFO", message, context);
    },
    warn(message, context) {
      log("WARN", message, context);
    },
    error(message, context) {
      log("ERROR", message, context);
    },
    child(context) {
      return createLogger(service, { ...baseContext, ...context });
    }
  };
};
