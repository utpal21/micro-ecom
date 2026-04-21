# Enterprise Marketplace Platform (EMP) — Implementation Plan

> **Based on:** Enterprise Marketplace Platform (EMP) SRS v3.0.0
> **Architecture:** Microservices, Event-Driven, DDD, CQRS, Event Sourcing

This document outlines the step-by-step implementation plan. We will follow this sequence strictly, ensuring no service is built without its required foundations and integrations. **Do not skip ahead.**

**CRITICAL PHASE PRE-REQUISITES:**
1. **Containerization First:** Before beginning any coding for a phase, you MUST create a Dockerfile and docker-compose service configuration for that specific service. No service (e.g., Auth Service) should run natively on the host machine.
2. **Strict Design Patterns:** Controllers must NEVER contain direct database queries. You must strictly use Service and Repository patterns.
3. **Dynamic Swagger:** Swagger/OpenAPI documentation must be generated dynamically from code annotations.

Implementation standards and coding conventions are defined in `.ai/engineering_playbook.md`. All phases must follow that playbook in addition to the SRS.

---

## Phase Progress Tracker

| Phase | Status | Notes |
|------|--------|-------|
| Phase 1: Project Initialization & Monorepo Setup | COMPLETE | Monorepo structure created, base infrastructure booted and verified, Swagger registry seed added |
| Phase 2: Shared Packages & Core Infrastructure | COMPLETE | Shared packages implemented, TypeScript builds verified, Nginx base config validated |
| Phase 3: Auth Service | COMPLETE | Laravel 13 auth service implemented, JWT/JWKS flows tested, OpenAPI added |
| Phase 4: Product Service | NOT STARTED | Pending |
| Phase 5: Inventory Service | NOT STARTED | Pending |
| Phase 6: Order Service | NOT STARTED | Pending |
| Phase 7: Payment Service | NOT STARTED | Pending |
| Phase 8: Notification Service | NOT STARTED | Pending |
| Phase 9: API Gateway & Security Hardening | NOT STARTED | Pending |
| Phase 10: Frontend Integration | NOT STARTED | Pending |
| Phase 11: Deployment Readiness & Observability | NOT STARTED | Pending |

**Completed Phases:** `3 / 11`
**Current Phase:** `Phase 4 - Product Service`

---

## Phase 1: Project Initialization & Monorepo Setup
**Goal:** Establish the repository structure and base docker-based infrastructure.
1. **Initialize Monorepo:**
   - Create directories: `apps/`, `services/`, `packages/`, `infrastructure/`.
   - Setup basic workspace configuration (e.g., Nx, Turborepo, or simple pnpm/yarn workspaces for node services).
2. **Infrastructure provisioning (`docker-compose.yml`):**
   - Configure PostgreSQL 17 instances (`postgres-auth`, `postgres-order`, `postgres-inventory`, `postgres-payment`).
   - Configure MongoDB 7.0 (`mongodb`).
   - Configure Redis 7.2 (`redis` sentinel cluster setup).
   - Configure RabbitMQ 3.13 (`rabbitmq` with management plugin).
   - Provision initial `wait-for-it.sh` and DB initialization scripts.

## Phase 2: Shared Packages & Core Infrastructure
**Goal:** Build the shared code used across multiple services to maintain constraints (C-03, C-08).
1. **`packages/shared-types`:**
   - Create TypeScript interfaces and Zod schemas for events, user roles, and order statuses.
2. **`packages/utils`:**
   - Structured JSON logger (enforcing trace, span, and request-id fields).
   - Trace propagation middleware.
   - Standardized API error responses and validation interceptors.
3. **`packages/event-bus`:**
   - Implement RabbitMQ publisher/consumer factory.
   - Enforce DLQ configuration (C-06).
   - Integrate idempotency checks and 3x exponential retry policies.
4. **API Gateway Base Setup (`infrastructure/nginx`):**
   - Configure basic reverse proxy rules, global rate limits, and health checks.

## Phase 3: Auth Service (Laravel 13)
**Goal:** Deliver Identity & Access Management and RS256 tokens (Port: 8001).
1. **Setup & DB:** Initialize Laravel 13, setup PostgreSQL connection and Run migrations.
2. **Key Management:** Implement RSA 4096-bit key pair generation/loading from Docker Secrets (C-07, C-15).
3. **Endpoints:** Develop JWKS endpoint (`/.well-known/jwks.json`), registration, and login.
4. **RBAC:** Integrate Spatie Laravel Permission with 7 roles and required permissions.
5. **Token Management:** Implement Refresh Token rotating and Service-to-Service JWT issuance. Add Redis-backed token blacklist.

## Phase 4: Product Service (NestJS 11)
**Goal:** Establish the Product Catalogue & Search functionality (Port: 8002).
1. **Setup & DB:** Initialize NestJS 11 with MongoDB (Mongoose).
2. **Folder Structure:** Create concrete module layout: `config/`, `health/`, `common/`, `products/`, `categories/` with domain/application/infrastructure/interfaces separation.
3. **OpenTelemetry Bootstrap:** Initialize OTel SDK BEFORE anything else in main.ts with service name and version.
4. **Config Module:** Create config service that validates ALL environment variables at startup using Joi or class-validator.
5. **Health Endpoints:** Implement `/health/live` (always 200) and `/health/ready` (checks MongoDB, Redis, RabbitMQ) FIRST.
6. **JWT Validator Middleware:** Implement the 8-step local JWKS validation flow with Redis cache and in-process LRU fallback.
7. **Domain Implementation:** Create schemas and REST endpoints for Products and Categories with Zod-backed DTOs.
8. **Redis Key Registry:** Implement cache keys with TTL: `products:list:*` (300s), `products:detail:*` (600s), `categories:tree` (1800s), `jwks:public_keys` (3600s).
9. **Cache Stampede Prevention:** Implement Redlock distributed lock pattern for cache rebuilds with 5s TTL.
10. **MongoDB Indexes:** Create migration scripts for indexes (slug unique, category/status/created_at compound, vendor_id/status, text search).
11. **Event Consumer:** Implement consumers for domain events with idempotency checks via `processed_events` table.
12. **Prometheus Metrics:** Expose required metrics: `http_requests_total`, `http_request_duration_seconds`, `db_query_duration_seconds`, `cache_hits_total`, `cache_misses_total`, `rabbitmq_messages_consumed_total`.
13. **Testing Matrix:** Implement unit (business logic, cache, JWT), integration (API, cache flow, health), contract (Zod validation), failure (dependency outage), idempotency tests.
14. **Docker Production:** Create multi-stage Dockerfile with non-root user, healthcheck directive, and resource limits in docker-compose.

## Phase 5: Inventory Service (NestJS 11)
**Goal:** Stock Ledger, Pessimistic Locking, and Reservations (Port: 8004).
1. **Setup & DB:** Initialize NestJS 11 with PostgreSQL via PgBouncer (transaction mode).
2. **Folder Structure:** Create concrete module layout with domain/application/infrastructure/interfaces separation.
3. **OpenTelemetry Bootstrap:** Initialize OTel SDK BEFORE anything else in main.ts.
4. **Config Module:** Create config service that validates ALL environment variables at startup.
5. **Health Endpoints:** Implement `/health/live` and `/health/ready` (checks PostgreSQL, Redis, RabbitMQ) FIRST.
6. **JWT Validator Middleware:** Implement the 8-step local JWKS validation flow.
7. **Database Isolation & Integrity:** Create `inventory` and `inventory_ledger` tables with DB constraint `chk_stock_non_negative` (stock_quantity >= 0 AND reserved_quantity >= 0 AND stock_quantity >= reserved_quantity).
8. **Idempotency Store:** Create `processed_events` table for event deduplication (event_id UUID, processed_at TIMESTAMPTZ).
9. **Reservation Logic:** Implement `SELECT FOR UPDATE` pessimistic locking inside DB transaction for safe concurrent reservations.
10. **Idempotency Contract:** Every event consumer MUST check idempotency before processing, process inside transaction, mark processed in same transaction, then ACK.
11. **Endpoints:** Develop stock adjustment API and retrieval endpoints.
12. **Event Consumer:** Setup consumers for `order.created` (deduce stock) and `payment.failed` (restore stock / compensation). Publish `inventory.updated`.
13. **Redis Key Registry:** Implement `inventory:display:{sku}` with 60s TTL.
14. **Prometheus Metrics:** Expose required metrics including `rabbitmq_messages_consumed_total{queue,status}`.
15. **Testing Matrix:** Implement unit (reservation logic, ledger), concurrency (simultaneous reservations), idempotency (duplicate events), integration (API, event flow), failure (RabbitMQ consumer mid-transaction).
16. **Docker Production:** Create multi-stage Dockerfile with non-root user, healthcheck, resource limits, and PgBouncer sidecar.

## Phase 6: Order Service (Laravel 13)
**Goal:** Order fulfillment state machine and history (Port: 8003).
1. **Setup & DB:** Initialize Laravel 13 with PostgreSQL via PgBouncer (transaction mode).
2. **OpenTelemetry Bootstrap:** Initialize OTel SDK in bootstrap/app.php BEFORE application boot.
3. **Config Module:** Validate ALL environment variables at startup.
4. **Health Endpoints:** Implement `/health/live` and `/health/ready` (checks PostgreSQL, Redis, RabbitMQ) FIRST.
5. **Domain Implementation:** Create migrations for `orders` and `order_items` (prices snapshot in integer paisa - NEVER reference product price table).
6. **State Machine Contract:** Implement `OrderStateMachine` class with ALLOWED_TRANSITIONS map; forbidden transitions MUST throw `InvalidOrderTransitionException`.
7. **Status History:** Create `order_status_history` table; write history record BEFORE updating current status.
8. **Idempotency Enforcement:** Order creation MUST enforce `Idempotency-Key` header; return cached result with HTTP 200 if key exists.
9. **Redis Key Registry:** Implement `order:idempotency:{key}` with 86400s TTL, `cart:{user_id}` with 7200s TTL.
10. **Transactional Outbox:** Create `outbox_events` table for reliable event publishing; INSERT to outbox in same transaction as business write.
11. **Event Publisher & Consumer:** Publish `order.created`, `order.cancelled` via outbox. Consume `payment.completed` and `payment.cod_collected` to advance states (PENDING -> PAID).
12. **Prometheus Metrics:** Expose required metrics including `rabbitmq_messages_consumed_total{queue,status}`.
13. **Testing Matrix:** Implement unit (state machine transitions, idempotency), integration (API, event flow), failure (dependency outage).
14. **Docker Production:** Create multi-stage Dockerfile with non-root user, healthcheck, resource limits, and PgBouncer sidecar.

## Phase 7: Payment Service (NestJS 11)
**Goal:** SSLCommerz Integration, COD, and Double-Entry Ledger (Port: 8005).
1. **Setup & DB:** Initialize NestJS 11 with PostgreSQL via PgBouncer (transaction mode).
2. **Folder Structure:** Create concrete module layout with domain/application/infrastructure/interfaces separation.
3. **OpenTelemetry Bootstrap:** Initialize OTel SDK BEFORE anything else in main.ts.
4. **Config Module:** Create config service that validates ALL environment variables at startup.
5. **Health Endpoints:** Implement `/health/live` and `/health/ready` (checks PostgreSQL, Redis, RabbitMQ) FIRST.
6. **JWT Validator Middleware:** Implement the 8-step local JWKS validation flow.
7. **Double-Entry Ledger (C-14):** Build `accounts`, `journal_entries`, `ledger_lines`. **Crucial**: Implement PostgreSQL trigger `check_journal_balance()` enforcing balanced entries (debits = credits).
8. **Ledger Service Contract:** ALL ledger writes MUST go through LedgerService - never direct repository calls.
9. **SSLCommerz IPN Double-Validation (C-13):** Implement EXACT 10-step flow: verify IP range → parse payload → check status → idempotency check → call validation API → verify amount/currency → open DB transaction → update payment + write ledger + mark processed → COMMIT → publish event → return 200.
10. **CRITICAL:** NEVER publish payment.completed event BEFORE DB transaction commits - this causes phantom payments.
11. **Idempotency Contract:** Check idempotency via tran_id before processing, mark processed in same transaction, then ACK.
12. **COD Flow:** Implement suspense accounting for Cash on Delivery and manual confirmation endpoints.
13. **Transactional Outbox:** Create `outbox_events` table for reliable event publishing.
14. **Integration:** Consume `order.created` via outbox, emit `payment.completed`/`payment.failed` via outbox. Write appropriate templates to Double-Entry Ledger.
15. **Prometheus Metrics:** Expose required metrics including `rabbitmq_messages_consumed_total{queue,status}` and custom counter for ledger trigger fires.
16. **Testing Matrix:** Implement unit (ledger balancing, IPN validation), integration (payment flow), contract (OpenAPI), failure (SSLCommerz timeout, DB outage).
17. **Docker Production:** Create multi-stage Dockerfile with non-root user, healthcheck, resource limits, and PgBouncer sidecar.

## Phase 8: Notification Service (Node.js 22)
**Goal:** Async Email/SMS Dispatch (Port: 8006).
1. **Setup:** Lightweight Node.js app using Redis for state.
2. **Folder Structure:** Create template registry pattern - no if/else chains for template resolution.
3. **Template Registry:** Implement `TEMPLATE_REGISTRY` Record mapping event names to templates (payment.completed, payment.cod_placed, payment.cod_collected, payment.failed, order.cancelled, etc.).
4. **Event Consumer:** Consume notification events from RabbitMQ.
5. **Retry & DLQ Behavior:** Max 3 retries with exponential backoff (1s, 2s, 4s); after failures move to DLQ; DLQ processor logs to Loki with WARN level and emits Prometheus counter `notification_dlq_total`.
6. **Error Handling:** Never throw from consumer handler - wrap in try/catch and nack(false) on failure.
7. **Business Logic Rule:** Service MUST stay dumb - if template needs business context, publishing service must include data in event payload.
8. **Prometheus Metrics:** Expose required metrics including `rabbitmq_messages_consumed_total{queue,status}`.
9. **Testing Matrix:** Implement unit (template rendering, retry logic), integration (RabbitMQ flow), failure (SMTP outage, DLQ handling).
10. **Docker Production:** Create multi-stage Dockerfile with non-root user, healthcheck, and resource limits.

## Phase 9: API Gateway (Nginx)
**Goal:** Finalize Nginx configurations with security hardening.
1. **Gateway Rules:** Configure `nginx.conf` routing to upstream service architectures (`proxy_pass`).
2. **Rate Limiting:** Enforce strict limits: auth zone (10r/m burst 5), api zone (100r/m burst 20).
3. **Rate Limit Response:** Override default HTML 429 to JSON response with structure: `{"success":false,"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please try again later."},"meta":{"timestamp":"$time_iso8601"}}`.
4. **Security Headers (All Responses):** Add X-Frame-Options "DENY", X-Content-Type-Options "nosniff", X-XSS-Protection "1; mode=block", Referrer-Policy "strict-origin-when-cross-origin", Permissions-Policy, Strict-Transport-Security, Content-Security-Policy, server_tokens off.
5. **CORS Policy:** Configure CORS for API Gateway (allow from frontend domain); do NOT add CORS to internal service-to-service calls.
6. **Testing:** Verify rate limit returns JSON 429, security headers present, internal services communicate without CORS.

## Phase 10: Frontend Integration (Next.js 14)
**Goal:** User-facing Web Application.
1. **Setup:** Next.js 14 App Router, set up TailwindCSS and UI component library.
2. **State Management:** Setup `next-auth` (v5) with httpOnly cookies for JWT, Zustand (for cart UI preferences), and TanStack React Query (for server state).
3. **Auth State Rule:** NEVER store JWT in localStorage or Zustand - token MUST live in httpOnly cookie managed by next-auth.
4. **Error Boundaries:** Every page-level component MUST be wrapped in error boundary to prevent app crash from uncaught render errors.
5. **Customer Journeys:** 
   - Catalogue browsing & search.
   - Authentication (Login/Register).
   - Checkout flows (COD & Gateway mock).
6. **Dashboards:** Customer, Vendor, and Admin Role-Based protected views.
7. **Testing:** Implement error boundary fallbacks, verify auth state management, test error scenarios.

## Phase 11: Deployment Readiness & Observability
**Goal:** Prepare for production SLA.
1. **Observability Stack:** Deploy Promtail, Loki, Prometheus, Grafana, and Jaeger in `docker-compose.yml`.
2. **OpenTelemetry Bootstrap:** Ensure ALL services initialize OTel SDK BEFORE any application code (NestJS: main.ts, Laravel: bootstrap/app.php).
3. **Prometheus Metrics:** Every NestJS service MUST expose: `http_requests_total{method,route,status_code}`, `http_request_duration_seconds{method,route}`, `db_query_duration_seconds{operation,collection}`, `cache_hits_total{cache_name}`, `cache_misses_total{cache_name}`, `rabbitmq_messages_consumed_total{queue,status}`.
4. **Dashboards:** Provision Grafana dashboards checking RabbitMQ DLQs and Database Connection saturation.
5. **Circuit Breaker Policy:** Define failure behavior per dependency: Redis cache (bypass to DB), Redis blacklist (DENY request), MongoDB (3 retries + 503), PostgreSQL (PgBouncer pool exhaustion → 503), RabbitMQ publish (write to outbox table), SSLCommerz API (DENY IPN).
6. **Structured Logging:** Every log line MUST be JSON with fields: timestamp, level, service, trace_id, span_id, request_id, user_id, message, duration_ms, status_code, meta.
7. **Log Redaction:** NEVER log password, token, access_token, refresh_token, val_id, store_passwd, tran_id, private_key, secret, credit card numbers, bank account numbers.
8. **Docker Production Standards:** All Dockerfiles must be multi-stage, final stage non-root user, HEALTHCHECK directive, resource limits in docker-compose (cpu/memory limits and reservations).
9. **PgBouncer Configuration:** Every PostgreSQL service must have PgBouncer sidecar in transaction mode (POOL_MODE: transaction, DEFAULT_POOL_SIZE: 20, MAX_CLIENT_CONN: 100).
10. **Transactional Outbox:** All event publishers must use outbox pattern for reliable event delivery.
11. **Health Check Contract:** `/health/live` returns 200 always; `/health/ready` returns 200 if deps healthy else 503 with dependencies status and latency.
12. **Migration Governance:** File naming: `V{NNN}__description_in_snake_case.sql`, never modify existing migrations, run migrations via CI/CD step in production, create rollback scripts in `migrations/rollback/`.
13. **Testing Matrix:** Mandatory tests: unit (business logic 90%+), integration (API endpoints, DB+ORM), contract (OpenAPI schema), event (publish round-trip), idempotency (duplicate events), failure (dependency outage), load (k6 scripts), security (OWASP ZAP).
14. **Testing:** Execute end-to-end load test flows. Ensure Docker Secrets architecture is appropriately isolated for `JWT_PRIVATE_KEY` and DB credentials. 
15. **CI/CD:** Enforce contract/schema validations inside CI pipelines. 

---
**What's Next?**
If approved, we will begin with **Phase 4: Product Service (NestJS 11)**.
