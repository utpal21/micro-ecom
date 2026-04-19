import { randomUUID } from "node:crypto";

export const REQUEST_ID_HEADER = "x-request-id";
export const TRACEPARENT_HEADER = "traceparent";

export type TraceContext = {
  requestId: string;
  traceId: string;
  spanId: string;
};

const createSpanId = (): string => randomUUID().replace(/-/g, "").slice(0, 16);
const createTraceId = (): string => randomUUID().replace(/-/g, "");

/**
 * Creates or reuses trace headers so downstream services can correlate work.
 */
export const extractOrCreateTraceContext = (headers: Record<string, string | undefined>): TraceContext => {
  const requestId = headers[REQUEST_ID_HEADER] ?? randomUUID();
  const existingTraceparent = headers[TRACEPARENT_HEADER];

  if (existingTraceparent) {
    const [, traceId, parentSpanId] = existingTraceparent.split("-");
    if (traceId && parentSpanId) {
      return {
        requestId,
        traceId,
        spanId: createSpanId()
      };
    }
  }

  return {
    requestId,
    traceId: createTraceId(),
    spanId: createSpanId()
  };
};

export const toTraceHeaders = (context: TraceContext): Record<string, string> => ({
  [REQUEST_ID_HEADER]: context.requestId,
  [TRACEPARENT_HEADER]: `00-${context.traceId}-${context.spanId}-01`
});

