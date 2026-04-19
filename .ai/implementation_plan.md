# Enterprise Marketplace Platform (EMP) — Implementation Plan

> **Based on:** Enterprise Marketplace Platform (EMP) SRS v3.0.0
> **Architecture:** Microservices, Event-Driven, DDD, CQRS, Event Sourcing

This document outlines the step-by-step implementation plan. We will follow this sequence strictly, ensuring no service is built without its required foundations and integrations. **Do not skip ahead.**

Implementation standards and coding conventions are defined in `.ai/engineering_playbook.md`. All phases must follow that playbook in addition to the SRS.

---

## Phase Progress Tracker

| Phase | Status | Notes |
|------|--------|-------|
| Phase 1: Project Initialization & Monorepo Setup | COMPLETE | Monorepo structure created, base infrastructure booted and verified, Swagger registry seed added |
| Phase 2: Shared Packages & Core Infrastructure | COMPLETE | Shared packages implemented, TypeScript builds verified, Nginx base config validated |
| Phase 3: Auth Service | NOT STARTED | Pending |
| Phase 4: Product Service | NOT STARTED | Pending |
| Phase 5: Inventory Service | NOT STARTED | Pending |
| Phase 6: Order Service | NOT STARTED | Pending |
| Phase 7: Payment Service | NOT STARTED | Pending |
| Phase 8: Notification Service | NOT STARTED | Pending |
| Phase 9: API Gateway & Security Hardening | NOT STARTED | Pending |
| Phase 10: Frontend Integration | NOT STARTED | Pending |
| Phase 11: Deployment Readiness & Observability | NOT STARTED | Pending |

**Completed Phases:** `2 / 11`
**Current Phase:** `Phase 3 - Auth Service`

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

## Phase 4: Product Service (NestJS 10)
**Goal:** Establish the Product Catalogue & Search functionality (Port: 8002).
1. **Setup & DB:** Initialize NestJS 10 with MongoDB (Mongoose/TypeORM).
2. **JWT Validator Middleware:** Implement the 8-step local JWKS validation flow.
3. **Domain Implementation:** Create schemas and REST endpoints for Products and Categories.
4. **Caching:** Integrate Redis cache-aside pattern with distributed locks for categories and product listings.
5. **Search:** Implement MongoDB text indexes or Atlas search capabilities.

## Phase 5: Inventory Service (NestJS 10)
**Goal:** Stock Ledger, Pessimistic Locking, and Reservations (Port: 8004).
1. **Setup & DB:** Initialize NestJS 10 with PostgreSQL.
2. **Database Isolation & Integrity:** Create `inventory` and `inventory_ledger` tables with DB constraints (`stock_quantity >= 0`).
3. **Reservation Logic:** Implement `SELECT FOR UPDATE` pessimistic locking for safe concurrent reservations.
4. **Endpoints:** Develop stock adjustment API and retrieval endpoints.
5. **Event Consumer:** Setup consumers for `order.created` (deduce stock) and `payment.failed` (restore stock / compensation). Publish `inventory.updated`.

## Phase 6: Order Service (Laravel 13)
**Goal:** Order fulfillment state machine and history (Port: 8003).
1. **Setup & DB:** Initialize Laravel 13 with PostgreSQL.
2. **Domain Implementation:** Create migrations for `orders` and `order_items` (prices snapshot in integer paisa).
3. **API & Idempotency:** Build order creation endpoints enforcing idempotency keys.
4. **State Machine:** Implement the state machine logic preventing direct DB status updates.
5. **Event Publisher & Consumer:** Publish `order.created`, `order.cancelled`. Consume `payment.completed` and `payment.cod_collected` to advance states (PENDING -> PAID).

## Phase 7: Payment Service (NestJS 10)
**Goal:** SSLCommerz Integration, COD, and Double-Entry Ledger (Port: 8005).
1. **Setup & DB:** Initialize NestJS 10 with PostgreSQL.
2. **Double-Entry Ledger (C-14):** Build `accounts`, `journal_entries`, `ledger_lines`. **Crucial**: Implement PostgreSQL constraint trigger enforcing balanced entries (debits = credits).
3. **SSLCommerz API:** Implement the 10-step SSLCommerz instantiation and IPN webhook workflow.
4. **IPN Validation (C-13):** Implement double-validation via SSLCommerz Validation API.
5. **COD Flow:** Implement suspense accounting for Cash on Delivery and manual confirmation endpoints.
6. **Integration:** Consume `order.created`, emit `payment.completed`, `payment.failed`. Write appropriate templates to Double-Entry Ledger.

## Phase 8: Notification Service (Node.js 22)
**Goal:** Async Email/SMS Dispatch (Port: 8006).
1. **Setup:** Lightweight Node.js app using Redis for state.
2. **Event Consumer:** Consume notification events from RabbitMQ.
3. **Templates:** Handlebars.js template configuration for order receipts and stock alerts.
4. **Dispatcher:** Implement exponential backoff retries for SMTP or external SMS platforms.

## Phase 9: API Gateway & Security Hardening
**Goal:** Finalize Nginx configurations.
1. **Gateway Rules:** Configure `nginx.conf` routing to upstream service architectures (`proxy_pass`).
2. **Rate Limiting:** Enforce strict limits on auth (`/api/v1/auth`) and general `api_zone`.
3. **Security Headers:** HSTS, CORS configuration.

## Phase 10: Frontend Integration (Next.js 14)
**Goal:** User-facing Web Application.
1. **Setup:** Next.js 14 App Router, set up TailwindCSS and UI component library.
2. **State Management:** Setup `next-auth` (v5), Zustand (for cart UI preferences), and TanStack React Query (for server state).
3. **Customer Journeys:** 
   - Catalogue browsing & search.
   - Authentication (Login/Register).
   - Checkout flows (COD & Gateway mock).
4. **Dashboards:** Customer, Vendor, and Admin Role-Based protected views.

## Phase 11: Deployment Readiness & Observability
**Goal:** Prepare for production SLA.
1. **Observability Stack:** Deploy Promtail, Loki, Prometheus, Grafana, and Jaeger in `docker-compose.yml`.
2. **Dashboards:** Provision Grafana dashboards checking RabbitMQ DLQs and Database Connection saturation.
3. **Testing:** Execute end-to-end load test flows. Ensure Docker Secrets architecture is appropriately isolated for `JWT_PRIVATE_KEY` and DB credentials. 
4. **CI/CD:** Enforce contract/schema validations inside CI pipelines. 

---
**What's Next?**
If approved, we will begin with **Phase 3: Auth Service (Laravel 13)**.
