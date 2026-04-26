# Enterprise Marketplace Platform (EMP) — Implementation Plan

> **Based on:** Enterprise Marketplace Platform (EMP) SRS v3.0.0
> **Architecture:** Microservices, Event-Driven, DDD, CQRS, Event-Driven Architecture with Transactional Outbox

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
| | Phase 1: Project Initialization & Monorepo Setup | COMPLETE | Monorepo structure created, base infrastructure booted and verified, Swagger registry seed added |
| | Phase 2: Shared Packages & Core Infrastructure | COMPLETE | Shared packages implemented, TypeScript builds verified, Nginx base config validated |
| | Phase 3: Auth Service | COMPLETE | Laravel 13 auth service implemented, JWT/JWKS flows tested, OpenAPI added |
| | Phase 4: Product Service | COMPLETE | NestJS 11 product service implemented, Swagger added |
| | Phase 5: Inventory Service | COMPLETE | All 16 requirements + bonus Redis caching: DDD structure, stock ledger, pessimistic locking, reservations, idempotency, OpenTelemetry, health checks, JWT validation, event consumers, Redis cache with TTL/warming/invalidation, comprehensive tests (87+ tests), Docker setup |
| | Phase 6: Order Service | COMPLETE | All 16 requirements implemented: DDD structure, order state machine, status history, idempotency enforcement, transactional outbox, event integration, comprehensive tests, Docker setup |
| | Phase 7: Payment Service | NOT STARTED | Pending |
| | Phase 8: Notification Service | NOT STARTED | Pending |
| | Phase 9a: Admin API Service | NOT STARTED | NestJS 11 backend with RBAC, audit trail, event integration |
| | Phase 9b: Admin Frontend | NOT STARTED | Next.js 14 dashboard UI |
| | Phase 10: Search/Catalog Service | NOT STARTED | NestJS 11 + Elasticsearch for product search |
| | Phase 11: API Gateway & Security Hardening | NOT STARTED | Pending |
| | Phase 12: Frontend Integration | NOT STARTED | Pending |
| | Phase 13: Deployment Readiness & Observability | NOT STARTED | Pending |

**Completed Phases:** `6 / 13`
**Current Phase:** `Phase 7 - Payment Service (NestJS 11)`
**Next Phase:** `Phase 8 - Notification Service (Node.js 22)`

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

## Phase 2.5: Shared Packages Foundation (CRITICAL PREREQUISITE)
**Goal:** Implement critical shared packages before Phase 6 (Order Service).
**Documentation:** See `.ai/SHARED_PACKAGES_SPECIFICATION.md` for detailed specifications.
1. **`packages/shared-types` Enhancements:**
   - Branded `Paisa` type for type-safe money operations
   - Role/Permission enums and mapping functions
   - Centralized error codes with HTTP status mapping
   - Redis key registry with TTL, owner, and invalidation logic
2. **`packages/event-bus` Transactional Outbox:**
   - Outbox pattern implementation for reliable event delivery
   - Schema validation on incoming events
   - Built-in idempotency decorator for consumers
   - Background outbox processor
3. **`packages/utils` Logger Redaction:**
   - Automatic sensitive field redaction (password, token, secret, etc.)
   - Enhanced structured JSON logging
   - Centralized redaction logic
4. **`packages/http-client` (NEW):**
   - Axios wrapper with automatic trace propagation
   - Circuit breaker logic using opossum
   - Retry with exponential backoff
   - Unified error handling
5. **`packages/testing` (NEW):**
   - Testcontainers setup for Postgres/MongoDB/Redis/RabbitMQ
   - Mock factories for common domain objects
   - Shared test utilities and fixtures

## Phase 6: Order Service (NestJS 11)
**Goal:** Order fulfillment state machine and history (Port: 8003).
**Note:** Changed from Laravel 13 to NestJS 11 per Staff Architect Review for better event-driven support and shared packages consumption.
1. **Setup & DB:** Initialize NestJS 11 with PostgreSQL via PgBouncer (transaction mode).
2. **Folder Structure:** Create concrete module layout with domain/application/infrastructure/interfaces separation.
3. **OpenTelemetry Bootstrap:** Initialize OTel SDK BEFORE anything else in main.ts.
4. **Config Module:** Create config service that validates ALL environment variables at startup.
5. **Health Endpoints:** Implement `/health/live` and `/health/ready` (checks PostgreSQL, Redis, RabbitMQ) FIRST.
6. **JWT Validator Middleware:** Implement the 8-step local JWKS validation flow.
7. **Domain Implementation:** Create migrations for `orders` and `order_items` (prices snapshot in integer paisa - NEVER reference product price table).
8. **State Machine Contract:** Implement `OrderStateMachine` class with ALLOWED_TRANSITIONS map; forbidden transitions MUST throw `InvalidOrderTransitionException`.
9. **Status History:** Create `order_status_history` table; write history record BEFORE updating current status.
10. **Idempotency Enforcement:** Order creation MUST enforce `Idempotency-Key` header; return cached result with HTTP 200 if key exists.
11. **Redis Key Registry:** Implement `order:idempotency:{key}` with 86400s TTL, `cart:{user_id}` with 7200s TTL.
12. **Transactional Outbox:** Create `outbox_events` table for reliable event publishing; INSERT to outbox in same transaction as business write.
13. **Event Publisher & Consumer:** Publish `order.created`, `order.cancelled` via outbox. Consume `payment.completed` and `payment.cod_collected` to advance states (PENDING -> PAID).
14. **Prometheus Metrics:** Expose required metrics including `rabbitmq_messages_consumed_total{queue,status}`.
15. **Testing Matrix:** Implement unit (state machine transitions, idempotency), integration (API, event flow), failure (dependency outage).
16. **Docker Production:** Create multi-stage Dockerfile with non-root user, healthcheck, resource limits, and PgBouncer sidecar.

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

## Phase 9a: Admin API Service (NestJS 11)
**Goal:** Centralized Admin Dashboard Backend API with RBAC (Port: 8007).
**Documentation:** See `.ai/admin-service/` for comprehensive design docs (README, ARCHITECTURE, DATABASE_SCHEMA, API_SPECIFICATION, EVENT_INTEGRATION, SECURITY, IMPLEMENTATION_PLAN).
**Note:** Split from Admin Frontend per Staff Architect Review for proper separation of concerns.
1. **Setup & DB:** Initialize NestJS 11 with PostgreSQL via PgBouncer for admin data, Redis for caching and sessions.
2. **Folder Structure:** Create module-based layout: `src/modules/` (auth, products, orders, inventory, customers, dashboard, reports, vendors, content), `src/events/` (consumers, publishers), `src/middleware/` (auth, rbac, audit).
3. **OpenTelemetry Bootstrap:** Initialize OTel SDK BEFORE any application code in `src/lib/otel.ts`.
4. **Config Module:** Create config service validating ALL environment variables at startup using Zod.
5. **Health Endpoints:** Implement `/health/live` (always 200) and `/health/ready` (checks PostgreSQL, Redis, RabbitMQ) FIRST.
6. **JWT Auth Integration:** Implement RS256 token validation with 8-step local JWKS flow from Auth Service, Redis cache for keys.
7. **Authentication Module:** 
   - Login/logout endpoints with Auth Service integration
   - Token refresh mechanism
   - 2FA (Two-Factor Authentication) using speakeasy/TOTP
   - Admin user management
8. **Authorization (RBAC):**
   - Define 7 roles: super_admin, admin, finance_manager, inventory_manager, content_manager, support_manager, product_manager
   - Implement permission matrix with granular permissions
   - RBAC middleware for API protection
   - Role assignment and management
9. **Audit Logging:**
   - Comprehensive audit trail for all admin actions
   - Log structure: admin_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent
   - Audit query API with filtering
   - Sensitive data redaction
10. **Product Management:**
    - List, create, update, delete products (with permission checks)
    - Product approval workflow for vendor products
    - Bulk operations (publish, unpublish, delete)
    - Product approval/rejection with event publishing
11. **Order Management:**
    - List orders with advanced filtering (status, date, customer)
    - Order detail view
    - Order status update workflow with validation
    - Order analytics (statistics, revenue, breakdown)
    - Bulk order operations
12. **Inventory Management:**
    - Inventory overview
    - Low stock alerts
    - Stock adjustment endpoint
    - Inventory alerts management
    - Integration with Inventory Service via events
13. **Customer Management:**
    - Customer list with search and filtering
    - Customer detail view
    - Block/unblock customers
    - Customer order history
    - Customer analytics (CLV, AOV, retention)
14. **Dashboard Module:**
    - KPI aggregation (orders, revenue, users, products)
    - Graph data generation (sales trends, revenue trends)
    - Alert center (low stock, pending approvals, issues)
    - Caching strategy for dashboard metrics (5-15 min TTL)
15. **Reports Module:**
    - Sales reports (daily, weekly, monthly)
    - Revenue reports (by category, time period)
    - Product performance reports (top-selling, low-performing)
    - Customer analytics reports (retention, CLV, AOV)
    - Custom report builder
    - Report scheduling and export (PDF, CSV)
16. **Vendor Management:**
    - Vendor list and detail views
    - Vendor performance metrics
    - Settlement tracking
    - Settlement processing
17. **Content Management:**
    - Banner management (CRUD operations)
    - Display period logic
    - Active/inactive toggle
    - Image upload to S3/MinIO
18. **Event Integration:**
    - **Consumed Events:** order.created, order.updated, order.cancelled, product.created, product.updated, inventory.updated, inventory.low_stock, payment.completed, payment.failed, payment.refunded, user.registered, user.blocked
    - **Published Events:** product.approved, product.rejected, order.status.updated, inventory.adjusted, customer.blocked, customer.unblocked
    - Implement event consumers for all consumed events
    - Implement event publishers for all published events
    - Idempotency handling via Redis (`event:processed:{event_id}` TTL 7 days)
    - DLQ setup for failed events
19. **Security Implementation:**
    - JWT token validation (RS256 from Auth Service)
    - RBAC middleware with permission checking
    - 2FA implementation with TOTP
    - Encryption utility (AES-256-GCM) for sensitive data
    - Input sanitization (DOMPurify for HTML)
    - Rate limiting (Redis-based)
    - Security headers (HSTS, CSP, X-Frame-Options, etc.)
    - IP whitelisting (optional)
20. **Redis Key Registry:**
    - `dashboard:kpi:*` (300s TTL)
    - `dashboard:graph:*` (600s TTL)
    - `reports:*` (1800s TTL)
    - `event:processed:*` (604800s TTL - 7 days)
    - `jwks:public_keys` (3600s TTL)
    - `rate_limit:*` (varies by endpoint)
21. **Prometheus Metrics:** Expose required metrics including `http_requests_total`, `http_request_duration_seconds`, `db_query_duration_seconds`, `cache_hits_total`, `cache_misses_total`, `rabbitmq_messages_consumed_total{queue,status}`, `auth_failures_total`, `rate_limit_exceeded_total`.
22. **Testing Matrix:** Implement unit (business logic, RBAC, audit logging), integration (API, event flow, caching), contract (OpenAPI schema), event (publish/consume round-trip), idempotency (duplicate events), failure (dependency outage), performance (P95 < 200ms).
23. **Docker Production:** Create multi-stage Dockerfile with non-root user, HEALTHCHECK directive, resource limits in docker-compose, and PgBouncer sidecar.

## Phase 9b: Admin Frontend (Next.js 14)
**Goal:** Admin Dashboard UI consuming Admin API Service (Port: 8008).
**Note:** Split from Admin API Service per Staff Architect Review for proper separation of concerns.
1. **Setup:** Initialize Next.js 14 with App Router, TypeScript, TailwindCSS, and UI component library (shadcn/ui or similar).
2. **Authentication:**
   - Implement next-auth v5 with httpOnly cookies for JWT
   - JWT validation via Admin API Service endpoints
   - Protected routes using middleware
   - Token refresh mechanism
3. **State Management:**
   - TanStack React Query for server state (API calls)
   - Zustand for UI state (modals, filters, sidebar)
   - React Context for auth state
4. **Layout & Navigation:**
   - Responsive sidebar with role-based menu items
   - Top navigation with user profile and notifications
   - Breadcrumb navigation
   - Mobile-responsive design
5. **Dashboard Pages:**
   - Overview with KPI cards and charts
   - Real-time alerts and notifications
   - Quick action buttons
6. **Product Management Pages:**
   - Product list with search, filters, pagination
   - Product creation/editing forms with image upload
   - Product approval queue for vendor products
   - Bulk operations interface
7. **Order Management Pages:**
   - Order list with advanced filtering
   - Order detail view with timeline
   - Order status update workflow
   - Order analytics dashboard
8. **Inventory Management Pages:**
   - Inventory overview with stock levels
   - Low stock alerts interface
   - Stock adjustment forms
9. **Customer Management Pages:**
   - Customer list with search
   - Customer detail view with order history
   - Block/unblock interface
   - Customer analytics dashboard
10. **Reports Pages:**
    - Report builder interface
    - Scheduled reports management
    - Report export (PDF, CSV)
    - Chart visualizations
11. **Vendor Management Pages:**
    - Vendor list and detail views
    - Vendor performance metrics
    - Settlement tracking interface
12. **Content Management Pages:**
    - Banner management interface
    - Image upload to S3/MinIO
    - Display period configuration
13. **Error Handling:**
    - Global error boundary
    - API error toast notifications
    - Loading states and skeletons
14. **Performance:**
    - Code splitting and lazy loading
    - Image optimization (next/image)
    - Caching strategies
15. **Testing:** Implement E2E tests with Playwright, unit tests with Vitest, component tests with React Testing Library.
16. **Docker Production:** Create multi-stage Dockerfile with Nginx for static file serving, healthcheck, and resource limits.

## Phase 10: Search/Catalog Service (NestJS 11)
**Goal:** Dedicated product search and catalog service with Elasticsearch (Port: 8009).
**Note:** New service per Staff Architect Review - search deserves its own service.
1. **Setup & Infrastructure:**
   - Initialize NestJS 11
   - Setup Elasticsearch 8.x cluster
   - Configure Redis for caching
2. **Elasticsearch Integration:**
   - Create product index with proper mapping
   - Implement search with faceted filters
   - Autocomplete/suggest functionality
   - Aggregations for categories, price ranges, etc.
3. **Event Integration:**
   - Consume product.created, product.updated, product.deleted events
   - Sync product data to Elasticsearch in near real-time
4. **API Endpoints:**
   - Search endpoint with pagination
   - Faceted filtering
   - Autocomplete endpoint
   - Category browsing
5. **Caching:**
   - Cache热门 search queries
   - Cache category trees
   - TTL-based invalidation
6. **Testing:** Unit tests for search logic, integration tests with Elasticsearch, event sync tests.
7. **Docker Production:** Multi-stage Dockerfile with Elasticsearch sidecar, healthcheck, resource limits.

## Phase 11: API Gateway (Nginx)
**Goal:** Finalize Nginx configurations with security hardening.
1. **Gateway Rules:** Configure `nginx.conf` routing to upstream service architectures (`proxy_pass`).
2. **Rate Limiting:** Enforce strict limits: auth zone (10r/m burst 5), api zone (100r/m burst 20).
3. **Rate Limit Response:** Override default HTML 429 to JSON response with structure: `{"success":false,"error":{"code":"RATE_LIMIT_EXCEEDED","message":"Too many requests. Please try again later."},"meta":{"timestamp":"$time_iso8601"}}`.
4. **Security Headers (All Responses):** Add X-Frame-Options "DENY", X-Content-Type-Options "nosniff", X-XSS-Protection "1; mode=block", Referrer-Policy "strict-origin-when-cross-origin", Permissions-Policy, Strict-Transport-Security, Content-Security-Policy, server_tokens off.
5. **CORS Policy:** Configure CORS for API Gateway (allow from frontend domain); do NOT add CORS to internal service-to-service calls.
6. **Testing:** Verify rate limit returns JSON 429, security headers present, internal services communicate without CORS.

## Phase 12: Frontend Integration (Next.js 14)
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

## Phase 13: Deployment Readiness & Observability
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

**Note:** Detailed Admin Service design documentation is available in `.ai/admin-service/` including:
- `README.md` - Overview and quick start
- `ARCHITECTURE.md` - System architecture and design patterns
- `DATABASE_SCHEMA.md` - Complete database schema with migrations
- `API_SPECIFICATION.md` - Full API documentation with examples
- `EVENT_INTEGRATION.md` - Event-driven architecture details
- `SECURITY.md` - Security implementation and best practices
- `IMPLEMENTATION_PLAN.md` - Detailed 8-week implementation roadmap
