# Coding Agent Implementation Prompt: Phase 9a - Admin API Service (NestJS 11)

> **Version**: 1.0.0  
> **Target Agent**: Cline/GLM 4.6  
> **Service**: Admin API Service  
> **Framework**: NestJS 11  
> **Port**: 8007  
> **Duration Estimate**: 8 weeks  
> **Last Updated**: April 27, 2026

---

## 📋 TABLE OF CONTENTS

1. [Overview & Context](#overview--context)
2. [Prerequisites & Setup](#prerequisites--setup)
3. [Architecture & Design Patterns](#architecture--design-patterns)
4. [Implementation Phases](#implementation-phases)
5. [Coding Standards & Best Practices](#coding-standards--best-practices)
6. [Testing Strategy](#testing-strategy)
7. [Docker & Infrastructure](#docker--infrastructure)
8. [CI/CD & Monitoring](#cicd--monitoring)
9. [Deliverables Checklist](#deliverables-checklist)

---

## 1. OVERVIEW & CONTEXT

### Project Background

You are implementing **Phase 9a - Admin API Service** for the Enterprise Marketplace Platform (EMP), a microservices-based e-commerce platform. This is the 9th phase of a 12-phase implementation plan.

**Current Status**: 
- Phases 1-8 are COMPLETE (Auth, Product, Inventory, Order, Payment, Notification services)
- Phase 9a: Admin API Service (NestJS 11) - **CURRENT TASK**
- Phase 9b: Admin Frontend (React 18 + Vite) - NEXT

### Service Purpose

The Admin API Service provides **admin-specific functionality** only. It does NOT duplicate existing microservices.

**What Admin Service DOES provide:**

**1. Authentication & Authorization**
- Admin login, JWT token generation/refresh
- 2FA (TOTP) management
- RBAC enforcement (7 roles with granular permissions)
- Admin user management (CRUD, role assignments)

**2. Audit Logging**
- Centralized audit log repository (all admin actions across system)
- Audit log API for viewing, searching, exporting logs
- Sensitive data redaction

**3. Admin Notifications**
- Real-time notifications for admins
- Notification center API (mark as read, unread count)
- Push notifications for critical events

**4. Dashboard Aggregations**
- KPIs aggregating data from Order, Product, Payment, Auth services
- Graph data for analytics (sales trends, order trends, customer trends)
- Alert center aggregating from Inventory, Order, Payment services
- Cached metrics for fast dashboard loading

**5. Reports**
- Aggregated reports combining data from multiple services
- Custom report builder with save/schedule functionality
- Export to CSV/PDF

**6. Product Approval Workflow**
- Product approval tracking (draft → pending → approved/rejected)
- Approval API endpoints
- Publishes events to Product Service

**7. Inventory Alerts**
- Inventory alert notifications (low stock, out of stock)
- Alert acknowledgment system
- Consumes events from Inventory Service

**8. Vendor Settlements**
- Vendor settlement calculations and tracking
- Settlement processing API
- Commission management

**9. Content/Banners**
- Banner management (create, update, delete, toggle)
- Active banner display logic

**What Admin Frontend calls directly (NOT via Admin Service):**

| Feature | Service Called | Port |
|---------|---------------|-------|
| Product CRUD | Product Service API | 8001 |
| Order management | Order Service API | 8002 |
| Inventory management | Inventory Service API | 8003 |
| Customer management | Auth Service API | 8000 |
| Payment operations | Payment Service API | 8006 |

**CRITICAL ARCHITECTURAL PRINCIPLES:**

1. **NO Duplication**: Admin Service does NOT duplicate product/inventory/order/customer APIs
2. **Admin-Only**: Admin Service only provides admin-specific functionality
3. **Direct Access**: Admin Frontend calls Product/Order/Inventory/Auth/Payment services directly
4. **Aggregation**: Admin Service only aggregates data for dashboards and reports
5. **Events**: Admin Service consumes events from other services for alerts and triggers events for admin actions

### Technical Stack

| Component | Technology | Version | Purpose |
|-----------|-----------|---------|---------|
| **Framework** | NestJS | 11.x | Backend framework |
| **Language** | TypeScript | 5.x | Type safety |
| **Database** | PostgreSQL | 17 | Primary data store |
| **ORM** | Prisma | 6.x | Database abstraction |
| **Cache** | Redis | 7.2 | Caching & sessions |
| **Message Broker** | RabbitMQ | 3.13 | Event-driven architecture |
| **Validation** | Zod | 3.x | Runtime validation |
| **Auth** | JWT (RS256) | - | Token-based authentication |
| **2FA** | speakeasy | - | Two-factor authentication |
| **HTTP Client** | Axios | 1.x | Service-to-service calls |
| **Encryption** | Node crypto | - | AES-256-GCM encryption |

### Service Specifications

- **Port**: 8007
- **Database**: `emp_admin` (PostgreSQL 17)
- **Cache**: Redis with Sentinel cluster
- **Events**: RabbitMQ with DLQ support
- **API Prefix**: `/api/v1`
- **Health Endpoints**: `/health/live`, `/health/ready`
- **Metrics Endpoint**: `/metrics` (Prometheus)

### Success Criteria

**Database & Schema:**
- [ ] All 8 admin-specific tables implemented with proper indexes and constraints (admins, roles, permissions, admin_logs, product_approvals, inventory_alerts, dashboard_metrics, saved_reports, vendor_settlements, banners)
- [ ] NO duplication of product/inventory/order/customer databases (microservices principle)

**Functionality:**
- [ ] 9 functional modules working (Auth, Products, Orders, Inventory, Customers, Dashboard, Reports, Vendors, Content)
- [ ] All product/inventory/order/customer operations call external service APIs
- [ ] RBAC implemented with 7 roles and granular permissions
- [ ] Audit logging for all admin actions
- [ ] 11 event consumers and 6 event publishers working
- [ ] Idempotency handling for all events
- [ ] Proper caching strategy with Redis

**Quality & Testing:**
- [ ] 95%+ test coverage (unit, integration, E2E)
- [ ] Integration tests with mocked external service APIs
- [ ] Performance SLA met (P95 < 200ms, P50 < 100ms)

**Infrastructure:**
- [ ] Docker production-ready with multi-stage build
- [ ] CI/CD pipeline configured
- [ ] Monitoring and observability set up (Prometheus, Grafana)
- [ ] OpenAPI/Swagger documentation generated
- [ ] Security vulnerabilities resolved

---

## 2. PREREQUISITES & SETUP

### Initial Setup

**Task 2.1: Project Initialization**

```bash
# Navigate to services directory
cd /Users/utpal/Projects/SmartEnergySolution/micro-ecom/services

# Create admin-service directory
mkdir admin-service
cd admin-service

# Initialize NestJS project
npx @nestjs/cli@11 new . --package-manager npm --skip-git
# Answer prompts:
# - Which package manager: npm
# - TypeScript: Yes
# - ESLint: Yes
# - Prettier: Yes
# - Class mode: Yes
# - API prefix: api/v1
# - Version: Yes

# Install core dependencies
npm install @nestjs/common@latest @nestjs/core@latest @nestjs/platform-express@latest
npm install @nestjs/config@latest @nestjs/swagger@latest @nestjs/throttler@latest
npm install @prisma/client@latest ioredis@latest amqplib@latest amqp-connection-manager@latest
npm install zod@latest axios@latest bcrypt@latest jsonwebtoken@latest
npm install speakeasy@latest qrcode@latest dompurify@latest jsdom@latest
npm install uuid@latest date-fns@latest class-transformer@latest class-validator@latest
npm install @nestjs/jwt@latest @nestjs/passport@latest passport@latest passport-jwt@latest

# Install OpenTelemetry packages
npm install @opentelemetry/api@latest @opentelemetry/sdk-node@latest
npm install @opentelemetry/auto-instrumentations-node@latest
npm install @opentelemetry/resources@latest @opentelemetry/semantic-conventions@latest
npm install @opentelemetry/exporter-prometheus@latest @opentelemetry/sdk-metrics@latest

# Install development dependencies
npm install -D @types/node@latest @types/bcrypt@latest @types/jsonwebtoken@latest
npm install -D @types/uuid@latest @types/dompurify@latest @types/passport-jwt@latest
npm install -D @nestjs/schematics@latest @nestjs/testing@latest
npm install -D @types/jest@latest ts-jest@latest jest@latest
npm install -D supertest@latest @types/supertest@latest

# Initialize Prisma
npx prisma init
```

**Task 2.2: Folder Structure Creation**

Create the following directory structure:

```
services/admin-service/
├── src/
│   ├── common/                          # Shared functionality
│   │   ├── decorators/                  # Custom decorators
│   │   ├── dto/                        # Shared DTOs
│   │   ├── filters/                     # Exception filters
│   │   ├── guards/                      # Auth guards
│   │   ├── interceptors/                # HTTP interceptors
│   │   ├── middleware/                 # NestJS middleware
│   │   ├── pipes/                      # Validation pipes
│   │   └── utils/                      # Utility functions
│   ├── config/                         # Configuration
│   ├── infrastructure/                 # Infrastructure layer
│   │   ├── database/
│   │   ├── redis/
│   │   ├── messaging/
│   │   └── cache/
│   ├── health/                        # Health checks
│   ├── modules/                       # Feature modules
│   │   ├── auth/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── inventory/
│   │   ├── customers/
│   │   ├── dashboard/
│   │   ├── reports/
│   │   ├── vendors/
│   │   ├── content/
│   │   ├── notifications/
│   │   └── audit/
│   ├── events/                       # Event handling
│   │   ├── consumers/
│   │   ├── publishers/
│   │   └── types.ts
│   ├── lib/                          # Library code
│   │   ├── logger.ts
│   │   ├── errors.ts
│   │   ├── encryption.ts
│   │   ├── sanitization.ts
│   │   ├── validators.ts
│   │   └── constants.ts
│   ├── opentelemetry.ts
│   ├── app.module.ts
│   └── main.ts
├── prisma/
├── test/
├── .env.example
├── .env
├── Dockerfile
└── package.json
```

**Task 2.3: Environment Variables**

Create `.env.example` with all required variables (DATABASE_URL, REDIS_HOST, RABBITMQ_URL, JWT keys, etc.)

**Task 2.4: TypeScript, Jest, and ESLint Configuration**

Configure `tsconfig.json`, `jest.config.js`, `.eslintrc.js`, and `nest-cli.json` with proper paths and settings.

---

## 3. ARCHITECTURE & DESIGN PATTERNS

### 3.1 Design Patterns to Implement

**Pattern 1: Repository Pattern**
- Separate data access logic from business logic
- Interface-based repository definitions
- All database operations go through repositories
- NEVER query database directly from controllers

**Pattern 2: Service Layer Pattern**
- Business logic encapsulated in services
- Services orchestrate repository calls
- Services handle domain-specific operations
- Controllers only handle HTTP concerns

**Pattern 3: DTO Pattern (Data Transfer Objects)**
- Use Zod schemas for runtime validation
- Transform incoming data before reaching service layer
- Validate outgoing data before sending responses
- NEVER use raw request body objects

**Pattern 4: Event-Driven Architecture**
- Publish events for state changes
- Consume events from other services
- Idempotency handling for all events
- DLQ (Dead Letter Queue) for failed events

**Pattern 5: Cache-Aside Pattern**
- Check cache before database
- Update cache after database writes
- Implement cache invalidation strategy
- Use Redis with appropriate TTL

### 3.2 Layered Architecture

```
┌─────────────────────────────────────────┐
│   Presentation Layer (Controllers)    │
│   - HTTP request/response             │
│   - DTO validation                   │
│   - Authentication check              │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Application Layer (Services)        │
│   - Business logic                   │
│   - Orchestration                   │
│   - Domain operations                │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Data Access Layer (Repositories)   │
│   - Database operations             │
│   - Data transformation            │
│   - Query optimization             │
└──────────────┬──────────────────────┘
               │
┌──────────────▼──────────────────────┐
│   Infrastructure Layer               │
│   - PostgreSQL (Prisma)           │
│   - Redis                         │
│   - RabbitMQ                      │
└─────────────────────────────────────┘
```

### 3.3 External Service Integration Pattern

**CRITICAL**: The Admin Service follows a pure microservices architecture. It does NOT store product/inventory/order/customer data locally.

**Pattern: API Gateway/Proxy Pattern**

**Architecture:**
```
Admin Controller → Admin Service → HTTP Client (Axios) → External Service APIs
                    ↓                        ↓
                 Business Logic         REST/gRPC Calls
                    ↓                        ↓
                 Cache Layer           Product/Order/Inventory/Auth Services
                    ↓                        ↓
                 Audit Logging         Dedicated Databases
```

**Implementation Requirements:**

**1. HTTP Client Service** (infrastructure/http-client):
- Centralized Axios instance with interceptors
- Retry logic with exponential backoff
- Circuit breaker for external service failures
- Request timeout configuration
- JWT token propagation for service-to-service calls

**2. Service Adapter Pattern:**
Each external service has a dedicated adapter:
- `ProductServiceAdapter` - Calls Product Service API
- `OrderServiceAdapter` - Calls Order Service API
- `InventoryServiceAdapter` - Calls Inventory Service API
- `AuthServiceAdapter` - Calls Auth Service API

**3. Error Handling:**
- Catch external service errors and translate to admin service errors
- Log failed external service calls
- Implement graceful degradation when external services are down
- Cache successful responses to reduce external service load

**4. Caching Strategy:**
- Cache external service responses in Redis
- Use appropriate TTL based on data freshness requirements
- Implement cache warming for frequently accessed data
- Invalidate cache on relevant events from RabbitMQ

**5. Data Transformation:**
- Transform external service responses to admin DTOs
- Aggregate data from multiple services (e.g., customer analytics combines Auth + Order data)
- Handle missing or inconsistent data from external services

**Example Architecture for Product Module:**
```
ProductController
    ↓
ProductService
    ↓
    ├─→ ProductServiceAdapter (calls Product Service API)
    │       ↓
    │   GET http://product-service:8001/products
    │
    ├─→ CacheService (check Redis first)
    │       ↓
    │   products:list:{hash}
    │
    ├─→ AuditService (log actions)
    │       ↓
    │   Create audit log entry
    │
    └─→ EventPublisher (publish events)
            ↓
        product.approved → RabbitMQ
```

**Important Notes:**
- NEVER create local tables for products, orders, inventory, or customers
- ONLY local tables are: admins, roles, permissions, admin_logs, product_approvals, inventory_alerts, dashboard_metrics, saved_reports, vendor_settlements, banners
- The `product_approvals` table only tracks workflow state, not product data
- The `inventory_alerts` table only stores alert notifications, not inventory data
- All actual product/inventory/order/customer data comes from external service APIs

### 3.4 Security Patterns

**Pattern 1: JWT Validation**
- RS256 algorithm (asymmetric keys)
- Validate signature, issuer, audience
- Cache public keys in Redis (TTL: 1 hour)

**Pattern 2: RBAC Enforcement**
- 7 predefined roles with specific permissions
- Permission matrix for fine-grained control
- Decorator-based permission checking

**Pattern 3: Audit Logging**
- Log all admin actions (create, update, delete, status changes)
- Include: admin_id, action, resource_type, resource_id, old_values, new_values

**Pattern 4: Input Sanitization**
- Sanitize all user inputs with DOMPurify
- Validate with Zod schemas

**Pattern 5: Rate Limiting**
- Per-IP rate limiting (100 requests/minute)
- Redis-based distributed rate limiting

---

## 4. IMPLEMENTATION PHASES

### PHASE 1: FOUNDATION SETUP (Week 1)

**Week 1, Day 1-2: Project Initialization**
- Initialize NestJS project with proper configuration
- Create folder structure
- Set up TypeScript, Jest, and ESLint
- Configure environment variables

**Week 1, Day 3-4: Database Schema & Migrations**
- Create complete database schema in `prisma/schema.prisma`
- Define 8 tables with proper indexes and constraints
- Generate and run migrations
- Create seed script

**Week 1, Day 5: Infrastructure Layer Setup**
- Create Database module (PrismaService)
- Create Redis module (RedisService)
- Create RabbitMQ module (RabbitMQService)
- Create Cache module (CacheService)
- Create Health check module

---

### PHASE 2: AUTHENTICATION & AUTHORIZATION (Week 2)

**Key Components to Implement:**

**Auth Module:**
- JWT Service (RS256 algorithm)
- 2FA Service (TOTP with speakeasy)
- Admin Repository
- Auth Service (login, refresh, 2FA enable/disable)
- Auth Controller
- 2FA Controller

**Common Middleware:**
- JWT Auth Guard
- RBAC Guard with permission matrix
- Custom decorators (@SkipAuth, @RequirePermissions, @CurrentUser)
- Zod Validation Pipe
- HTTP Exception Filter
- Audit Logging Middleware

**Audit Module:**
- Admin Log Repository
- Audit Log Service with sensitive data redaction
- Audit Log Controller

**Events Module:**
- Event type definitions
- Event Publisher Service
- Event Consumer Service with idempotency

**Permission Matrix:**
| Role | Products | Orders | Inventory | Customers | Dashboard | Reports | Vendors | Content |
|-------|----------|--------|-----------|------------|----------|---------|---------|---------|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| finance_manager | 📖 | 📖 | 📖 | ✅ | ✅ | ✅ | 📖 | 📖 |
| inventory_manager | 📖 | 📖 | ✅ | 📖 | 📖 | 📖 | 📖 | 📖 |
| content_manager | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | ✅ |
| support_manager | 📖 | ✅ | 📖 | ✅ | 📖 | 📖 | 📖 | 📖 |
| product_manager | ✅ | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 |

---

### PHASE 3: PRODUCT APPROVAL WORKFLOW (Week 3, Day 3-5)

**Architectural Requirements:**

**Database Table:**
- `product_approvals` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/products/approvals` - List pending approvals
- `POST /api/v1/products/:id/approve` - Approve product
- `POST /api/v1/products/:id/reject` - Reject product

**Important: Admin Frontend calls Product Service API directly for product CRUD. Admin Service ONLY manages approval workflow.**

**Integration Points:**
- **Product Service API**: GET `/products/:id` (to fetch product details for approval)
- **Event Publisher**: Publish `product.approved`, `product.rejected`
- **Audit Service**: Log all approval actions

**Caching Strategy:**
- Pending approvals: `products:approvals` - 5 minutes TTL

**Business Logic Rules:**
1. Product approval requires validation (product exists, vendor verified, meets requirements)
2. Rejection must require reason
3. Approval updates product_approvals table status
4. Publish event to Product Service to update product status
5. Only admins with product management permissions can approve/reject

---

### PHASE 4: INVENTORY ALERTS (Week 4, Day 1-3)

**Architectural Requirements:**

**Database Table:**
- `inventory_alerts` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/inventory/alerts` - All inventory alerts
- `POST /api/v1/inventory/alerts/:id/acknowledge` - Acknowledge alert

**Important: Admin Frontend calls Inventory Service API directly for inventory management. Admin Service ONLY manages alert notifications.**

**Integration Points:**
- **Inventory Service API**: GET `/inventory/:id` (to fetch inventory details)
- **Event Consumer**: Handle `inventory.low_stock` events from Inventory Service
- **Audit Service**: Log alert acknowledgments

**Caching Strategy:**
- Inventory alerts: `inventory:alerts` - 2 minutes TTL

**Alert Logic:**
1. Triggered from `inventory.low_stock` events
2. Alert types: `low_stock`, `out_of_stock`
3. Auto-create alert records in inventory_alerts table
4. Admins must acknowledge alerts manually
5. Alert count in dashboard KPIs

---

### PHASE 5: VENDOR SETTLEMENTS (Week 4, Day 4-5)

**Architectural Requirements:**

**Database Table:**
- `vendor_settlements` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/vendors/settlements` - List settlements
- `POST /api/v1/vendors/settlements/:id/process` - Process settlement

**Integration Points:**
- **Product Service API**: GET `/vendors/:id` (to fetch vendor details)
- **Order Service API**: GET `/orders` (to calculate settlement amounts)
- **Audit Service**: Log settlement processing

**Settlement Requirements:**
1. Calculate settlement period (monthly by default)
2. Aggregate all vendor orders within period from Order Service
3. Calculate: Total orders count, Total revenue (gross), Platform commission, Net payout
4. Create settlement record with `pending` status
5. Process payment: Update status to `processing` → `paid` or `failed`

**Commission Structure:**
- 0-100,000 BDT: 10% commission
- 100,001-500,000 BDT: 8% commission
- 500,001+ BDT: 5% commission

**Settlement States:**
- `pending`: Calculated, awaiting processing
- `processing`: Payment in progress
- `paid`: Payment completed
- `failed`: Payment failed (requires retry)

---

### PHASE 6: CONTENT/BANNERS (Week 5, Day 1-2)

**Architectural Requirements:**

**Database Table:**
- `banners` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/banners` - List all banners
- `POST /api/v1/banners` - Create banner
- `PUT /api/v1/banners/:id` - Update banner
- `DELETE /api/v1/banners/:id` - Delete banner
- `POST /api/v1/banners/:id/toggle` - Toggle active/inactive

**Banner Fields Required:**
- Title: Required, max 200 chars
- Image URL: Required, from S3/MinIO
- Link URL: Optional, clickthrough destination
- Position: Required, integer, display order
- Status: Required, enum (active, inactive)
- Display from: Required, start date
- Display until: Optional, end date
- Created by: Auto-filled from admin ID

**Display Logic:**
- Banner is active if: Status = 'active', Current date >= display_from, Current date <= display_until (or null)
- Position determines display order (lower = higher priority)
- Multiple banners can be active at same time

**Image Upload Requirements:**
- Supported formats: JPG, PNG, WEBP
- Max file size: 5MB
- Image dimensions: Recommended 1920x600px
- Storage: S3/MinIO with public read access

---

### PHASE 7: DASHBOARD AGGREGATIONS (Week 6, Day 1-2)

**Architectural Requirements:**

**Database Table:**
- `dashboard_metrics` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/dashboard/kpis` - Dashboard KPIs
- `GET /api/v1/dashboard/graphs` - Graph data for charts
- `GET /api/v1/dashboard/alerts` - Active alerts center
- `GET /api/v1/dashboard/quick-actions` - Quick action statistics

**KPIs Required:**
- Total orders (today, 7 days, 30 days)
- Total revenue (today, 7 days, 30 days)
- Active customers (today, 7 days, 30 days)
- Total products (active, inactive)
- Low stock items count
- Pending approvals count
- Unread notifications count
- Average order value (AOV)

**Graph Data Required:**
- Sales trend: Daily revenue over time period
- Order trend: Daily order count over time period
- Customer trend: New customer registration over time
- Product trend: New product additions over time
- Revenue breakdown: By category, by payment method
- Top products: By revenue, by quantity sold
- Top customers: By revenue, by order count

**Alert Categories:**
- Inventory alerts (low stock, out of stock)
- Order alerts (high-value orders, suspicious orders)
- Payment alerts (failed payments, refunds)
- System alerts (service health issues)
- Approval alerts (pending product approvals)

**Caching Strategy:**
- Dashboard KPIs: `dashboard:kpi:{time_range}` - 5 minutes TTL
- Graph data: `dashboard:graph:{type}:{time_range}` - 15 minutes TTL
- Alerts: `dashboard:alerts` - 2 minutes TTL

**Background Jobs:**
1. KPI aggregation: Run every 5 minutes, store in `dashboard_metrics`
2. Alert aggregation: Run every 2 minutes, pull from all modules
3. Cache warming: Pre-load popular dashboards

---

### PHASE 8: REPORTS MODULE (Week 6, Day 3-5)

**Architectural Requirements:**

**Database Table:**
- `saved_reports` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/reports/sales` - Sales report
- `GET /api/v1/reports/revenue` - Revenue report
- `GET /api/v1/reports/products` - Product performance report
- `GET /api/v1/reports/customers` - Customer analytics report
- `GET /api/v1/reports/custom` - Run custom report
- `POST /api/v1/reports/save` - Save custom report
- `GET /api/v1/reports/saved` - List saved reports

**Report Types:**

**Sales Report:**
- Date range (start, end)
- Total orders, total revenue, AOV
- Orders by status breakdown
- Orders by payment method breakdown
- Daily/weekly/monthly trend

**Revenue Report:**
- Date range (start, end)
- Total revenue by category
- Total revenue by payment method
- Revenue by time period (daily/weekly/monthly)

**Product Performance Report:**
- Date range (start, end)
- Top 10 products by revenue
- Top 10 products by quantity sold
- Bottom 10 products by revenue
- Products with zero sales
- Inventory turnover rate

**Customer Analytics Report:**
- Date range (start, end)
- Total customers, new customers, returning customers
- Customer retention rate
- Average CLV, average AOV
- Customer segmentation by order count
- Top 10 customers by revenue

**Custom Report Builder:**
- Select data source (orders, products, customers, inventory)
- Select metrics (count, sum, avg, max, min)
- Select groupings (by day, week, month, category, status)
- Select filters (date range, status, category)
- Save report configuration
- Schedule auto-generation (daily, weekly, monthly)

**Export Requirements:**
- CSV format: Comma-separated, header row
- PDF format: Formatted tables, charts (if applicable)
- Large reports: Stream download, avoid memory issues

---

### PHASE 9: VENDOR MANAGEMENT MODULE (Week 7, Day 1-2)

**Architectural Requirements:**

**Database Table:**
- `vendor_settlements` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/vendors` - List vendors
- `GET /api/v1/vendors/:id` - Vendor details
- `GET /api/v1/vendors/:id/performance` - Vendor performance metrics
- `GET /api/v1/vendors/settlements` - List settlements
- `POST /api/v1/vendors/settlements/:id/process` - Process settlement

**Vendor Performance Metrics:**
- Total orders (lifetime, this month)
- Total revenue (lifetime, this month)
- Average order value
- Product approval rate (approved / submitted)
- Customer satisfaction (average rating)
- Response time (average)
- On-time delivery rate
- Return rate
- Commission earned

**Settlement Requirements:**
1. Calculate settlement period (monthly by default)
2. Aggregate all orders within period
3. Calculate: Total orders count, Total revenue (gross), Platform commission, Net payout
4. Create settlement record with `pending` status
5. Process payment: Update status to `processing` → `paid` or `failed`

**Commission Structure:**
Define commission tiers based on monthly revenue:
- 0-100,000 BDT: 10% commission
- 100,001-500,000 BDT: 8% commission
- 500,001+ BDT: 5% commission

**Settlement States:**
- `pending`: Calculated, awaiting processing
- `processing`: Payment in progress
- `paid`: Payment completed
- `failed`: Payment failed (requires retry)

---

### PHASE 10: CONTENT MANAGEMENT MODULE (Week 7, Day 3)

**Architectural Requirements:**

**Database Table:**
- `banners` (already defined in schema)

**API Endpoints Required:**
- `GET /api/v1/banners` - List all banners
- `POST /api/v1/banners` - Create banner
- `PUT /api/v1/banners/:id` - Update banner
- `DELETE /api/v1/banners/:id` - Delete banner
- `POST /api/v1/banners/:id/toggle` - Toggle active/inactive

**Banner Fields Required:**
- Title: Required, max 200 chars
- Image URL: Required, from S3/MinIO
- Link URL: Optional, clickthrough destination
- Position: Required, integer, display order
- Status: Required, enum (active, inactive)
- Display from: Required, start date
- Display until: Optional, end date
- Created by: Auto-filled from admin ID

**Display Logic:**
- Banner is active if: Status = 'active', Current date >= display_from, Current date <= display_until (or null)
- Position determines display order (lower = higher priority)
- Multiple banners can be active at same time

**Image Upload Requirements:**
- Supported formats: JPG, PNG, WEBP
- Max file size: 5MB
- Image dimensions: Recommended 1920x600px
- Storage: S3/MinIO with public read access

---

## 5. CODING STANDARDS & BEST PRACTICES

### 5.1 Code Organization Standards

**Module Structure**: Every feature module MUST follow this exact structure:
```
modules/{module-name}/
├── controllers/          # HTTP request handlers
├── services/             # Business logic
├── repositories/         # Data access
├── dto/                # Request/response DTOs
├── schemas/            # Zod validation schemas
└── {module-name}.module.ts  # NestJS module
```

**Naming Conventions:**
- Files: `kebab-case.ts`
- Classes: `PascalCase`
- Methods: `camelCase`
- Constants: `UPPER_SNAKE_CASE`
- Interfaces: `PascalCase` with `I` prefix

### 5.2 TypeScript Best Practices

- NEVER use `any` type (use `unknown` if type is unknown)
- Use strict null checks
- Use optional chaining (`value?.property`)
- Use type guards for runtime type checking
- Always use `async/await` for promises
- Use `Promise.all()` for parallel operations

### 5.3 Database Query Standards

- Use `select` to limit returned columns
- Use `include` for eager loading relations
- Avoid N+1 queries
- Use indexes on frequently queried columns
- Use `$transaction` for multi-step operations

### 5.4 Caching Standards

**Cache Key Format**: `{resource}:{operation}:{hash}`

**TTL Guidelines:**
- Frequently changing data: 1-5 minutes
- Moderately changing data: 5-15 minutes
- Slowly changing data: 15-60 minutes
- Rarely changing data: 1-4 hours

### 5.5 Security Standards

- JWT validation on protected routes
- RBAC enforcement before resource access
- Input sanitization with DOMPurify
- Validate with Zod schemas
- Never hardcode secrets
- Log all admin actions
- Redact sensitive data from logs

---

## 6. TESTING STRATEGY

### 6.1 Unit Testing

**Coverage Targets:**
- Services: 95%+
- Repositories: 95%+
- DTOs/Schemas: 100%
- Controllers: 90%+

### 6.2 Integration Testing

Test API endpoints, database operations, cache integration, and external service integration.

### 6.3 E2E Testing

Test complete user workflows and cross-service interactions.

### 6.4 Performance Testing

**Performance Targets:**
- P50 latency: < 100ms
- P95 latency: < 200ms
- P99 latency: < 500ms
- Throughput: > 1000 requests/second
- Error rate: < 0.1%

### 6.5 Security Testing

Test for OWASP Top 10 vulnerabilities:
1. Injection (SQL, NoSQL, Command)
2. Broken Authentication
3. Broken Authorization
4. Security Misconfiguration
5. XSS
6. Insecure Deserialization
7. Known Vulnerabilities
8. Insufficient Logging

---

## 7. DOCKER & INFRASTRUCTURE

### 7.1 Docker Configuration

Use multi-stage Dockerfile:
- Stage 1: Build
- Stage 2: Production (node:22-alpine)
- Non-root user for security
- Health check endpoint
- Resource limits

### 7.2 Infrastructure Setup

**PostgreSQL:**
- Database: `emp_admin`
- Connection pooling: PgBouncer
- Max connections: 20 per instance
- Backup strategy: Daily full + WAL archiving

**Redis:**
- Sentinel cluster for high availability
- Memory limit: 256MB
- Eviction policy: allkeys-lru

**RabbitMQ:**
- Virtual host: `emp.admin`
- Queue durability: True
- Message TTL: 7 days
- DLQ: Enabled for all queues

### 7.3 Resource Limits

**CPU:**
- Development: 0.5 cores
- Staging: 1.0 cores
- Production: 2.0 cores (horizontal scaling)

**Memory:**
- Development: 512MB
- Staging: 1GB
- Production: 2GB (horizontal scaling)

---

## 8. CI/CD & MONITORING

### 8.1 CI/CD Pipeline

**GitHub Actions Workflow:**
1. **Test job**: Run linter, type check, unit tests, upload coverage
2. **Build job**: Build and push Docker image
3. **Deploy job**: Deploy to Kubernetes

### 8.2 Monitoring Setup

**Prometheus Metrics:**
- HTTP requests total
- HTTP request duration
- Database query duration
- Cache hits/misses
- Error rates

**Grafana Dashboards:**
1. Overview Dashboard (RPS, error rate, latency)
2. Database Dashboard (query duration, slow queries)
3. Cache Dashboard (hit rate, memory usage)
4. Business Metrics Dashboard (orders/min, revenue/min)

### 8.3 Alerting Rules

- HighErrorRate: > 0.1 errors/second for 5 minutes
- HighLatency: P95 > 500ms for 5 minutes
- HighDBLatency: P95 > 100ms for 5 minutes
- LowCacheHitRate: < 50% for 10 minutes

---

## 9. DELIVERABLES CHECKLIST

### Phase 1: Foundation Setup (Week 1)
- [ ] NestJS project initialized with all dependencies
- [ ] Complete folder structure created
- [ ] TypeScript, Jest, ESLint configured
- [ ] Environment variables documented
- [ ] Prisma initialized with schema
- [ ] Database migrations created and tested
- [ ] Infrastructure modules (DB, Redis, RabbitMQ, Cache) created
- [ ] Health check endpoints working
- [ ] Docker build successful
- [ ] Service starts without errors

### Phase 2: Authentication & Authorization (Week 2)
- [ ] Auth module complete with all DTOs
- [ ] JWT service implemented (RS256)
- [ ] 2FA service implemented (TOTP)
- [ ] Admin repository created
- [ ] Auth controllers created
- [ ] JWT auth guard created
- [ ] RBAC guard created with permission matrix
- [ ] Custom decorators created
- [ ] Validation pipe created (Zod)
- [ ] Exception filter created
- [ ] Audit logging middleware created
- [ ] Audit module complete
- [ ] Events module with publishers/consumers
- [ ] All authentication flows tested

### Phase 3-10: Core Features (Weeks 3-7)
- [ ] Product management module complete
- [ ] Order management module complete
- [ ] Inventory management module complete
- [ ] Customer management module complete
- [ ] Dashboard module complete
- [ ] Reports module complete
- [ ] Vendor management module complete
- [ ] Content management module complete
- [ ] All modules integrated with external services
- [ ] All modules have proper caching
- [ ] All modules have event publishers/consumers
- [ ] All modules have audit logging

### Phase 11: Testing (Week 7)
- [ ] Unit tests with 95%+ coverage
- [ ] Integration tests for all modules
- [ ] E2E tests for critical workflows
- [ ] Performance tests completed
- [ ] Security tests completed
- [ ] Test fixtures and factories created

### Phase 12: Deployment (Week 8)
- [ ] Dockerfile created and tested
- [ ] Docker Compose configuration
- [ ] CI/CD pipeline configured
- [ ] Monitoring setup (Prometheus, Grafana)
- [ ] Alerting rules configured
- [ ] Log aggregation setup
- [ ] Documentation complete (API, Architecture, Deployment)
- [ ] Production deployment successful
- [ ] Post-deployment smoke tests passing

### Overall Deliverables
- [ ] All 8 database tables with indexes and constraints
- [ ] All 9 functional modules working
- [ ] RBAC with 7 roles and granular permissions
- [ ] Comprehensive audit logging
- [ ] 10 event consumers and 6 event publishers
- [ ] Idempotency handling for all events
- [ ] 95%+ test coverage
- [ ] Docker production-ready
- [ ] CI/CD pipeline automated
- [ ] Monitoring and observability set up
- [ ] OpenAPI/Swagger documentation
- [ ] Performance SLA met (P95 < 200ms)
- [ ] Security vulnerabilities resolved
- [ ] Complete documentation

---

## APPENDICES

### Appendix A: Redis Key Registry

| Key Pattern | TTL | Purpose | Invalidation Trigger |
|-------------|-----|---------|-------------------|
| `products:list:{hash}` | 600s | Product list | Create/update/delete |
| `products:detail:{id}` | 900s | Product detail | Product update |
| `products:approvals` | 300s | Pending approvals | Approval status change |
| `orders:list:{hash}` | 300s | Order list | Order create/update |
| `orders:detail:{id}` | 600s | Order detail | Order update |
| `orders:analytics:{hash}` | 900s | Order analytics | New order |
| `inventory:overview:{hash}` | 300s | Inventory overview | Stock adjustment |
| `inventory:sku:{sku}` | 180s | SKU inventory | Stock update |
| `inventory:alerts` | 600s | Inventory alerts | Alert change |
| `customers:list:{hash}` | 300s | Customer list | Customer update |
| `customers:detail:{id}` | 600s | Customer detail | Customer update |
| `customers:analytics:{id}` | 900s | Customer analytics | New order |
| `dashboard:kpi:{range}` | 300s | Dashboard KPIs | Background refresh |
| `dashboard:graph:{type}:{range}` | 900s | Graph data | Background refresh |
| `dashboard:alerts` | 120s | Alerts | Alert change |
| `reports:{type}:{hash}` | 1800s | Generated reports | Data change |
| `reports:saved:{id}` | 3600s | Saved reports | Config update |
| `vendors:list:{hash}` | 600s | Vendor list | Vendor update |
| `vendors:performance:{id}` | 900s | Vendor performance | New order |
| `banners:active` | 120s | Active banners | Banner change |
| `banners:detail:{id}` | 900s | Banner detail | Banner update |
| `event:processed:{event_id}` | 604800s | Event idempotency | Auto-expire |

### Appendix B: Permission Matrix

| Role | Products | Orders | Inventory | Customers | Dashboard | Reports | Vendors | Content | System |
|-------|----------|--------|-----------|------------|----------|---------|---------|---------|--------|
| super_admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| finance_manager | 📖 | 📖 | 📖 | ✅ | ✅ | ✅ | 📖 | 📖 | 📖 |
| inventory_manager | 📖 | 📖 | ✅ | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 |
| content_manager | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | ✅ | 📖 |
| support_manager | 📖 | ✅ | 📖 | ✅ | 📖 | 📖 | 📖 | 📖 | 📖 |
| product_manager | ✅ | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 | 📖 |

Legend:
- ✅ Full access (read, write, delete)
- 📖 Read-only access

### Appendix C: Event Reference

**Consumed Events** (11 total):
1. `order.created` - From Order Service
2. `order.updated` - From Order Service
3. `order.cancelled` - From Order Service
4. `product.created` - From Product Service
5. `product.updated` - From Product Service
6. `inventory.updated` - From Inventory Service
7. `inventory.low_stock` - From Inventory Service
8. `payment.completed` - From Payment Service
9. `payment.failed` - From Payment Service
10. `payment.refunded` - From Payment Service
11. `user.blocked` - From Auth Service

**Published Events** (6 total):
1. `product.approved` - To Product Service
2. `product.rejected` - To Product Service
3. `order.status.updated` - To Order Service
4. `inventory.adjusted` - To Inventory Service
5. `customer.blocked` - To Auth Service
6. `customer.unblocked` - To Auth Service

---

**END OF PROMPT**

This comprehensive prompt provides all necessary information for implementing Phase 9a - Admin API Service (NestJS 11). The coding agent should follow the architectural patterns, coding standards, and implementation phases outlined above to successfully deliver a production-ready admin service.

**Remember**: Quality over speed. Test thoroughly. Document decisions. Follow patterns.