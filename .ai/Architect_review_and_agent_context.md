# EMP — Staff Architect Review & Production-Grade Agent Context
> **Classification:** Engineering Internal  
> **Role:** Senior Staff Software Architect & System Designer Review  
> **Scope:** Full-stack audit of all phases (Phase 4–11) + cross-cutting production concerns  
> **Audience:** Coding agents AND human engineers. Read this BEFORE touching any phase.

---

## PART 1 — HONEST GAPS IN YOUR CURRENT DOCUMENTS

Before Phase 4 begins, these are the missing or under-specified areas your existing `.ai/` context documents do NOT cover adequately. Every gap below is a hallucination surface for coding agents.

### 1.1 What the playbook is silent on (agents WILL guess wrong without this)

| Gap | Risk Without It |
|-----|----------------|
| No concrete NestJS module/folder layout per service | Agents will invent wildly different structures per service |
| No concrete event payload schema example with all required fields | Agents will omit `event_id`, `schema_version`, or `occurred_at` |
| No defined error class hierarchy per stack | Agents mix HTTP errors with domain errors; leak stack traces |
| No Redis key registry with actual key patterns | Agents invent ad-hoc keys that collide or never expire |
| No idempotency implementation pattern spelled out | "Be idempotent" is stated but HOW is not — agents will use wrong dedup keys |
| No PgBouncer wiring example | Agents will connect NestJS directly to Postgres at 200 connections each |
| No Redlock/distributed lock usage contract | Cache stampede prevention exists in SRS but no code-level contract |
| No circuit breaker policy | Dependency failures have no defined fallback or open-circuit behavior |
| No concrete OpenTelemetry bootstrap per runtime | Agents will add tracing inconsistently across services |
| No `docker-compose.prod.yml` override contract | Resource limits, replica counts, secret mounts not specified |
| No migration governance beyond "additive only" | No convention on file naming, who runs them, rollback procedure |
| No contract test format between services | "Contract tests" is named in SRS but no schema or tooling is defined |
| No DLQ consumer / alert-to-human procedure | DLQs exist but what consumes or alerts on them is undefined |
| No rate limit response shape | Agents will let Nginx return its default 503; should be a JSON error |
| CORS policy for internal service-to-service calls is unspecified | Agents add CORS to internal services unnecessarily, or miss it on the gateway |

---

## PART 2 — PER-PHASE PRODUCTION HARDENING GUIDE

This section tells you specifically WHAT to add or enforce for each remaining phase (4–11). Use this as the per-phase briefing sheet.

---

### PHASE 4 — Product Service (NestJS 11 + MongoDB)

#### Architecture

```
services/product-service/src/
├── main.ts                     # Bootstrap only — OTel init, config validation, listen
├── app.module.ts               # Root module — wires global providers
├── config/
│   └── config.service.ts       # Validates all env at startup via Joi or class-validator
├── health/
│   ├── health.controller.ts    # GET /health/live, /health/ready
│   └── health.module.ts
├── common/
│   ├── filters/                # Global exception filter → standardized error JSON
│   ├── interceptors/           # Logging interceptor, response transform interceptor
│   ├── guards/                 # JwtAuthGuard (local JWKS validation)
│   ├── decorators/             # @CurrentUser(), @Roles(), @Public()
│   ├── pipes/                  # ZodValidationPipe
│   └── middleware/             # TraceContextMiddleware (X-Request-ID propagation)
├── products/
│   ├── domain/
│   │   ├── product.entity.ts   # Domain model — never a Mongoose doc directly
│   │   └── product.errors.ts   # ProductNotFoundError, ProductConflictError, etc.
│   ├── application/
│   │   ├── commands/           # CreateProductCommand, UpdateProductCommand
│   │   ├── queries/            # GetProductQuery, ListProductsQuery
│   │   └── product.service.ts  # Orchestrates commands/queries, no DB calls here
│   ├── infrastructure/
│   │   ├── schemas/            # Mongoose schema (separate from domain entity)
│   │   ├── repositories/       # ProductRepository implements IProductRepository
│   │   └── cache/              # ProductCacheService (Redis cache-aside + Redlock)
│   ├── interfaces/
│   │   ├── http/
│   │   │   ├── products.controller.ts
│   │   │   └── dto/            # CreateProductDto, UpdateProductDto (Zod-backed)
│   │   └── events/
│   │       └── product-events.consumer.ts
│   └── products.module.ts
└── categories/
    └── (same structure as products/)
```

#### JWKS Validation — 8-Step Contract (Do not skip any step)

Every NestJS service (Product, Inventory, Payment) MUST implement JWT validation exactly as follows in `JwtAuthGuard`:

```
Step 1: Extract Bearer token from Authorization header
Step 2: Base64-decode header — parse kid (Key ID)
Step 3: Fetch JWKS from Redis cache key `jwks:public_keys` (TTL 1 hour)
Step 4: On cache miss — HTTP GET http://auth-service:8001/.well-known/jwks.json
Step 5: Write JWKS to Redis with TTL 3600 seconds
Step 6: Find matching key by kid from JWKS
Step 7: Verify RS256 signature using public key — reject if invalid
Step 8: Check exp, iat, iss, aud claims — reject if any fail
→ Attach decoded payload to request context as req.user
→ On ANY failure: throw UnauthorizedException (never 500)
```

Key concerns:
- NEVER call auth-service per-request. Always JWKS via Redis cache.
- If Redis is unavailable: use in-process LRU fallback (max 10 keys, 5 min TTL).
- Rotate key detection: if `kid` not found in cached JWKS, do ONE forced refresh of JWKS before failing.

#### Redis Key Patterns — Product Service

| Key | TTL | Invalidated By |
|-----|-----|----------------|
| `products:list:{page}:{filters_hash}` | 300s | Any product write event |
| `products:detail:{id}` | 600s | Product update/delete |
| `categories:tree` | 1800s | Category create/update/delete |
| `jwks:public_keys` | 3600s | Manual flush on key rotation |
| `lock:products:cache:{key_hash}` | 5s | Redlock — released after cache rebuild |

#### Distributed Lock (Cache Stampede Prevention)

When rebuilding a cache entry after a miss:
1. Acquire Redlock on `lock:products:cache:{key_hash}` with 5-second TTL
2. Double-check: re-read cache. If another process beat you, return cached value.
3. Query MongoDB and write to Redis inside the lock
4. Release lock
5. If lock acquisition fails after 200ms: fall through to DB directly (degrade gracefully)

#### MongoDB Indexes Required (migration file, not application code)

```javascript
// Must be declared as migration scripts in services/product-service/migrations/
db.products.createIndex({ slug: 1 }, { unique: true });
db.products.createIndex({ category_id: 1, status: 1, created_at: -1 });
db.products.createIndex({ vendor_id: 1, status: 1 });
db.products.createIndex({ "$**": "text" }, { name: "products_text_search" });
db.categories.createIndex({ slug: 1 }, { unique: true });
db.categories.createIndex({ parent_id: 1 });
```

#### Testing Requirements — Product Service

| Test | What to Cover |
|------|--------------|
| Unit | ProductService.createProduct — valid input, duplicate slug, invalid vendor |
| Unit | ProductCacheService — cache hit, cache miss, Redlock acquisition, lock timeout |
| Unit | JwtAuthGuard — valid JWT, expired JWT, invalid kid, JWKS cache miss, JWKS cache hit |
| Integration | POST /products — creates in MongoDB, returns correct shape |
| Integration | GET /products — returns paginated results, filters by category |
| Integration | GET /products/:id — cache miss → DB → cache population |
| Integration | GET /products/:id — cache hit (mock Redis) |
| Integration | GET /health/ready — MongoDB up returns 200, MongoDB down returns 503 |
| Contract | Response shape matches OpenAPI schema (use Zod parsing on response) |
| Failure | GET /products/:id — MongoDB unavailable returns 503, not 500 |
| Failure | POST /products — Redis unavailable, falls back to DB-only path |

---

### PHASE 5 — Inventory Service (NestJS 11 + PostgreSQL)

#### Critical Concurrency Contract

The entire correctness of the platform depends on getting inventory locking right. Every agent MUST follow this exact pattern — no shortcuts.

**Reservation Flow (inside a DB transaction):**

```sql
-- 1. Lock the row exclusively
SELECT * FROM inventory WHERE sku_id = $1 FOR UPDATE;

-- 2. Check availability
-- If stock_quantity - reserved_quantity < requested_quantity: RAISE exception

-- 3. Deduct reservation
UPDATE inventory 
SET reserved_quantity = reserved_quantity + $requested
WHERE sku_id = $1;

-- 4. Insert ledger record
INSERT INTO inventory_ledger (id, sku_id, change_type, quantity_delta, reference_id, occurred_at)
VALUES (gen_random_uuid(), $1, 'RESERVED', -$requested, $order_id, NOW());

-- 5. COMMIT — lock released here
```

**NEVER** do step 2 outside a transaction with the lock held. Race conditions here = overselling.

#### DB Constraint That Must Exist (migration, not application)

```sql
-- Enforce non-negative stock at DB level — application logic is NOT enough
ALTER TABLE inventory 
ADD CONSTRAINT chk_stock_non_negative 
CHECK (stock_quantity >= 0 AND reserved_quantity >= 0 AND stock_quantity >= reserved_quantity);
```

#### Idempotency Contract — Event Consumer

Every RabbitMQ consumer MUST follow this exact pattern:

```typescript
async handleOrderCreated(event: OrderCreatedEvent): Promise<void> {
  // Step 1: Check idempotency
  const alreadyProcessed = await this.idempotencyRepository.exists(event.event_id);
  if (alreadyProcessed) {
    this.logger.info('Skipping duplicate event', { event_id: event.event_id });
    return; // ACK without processing — idempotent
  }

  // Step 2: Process inside a DB transaction
  await this.dataSource.transaction(async (manager) => {
    await this.inventoryRepository.reserveStock(event.order_id, event.items, manager);
    // Step 3: Record processed event inside same transaction
    await this.idempotencyRepository.markProcessed(event.event_id, manager);
  });

  // Step 4: ACK to RabbitMQ — only after transaction commits
}
```

The `processed_events` table is the idempotency store:
```sql
CREATE TABLE processed_events (
  event_id    UUID PRIMARY KEY,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
-- Purge entries older than 7 days via a scheduled job
CREATE INDEX idx_processed_events_at ON processed_events(processed_at);
```

#### Testing Requirements — Inventory Service

| Test | What to Cover |
|------|--------------|
| Unit | ReservationService — sufficient stock, insufficient stock, zero quantity edge case |
| Unit | Stock ledger entry created on every state change |
| Concurrency | Two simultaneous reservation requests for the last unit — only one succeeds |
| Idempotency | Same `order.created` event delivered twice — stock deducted only once |
| Integration | `payment.failed` event → stock released, ledger entry written |
| Integration | Negative stock prevented by DB constraint (test that the constraint fires) |
| Failure | RabbitMQ consumer fails mid-transaction — rollback verified, event goes to DLQ |

---

### PHASE 6 — Order Service (Laravel 13 + PostgreSQL)

#### State Machine Contract

The order status transitions are the canonical contract. Agents MUST implement this as a state machine, not a raw status update.

```
PENDING → PAID            (via payment.completed)
PENDING → CANCELLED       (via payment.failed OR manual cancel)
CONFIRMED → PAID          (COD: via payment.cod_collected)
PAID → PROCESSING         (vendor begins fulfillment)
PROCESSING → SHIPPED      (tracking number assigned)
SHIPPED → DELIVERED       (delivery confirmation)
DELIVERED → COMPLETED     (auto after 7 days or manual)
ANY (except COMPLETED) → CANCELLED (with compensation trigger)
```

**Forbidden transitions must throw a domain exception, not silently fail.**

Implementation pattern:

```php
// Use a dedicated OrderStateMachine class — NOT a switch in the controller or repository
class OrderStateMachine
{
    private const ALLOWED_TRANSITIONS = [
        OrderStatus::PENDING->value => [OrderStatus::PAID, OrderStatus::CANCELLED],
        OrderStatus::CONFIRMED->value => [OrderStatus::PAID, OrderStatus::CANCELLED],
        // ...
    ];

    public function transition(Order $order, OrderStatus $newStatus): void
    {
        $allowed = self::ALLOWED_TRANSITIONS[$order->status->value] ?? [];
        if (!in_array($newStatus, $allowed, true)) {
            throw new InvalidOrderTransitionException(
                from: $order->status,
                to: $newStatus,
                orderId: $order->id
            );
        }
        // Write to order_status_history BEFORE updating current status
        $this->statusHistoryRepository->record($order->id, $order->status, $newStatus);
        $order->status = $newStatus;
    }
}
```

#### Idempotency Key Enforcement

Order creation MUST enforce idempotency via the `Idempotency-Key` header:

```php
// In the CreateOrderController
$idempotencyKey = $request->header('Idempotency-Key');
if (!$idempotencyKey) {
    throw new MissingIdempotencyKeyException();
}

$cached = $this->idempotencyCache->get("order:idempotency:{$idempotencyKey}");
if ($cached) {
    return response()->json($cached, 200); // Return previous result, HTTP 200 not 201
}

$order = $this->orderService->createOrder($dto);
$this->idempotencyCache->set("order:idempotency:{$idempotencyKey}", $order->toArray(), ttl: 86400);
```

#### Prices Are Snapshots — Not References

When an order is created, snapshot item prices INTO the `order_items` table as integer paisa. NEVER store a foreign key to a product price. Prices change; orders must be immutable.

```sql
CREATE TABLE order_items (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID NOT NULL REFERENCES orders(id),
  product_id      UUID NOT NULL,                   -- reference only, no FK to product DB
  product_name    VARCHAR(255) NOT NULL,            -- snapshot
  sku             VARCHAR(100) NOT NULL,            -- snapshot
  unit_price_paisa BIGINT NOT NULL CHECK (unit_price_paisa > 0),  -- snapshot
  quantity        INT NOT NULL CHECK (quantity > 0),
  subtotal_paisa  BIGINT NOT NULL,                 -- unit_price_paisa * quantity
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

---

### PHASE 7 — Payment Service (NestJS 11 + PostgreSQL)

#### SSLCommerz IPN Double-Validation (C-13) — Critical Path

This flow must be implemented exactly. A single deviation = financial liability.

```
Step 1:  Receive IPN POST from SSLCommerz at POST /payments/ipn
Step 2:  Verify request originates from known SSLCommerz IP range (whitelist)
Step 3:  Parse IPN payload; extract val_id, tran_id, status, amount, currency
Step 4:  IF status != 'VALID' AND status != 'VALIDATED' → log + discard (do NOT proceed)
Step 5:  Idempotency check on tran_id → if already processed, ACK and return 200
Step 6:  Call SSLCommerz Validation API: GET https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php?val_id={val_id}&store_id={id}&store_passwd={pass}&format=json
Step 7:  Parse validation response; verify:
           - status = 'VALID'
           - amount matches stored order amount (within ±1 paisa tolerance)
           - currency matches expected currency
Step 8:  Open a DB transaction:
           a. Update payment record to COMPLETED
           b. Write balanced journal entry (ledger_lines must balance — trigger enforces)
           c. Insert into processed_events (idempotency)
           d. COMMIT
Step 9:  Publish payment.completed event to RabbitMQ (AFTER transaction commits)
Step 10: Return HTTP 200 OK to SSLCommerz (they retry on non-200)
```

**NEVER publish the event before the DB transaction commits. Event-before-commit = phantom payment.**

#### Double-Entry Ledger Implementation Rule

```typescript
// ALL ledger writes MUST go through LedgerService — never direct repository calls
class LedgerService {
  async writeJournalEntry(template: JournalTemplate, manager: EntityManager): Promise<void> {
    // 1. Create journal_entry record
    // 2. Create ALL ledger_lines in same transaction
    // 3. The DB trigger check_journal_balance() fires on COMMIT
    // 4. If trigger raises exception: entire transaction rolls back
    // 5. This is the safety net — but code should always produce balanced entries
  }
}
```

---

### PHASE 8 — Notification Service (Node.js 22)

#### Why This Service Must Stay Dumb

The notification service has ONE job: receive an event, render a template, send it out. It must NOT contain business logic. If a template decision requires business context, the publishing service must include that data in the event payload.

#### Template Registry Pattern

```typescript
// Template resolver must be a registry pattern — no if/else chains
const TEMPLATE_REGISTRY: Record<string, NotificationTemplate> = {
  'payment.completed':     paymentConfirmationTemplate,
  'payment.cod_placed':    codOrderTemplate,
  'payment.cod_collected': codCollectedTemplate,
  'payment.failed':        paymentFailedTemplate,
  'order.cancelled':       orderCancelledTemplate,
  // ...
};
```

#### Retry and DLQ Behavior

- Max retries: 3 with exponential backoff (1s, 2s, 4s)
- After 3 failures: message moves to `notifications.dlq`
- DLQ processor: log to Loki with WARN level and emit a Prometheus counter `notification_dlq_total`
- Never throw from the consumer handler — wrap in try/catch and nack(false) on failure

---

### PHASE 9 — API Gateway (Nginx)

#### Rate Limit Response Must Be JSON

By default Nginx returns HTML for 429. Override this to match your error response contract:

```nginx
# nginx.conf
limit_req_zone $binary_remote_addr zone=auth_zone:10m rate=10r/m;
limit_req_zone $binary_remote_addr zone=api_zone:10m rate=100r/m;

# In location block
limit_req zone=auth_zone burst=5 nodelay;
limit_req_status 429;

# Custom error pages
error_page 429 /429.json;
location = /429.json {
  internal;
  default_type application/json;
  return 429 '{"success":false,"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please try again later."},"meta":{"timestamp":"$time_iso8601"}}';
}
```

#### Security Headers (All Responses)

```nginx
add_header X-Frame-Options "DENY" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-XSS-Protection "1; mode=block" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; object-src 'none';" always;
# Remove server signature
server_tokens off;
more_clear_headers Server;
```

---

### PHASE 10 — Frontend (Next.js 14)

#### Auth State — Never Use localStorage

`next-auth` v5 manages the session. Zustand manages UI state. The auth token MUST live in an httpOnly cookie managed by next-auth. Never expose the raw JWT to JavaScript.

```typescript
// ✅ Correct — token in httpOnly cookie via next-auth
const session = await getServerSession(authOptions);

// ❌ Wrong — DO NOT store JWT in Zustand or localStorage
useAuthStore.setState({ token: jwtToken });
```

#### Error Boundaries Are Mandatory

Every page-level component MUST be wrapped in an error boundary. Uncaught render errors must not crash the whole app.

```tsx
// app/products/page.tsx
export default function ProductsPage() {
  return (
    <ErrorBoundary fallback={<ProductsErrorFallback />}>
      <Suspense fallback={<ProductsSkeleton />}>
        <ProductList />
      </Suspense>
    </ErrorBoundary>
  );
}
```

---

### PHASE 11 — Observability & Deployment Readiness

#### OpenTelemetry Bootstrap — All Services Must Initialize BEFORE Anything Else

```typescript
// product-service/src/instrumentation.ts — imported FIRST in main.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

const sdk = new NodeSDK({
  resource: new Resource({
    [SemanticResourceAttributes.SERVICE_NAME]: 'product-service',
    [SemanticResourceAttributes.SERVICE_VERSION]: process.env.APP_VERSION ?? '0.0.0',
  }),
  traceExporter: new OTLPTraceExporter({
    url: process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://jaeger:4317',
  }),
});

sdk.start();
```

For Laravel services use `open-telemetry/opentelemetry-php` SDK with the same pattern in `bootstrap/app.php`.

#### Prometheus Metrics — What Each Service Must Expose (minimum)

Every NestJS service must use `@willsoto/nestjs-prometheus` (or equivalent). Required metrics:

```typescript
// Required for every service
http_requests_total{method, route, status_code}      // Counter
http_request_duration_seconds{method, route}          // Histogram (p50/p95/p99)
db_query_duration_seconds{operation, collection}      // Histogram
cache_hits_total{cache_name}                          // Counter
cache_misses_total{cache_name}                        // Counter
rabbitmq_messages_consumed_total{queue, status}       // Counter (status: success|failure|dlq)
```

---

## PART 3 — CROSS-CUTTING PRODUCTION CONCERNS

These apply to ALL phases. Every agent must read and implement these.

---

### 3.1 Event Payload Standard — Full Contract

Every RabbitMQ event published ANYWHERE in this system MUST have this envelope:

```typescript
interface EventEnvelope<T> {
  event_id: string;        // UUID v4 — used for idempotency deduplication
  event_name: string;      // domain.action — e.g. "order.created"
  schema_version: string;  // semver — e.g. "1.0.0"
  occurred_at: string;     // ISO 8601 UTC — e.g. "2026-04-20T12:00:00.000Z"
  producer: string;        // service name — e.g. "order-service"
  correlation_id: string;  // trace_id from OpenTelemetry for distributed tracing
  payload: T;              // domain-specific data
}
```

Example `order.created` payload:

```typescript
interface OrderCreatedPayload {
  order_id: string;
  customer_id: string;
  vendor_id: string;
  payment_method: 'sslcommerz' | 'cod';
  total_amount_paisa: number;
  items: Array<{
    sku: string;
    product_id: string;
    quantity: number;
    unit_price_paisa: number;
  }>;
}
```

**Publish exchange topology:**

```
Exchange: emp.events (type: topic, durable: true)
Routing key: domain.action (e.g. "order.created")

Consumer queues (durable: true):
  inventory-service.order.created  → binds to "order.created"
  payment-service.order.created    → binds to "order.created"
  
DLQs (durable: true, auto-created on consumer setup):
  inventory-service.order.created.dlq
  payment-service.order.created.dlq
```

---

### 3.2 Error Taxonomy — Use This, Not Ad-Hoc Strings

Define these error codes in `packages/shared-types/src/errors.ts`. Use them in ALL services.

```typescript
export const ErrorCode = {
  // Validation
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  INVALID_FORMAT: 'INVALID_FORMAT',

  // Auth
  UNAUTHORIZED: 'UNAUTHORIZED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  FORBIDDEN: 'FORBIDDEN',
  INSUFFICIENT_PERMISSIONS: 'INSUFFICIENT_PERMISSIONS',

  // Domain
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  INVALID_STATE_TRANSITION: 'INVALID_STATE_TRANSITION',
  INSUFFICIENT_STOCK: 'INSUFFICIENT_STOCK',
  IDEMPOTENCY_KEY_MISSING: 'IDEMPOTENCY_KEY_MISSING',

  // Payment
  PAYMENT_VALIDATION_FAILED: 'PAYMENT_VALIDATION_FAILED',
  LEDGER_IMBALANCED: 'LEDGER_IMBALANCED',

  // Infrastructure
  DEPENDENCY_UNAVAILABLE: 'DEPENDENCY_UNAVAILABLE',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;
```

---

### 3.3 Circuit Breaker Policy

Services calling external dependencies (Redis, MongoDB, PostgreSQL, RabbitMQ, SSLCommerz API) MUST behave gracefully on failure. Define this policy per dependency type:

| Dependency | Failure Behavior | Fallback |
|-----------|-----------------|---------|
| Redis (cache) | On connect error: log WARN, bypass cache, query DB directly | DB-only mode |
| Redis (token blacklist) | On failure: DENY the request (fail closed — security) | Reject with 503 |
| MongoDB (product) | 3 retries with 100ms backoff, then return 503 | Return cached version if available |
| PostgreSQL | PgBouncer handles connection pool; on pool exhaustion return 503 | No fallback |
| RabbitMQ (publish) | If broker unavailable: log ERROR + write to a local `outbox` table | Transactional outbox pattern |
| SSLCommerz API (validation) | On timeout/error: DENY the IPN — do NOT fulfill | Return 500 to SSLCommerz (they retry) |

---

### 3.4 Structured Log Schema — Every Service, Every Log Line

Every log line emitted across the platform MUST be valid JSON with these fields:

```json
{
  "timestamp": "2026-04-20T12:00:00.000Z",
  "level": "info",
  "service": "product-service",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "span_id": "00f067aa0ba902b7",
  "request_id": "req-uuid-here",
  "user_id": "user-uuid-or-null",
  "message": "Product created successfully",
  "duration_ms": 42,
  "status_code": 201,
  "meta": {}
}
```

Fields that must NEVER appear in logs:
- `password`, `token`, `access_token`, `refresh_token`
- `val_id`, `store_passwd`, `tran_id` (raw SSLCommerz values)
- `private_key`, `secret`
- Full credit card numbers or bank account numbers

---

### 3.5 Docker Production Standards

#### Multi-Stage Dockerfile Checklist (every service)

```dockerfile
# Stage 1: Dependencies
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

# Stage 2: Build
FROM node:22-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# Stage 3: Production (minimum image)
FROM node:22-alpine AS production
RUN addgroup -g 1001 appgroup && adduser -u 1001 -G appgroup -s /bin/sh -D appuser
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=deps /app/node_modules ./node_modules
USER appuser  # ← NON-ROOT. This is mandatory.
EXPOSE 8002
HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD wget -q -O /dev/null http://localhost:8002/health/live || exit 1
CMD ["node", "dist/main.js"]
```

Rules:
- Final stage must be non-root user
- No `apt-get` or package managers in production stage
- No `.env` files EVER copied into image layers
- `HEALTHCHECK` directive required in Dockerfile
- Use `--only=production` on npm install in production stage

#### docker-compose.yml Service Block Template (all app services)

```yaml
product-service:
  build:
    context: ./services/product-service
    dockerfile: ../../infrastructure/docker/product-service/Dockerfile
    target: production
  image: emp/product-service:${APP_VERSION:-latest}
  container_name: emp-product-service
  restart: unless-stopped
  depends_on:
    mongodb:
      condition: service_healthy
    redis:
      condition: service_healthy
    rabbitmq:
      condition: service_healthy
  environment:
    NODE_ENV: production
    PORT: 8002
    MONGODB_URI: mongodb://mongodb:27017/emp_products
    REDIS_HOST: redis
    RABBITMQ_URL: amqp://${RABBITMQ_USER}:${RABBITMQ_PASS}@rabbitmq:5672
    OTEL_EXPORTER_OTLP_ENDPOINT: http://jaeger:4317
  env_file:
    - .env
  networks:
    - emp-internal
  deploy:
    resources:
      limits:
        cpus: '1.0'
        memory: 512M
      reservations:
        cpus: '0.25'
        memory: 128M
  logging:
    driver: json-file
    options:
      max-size: "100m"
      max-file: "3"
  healthcheck:
    test: ["CMD", "wget", "-q", "-O", "/dev/null", "http://localhost:8002/health/live"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 30s
```

---

### 3.6 PgBouncer — Connection Pooling Is Not Optional

Direct NestJS→PostgreSQL connections at 200 max_connections WILL exhaust the DB at scale. The SRS specifies PgBouncer as a sidecar. This is how to wire it:

```yaml
# docker-compose.yml — alongside postgres-inventory
pgbouncer-inventory:
  image: edoburu/pgbouncer:1.21.0
  container_name: emp-pgbouncer-inventory
  environment:
    DB_HOST: postgres-inventory
    DB_PORT: 5432
    DB_USER: ${POSTGRES_USER:-emp}
    DB_PASSWORD: ${POSTGRES_PASSWORD}
    POOL_MODE: transaction        # Most efficient for microservices
    MAX_CLIENT_CONN: 100
    DEFAULT_POOL_SIZE: 20
    SERVER_RESET_QUERY: DISCARD ALL
  networks:
    - emp-internal
  depends_on:
    postgres-inventory:
      condition: service_healthy
```

Application DB_HOST points to `pgbouncer-inventory`, NOT `postgres-inventory`.

---

### 3.7 Transactional Outbox Pattern (for event reliability)

When a service needs to both commit a DB change AND publish a RabbitMQ event, a failure between the commit and publish = lost event. Use the outbox pattern:

```sql
-- Add to every service that publishes events (order, inventory, payment)
CREATE TABLE outbox_events (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_name    VARCHAR(100) NOT NULL,
  payload       JSONB NOT NULL,
  status        VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PUBLISHED','FAILED')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  published_at  TIMESTAMPTZ,
  error_message TEXT
);
CREATE INDEX idx_outbox_pending ON outbox_events(created_at) WHERE status = 'PENDING';
```

Flow:
1. In the same DB transaction as your business write, INSERT to `outbox_events` with status `PENDING`
2. A background `OutboxProcessor` polls every 1s for `PENDING` events, publishes to RabbitMQ, updates status to `PUBLISHED`
3. On publish failure: increment retry count; after 3 failures mark `FAILED`, alert via Prometheus counter
4. This guarantees at-least-once delivery even if RabbitMQ is temporarily down

---

### 3.8 Health Check Contract (All Services)

```typescript
// GET /health/live — always returns 200 if process is running
{ "status": "ok", "timestamp": "2026-04-20T12:00:00Z" }

// GET /health/ready — returns 200 if all deps healthy, 503 if any dep is down
{
  "status": "ok",          // or "degraded" or "down"
  "timestamp": "...",
  "dependencies": {
    "database": { "status": "ok", "latency_ms": 2 },
    "redis":    { "status": "ok", "latency_ms": 1 },
    "rabbitmq": { "status": "ok", "latency_ms": 3 }
  }
}
```

The `ready` check must:
- Execute a lightweight ping on each dependency (SELECT 1 for Postgres, PING for Redis)
- Time out after 2 seconds per dependency check
- Return 503 if ANY required dependency is unreachable
- NOT expose internal IPs, hostnames, or connection strings in the response

---

### 3.9 Migration Governance

File naming convention (strictly followed):

```
services/{service-name}/migrations/
  V001__create_orders_table.sql
  V002__add_order_status_history.sql
  V003__add_idempotency_index.sql
  V{NNN}__{description_in_snake_case}.sql
```

Rules:
- Version numbers are sequential integers with zero-padding to 3 digits
- NEVER modify an existing migration file — write a new one
- Migrations run automatically on service startup in dev/staging
- In production: migrations run via explicit step in CI/CD pipeline before service deploy
- Every migration must have a corresponding `down` rollback script in `migrations/rollback/`

---

### 3.10 Testing Matrix — Complete Per Service

The following test types are MANDATORY for every service. A service is NOT production-ready without all of them.

| Test Type | Tooling | Location | CI Gate |
|-----------|---------|----------|---------|
| Unit — business logic | Jest (NestJS) / PHPUnit (Laravel) | `src/**/*.spec.ts` | Block on fail |
| Unit — validators/DTOs | Jest / PHPUnit | `src/**/*.spec.ts` | Block on fail |
| Integration — API endpoints | Supertest + testcontainers | `test/integration/` | Block on fail |
| Integration — DB + ORM | Testcontainers (real DB) | `test/integration/` | Block on fail |
| Contract — response shapes | Zod parse on response | `test/contract/` | Block on fail |
| Event — publish round-trip | Jest + RabbitMQ testcontainer | `test/events/` | Block on fail |
| Idempotency — duplicate events | Jest | `test/events/` | Block on fail |
| Failure — dependency outage | Jest with mocked failure | `test/failure/` | Block on fail |
| Load — high concurrency | k6 scripts | `test/load/` | Pre-release |
| Security — OWASP scan | OWASP ZAP | CI pipeline | Block on critical |

**Minimum coverage targets:**
- Business logic (services, use-cases): 90%+
- HTTP controllers: 80%+
- Infrastructure adapters (repos, cache): 70%+
- Overall per service: 80%+

---

## PART 4 — RISKS AND HOW TO PREVENT THEM

| Risk | Category | Prevention |
|------|----------|-----------|
| Overselling inventory under load | Concurrency | SELECT FOR UPDATE inside transaction + DB CHECK constraint |
| Lost payment events | Reliability | Transactional outbox pattern for all event publishers |
| Phantom payment (event before commit) | Data integrity | Publish AFTER transaction commits, never inside |
| Token replay after logout | Security | Redis blacklist checked on every request |
| JWKS cache stampede | Performance | Redlock on JWKS cache rebuild |
| Cascading failure from single service | Resilience | Circuit breaker + graceful degradation per dependency |
| Data drift across services | Consistency | Events are the single source of truth for cross-service state |
| DLQ silently growing | Observability | Prometheus counter + Grafana alert on DLQ depth > 0 |
| Connection pool exhaustion | Scalability | PgBouncer in transaction mode between every NestJS↔Postgres pair |
| Unbalanced ledger entries | Financial integrity | DB trigger enforces debit=credit; Prometheus alert on trigger fire |
| Secret leak via logs | Security | Centralized log redaction in logger utility; no raw token logging |
| Duplicate order creation | UX/Data integrity | Idempotency-Key header enforced on POST /orders |
| Schema breaking change | Compatibility | schema_version in event envelope; additive-only migrations |
| Hot cache key stampede under load | Performance | PER algorithm or Redlock for cache rebuilds |
| Single point of failure in auth JWKS | Availability | In-process LRU fallback when Redis is unavailable |

---

## PART 5 — WHAT CODING AGENTS MUST DO BEFORE WRITING A SINGLE LINE

This is the mandatory pre-flight checklist. If you are an agent starting a phase, run through this list fully.

1. **Read the SRS section** for the service you are about to build.
2. **Read Phase N entry** in `implementation_plan.md`.
3. **Read this document**, specifically the Part 2 section for your phase and all of Part 3.
4. **Create the Dockerfile FIRST** — no code before the container exists.
5. **Add the service to docker-compose.yml FIRST** — verify it boots before writing business logic.
6. **Create the folder structure** as defined in this document for your stack.
7. **Create the config module FIRST** — validate all env vars at startup. If config is invalid, the service must refuse to start.
8. **Create health endpoints FIRST** — `/health/live` and `/health/ready` before any domain code.
9. **Create the OpenAPI/Swagger annotations** as you write each endpoint — not after.
10. **Write tests alongside code**, not at the end.
11. **Never skip the idempotency store** for event consumers.
12. **Never write a migration as a direct DB call** — always a versioned migration file.
13. **Never log a token, password, val_id, or private key** — the logger utility must redact these.
14. **Update the progress tracker** in `implementation_plan.md` when your phase is complete.

---

## PART 6 — QUICK REFERENCE CARDS

### RabbitMQ Exchange/Queue Naming

```
Exchange (one, shared): emp.events (topic, durable)

Queue naming:    {consumer-service}.{event_name}
DLQ naming:      {consumer-service}.{event_name}.dlq
Routing key:     {domain}.{action}

Examples:
  inventory-service.order.created      ← routing key: order.created
  inventory-service.order.created.dlq
  payment-service.order.created        ← routing key: order.created
  order-service.payment.completed      ← routing key: payment.completed
  notification-service.payment.completed
```

### Redis Key Registry (complete)

```
# Auth Service
session:{user_id}                      TTL: 900s
token:blacklisted:{jti}               TTL: remaining JWT TTL
jwks:public_keys                       TTL: 3600s

# Product Service
products:list:{page}:{filters_hash}    TTL: 300s
products:detail:{id}                   TTL: 600s
categories:tree                        TTL: 1800s
lock:products:cache:{key}             TTL: 5s (Redlock)

# Order Service
order:idempotency:{idempotency_key}   TTL: 86400s
cart:{user_id}                         TTL: 7200s

# Inventory Service
inventory:display:{sku}               TTL: 60s

# Rate Limiting (Nginx)
ratelimit:{ip}:{endpoint}             TTL: 60s rolling
```

### Service Port Map

```
auth-service:        8001  (internal) → 8001 (external in dev)
product-service:     8002
order-service:       8003
inventory-service:   8004
payment-service:     8005
notification-service: 8006
nginx (gateway):     80 / 443
rabbitmq mgmt:       15672
grafana:             3001
prometheus:          9090
jaeger UI:           16686
```

### Money Rules (Zero Tolerance)

- Store: `BIGINT` paisa ONLY. Never `DECIMAL`, `FLOAT`, `NUMERIC`, or cents.
- Display: Divide by 100 in presentation layer only, never store the divided result.
- Transfer: `integer paisa` in all event payloads and API bodies.
- Validate: Any incoming monetary value must be a positive integer. Reject floats at the validation layer.
- Arithmetic: BDT 100.00 = 10000 paisa. Addition and comparison in integer arithmetic only.

---

*Document Version: 1.0.0 | Maintained by: Staff Architecture Team | Last Updated: 2026-04-20*