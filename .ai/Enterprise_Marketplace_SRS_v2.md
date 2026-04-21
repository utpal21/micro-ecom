# Enterprise Marketplace Platform (EMP) — Software Requirements Specification

> **Version:** 3.0.0 | **Status:** APPROVED FOR IMPLEMENTATION | **Last Revised:** April 19, 2026  
> **Classification:** Internal / Engineering Confidential  
> **Architecture:** Microservices · Event-Driven · DDD · CQRS · Event Sourcing

---

## ⚠️ AGENT CONSTRAINTS — READ FIRST

These rules are **non-negotiable**. Violating any constraint requires an Architecture Decision Record (ADR).

| ID | Rule | Constraint |
|----|------|------------|
| C-01 | Database isolation | NEVER access another service's database — API or events only |
| C-02 | Tech stack | DO NOT change framework/language per service without ADR approval |
| C-03 | Async events | ALWAYS use RabbitMQ for state-changing cross-service operations |
| C-04 | Event naming | ALWAYS follow `domain.action` convention — lowercase, dot-separated |
| C-05 | Idempotency | ALL consumers MUST be idempotent with `event_id` deduplication |
| C-06 | Dead Letter Queue | ALWAYS configure DLQ for every consumer queue |
| C-07 | Secrets | NEVER commit secrets/keys/credentials to source code or Docker images |
| C-08 | Logging | ALL services MUST emit structured JSON logs with required fields |
| C-09 | Health endpoints | ALL services MUST expose `/health/live` and `/health/ready` |
| C-10 | Migrations | ALL migrations MUST be backward-compatible (additive only, 2-release window) |
| C-11 | Raw SQL | FORBIDDEN — use ORM or query builder only |
| C-12 | Service calls | FORBIDDEN to call another service's internal port — use Gateway or events |
| C-13 | SSLCommerz IPN | ALWAYS double-validate `val_id` via SSLCommerz Validation API before fulfilling order |
| C-14 | Ledger amounts | ALWAYS store monetary amounts as **integer paisa** — never floats |
| C-15 | JWT private key | RSA 4096-bit private key stored ONLY in Docker Secret — never in env vars, code, or logs |

---

## Table of Contents

1. [System Identity & SLA Targets](#1-system-identity--sla-targets)
2. [Monorepo Structure](#2-monorepo-structure)
3. [Tech Stack — Pinned Versions](#3-tech-stack--pinned-versions)
4. [Service Specifications](#4-service-specifications)
5. [Authentication Architecture — RS256 + JWKS](#5-authentication-architecture--rs256--jwks)
6. [RBAC — Roles & Permissions (Spatie)](#6-rbac--roles--permissions-spatie)
7. [Communication Architecture](#7-communication-architecture)
8. [Payment Architecture — SSLCommerz + COD](#8-payment-architecture--sslcommerz--cod)
9. [Double-Entry Ledger](#9-double-entry-ledger)
10. [Database Architecture](#10-database-architecture)
11. [Caching Strategy](#11-caching-strategy)
12. [API Gateway — Nginx](#12-api-gateway--nginx)
13. [Observability Stack](#13-observability-stack)
14. [Security Architecture](#14-security-architecture)
15. [Frontend Architecture](#15-frontend-architecture)
16. [Deployment Architecture](#16-deployment-architecture)
17. [Testing Strategy](#17-testing-strategy)
18. [Critical Event Flows](#18-critical-event-flows)
19. [Scalability & High Availability](#19-scalability--high-availability)
20. [Glossary](#20-glossary)

---

## 1. System Identity & SLA Targets

| Attribute | Value |
|-----------|-------|
| System Name | Enterprise Marketplace Platform (EMP) |
| System Type | Distributed Microservices eCommerce |
| Architecture | DDD + CQRS + Event Sourcing |
| Communication | Synchronous (HTTP/REST) + Asynchronous (RabbitMQ) |
| Deployment | Docker Compose (VPS) — Kubernetes-ready |
| Uptime SLA | 99.95% (≤ 4.38 hrs downtime/year) |
| Latency SLA (p95) | < 200 ms reads; < 500 ms writes |
| Throughput | ≥ 10,000 concurrent users; ≥ 3,000 RPS sustained |

### Design Philosophy

- **Loose coupling, high cohesion** — each service owns exactly one domain
- **Failure isolation** — a failing service must not cascade
- **Observable by default** — every request, event, and error is traceable
- **Security-first** — least-privilege, zero-trust between services
- **Operational excellence** — day-2 operations (scaling, DR, upgrades) from day 1

---

## 2. Monorepo Structure

```
/
├── apps/
│   ├── web/                        # Next.js 14 frontend (App Router, SSR, React Query, Zustand)
│   └── api-gateway/                # Nginx reverse proxy (routing, rate limiting, TLS termination)
├── services/
│   ├── auth-service/               # Laravel 13 — JWT/RS256, OAuth2, RBAC, JWKS endpoint
│   ├── product-service/            # NestJS 11 — product catalogue, search, categorisation
│   ├── order-service/              # Laravel 13 — order lifecycle, state machine, history
│   ├── inventory-service/          # NestJS 11 — stock ledger, reservation, deduction
│   ├── payment-service/            # NestJS 11 — SSLCommerz, COD, reconciliation, ledger
│   └── notification-service/       # Node.js 22 lightweight — email/SMS dispatch, templates
├── packages/
│   ├── shared-types/               # TypeScript interfaces & Zod schemas shared across services
│   ├── event-bus/                  # RabbitMQ publisher/consumer factory, retry & DLQ wrappers
│   └── utils/                      # Logging, tracing, validation, error handling utilities
├── infrastructure/
│   ├── docker/                     # Per-service Dockerfiles, multi-stage builds
│   ├── nginx/                      # Nginx configs, rate limit zones, upstream definitions
│   └── monitoring/                 # Prometheus, Grafana, Loki, Jaeger configs & dashboards
├── docker-compose.yml              # Full stack orchestration — all services, infra, observability
└── docker-compose.prod.yml         # Production overrides — resource limits, replicas, secrets
```

---

## 3. Tech Stack — Pinned Versions

> **ALL versions below are pinned to current LTS/stable as of April 2026. Do not upgrade without ADR.**

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| PHP Framework (Auth, Order) | Laravel | **13** | Latest stable; replaces Laravel 11 |
| Node.js Runtime | Node.js | **22 LTS** | All Node services: NestJS, Notification, Next.js |
| Node Framework (Product, Inventory, Payment) | NestJS | **10 LTS** | Current LTS branch |
| Frontend | Next.js | **14** (App Router) | SSR, SSG, ISR, streaming |
| Relational DB | PostgreSQL | **17** | Released Sep 2024; current stable |
| Document DB | MongoDB | **7.0** | Product service only |
| Cache / Queue | Redis | **7.2** | Sentinel cluster for HA |
| Message Broker | RabbitMQ | **3.13** | Management plugin enabled |
| Frontend State | React Query (TanStack) | **v5** | Server state, caching, background sync |
| Frontend State | Zustand | **v4** | Client state — cart, auth, UI prefs |
| Auth Session | next-auth | **v5** | OAuth / JWT session management |
| Validation | Zod | **v3** | Runtime schema validation |
| HTTP Client | Axios | **v1** | Interceptors for auth + retry |
| PHP Auth | Spatie Laravel Permission | **latest** | RBAC roles and permissions |
| PHP HTTP | Guzzle | **v7** | Service-to-service HTTP calls |

---

## 4. Service Specifications

### 4.0 Summary Table

| Service | Framework | Database | Port | Domain |
|---------|-----------|----------|------|--------|
| Auth Service | Laravel 13 | PostgreSQL 17 | 8001 | Identity & Access Management |
| Product Service | NestJS 11 | MongoDB 7.0 | 8002 | Product Catalogue & Search |
| Order Service | Laravel 13 | PostgreSQL 17 | 8003 | Order Lifecycle Management |
| Inventory Service | NestJS 11 | PostgreSQL 17 | 8004 | Stock Ledger & Reservation |
| Payment Service | NestJS 11 | PostgreSQL 17 | 8005 | Payment Processing & Ledger |
| Notification Service | Node.js 22 (lightweight) | Stateless (Redis) | 8006 | Email / SMS Dispatch |

---

### 4.1 Auth Service

**Framework:** Laravel 13 | **DB:** PostgreSQL 17 | **Port:** 8001

**Responsibilities:**
- User registration, login, logout
- JWT RS256 — RSA 4096-bit asymmetric key pair
- Access token TTL: 15 min; Refresh token TTL: 7 days (rotated on use)
- JWKS endpoint (`/.well-known/jwks.json`) — public key distribution
- OAuth2 / Social login (Google, Facebook)
- RBAC via **Spatie Laravel Permission** (7 roles, 15 permissions — see §6)
- Brute-force protection, account lockout (5 failed attempts → 15 min lockout)
- Audit log of all auth events
- Service-to-service token issuance (`type: service` JWT)

**API Endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /auth/register` | Public | Register new user |
| `POST /auth/login` | Public | Issue JWT + refresh token |
| `POST /auth/refresh` | Bearer (refresh) | Rotate access token |
| `POST /auth/logout` | Bearer | Invalidate refresh token |
| `GET /auth/me` | Bearer | Current user profile |
| `POST /auth/password/reset` | Public | Initiate password reset |
| `GET /.well-known/jwks.json` | Public | RSA public key set (JWKS) |
| `POST /auth/service-token` | Service API key | Issue service-to-service JWT |

**Non-Functional:**
- Bcrypt password hashing, cost factor 12
- Refresh tokens stored as hashed SHA-256 in DB
- Redis token blacklist for immediate revocation
- RSA private key in Docker Secret only — never logged, never in env var

---

### 4.2 Product Service

**Framework:** NestJS 11 | **DB:** MongoDB 7.0 | **Port:** 8002

**Responsibilities:**
- Product CRUD with variant support (size, color, SKU)
- Category hierarchy (multi-level)
- Full-text search (MongoDB Atlas Search or Elasticsearch-ready)
- Image URL management, SEO slugs
- Redis-cached product listings (TTL: 5 min)
- Vendor-scoped product management
- Consume `inventory.updated` to sync stock display

**API Endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /products` | Public | Paginated product list (cached) |
| `GET /products/:id` | Public | Product detail |
| `POST /products` | Vendor/Admin | Create product |
| `PUT /products/:id` | Vendor/Admin | Update product |
| `DELETE /products/:id` | Vendor/Admin | Soft-delete product |
| `GET /products/search?q=` | Public | Full-text search |
| `GET /categories` | Public | Category tree (cached 30 min) |

**Non-Functional:**
- MongoDB flexible schema; indexed on `category`, `vendor_id`, `status`, `slug` (unique), `created_at` (TTL)
- Cache invalidation on write via Redis pub/sub
- Cursor-based pagination for performance

---

### 4.3 Order Service

**Framework:** Laravel 13 | **DB:** PostgreSQL 17 | **Port:** 8003

**Responsibilities:**
- Order creation with idempotency key
- Order state machine: `PENDING → CONFIRMED → PAID → SHIPPED → DELIVERED → CANCELLED`
- Order line items with pricing snapshot at order time
- Order history & admin management
- Emit `order.created`, `order.cancelled` events
- Consume `payment.completed`, `payment.failed` to advance state

**API Endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /orders` | Customer JWT | Create order (idempotent via key) |
| `GET /orders/:id` | Owner/Admin JWT | Order detail |
| `GET /orders` | Customer JWT | User's order history |
| `PATCH /orders/:id/cancel` | Owner/Admin | Cancel order |
| `GET /admin/orders` | Admin JWT | Admin order management |
| `PATCH /admin/orders/:id/status` | Admin JWT | Manual status override |

**Non-Functional:**
- PostgreSQL transactions for ACID guarantees
- Idempotency keys prevent duplicate orders
- State transitions validated by state machine — no direct DB status updates allowed
- Pricing snapshot stored in `order_items.unit_price_paisa` (integer paisa)

---

### 4.4 Inventory Service

**Framework:** NestJS 11 | **DB:** PostgreSQL 17 | **Port:** 8004

**Responsibilities:**
- Stock level tracking per SKU
- Pessimistic locking (`SELECT FOR UPDATE`) for concurrent reservation
- Stock deduction on `order.created` event
- Stock rollback on `payment.failed` event
- Low-stock alerts via `inventory.low_stock` event
- Admin stock adjustment with full audit trail in `inventory_ledger`

**API Endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `GET /inventory/:sku` | Internal | Get stock level |
| `POST /inventory/reserve` | Internal | Reserve stock |
| `POST /inventory/release` | Internal | Release reservation |
| `POST /admin/inventory/adjust` | Admin JWT | Manual adjustment with reason |
| `GET /admin/inventory` | Admin JWT | Full stock list |

**Non-Functional:**
- `SELECT FOR UPDATE` on all reservation operations
- DB constraint: `stock_quantity >= 0` enforced at DB level
- All adjustments append to `inventory_ledger` — immutable audit trail

---

### 4.5 Payment Service

**Framework:** NestJS 11 | **DB:** PostgreSQL 17 | **Port:** 8005

**Responsibilities:**
- SSLCommerz integration (primary gateway — BD market)
- Cash on Delivery (COD) flow
- Process payment on `order.created` event
- Emit `payment.completed` or `payment.failed`
- IPN webhook validation via SSLCommerz Validation API
- Refund processing on cancellation
- Double-entry ledger journal entry creation (see §9)
- Financial reconciliation reports

**API Endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /payments/initiate` | Customer JWT | Start SSLCommerz payment session |
| `POST /payments/ipn` | Public (HMAC verified) | SSLCommerz IPN webhook receiver |
| `POST /payments/success` | Public (redirect) | SSLCommerz success redirect |
| `POST /payments/fail` | Public (redirect) | SSLCommerz failure redirect |
| `POST /payments/cancel` | Public (redirect) | SSLCommerz cancel redirect |
| `GET /payments/:id` | Owner/Admin | Payment status |
| `POST /payments/:id/refund` | Admin JWT | Initiate refund |
| `POST /payments/cod/confirm` | Admin JWT | Confirm COD collection |
| `GET /payments/reconciliation` | Finance Manager | Reconciliation report |

**Non-Functional:**
- No raw card data stored (SSLCommerz tokenizes)
- Idempotency on all payment operations
- IPN `val_id` double-validated via SSLCommerz Validation API (C-13)
- All amounts stored as integer paisa (C-14)
- COD uses suspense accounting until admin confirms collection

---

### 4.6 Notification Service

**Framework:** Node.js 22 (lightweight) | **DB:** Stateless (Redis) | **Port:** 8006

**Responsibilities:**
- Consume events and dispatch notifications
- Email via SMTP / AWS SES / SendGrid (configurable)
- SMS via Twilio / AWS SNS (configurable)
- Template management (Handlebars)
- Retry failed deliveries with exponential backoff
- Delivery status tracking via Redis

**API Endpoints:**

| Endpoint | Auth | Description |
|----------|------|-------------|
| `POST /notify/email` | Internal API key | Direct email dispatch |
| `POST /notify/sms` | Internal API key | Direct SMS dispatch |
| `GET /notifications/:userId` | Admin JWT | Notification history |

**Non-Functional:**
- Stateless — no primary DB; Redis for dedup and job queue
- Provider failover: primary → secondary on failure
- Rate limiting per user to prevent notification spam
- All templates version-controlled in `templates/` directory

---

## 5. Authentication Architecture — RS256 + JWKS

### 5.1 Key Architecture

```
┌─────────────────────────────────────────────────────┐
│                   Auth Service                      │
│  ┌─────────────────────────────────────────────┐   │
│  │  RSA 4096-bit Private Key                   │   │
│  │  Source: Docker Secret ONLY                 │   │
│  │  Never: env vars, logs, code, network       │   │
│  └────────────────────┬────────────────────────┘   │
│                       │ signs JWTs                  │
│  ┌────────────────────▼────────────────────────┐   │
│  │  JWKS Endpoint: GET /.well-known/jwks.json  │   │
│  │  Returns: RSA public key in JWK format      │   │
│  │  Cache-Control: max-age=3600                │   │
│  └─────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
          │ public key via JWKS
          ▼
┌──────────────────────────────────────────┐
│  All Other Services (Product, Order…)    │
│  - Fetch JWKS on startup, cache locally  │
│  - Background refresh every 1 hour       │
│  - Validate JWT locally — NO network     │
│    call to Auth Service per request      │
└──────────────────────────────────────────┘
```

### 5.2 JWT Token Types

| Token Type | `type` claim | TTL | Audience (`aud`) | Issued By |
|-----------|-------------|-----|-----------------|-----------|
| User Access Token | `access` | 15 min | `emp-platform` | Auth Service |
| User Refresh Token | `refresh` | 7 days | `emp-auth` | Auth Service |
| Service Token | `service` | 1 hour | `emp-{target-service}` | Auth Service |

**Access Token Claims:**
```json
{
  "iss": "https://emp.example.com",
  "sub": "user_uuid",
  "aud": "emp-platform",
  "type": "access",
  "jti": "unique_token_id",
  "iat": 1713456000,
  "exp": 1713456900,
  "roles": ["customer"],
  "permissions": ["orders.create", "products.read"]
}
```

**Service Token Claims:**
```json
{
  "iss": "https://emp.example.com",
  "sub": "order-service",
  "aud": "emp-inventory-service",
  "type": "service",
  "jti": "unique_token_id",
  "iat": 1713456000,
  "exp": 1713459600,
  "scopes": ["inventory.reserve", "inventory.release"]
}
```

### 5.3 Token Validation Flow (8 Steps — Every Service)

Every service receiving a JWT MUST perform ALL 8 steps in order:

```
Step 1: Extract token from Authorization: Bearer <token> header
Step 2: Decode JWT header — extract `kid` (key ID)
Step 3: Look up matching key in local JWKS cache by `kid`
        → If `kid` not found: refresh JWKS cache from /.well-known/jwks.json, retry once
        → If still not found: reject with 401
Step 4: Verify RS256 signature using RSA public key
        → Signature mismatch: reject with 401
Step 5: Verify `exp` (expiry) — reject if token is expired (401)
Step 6: Verify `iss` matches expected issuer URL (401 if mismatch)
Step 7: Verify `aud` contains this service's expected audience value (401 if mismatch)
Step 8: Verify `type` == "access" for user requests OR "service" for service calls
        → Wrong type: reject with 401
→ PASS: Extract `sub`, `roles`, `permissions` (or `scopes`) from claims
→ All checks passed: proceed with request
```

### 5.4 Service-to-Service Token Caching

```
Service startup:
  → Request service token from Auth Service (POST /auth/service-token)
  → Cache in-memory with TTL = token.exp - 60 seconds (60s buffer)
  → Attach as Authorization: Bearer <service_token> on outbound calls

Background refresh:
  → 60 seconds before expiry, fetch new token silently
  → Swap in-memory cache atomically — zero downtime
  → On fetch failure: retry 3× with backoff, alert if all fail
```

### 5.5 Token Blacklist (Immediate Revocation)

- On logout: store `jti` in Redis with TTL = remaining token lifetime
- Key pattern: `token:blacklisted:{jti}`
- Services check blacklist as **Step 1.5** (after extraction, before JWKS lookup)
- Redis Sentinel ensures blacklist survives node failure

---

## 6. RBAC — Roles & Permissions (Spatie)

### 6.1 Role Hierarchy

```
super_admin
    └── admin
            ├── finance_manager
            ├── inventory_manager
            ├── support_agent
            └── vendor
                    └── customer
```

### 6.2 Roles

| Role | Description | Guard |
|------|-------------|-------|
| `super_admin` | Full system access; can manage admins | `web` + `api` |
| `admin` | Platform operations; user management | `api` |
| `finance_manager` | Payment reports, reconciliation, refunds | `api` |
| `inventory_manager` | Stock adjustments, low-stock management | `api` |
| `support_agent` | View orders/users; cannot modify financial data | `api` |
| `vendor` | Own product CRUD; view own orders | `api` |
| `customer` | Browse, buy, manage own orders | `api` |

### 6.3 Permission Slugs & Role Assignments

| Permission Slug | customer | vendor | support_agent | inventory_manager | finance_manager | admin | super_admin |
|----------------|----------|--------|--------------|-------------------|----------------|-------|-------------|
| `products.read` | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| `products.create` | ❌ | ✅ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `products.update` | ❌ | ✅ (own) | ❌ | ❌ | ❌ | ✅ | ✅ |
| `products.delete` | ❌ | ✅ (own) | ❌ | ❌ | ❌ | ✅ | ✅ |
| `orders.create` | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |
| `orders.read` | ✅ (own) | ✅ (own) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `orders.manage` | ❌ | ❌ | ✅ | ❌ | ❌ | ✅ | ✅ |
| `inventory.read` | ❌ | ✅ (own) | ✅ | ✅ | ✅ | ✅ | ✅ |
| `inventory.adjust` | ❌ | ❌ | ❌ | ✅ | ❌ | ✅ | ✅ |
| `payments.read` | ✅ (own) | ✅ (own) | ✅ | ❌ | ✅ | ✅ | ✅ |
| `payments.refund` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `reports.financial` | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ | ✅ |
| `users.manage` | ❌ | ❌ | ✅ (view) | ❌ | ❌ | ✅ | ✅ |
| `roles.manage` | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ | ✅ |
| `system.config` | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ | ✅ |

### 6.4 Dashboard Routing by Role

| Role | Landing Route | Dashboard Type |
|------|--------------|----------------|
| `customer` | `/dashboard` | Customer Dashboard — orders, wishlist, profile |
| `vendor` | `/vendor/dashboard` | Vendor Dashboard — products, sales, inventory |
| `support_agent` | `/admin/support` | Support Dashboard — orders, users, tickets |
| `inventory_manager` | `/admin/inventory` | Inventory Dashboard — stock levels, adjustments |
| `finance_manager` | `/admin/finance` | Finance Dashboard — payments, reconciliation, reports |
| `admin` | `/admin/dashboard` | Admin Dashboard — full platform overview |
| `super_admin` | `/admin/dashboard` | Admin Dashboard + system config panel |

### 6.5 Implementation Notes (Spatie)

```php
// Assign role on registration
$user->assignRole('customer');

// Check permission (enforced at service layer AND gateway)
$user->can('orders.create');
Gate::authorize('inventory.adjust');

// Middleware on routes
Route::middleware(['auth:api', 'role:admin|finance_manager'])->group(function () {
    Route::get('/admin/payments', [PaymentController::class, 'index']);
});

// Vendor-scoped policy (own resources only)
class ProductPolicy {
    public function update(User $user, Product $product): bool {
        return $user->hasRole('admin') || $product->vendor_id === $user->id;
    }
}
```

---

## 7. Communication Architecture

### 7.1 Synchronous HTTP/REST

| Rule | Detail |
|------|--------|
| External protocol | HTTPS (TLS 1.3); HSTS max-age 1 year |
| Internal protocol | HTTP within Docker network |
| Auth header | `Authorization: Bearer <JWT>` on all protected routes |
| Request tracing | `X-Request-ID` header propagated across all services |
| Default timeout | 5s; 30s for payment endpoints; 2s for health checks |
| Circuit breaker | Open after 5 consecutive failures; half-open after 30s |
| Retry policy | 3× exponential backoff (1s, 2s, 4s) — idempotent GETs only |
| Service-to-service | Service JWT (`type: service`) + mTLS on internal calls |

### 7.2 Asynchronous — RabbitMQ Event Bus

**Event Naming Convention:** `{domain}.{action}` — lowercase, dot-separated

| Event | Producer | Consumer(s) | Trigger |
|-------|----------|-------------|---------|
| `order.created` | Order Service | Inventory, Payment | User places order |
| `order.cancelled` | Order Service | Inventory, Payment, Notification | Cancellation requested |
| `payment.completed` | Payment Service | Order, Notification | Gateway/IPN confirms success |
| `payment.failed` | Payment Service | Order, Inventory, Notification | Gateway reports failure |
| `payment.cod_placed` | Payment Service | Order, Notification | COD order placed |
| `payment.cod_collected` | Payment Service | Order, Notification | Admin confirms cash collected |
| `inventory.low_stock` | Inventory Service | Notification | SKU below threshold |
| `inventory.updated` | Inventory Service | Product Service | Stock level change for display |
| `notification.email` | Any Service | Notification Service | Email dispatch requested |
| `notification.sms` | Any Service | Notification Service | SMS dispatch requested |

### 7.3 Queue & Exchange Design

| Exchange | Type | Routing Key | Queue(s) | DLQ |
|----------|------|-------------|----------|-----|
| `order.exchange` | Topic | `order.created` | `inventory.order.queue`, `payment.order.queue` | `dlq.order.created` |
| `order.exchange` | Topic | `order.cancelled` | `inventory.cancel.queue`, `payment.cancel.queue`, `notification.cancel.queue` | `dlq.order.cancelled` |
| `payment.exchange` | Topic | `payment.completed` | `order.payment.queue`, `notification.payment.queue` | `dlq.payment.completed` |
| `payment.exchange` | Topic | `payment.failed` | `order.fail.queue`, `inventory.fail.queue`, `notification.fail.queue` | `dlq.payment.failed` |
| `payment.exchange` | Topic | `payment.cod_collected` | `order.cod.queue`, `notification.cod.queue` | `dlq.payment.cod_collected` |

### 7.4 Consumer Contract

- Every consumer **MUST be idempotent** — processing same event twice = same result
- Idempotency via `event_id` deduplication table per consumer (TTL: 7 days)
- Retry policy: 3 attempts — 5s, 30s, 5 min
- After 3 failures: route to DLQ; alert after 10 min without resolution
- Consumer processing wrapped in DB transaction — **ack only after successful commit**

---

## 8. Payment Architecture — SSLCommerz + COD

### 8.1 SSLCommerz Integration — 10-Step Flow

```
Step 1:  Customer confirms order → Frontend POSTs to POST /payments/initiate
Step 2:  Payment Service creates payment record (status: PENDING) in DB
Step 3:  Payment Service calls SSLCommerz Init API with order details
         POST https://sandbox.sslcommerz.com/gwprocess/v4/api.php
         Fields: store_id, store_passwd, total_amount, currency=BDT,
                 tran_id (= payment_id), success_url, fail_url, cancel_url,
                 cus_name, cus_email, cus_phone, product_name, etc.
Step 4:  SSLCommerz returns GatewayPageURL
Step 5:  Payment Service returns {gateway_url} to Frontend
Step 6:  Frontend redirects customer to SSLCommerz gateway page
Step 7:  Customer completes payment on SSLCommerz
Step 8:  SSLCommerz sends IPN (Instant Payment Notification) POST to /payments/ipn
         CRITICAL (C-13): DO NOT fulfill order on IPN alone
Step 9:  Payment Service calls SSLCommerz Validation API to double-validate val_id:
         GET https://sandbox.sslcommerz.com/validator/api/validationserverAPI.php
             ?val_id={val_id}&store_id={id}&store_passwd={pass}&v=1&format=json
         Check: val_id exists, status=VALID, amount matches, tran_id matches
Step 10: Only on successful validation:
         - Update payment status → COMPLETED
         - Write ledger journal entry (see §9)
         - Publish payment.completed event
         - Redirect customer to success_url
```

**On fail/cancel redirect:** Update payment → FAILED/CANCELLED, publish `payment.failed`.

### 8.2 SSLCommerz IPN Validation Rules

```typescript
// MANDATORY validation checks (all must pass)
async validateSSLCommerzIPN(ipnData: SSLCommerzIPN): Promise<boolean> {
  // 1. Verify store credentials
  if (ipnData.store_id !== process.env.SSLCOMMERZ_STORE_ID) return false;

  // 2. Double-validate val_id via Validation API (C-13)
  const validation = await this.callValidationAPI(ipnData.val_id);
  if (validation.status !== 'VALID') return false;

  // 3. Amount verification (compare in paisa to avoid float issues)
  const expectedPaisa = await this.getOrderAmount(ipnData.tran_id);
  const receivedPaisa = Math.round(parseFloat(ipnData.amount) * 100);
  if (expectedPaisa !== receivedPaisa) return false;

  // 4. Currency check
  if (ipnData.currency !== 'BDT') return false;

  // 5. Transaction ID matches our payment record
  const payment = await this.findByTransactionId(ipnData.tran_id);
  if (!payment) return false;

  // 6. Idempotency — already processed?
  if (payment.status === 'COMPLETED') return true; // already done

  return true;
}
```

### 8.3 Cash on Delivery (COD) — 9-Step Flow

```
Step 1:  Customer selects COD at checkout → POST /orders (payment_method: "cod")
Step 2:  Order Service creates order (status: CONFIRMED — no payment needed upfront)
Step 3:  Order Service publishes order.created with payment_method: "cod"
Step 4:  Payment Service consumes order.created:
         - Creates payment record (status: COD_PENDING)
         - Writes COD placed journal entry (debit: AR, credit: Revenue — suspense)
         - Publishes payment.cod_placed event
Step 5:  Notification Service sends order confirmation email/SMS
Step 6:  Order is picked, packed, and shipped (Inventory deducted on order.created)
Step 7:  Delivery agent collects cash from customer
Step 8:  Admin confirms collection: POST /payments/cod/confirm
         Body: { payment_id, collected_amount_paisa, collected_at }
Step 9:  Payment Service:
         - Updates payment status → COMPLETED
         - Writes COD collection journal entry (debit: Cash, credit: AR — clears suspense)
         - Publishes payment.cod_collected event
         - Order Service updates order → PAID
```

### 8.4 Refund Flow

```
Trigger: Admin POSTs to POST /payments/:id/refund
         OR order.cancelled event with payment_method != COD_PENDING

Steps:
  1. Verify payment status is COMPLETED
  2. For SSLCommerz: call SSLCommerz Refund API
  3. Create payment record (status: REFUND_PENDING)
  4. On refund confirmation (webhook/polling):
     - Update status → REFUNDED
     - Write refund journal entry (debit: Revenue, credit: AR/Cash)
     - Publish order.cancelled compensation event
```

---

## 9. Double-Entry Ledger

### 9.1 Chart of Accounts

| Account Code | Account Name | Type | Normal Balance |
|-------------|-------------|------|----------------|
| `1000` | Cash and Cash Equivalents | Asset | Debit |
| `1100` | Accounts Receivable — SSLCommerz | Asset | Debit |
| `1110` | Accounts Receivable — COD | Asset | Debit |
| `1200` | SSLCommerz Gateway Suspense | Asset | Debit |
| `1210` | COD Collection Suspense | Asset | Debit |
| `2000` | Accounts Payable — Vendors | Liability | Credit |
| `2100` | Customer Refunds Payable | Liability | Credit |
| `2200` | Deferred Revenue — Pending Orders | Liability | Credit |
| `3000` | Revenue — Product Sales | Revenue | Credit |
| `3100` | Revenue — Delivery Charges | Revenue | Credit |
| `4000` | Platform Commission Expense | Expense | Debit |
| `4100` | Payment Gateway Fees | Expense | Debit |
| `4200` | Refunds & Chargebacks | Expense | Debit |

### 9.2 Journal Entry Templates

All amounts in **integer paisa** (1 BDT = 100 paisa). Never floats.

#### Template 1: SSLCommerz Payment Completed

```
Event: payment.completed (SSLCommerz)
Order: #12345 | Amount: 1,500 BDT = 150,000 paisa

DEBIT   1100  Accounts Receivable — SSLCommerz   150,000 paisa
  CREDIT  3000  Revenue — Product Sales           145,000 paisa
  CREDIT  3100  Revenue — Delivery Charges          5,000 paisa

Memo: SSLCommerz payment | tran_id: {tran_id} | val_id: {val_id} | order_id: {order_id}
```

#### Template 2: COD Order Placed

```
Event: payment.cod_placed
Order: #12346 | Amount: 800 BDT = 80,000 paisa

DEBIT   1110  Accounts Receivable — COD           80,000 paisa
  CREDIT  2200  Deferred Revenue — Pending Orders  80,000 paisa

Memo: COD order placed | order_id: {order_id} | expected_delivery: {date}
```

#### Template 3: COD Cash Collected by Admin

```
Event: payment.cod_collected
Order: #12346 | Amount: 800 BDT = 80,000 paisa

DEBIT   1000  Cash and Cash Equivalents           80,000 paisa
  CREDIT  1110  Accounts Receivable — COD          80,000 paisa

DEBIT   2200  Deferred Revenue — Pending Orders   80,000 paisa
  CREDIT  3000  Revenue — Product Sales            80,000 paisa

Memo: COD collected | collected_by: {admin_id} | order_id: {order_id}
```

#### Template 4: Refund Issued

```
Event: refund issued
Order: #12345 | Refund: 1,500 BDT = 150,000 paisa

DEBIT   4200  Refunds & Chargebacks               150,000 paisa
  CREDIT  2100  Customer Refunds Payable           150,000 paisa

On refund disbursement:
DEBIT   2100  Customer Refunds Payable            150,000 paisa
  CREDIT  1100  Accounts Receivable — SSLCommerz  150,000 paisa

Memo: Refund issued | payment_id: {id} | reason: {reason} | refund_ref: {ref}
```

### 9.3 Ledger Database Schema

```sql
-- Accounts (chart of accounts)
CREATE TABLE accounts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code         VARCHAR(10) UNIQUE NOT NULL,   -- e.g. '1000', '3000'
  name         VARCHAR(100) NOT NULL,
  type         VARCHAR(20) NOT NULL CHECK (type IN ('asset','liability','revenue','expense','equity')),
  normal_balance VARCHAR(6) NOT NULL CHECK (normal_balance IN ('debit','credit')),
  is_active    BOOLEAN NOT NULL DEFAULT TRUE,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Journal entries (one per transaction)
CREATE TABLE journal_entries (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_type  VARCHAR(50) NOT NULL,   -- 'payment', 'refund', 'cod_collection', etc.
  reference_id    UUID NOT NULL,           -- payment_id or order_id
  description     TEXT NOT NULL,
  entry_date      DATE NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_by      UUID NOT NULL            -- service or user id
);

-- Ledger lines (debit/credit pairs per entry)
CREATE TABLE ledger_lines (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  journal_entry_id UUID NOT NULL REFERENCES journal_entries(id),
  account_id       UUID NOT NULL REFERENCES accounts(id),
  direction        VARCHAR(6) NOT NULL CHECK (direction IN ('debit','credit')),
  amount_paisa     BIGINT NOT NULL CHECK (amount_paisa > 0),  -- NEVER zero or negative
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- PostgreSQL trigger: enforce debit = credit on every journal entry commit
CREATE OR REPLACE FUNCTION check_journal_balance()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
DECLARE
  v_debits  BIGINT;
  v_credits BIGINT;
BEGIN
  SELECT
    COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'debit'), 0),
    COALESCE(SUM(amount_paisa) FILTER (WHERE direction = 'credit'), 0)
  INTO v_debits, v_credits
  FROM ledger_lines
  WHERE journal_entry_id = NEW.journal_entry_id;

  IF v_debits <> v_credits THEN
    RAISE EXCEPTION 'Journal entry % is unbalanced: debits=% credits=%',
      NEW.journal_entry_id, v_debits, v_credits;
  END IF;
  RETURN NEW;
END;
$$;

CREATE CONSTRAINT TRIGGER enforce_journal_balance
AFTER INSERT OR UPDATE ON ledger_lines
DEFERRABLE INITIALLY DEFERRED
FOR EACH ROW EXECUTE FUNCTION check_journal_balance();
```

### 9.4 Ledger Rules

- Amounts stored as `BIGINT paisa` — **never** `DECIMAL`, `FLOAT`, or `NUMERIC` with cents
- Every `journal_entry` must have ≥ 2 `ledger_lines` (at least one debit, one credit)
- The PostgreSQL trigger enforces `sum(debits) = sum(credits)` — entries cannot commit if unbalanced
- `ledger_lines` are **immutable** — no UPDATE or DELETE; corrections via reversing entries only
- All ledger operations run inside a DB transaction with the payment status update

---

## 10. Database Architecture

### 10.1 Database Isolation Policy (C-01)

**NEVER access another service's database directly. No exceptions.**

| Service | Engine | Version | Key Tables / Collections |
|---------|--------|---------|--------------------------|
| Auth | PostgreSQL | 17 | `users`, `roles`, `permissions`, `model_has_roles`, `refresh_tokens`, `audit_logs` |
| Product | MongoDB | 7.0 | `products`, `categories`, `variants`, `reviews` |
| Order | PostgreSQL | 17 | `orders`, `order_items`, `order_status_history` |
| Inventory | PostgreSQL | 17 | `inventory`, `inventory_ledger`, `reservations` |
| Payment | PostgreSQL | 17 | `payments`, `refunds`, `payment_events`, `journal_entries`, `ledger_lines`, `accounts` |
| Notification | Redis | 7.2 | `notification:sent:{id}` keys, job queues |

### 10.2 PostgreSQL 17 Configuration (Production)

| Parameter | Value | Reason |
|-----------|-------|--------|
| `max_connections` | 200 | Tune with PgBouncer pooling |
| `shared_buffers` | 25% RAM | Standard recommendation |
| `effective_cache_size` | 75% RAM | Planner optimization |
| `work_mem` | 16 MB | Sort/hash operations |
| `wal_level` | `replica` | Enable streaming replication |
| `max_wal_senders` | 5 | Support up to 5 replicas |
| `checkpoint_completion_target` | 0.9 | Spread WAL I/O |
| `log_min_duration_statement` | 500ms | Capture slow queries |

### 10.3 PgBouncer Connection Pooling

- Mode: Transaction pooling (highest efficiency)
- Pool size per service: 20 server connections
- Max client connections: 100 per service instance
- Deployed as sidecar container alongside each PostgreSQL instance

### 10.4 MongoDB 7.0 Configuration (Product Service)

| Configuration | Value |
|--------------|-------|
| Replication | Replica Set: 1 Primary + 2 Secondaries |
| Read Preference | `primaryPreferred` for catalogue reads; `primary` for writes |
| Write Concern | `majority` |
| Indexes | `category` (compound), `vendor_id`, `status`, `slug` (unique), `created_at` (TTL) |
| Full-text | Atlas Search / text index on `name`, `description` |
| Schema Validation | JSON Schema validation at collection level |

### 10.5 Backup & Recovery

| Aspect | Policy |
|--------|--------|
| PostgreSQL Backup | Daily `pg_dump` (compressed) + continuous WAL archiving to object storage |
| MongoDB Backup | Daily `mongodump` to object storage; replica set provides continuous redundancy |
| Retention | Daily: 7 days \| Weekly: 4 weeks \| Monthly: 12 months |
| RPO | ≤ 1 hour (WAL-based PITR for PostgreSQL) |
| RTO | ≤ 30 minutes for service-level restore |
| Backup Verification | Automated restore-and-validate every Sunday 02:00 UTC |
| Encryption at Rest | AES-256 for all backup files |

### 10.6 Migration Strategy

- Migrations version-controlled alongside service code (Flyway for PostgreSQL)
- Migrations run automatically on service startup in staging; **manual approval gate for production**
- Backward-compatible only (additive) — no column drops within 2 releases
- Blue-green deployment support: new schema must serve both old and new code simultaneously

---

## 11. Caching Strategy

### 11.1 Redis 7.2 Architecture

Redis Sentinel cluster: 1 master + 2 replicas for HA.

| Use Case | Key Pattern | TTL | Invalidation |
|----------|------------|-----|-------------|
| Product List | `products:list:{page}:{filters_hash}` | 5 min | Pub/sub on product write |
| Product Detail | `products:detail:{id}` | 10 min | Delete on update/delete |
| Session / Auth Token | `session:{user_id}` | 15 min | Delete on logout |
| Token Blacklist | `token:blacklisted:{jti}` | JWT remaining TTL | Auto TTL expiry |
| Rate Limit Counters | `ratelimit:{ip}:{endpoint}` | 1 min rolling | Auto TTL |
| Cart State | `cart:{user_id}` | 2 hours | Clear on order creation |
| Category Tree | `categories:tree` | 30 min | Delete on category change |
| Stock Display | `inventory:display:{sku}` | 1 min | Invalidate on `inventory.updated` |
| JWKS Public Key | `jwks:public_keys` | 1 hour | Manual flush on key rotation |
| Service JWT Cache | In-memory per service | Token TTL - 60s | Background refresh |

### 11.2 Cache-Aside Pattern

- Check cache first; on miss: query DB → populate cache → return result
- Cache stampede prevention: probabilistic early expiration (PER algorithm)
- Distributed lock (Redlock) prevents concurrent cache rebuilds for hot keys
- All cached objects as JSON with schema version field for safe invalidation

---

## 12. API Gateway — Nginx

### 12.1 Configuration Overview

| Responsibility | Implementation |
|---------------|----------------|
| TLS Termination | Let's Encrypt / custom cert; TLS 1.3; HSTS enabled |
| Routing | Location-based `proxy_pass` to upstream pools |
| Rate Limiting | `limit_req_zone` — 100 req/min general; 10/min auth |
| Request Logging | JSON-format logs → Promtail → Loki |
| Health Check | Upstream health check; remove unhealthy upstream |
| Compression | gzip for `application/json`, `text/*`; min 1 KB |
| CORS | Configurable allowlist; credentials for frontend domain only |
| Timeout | `proxy_connect_timeout 5s`; `proxy_read_timeout 60s` (SSE) |

### 12.2 Route Definitions

| Route Prefix | Upstream Service | Auth Required | Rate Limit Zone |
|-------------|-----------------|---------------|----------------|
| `/api/v1/auth/` | `auth-service:8001` | Public | `auth_zone` (10 req/min/IP) |
| `/api/v1/products/` | `product-service:8002` | Conditional | `api_zone` (100 req/min/IP) |
| `/api/v1/orders/` | `order-service:8003` | JWT required | `api_zone` |
| `/api/v1/inventory/` | `inventory-service:8004` | Admin JWT | `api_zone` |
| `/api/v1/payments/` | `payment-service:8005` | JWT required | `api_zone` |
| `/api/v1/notifications/` | `notification-service:8006` | Internal | `internal_zone` |
| `/health` | Internal Nginx | Public | None |

---

## 13. Observability Stack

### 13.1 Metrics — Prometheus + Grafana

| Component | Role | Retention |
|-----------|------|-----------|
| Prometheus | Scrape `/metrics` every 15s; store time-series | 15 days |
| Grafana | Dashboards, alerting, annotations | Persistent volume |
| Node Exporter | Host CPU, RAM, disk, network | Via Prometheus |
| cAdvisor | Container-level resource metrics | Via Prometheus |
| RabbitMQ Exporter | Queue depth, consumer count, rates | Via Prometheus |
| Postgres Exporter | Query latency, connections, replication lag | Via Prometheus |
| Redis Exporter | Hit rate, eviction, memory, replication | Via Prometheus |

**Required Grafana Dashboards:**
- Platform Overview — RPS, error rate, p50/p95/p99 latency
- Service Health — uptime, restart count, CPU/RAM per service
- Order Funnel — created → paid → fulfilled → cancelled
- Payment Analytics — success rate, failures, refunds, COD collection rate
- Financial Dashboard — daily revenue, ledger balance by account
- RabbitMQ Health — queue depth, DLQ size, consumer lag
- Database Performance — query latency, slow queries, pool saturation
- Cache Performance — Redis hit rate, eviction, memory
- Infrastructure — host resources, network I/O, container limits

### 13.2 Alerting Rules

| Alert | Condition | Severity | Notification |
|-------|-----------|----------|-------------|
| `HighErrorRate` | HTTP 5xx > 1% for 2 min | CRITICAL | PagerDuty + Slack |
| `HighLatency` | p95 > 500ms for 5 min | WARNING | Slack |
| `ServiceDown` | No scrape for 30s | CRITICAL | PagerDuty + Slack |
| `DLQMessages` | DLQ depth > 0 for 10 min | WARNING | Slack |
| `DatabaseConnSaturation` | PgBouncer pool > 80% | WARNING | Slack |
| `DiskUsage` | Disk > 80% | WARNING | Slack |
| `DiskCritical` | Disk > 90% | CRITICAL | PagerDuty + Slack |
| `PaymentFailureSpike` | Payment failures > 5% per 5 min | CRITICAL | PagerDuty + Slack + Email |
| `InventoryLock` | Lock wait > 1s avg | WARNING | Slack |
| `LedgerImbalance` | Trigger fires on ledger_lines | CRITICAL | PagerDuty + Slack + Email |

### 13.3 Logging — Loki + Promtail

| Aspect | Specification |
|--------|--------------|
| Format | Structured JSON — all services, no plain text |
| Required Fields | `timestamp` (ISO 8601), `level`, `service`, `trace_id`, `span_id`, `request_id`, `user_id`, `message`, `duration_ms`, `status_code` |
| Log Levels | `ERROR` (5xx, panics) \| `WARN` (retries, degraded) \| `INFO` (lifecycle) \| `DEBUG` (dev only) |
| Collection | Promtail agent tails Docker log files |
| Storage | Loki, 30-day retention |
| Sensitive Data | Passwords, tokens, card numbers, `val_id` **MUST be redacted** before logging |
| Rotation | `json-file`; `max-size: 100m`; `max-file: 3` |

### 13.4 Distributed Tracing — Jaeger (OpenTelemetry)

- OpenTelemetry SDK in all services — auto-instruments HTTP and DB
- W3C TraceContext headers (`traceparent`, `tracestate`) for propagation
- Span attributes: `service.name`, `http.method`, `http.url`, `db.statement`, `rabbitmq.queue`
- Sampling: 100% staging; 10% head-based + 100% tail-based (errors) in production
- Trace ID correlated with logs — search Loki by `trace_id`

### 13.5 Health Check Endpoints (All Services)

| Endpoint | Returns | Used By |
|----------|---------|---------|
| `GET /health/live` | `200 OK` if process alive | Docker, Load Balancer |
| `GET /health/ready` | `200` if DB + deps reachable; `503` if not | Nginx upstream health |
| `GET /metrics` | Prometheus exposition format | Prometheus scrape |

---

## 14. Security Architecture

### 14.1 Authentication & Authorisation

- JWT RS256 (asymmetric) — RSA 4096-bit; private key in Docker Secret only
- All services verify JWT locally via JWKS — no Auth Service network call per request
- Access token TTL: 15 min; Refresh token TTL: 7 days (rotated on use)
- Service-to-service: separate `type: service` JWT with scoped `aud` and `scopes`
- RBAC enforced at API Gateway AND repeated at service layer (defence in depth)

### 14.2 Network Security

| Control | Implementation |
|---------|---------------|
| TLS | TLS 1.3 external; HSTS max-age 1 year |
| Internal Network | Docker network isolation — services not reachable outside docker network |
| Secrets | Docker Secrets only — never in image layers, env vars committed to repo, or logs |
| CORS | Production frontend domain only |
| HTTP Headers | `X-Frame-Options: DENY`; `X-Content-Type-Options: nosniff`; `CSP` header |
| SQL Injection | ORM/query builder only — raw SQL forbidden (C-11) |
| XSS | Input sanitisation middleware; DOMPurify on frontend |

### 14.3 Rate Limiting & DDoS

- Nginx: 100 req/min general; 10 req/min on `/auth/login`, `/auth/register`
- Redis-backed distributed rate limiting across replicated gateway instances
- Account lockout: 5 failed login attempts → 15-min lockout
- Cloudflare (optional) for volumetric DDoS

### 14.4 Data Protection

- Passwords: bcrypt, cost factor 12
- PII (phone, address): AES-256-GCM application-level encryption at rest
- Payments: SSLCommerz tokenization — no raw card data stored
- GDPR-ready: data deletion endpoint, data export endpoint, consent tracking
- Database encryption at rest on all production volumes

---

## 15. Frontend Architecture

### 15.1 Technology Stack

| Tool | Version | Purpose |
|------|---------|---------|
| Next.js | 14 (App Router) | React framework — SSR, SSG, ISR, streaming |
| React | 18 | UI |
| TypeScript | 5.x | Type safety |
| React Query (TanStack) | v5 | Server state, caching, background sync |
| Zustand | v4 | Client state — cart, auth, UI |
| Tailwind CSS | v3 | Utility-first styling |
| Zod | v3 | Runtime API response validation |
| Axios | v1 | HTTP client with auth interceptors |
| next-auth | v5 | OAuth / JWT session management |

### 15.2 Architecture Rules

- All API calls via API Gateway — no direct service access from frontend
- `NEXT_PUBLIC_` prefix only for browser-exposed env vars
- React Query: caching, background refetch, optimistic updates
- Auth state: Zustand + next-auth session; **never** `localStorage`
- Error boundaries at page and component level; Sentry for error tracking
- Image optimisation via `next/image`; lazy loading on non-above-fold images

---

## 16. Deployment Architecture

### 16.1 Docker Compose Service Manifest

| Container | Image Base | CPU | RAM | Replicas |
|-----------|-----------|-----|-----|---------|
| `nginx` | `nginx:1.25-alpine` | 0.5 | 128 MB | 1 |
| `web` | `node:22-alpine` | 1.0 | 512 MB | 1–2 |
| `auth-service` | `php:8.3-fpm` | 1.0 | 512 MB | 2 |
| `product-service` | `node:22-alpine` | 1.0 | 512 MB | 2 |
| `order-service` | `php:8.3-fpm` | 1.0 | 512 MB | 2 |
| `inventory-service` | `node:22-alpine` | 0.5 | 256 MB | 2 |
| `payment-service` | `node:22-alpine` | 0.5 | 256 MB | 2 |
| `notification-service` | `node:22-alpine` | 0.25 | 128 MB | 1 |
| `rabbitmq` | `rabbitmq:3.13-management` | 1.0 | 512 MB | 1 |
| `redis` | `redis:7.2-alpine` | 0.5 | 256 MB | 1 |
| `postgres-auth` | `postgres:17-alpine` | 1.0 | 1 GB | 1 |
| `postgres-order` | `postgres:17-alpine` | 1.0 | 1 GB | 1 |
| `postgres-inventory` | `postgres:17-alpine` | 0.5 | 512 MB | 1 |
| `postgres-payment` | `postgres:17-alpine` | 1.0 | 1 GB | 1 |
| `mongodb` | `mongo:7.0` | 1.0 | 1 GB | 1 (replica set) |
| `prometheus` | `prom/prometheus:v2.51` | 0.5 | 512 MB | 1 |
| `grafana` | `grafana/grafana:10.4` | 0.5 | 256 MB | 1 |
| `loki` | `grafana/loki:2.9` | 0.5 | 256 MB | 1 |
| `promtail` | `grafana/promtail:2.9` | 0.1 | 64 MB | 1 |
| `jaeger` | `jaegertracing/all-in-one:1.55` | 0.5 | 512 MB | 1 |

### 16.2 Deployment Process

```
Step 1 — Environment validation : verify all .env values present
Step 2 — Image build            : docker compose build --parallel
Step 3 — Infrastructure first   : docker compose up -d rabbitmq redis postgres-* mongodb
Step 4 — Health wait            : wait-for-it.sh confirms DB readiness
Step 5 — Migrations             : each service runs idempotent DB migrations on startup
Step 6 — Services               : docker compose up -d (all app services)
Step 7 — Observability          : docker compose up -d prometheus grafana loki promtail jaeger
Step 8 — Smoke test             : automated health check on all /health/ready endpoints
```

### 16.3 Environment Configuration

| Group | Examples | Storage |
|-------|---------|---------|
| DB credentials | `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME` per service | Docker Secrets |
| JWT keys | `JWT_PRIVATE_KEY`, `JWT_PUBLIC_KEY` | Docker Secrets |
| RabbitMQ | `RABBITMQ_URL`, `RABBITMQ_USER`, `RABBITMQ_PASS` | `.env.prod` |
| Redis | `REDIS_URL`, `REDIS_PASSWORD` | `.env.prod` |
| SSLCommerz | `SSLCOMMERZ_STORE_ID`, `SSLCOMMERZ_STORE_PASSWD`, `SSLCOMMERZ_IS_SANDBOX` | Docker Secrets |
| SMTP/SES | `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS` | Docker Secrets |
| Observability | `GRAFANA_ADMIN_PASS`, `PROMETHEUS_RETENTION` | `.env.prod` |
| App | `APP_ENV=production`, `APP_URL`, `ALLOWED_ORIGINS` | `.env.prod` |

---

## 17. Testing Strategy

| Test Type | Scope | Tool | Coverage Target | CI Gate |
|-----------|-------|------|-----------------|---------|
| Unit Tests | Functions, controllers, validators | Jest / PHPUnit | > 80% per service | Yes — block on fail |
| Integration Tests | Service + own DB | Jest + test DB | All core flows | Yes |
| Contract Tests | API request/response shapes | Zod schema validation | All public endpoints | Yes |
| Event Tests | Publish/consume round-trip | Jest + testcontainers | All event flows | Yes |
| Ledger Tests | Debit = credit on all journal templates | Jest + DB trigger | All 4 templates | Yes |
| IPN Tests | SSLCommerz IPN + validation mock | Jest + nock | All IPN scenarios | Yes |
| E2E Tests | Full flow via API Gateway | Playwright / Supertest | Critical journeys | Nightly |
| Load Tests | 10k users, 3k RPS | k6 | p95 < 500 ms | Pre-release |
| Security Scan | OWASP Top 10, dependency CVEs | OWASP ZAP, Snyk | Zero high/critical | Yes |

---

## 18. Critical Event Flows

### 18.1 Order Placement — SSLCommerz

| Step | Actor | Action | Output |
|------|-------|--------|--------|
| 1 | Frontend | `POST /api/v1/orders` with idempotency key | HTTP 202 Accepted |
| 2 | Order Service | Validate cart, create order (PENDING) | Order record |
| 3 | Order Service | Publish `order.created` | Event on RabbitMQ |
| 4a | Inventory Service | `order.created` → reserve stock (`SELECT FOR UPDATE`) | Stock reserved |
| 4b | Payment Service | `order.created` → initiate SSLCommerz session | Gateway URL returned |
| 5 | Frontend | Redirect to SSLCommerz gateway URL | Customer pays |
| 6 | SSLCommerz | IPN `POST /payments/ipn` → Payment Service validates `val_id` | Validation result |
| 7a | Payment Service (success) | Write ledger entry, publish `payment.completed` | Event |
| 7b | Order Service | `payment.completed` → status PAID | Order PAID |
| 7c | Notification Service | `payment.completed` → confirmation email | Email dispatched |
| 8 (fail) | Payment Service | Publish `payment.failed` | Event |
| 9 (fail) | Order Service | `payment.failed` → status CANCELLED | Order cancelled |
| 10 (fail) | Inventory Service | `payment.failed` → release reservation | Stock restored |

### 18.2 Order Placement — COD

| Step | Actor | Action | Output |
|------|-------|--------|--------|
| 1 | Frontend | `POST /api/v1/orders` (payment_method: "cod") | HTTP 202 |
| 2 | Order Service | Create order (CONFIRMED) | Order record |
| 3 | Order Service | Publish `order.created` (payment_method: cod) | Event |
| 4 | Inventory Service | Reserve stock | Stock reserved |
| 5 | Payment Service | Create payment (COD_PENDING), write ledger, publish `payment.cod_placed` | Event |
| 6 | Notification | `payment.cod_placed` → confirmation email | Email dispatched |
| 7 | Admin | `POST /payments/cod/confirm` after cash collected | Confirmation |
| 8 | Payment Service | Update COMPLETED, write collection ledger entry, publish `payment.cod_collected` | Event |
| 9 | Order Service | `payment.cod_collected` → status PAID | Order PAID |

### 18.3 Saga — Compensating Transactions

| Original Transaction | Compensating Transaction | Trigger Event |
|---------------------|--------------------------|---------------|
| Reserve inventory | Release inventory reservation | `payment.failed` |
| Create order (PENDING) | Cancel order | `payment.failed` or `inventory.insufficient` |
| Initiate payment | Cancel payment session | `inventory.insufficient` |
| Write revenue journal entry | Write refund journal entry | `order.cancelled` (paid order) |

---

## 19. Scalability & High Availability

### 19.1 Horizontal Scaling

- Stateless services scaled by increasing Docker Compose replicas
- Nginx upstream: round-robin + health check for automatic traffic distribution
- All shared state in Redis or databases — no in-process state
- RabbitMQ competing consumers: multiple service instances share queue

### 19.2 Capacity Targets

| Metric | Target | Scaling Trigger |
|--------|--------|----------------|
| Concurrent Users | ≥ 10,000 | Add replicas when CPU > 70% for 3 min |
| RPS | ≥ 3,000 sustained | Auto-scale or manual replica increase |
| API Gateway | ≥ 10,000 RPS | Vertical scale gateway host |
| PostgreSQL IOPS | ≥ 5,000 per instance | Enable read replicas |
| Cache Hit Rate | ≥ 90% | Increase TTL or add Redis replica |
| RabbitMQ Queue Depth | < 1,000 messages | Add consumers when depth > 500 |
| p95 Latency | < 200 ms read; < 500 ms write | Investigate slow queries + cache misses |

### 19.3 Disaster Recovery

| Scenario | Recovery Procedure | RTO |
|----------|-------------------|-----|
| Single service crash | Docker `restart: always` | < 1 min |
| Database primary failure | PostgreSQL: promote replica; MongoDB: auto-elect | < 5 min |
| RabbitMQ failure | Persistent queues; restart with data intact | < 5 min |
| Full host failure | Restore from snapshot + DB backup, re-deploy | < 30 min |
| Data corruption | PITR from WAL archive | < 1 hour |

---

## 20. Glossary

| Term | Definition |
|------|------------|
| ACID | Atomicity, Consistency, Isolation, Durability |
| ADR | Architecture Decision Record |
| CQRS | Command Query Responsibility Segregation |
| DDD | Domain-Driven Design |
| DLQ | Dead Letter Queue |
| IPN | Instant Payment Notification (SSLCommerz webhook) |
| JWKS | JSON Web Key Set — standard endpoint for public key distribution |
| Idempotent | Operation producing same result regardless of how many times applied |
| Paisa | Smallest unit of BDT (1 BDT = 100 paisa); all amounts stored as integer paisa |
| PITR | Point-in-Time Recovery |
| RS256 | RSA Signature with SHA-256 — asymmetric JWT signing algorithm |
| Saga | Pattern for distributed transactions via sequence of local transactions |
| mTLS | Mutual TLS — both client and server authenticate via certificates |
| RTO | Recovery Time Objective |
| RPO | Recovery Point Objective |
| SSLCommerz | Bangladeshi payment gateway (primary payment provider for EMP) |
| val_id | SSLCommerz validation ID — must be re-validated via Validation API before order fulfillment |

---

*End of SRS v3.0.0 — Enterprise Marketplace Platform*