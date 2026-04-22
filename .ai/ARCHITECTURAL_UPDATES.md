# Enterprise Marketplace Platform (EMP) - Architectural Updates Summary

> **Date:** April 22, 2026
> **Reviewer:** Senior System Architect
> **Purpose:** Document critical architectural decisions and corrections based on senior system architect review

---

## Executive Summary

This document captures the architectural refinements made to the Enterprise Marketplace Platform (EMP) based on senior system architect review. These changes address critical inconsistencies, operational concerns, and production-grade requirements that were identified during architectural analysis.

---

## Critical Changes Summary

### 1. Architecture Terminology Correction

**Issue:** The plan declared "Event Sourcing" as an architecture pattern, but implemented standard event-driven architecture with outbox pattern.

**Correction:** 
- ✅ **Old:** "Microservices, Event-Driven, DDD, CQRS, Event Sourcing"
- ✅ **New:** "Microservices, Event-Driven, DDD, CQRS, Event-Driven Architecture with Transactional Outbox"

**Rationale:** True Event Sourcing (where the event log IS the source of truth and state is derived by replaying events) adds significant complexity and was not the actual implementation pattern. The platform uses standard event-driven architecture with transactional outbox for reliable event delivery.

**Impact:** Documentation and architectural descriptions updated to accurately reflect the implementation pattern.

---

### 2. Order Service Technology Stack Change

**Issue:** Order Service was specified as Laravel 13, creating operational and architectural inconsistencies.

**Problems with Laravel 13 for Order Service:**
1. **Operational Cognitive Load:** Order Service is the most event-dense service, consuming `payment.completed` and `payment.cod_collected` events, publishing `order.created` and `order.cancelled`, managing a state machine, and implementing Transactional Outbox. NestJS handles event-driven async work natively with decorators, typed interceptors, and module system built for it. Laravel's synchronous HTTP-first mental model creates friction.
2. **State Machine Implementation:** The plan requires a formal `OrderStateMachine` class with `ALLOWED_TRANSITIONS` map and typed `InvalidOrderTransitionException`. This is idiomatic TypeScript/NestJS. In Laravel/PHP, you'd need a third-party package (like `spatie/laravel-model-states`) which adds an opinionated layer the team may not own deeply.
3. **Transactional Outbox Pattern:** Implementing outbox (insert event to outbox in same DB transaction as business write, then background poller publishes to RabbitMQ) is significantly easier in NestJS with TypeORM's `QueryRunner` or `EntityManager` transaction scoping. Laravel requires Horizon or custom artisan commands for the poller - more moving parts.
4. **Team Consistency & Shared Packages:** Phases 2, 4, 5, 7 all use packages/event-bus, packages/shared-types, and packages/utils - TypeScript packages. Order Service on Laravel cannot consume these directly, requiring PHP duplication or breaking the monorepo benefit.
5. **OpenTelemetry:** The NestJS OTel SDK is first-class and well-maintained. Laravel's PHP OTel instrumentation (`open-telemetry/opentelemetry-php`) is functional but significantly less mature for auto-instrumentation of DB queries, HTTP calls, and RabbitMQ spans.

**Correction:**
- ✅ **Old:** Phase 6 - Order Service (Laravel 13)
- ✅ **New:** Phase 6 - Order Service (NestJS 11)

**Updated Phase 6 Requirements:**
1. Setup & DB: Initialize NestJS 11 with PostgreSQL via PgBouncer (transaction mode)
2. Folder Structure: Create concrete module layout with domain/application/infrastructure/interfaces separation
3. OpenTelemetry Bootstrap: Initialize OTel SDK BEFORE anything else in main.ts
4. Config Module: Create config service that validates ALL environment variables at startup
5. Health Endpoints: Implement `/health/live` and `/health/ready` (checks PostgreSQL, Redis, RabbitMQ) FIRST
6. JWT Validator Middleware: Implement 8-step local JWKS validation flow
7. Domain Implementation: Create migrations for `orders` and `order_items` (prices snapshot in integer paisa)
8. State Machine Contract: Implement `OrderStateMachine` class with ALLOWED_TRANSITIONS map
9. Status History: Create `order_status_history` table; write history record BEFORE updating current status
10. Idempotency Enforcement: Order creation MUST enforce `Idempotency-Key` header
11. Redis Key Registry: Implement `order:idempotency:{key}` with 86400s TTL, `cart:{user_id}` with 7200s TTL
12. Transactional Outbox: Create `outbox_events` table using TypeORM QueryRunner
13. Event Publisher & Consumer: Publish/consume events via outbox pattern
14. Prometheus Metrics: Expose required metrics
15. Testing Matrix: Implement comprehensive tests
16. Docker Production: Create multi-stage Dockerfile with non-root user, healthcheck, resource limits, and PgBouncer sidecar

**Benefits:**
- Shared packages consumption (`@emp/shared-types`, `@emp/event-bus`, `@emp/utils`)
- Native TypeScript type safety for state machine
- TypeORM transaction scoping for outbox pattern
- First-class OpenTelemetry support
- Consistency with other NestJS services (Product, Inventory, Payment)
- Reduced operational cognitive load for engineering team

---

### 3. Admin Service Split (Backend + Frontend)

**Issue:** Admin Service was specified as Next.js 14 for both backend and frontend, which is architecturally problematic.

**Problems with Next.js 14 as Backend:**
1. **Wrong Abstraction Layer:** Next.js is a frontend framework with server-side capabilities. Using it as a backend admin service with PostgreSQL, PgBouncer, RabbitMQ consumers, RBAC middleware, and double-entry audit trail is forcing a frontend tool into a backend role.
2. **Long-Running Consumers:** The App Router's server components and route handlers are not designed for long-running event consumers or complex service-layer architectures. Running RabbitMQ consumers inside Next.js route handlers causes pain.
3. **Caching Semantics Conflict:** Next.js App Router's caching semantics conflict with real-time dashboard data requirements.
4. **Complex Business Logic:** Admin service requires complex RBAC with 7 roles and granular permissions, audit logging, 2FA, encryption utilities, and deep event integration - all better suited for a backend framework.

**Correction:**
- ✅ **Old:** Phase 9 - Admin Service (Next.js 14)
- ✅ **New:** 
  - **Phase 9a:** Admin Backend Service (NestJS 11) - Port 8007
  - **Phase 9b:** Admin Frontend (Next.js 14) - Port 3001

**Updated Phase 9a - Admin Backend (NestJS 11):**
**Goal:** Admin Backend API with RBAC, Audit Trail, and Event Integration

1. **Setup & DB:** NestJS 11 with PostgreSQL via PgBouncer for admin data, Redis for caching and sessions
2. **Folder Structure:** Module-based layout with `modules/` (auth, products, orders, inventory, customers, dashboard, reports, vendors, content), `events/` (consumers, publishers), `middleware/` (auth, rbac, audit)
3. **Modules Implemented:**
   - **Authentication Module:** Login/logout, token refresh, 2FA (speakeasy/TOTP), admin user management
   - **Authorization (RBAC):** 7 roles (super_admin, admin, finance_manager, inventory_manager, content_manager, support_manager, product_manager), permission matrix, RBAC middleware, role management
   - **Audit Logging:** Comprehensive audit trail (admin_id, action, resource_type, resource_id, old_values, new_values, ip_address, user_agent), audit query API, sensitive data redaction
   - **Product Management:** CRUD operations with permission checks, product approval workflow, bulk operations, event publishing
   - **Order Management:** Advanced filtering, order detail view, status update workflow with validation, order analytics, bulk operations
   - **Inventory Management:** Inventory overview, low stock alerts, stock adjustment endpoint, inventory alerts management, event integration
   - **Customer Management:** Search and filtering, customer detail view, block/unblock customers, customer order history, customer analytics (CLV, AOV, retention)
   - **Dashboard Module:** KPI aggregation, graph data generation, alert center, caching strategy (5-15 min TTL)
   - **Reports Module:** Sales reports, revenue reports, product performance reports, customer analytics reports, custom report builder, scheduling and export (PDF, CSV)
   - **Vendor Management:** Vendor list and detail views, vendor performance metrics, settlement tracking, settlement processing
   - **Content Management:** Banner management (CRUD), display period logic, active/inactive toggle, image upload to S3/MinIO
4. **Event Integration:**
   - **Consumed Events:** order.created, order.updated, order.cancelled, product.created, product.updated, inventory.updated, inventory.low_stock, payment.completed, payment.failed, payment.refunded, user.registered, user.blocked
   - **Published Events:** product.approved, product.rejected, order.status.updated, inventory.adjusted, customer.blocked, customer.unblocked
   - Idempotency handling via Redis (`event:processed:{event_id}` TTL 7 days)
   - DLQ setup for failed events
5. **Security Implementation:**
   - JWT token validation (RS256 from Auth Service)
   - RBAC middleware with permission checking
   - 2FA implementation with TOTP
   - Encryption utility (AES-256-GCM) for sensitive data
   - Input sanitization (DOMPurify for HTML)
   - Rate limiting (Redis-based)
   - Security headers (HSTS, CSP, X-Frame-Options, etc.)
   - IP whitelisting (optional)
6. **Redis Key Registry:**
   - `dashboard:kpi:*` (300s TTL)
   - `dashboard:graph:*` (600s TTL)
   - `reports:*` (1800s TTL)
   - `event:processed:*` (604800s TTL - 7 days)
   - `jwks:public_keys` (3600s TTL)
   - `rate_limit:*` (varies by endpoint)
7. **Prometheus Metrics:** All required metrics plus `auth_failures_total`, `rate_limit_exceeded_total`
8. **Testing Matrix:** Comprehensive unit, integration, contract, event, idempotency, failure, and performance tests
9. **Docker Production:** Multi-stage Dockerfile with non-root user, HEALTHCHECK directive, resource limits, and PgBouncer sidecar

**Updated Phase 9b - Admin Frontend (Next.js 14):**
**Goal:** Admin Dashboard UI for all management operations

1. **Setup:** Next.js 14 App Router, TailwindCSS, and UI component library
2. **Folder Structure:** Feature-based layout with `app/admin/` (dashboard, products, orders, inventory, customers, reports, vendors, content), `components/` (shared UI), `lib/` (API clients, utilities)
3. **State Management:**
   - `next-auth` (v5) with httpOnly cookies for JWT
   - Zustand for UI preferences
   - TanStack React Query for server state
4. **Auth State Rule:** NEVER store JWT in localStorage or Zustand - token MUST live in httpOnly cookie managed by next-auth
5. **Error Boundaries:** Every page-level component MUST be wrapped in error boundary to prevent app crash from uncaught render errors
6. **Pages Implemented:**
   - **Dashboard Pages:** KPI cards and charts, alert center, quick actions
   - **Product Management Pages:** Product list with filters, product detail view, product creation/editing form, product approval workflow, bulk operations
   - **Order Management Pages:** Order list with advanced filters, order detail view with timeline, order status update interface, order analytics dashboard
   - **Inventory Management Pages:** Inventory overview table, low stock alerts, stock adjustment form, inventory alerts management
   - **Customer Management Pages:** Customer list with search, customer detail view, block/unblock interface, customer analytics dashboard
   - **Reports Module:** Report selection interface, report filters, charts and tables, export functionality (PDF, CSV)
   - **Vendor Management Pages:** Vendor list, vendor detail view, performance metrics, settlement tracking
   - **Content Management Pages:** Banner management (CRUD), display period configuration, image upload interface
7. **Security Features:** Protected routes based on roles, permission-based UI element visibility, 2FA setup interface
8. **Testing:** Error boundary fallbacks, auth state management verification, responsive design testing, all user flows
9. **Docker Production:** Multi-stage Dockerfile with non-root user, HEALTHCHECK directive, resource limits

**Benefits:**
- Proper separation of concerns (backend API vs. frontend UI)
- NestJS for backend: event consumers, RBAC, audit logging, complex business logic
- Next.js for frontend: where it belongs
- Consistency: Frontend engineers own Next.js, backend engineers own NestJS
- Both Admin Frontend (Phase 9b) and Customer Frontend (Phase 11) use Next.js 14 - consistency

---

### 4. PgBouncer Transaction Mode Clarification

**Issue:** Plan specified transaction mode for all services but lacked clarity about limitations.

**Clarification:**
- PgBouncer pool mode is correctly set to `transaction` for all services
- **Important:** Session-mode features (advisory locks, SET LOCAL, temp tables, prepared statements) are unavailable in transaction mode
- **Guidance:** Any developer using `pg_advisory_lock` for inventory pessimistic locking must use `pg_advisory_xact_lock` (transaction-scoped) instead, or bypass PgBouncer for that specific connection

**Impact:** Developers informed about transaction mode limitations to prevent runtime issues.

---

### 5. Database Strategy Validation

**Issue:** Mixed database strategy needed validation and documentation.

**Validation:**
The mixed database strategy is sound with the following justifications:

| Service | Database | Justification |
|-----------|-----------|---------------|
| **Auth Service** | PostgreSQL | RBAC ecosystem, token infrastructure, HTTP-first flows - Laravel 13 is the right choice |
| **Product Service** | MongoDB | Catalogue data is document-shaped (products with varying attributes), flexible schema, MongoDB ODM fits well |
| **Inventory Service** | PostgreSQL | ACID ledger operations require transactional integrity, concurrent stock reservations need row-level locking |
| **Order Service** | PostgreSQL | State machine, financial record, transactional integrity - NOW NestJS 11 |
| **Payment Service** | PostgreSQL | Double-entry accounting ledger, regulatory requirements, transactional integrity |
| **Admin Backend** | PostgreSQL | ACID requirements for audit trail, RBAC, complex queries |

**Tradeoff Acknowledged:**
Cross-service joins (e.g., Order Service snapshotting product prices at order time) must be handled at the application layer, not the DB layer. The plan already accounts for this with price snapshots in `order_items` table as integer paisa.

**Conclusion:** The database choices are production-grade and appropriate for each service's requirements.

---

## Updated Architecture Overview

### Final Service Stack

| Service | Technology | Port | Database | Rationale |
|----------|-------------|-------|-----------|------------|
| **Auth Service** | Laravel 13 | 8001 | PostgreSQL | Session management, Spatie RBAC, artisan migrations, HTTP-first |
| **Product Service** | NestJS 11 | 8002 | MongoDB | MongoDB ODM, TypeScript, shared packages, document-shaped data |
| **Order Service** | NestJS 11 | 8003 | PostgreSQL | State machine, event-driven, shared packages, transactional outbox |
| **Inventory Service** | NestJS 11 | 8004 | PostgreSQL | Concurrency, OTel, shared packages, pessimistic locking |
| **Payment Service** | NestJS 11 | 8005 | PostgreSQL | Async IPN, ledger, OTel, double-entry accounting |
| **Notification Service** | Node.js 22 | 8006 | Redis | Lightweight, template registry, no heavy framework needed |
| **Admin Backend** | NestJS 11 | 8007 | PostgreSQL | RBAC, audit trail, event consumers, not a frontend concern |
| **Admin Frontend** | Next.js 14 | 3001 | - | Belongs here, not as a backend API host |
| **Customer Frontend** | Next.js 14 | - | - | Correct as-is, server-side rendering, App Router |
| **API Gateway** | Nginx | 80/443 | - | Correct as-is, reverse proxy, rate limiting, security headers |

### Shared Infrastructure

| Component | Technology | Purpose |
|-----------|-------------|----------|
| **packages/shared-types** | TypeScript | Event interfaces, user roles, order statuses, Zod schemas |
| **packages/event-bus** | TypeScript | RabbitMQ publisher/consumer factory, DLQ enforcement |
| **packages/utils** | TypeScript | Structured logger, trace propagation, API error responses |
| **PostgreSQL 17** | Database | Auth, Order, Inventory, Payment, Admin Backend |
| **MongoDB 7.0** | Database | Product Service document store |
| **Redis 7.2** | Cache/State | Caching, sessions, token blacklist, rate limiting |
| **RabbitMQ 3.13** | Message Broker | Event-driven architecture, DLQ, competing consumers |
| **PgBouncer** | Connection Pooler | Transaction mode for all PostgreSQL services |

---

## Architecture Principles (Updated)

1. **Event-Driven Architecture with Transactional Outbox:** Services communicate via asynchronous events, with reliable event delivery guaranteed by the outbox pattern
2. **Domain-Driven Design (DDD):** Business logic encapsulated in domain layer, with clear separation of concerns
3. **CQRS Pattern:** Read and write operations separated for scalability
4. **Clean Architecture:** Controllers → Services → Repositories → Infrastructure adapters
5. **Microservices:** Independent, deployable services with own databases
6. **TypeScript Monorepo Benefits:** Shared packages, type safety, consistent tooling (except Auth Service which legitimately requires Laravel)

---

## Migration Path

### For Existing Work
1. **Phase 6 (Order Service):** Start fresh with NestJS 11 architecture
2. **Phase 9 (Admin Service):** Split into Backend (NestJS 11) and Frontend (Next.js 14)
3. **Documentation Updates:** All plans and architecture docs updated to reflect these changes

### For Future Development
1. **All New Services:** Follow NestJS 11 pattern unless specifically justified otherwise (e.g., Auth Service legitimately requires Laravel)
2. **Event-Driven Design:** Always use outbox pattern for event publishers
3. **Type Safety:** Leverage TypeScript and shared packages across all services
4. **Production-Grade Standards:** Follow all testing, observability, and security guidelines from Architect review document

---

## Risk Mitigation

| Risk | Mitigation | Status |
|-------|-------------|--------|
| **Overselling inventory under load** | SELECT FOR UPDATE inside transaction + DB CHECK constraint | ✅ Documented |
| **Lost payment events** | Transactional outbox pattern for all event publishers | ✅ Documented |
| **Phantom payment (event before commit)** | Publish AFTER transaction commits, never inside | ✅ Documented |
| **Token replay after logout** | Redis blacklist checked on every request | ✅ Documented |
| **Connection pool exhaustion** | PgBouncer in transaction mode between every NestJS↔Postgres pair | ✅ Documented |
| **Cascading failure from single service** | Circuit breaker + graceful degradation per dependency | ✅ Documented |
| **Data drift across services** | Events are the single source of truth for cross-service state | ✅ Documented |
| **Unbalanced ledger entries** | DB trigger enforces debit=credit; Prometheus alert on trigger fire | ✅ Documented |
| **Secret leak via logs** | Centralized log redaction in logger utility | ✅ Documented |
| **DLQ silently growing** | Prometheus counter + Grafana alert on DLQ depth > 0 | ✅ Documented |

---

## Conclusion

These architectural corrections address the most critical concerns identified during senior system architect review:

1. ✅ **Order Service → NestJS 11:** Eliminates mixed-stack cognitive load, enables shared packages consumption, provides native event-driven support
2. ✅ **Admin Service Split:** Proper separation of backend (NestJS 11) and frontend (Next.js 14) responsibilities
3. ✅ **Terminology Correction:** "Event-Driven Architecture with Transactional Outbox" accurately describes the implementation
4. ✅ **Database Strategy Validation:** Confirmed sound with documented tradeoffs
5. ✅ **PgBouncer Clarity:** Transaction mode limitations documented for developers
6. ✅ **Production-Grade Standards:** All concerns documented in Architect review context document

The platform is now positioned for production deployment with a consistent, maintainable, and scalable architecture.

---

## Next Steps

1. **Update Implementation Plan:** ✅ Complete - All phases updated
2. **Update Admin Service Documentation:** Consider creating separate docs for backend vs. frontend
3. **Communicate Changes:** Ensure all engineering teams are aware of these architectural decisions
4. **Proceed with Implementation:** Begin Phase 6 (Order Service - NestJS 11)

---

**Document Version:** 1.0.0  
**Last Updated:** April 22, 2026  
**Maintained By:** Staff Architecture Team