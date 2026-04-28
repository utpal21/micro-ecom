# TraceContextMiddleware Fix

## Problem Identified

The admin-service container was starting but failing all health checks with error:
```
TypeError: Class constructor TraceContextMiddleware cannot be invoked without 'new'
```

## Root Cause

In `services/admin-service/src/main.ts`, line 41, the middleware was being registered incorrectly:
```typescript
// BEFORE (INCORRECT)
app.use(TraceContextMiddleware);
```

NestJS middleware classes must be instantiated before being registered as Express middleware.

## Solution Implemented

Changed line 41 in `main.ts` to properly instantiate the middleware:
```typescript
// AFTER (CORRECT)
app.use(new TraceContextMiddleware());
```

## Changes Made

### File: services/admin-service/src/main.ts

```diff
  // Trace context middleware
- app.use(TraceContextMiddleware);
+ app.use(new TraceContextMiddleware());
```

## Verification Steps

1. ✅ Identified middleware instantiation error in logs
2. ✅ Fixed middleware instantiation in main.ts
3. ⏳ Docker rebuild in progress
4. ⏳ Container restart pending
5. ⏳ Health check verification pending

## Expected Outcome

After rebuild and restart:
- Container should start without errors
- Health checks should pass
- Service should be accessible on port 8007
- Trace ID headers should be added to all requests

## Impact

This fix ensures that:
- All HTTP requests get trace IDs for distributed tracing
- Request correlation across microservices works correctly
- Logging and monitoring have proper trace context
- No runtime errors from middleware initialization

## Related Files

- `services/admin-service/src/main.ts` - Fixed middleware instantiation
- `services/admin-service/src/common/middleware/trace-context.middleware.ts` - Middleware implementation

**Date:** April 28, 2026  
**Fixed By:** Admin Service Phase 9a Implementation