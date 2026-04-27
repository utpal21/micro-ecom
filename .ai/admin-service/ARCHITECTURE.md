# Admin Service Architecture

> **Version**: 1.0.0 | **Last Updated**: April 21, 2026

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Design Patterns](#design-patterns)
3. [Folder Structure](#folder-structure)
4. [Component Interaction](#component-interaction)
5. [Data Flow](#data-flow)
6. [Scalability Strategy](#scalability-strategy)
7. [Performance Optimization](#performance-optimization)
8. [Technology Stack Rationale](#technology-stack-rationale)

---

## System Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Nginx API Gateway                      │
│         (Port 80/443 → Admin API: 8007, Admin UI: 8008) │
└────────────────────────┬────────────────────────────────────┘
                          │
          ┌───────────────┴───────────────┐
          │                               │
          ▼                               ▼
┌──────────────────────────┐  ┌─────────────────────────────────┐
│  Admin API Service      │  │   Admin Frontend (React 18)   │
│  (NestJS 11)          │  │   (Port 8008)                  │
│  Port 8007             │  │                                │
│  ┌────────────────────┐ │  │  ┌──────────────────────────┐ │
│  │ API Layer          │ │  │  │ React Components         │ │
│  │ - /api/admin/*   │ │  │  │ - Dashboard              │ │
│  └────────┬───────────┘ │  │  │ - Products              │ │
│           │             │  │  │ - Orders                │ │
│  ┌────────▼───────────┐ │  │  │ - Inventory             │ │
│  │ Service Layer       │ │  │  │ - Customers             │ │
│  │ - ProductService   │ │  │  │ - Reports               │ │
│  │ - OrderService     │ │  │  └────────┬───────────────┘ │
│  │ - ReportService    │ │  │           │                  │
│  └────────┬───────────┘ │  │  ┌────────▼───────────────┐ │
│           │             │  │  │ State Management        │ │
│  ┌────────▼───────────┐ │  │  │ - React Query v5       │ │
│  │ Repository Layer    │ │  │  │ - Zustand              │ │
│  │ - AdminRepository  │ │  │  │ - React Router v6      │ │
│  └────────┬───────────┘ │  │  └───────────────────────┘ │
└───────────┼─────────────┘  └─────────────────────────────────┘
            │
    ┌───────┼───────┐
    │               │
    ▼               ▼
┌─────────┐   ┌──────────┐
│Postgres │   │  Redis   │
│admin DB │   │  Cache   │
└─────────┘   └──────────┘

┌─────────────────────────────────────────────────────────────────┐
│                  RabbitMQ Event Bus                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  │ CONSUME      │  │ PUBLISH      │  │ QUEUES       │
│  │ order.created│  │ product.approved││ admin.orders │
│  │ payment.compl│  │ order.status.upd ││ admin.alerts │
│  │ inventory.low│  │ inventory.adjust││ admin.logs  │
│  └──────────────┘  └──────────────┘  └──────────────┘
└─────────────────────────────────────────────────────────────────┘
```

### Architecture Principles

1. **Clean Architecture**: Separation of concerns with distinct layers
2. **Domain-Driven Design**: Business logic encapsulated in service layer
3. **Event-Driven**: Loose coupling via RabbitMQ events
4. **Stateless**: Horizontal scalability without session state
5. **API-First**: RESTful API with OpenAPI specification

### Service Boundaries

| Layer | Responsibility | Technology |
|--------|---------------|-------------|
| **API Presentation Layer** | HTTP request/response | NestJS Controllers |
| **UI Presentation Layer** | User interface components | React 18 + Vite |
| **Application Layer** | Business logic, orchestration | TypeScript Services |
| **Data Access Layer** | Database operations | Prisma ORM |
| **Infrastructure Layer** | External services, caching, events | Redis, RabbitMQ |

---

## Design Patterns

### 1. Repository Pattern

Separates business logic from data access logic.

```typescript
// Interface
interface IAdminRepository {
  findById(id: UUID): Promise<Admin | null>;
  findByUserId(userId: UUID): Promise<Admin | null>;
  create(data: CreateAdminDto): Promise<Admin>;
  update(id: UUID, data: UpdateAdminDto): Promise<Admin>;
}

// Implementation
class AdminRepository implements IAdminRepository {
  constructor(private prisma: PrismaClient) {}
  
  async findById(id: UUID): Promise<Admin | null> {
    return this.prisma.admin.findUnique({ where: { id } });
  }
}
```

### 2. Service Layer Pattern

Encapsulates business logic and orchestrates repository calls.

```typescript
class AdminService {
  constructor(
    private adminRepo: IAdminRepository,
    private auditLogService: AuditLogService
  ) {}
  
  async updateAdmin(
    adminId: UUID,
    data: UpdateAdminDto,
    updatedBy: UUID
  ): Promise<Admin> {
    const admin = await this.adminRepo.findById(adminId);
    if (!admin) {
      throw new AdminNotFoundError(adminId);
    }
    
    const updatedAdmin = await this.adminRepo.update(adminId, data);
    
    // Audit log
    await this.auditLogService.log({
      adminId: updatedBy,
      action: 'admin.updated',
      resourceType: 'admin',
      resourceId: adminId,
      oldValues: admin,
      newValues: updatedAdmin
    });
    
    return updatedAdmin;
  }
}
```

### 3. DTO Pattern (Data Transfer Objects)

Validates and transforms incoming/outgoing data.

```typescript
// Zod schema
const createAdminSchema = z.object({
  userId: z.string().uuid(),
  role: z.enum(['admin', 'finance_manager', 'inventory_manager', ...]),
  permissions: z.array(z.string()).optional()
});

// DTO class
class CreateAdminDto {
  userId: string;
  role: string;
  permissions?: string[];
  
  static fromRequest(body: unknown): CreateAdminDto {
    return createAdminSchema.parse(body);
  }
}
```

### 4. Event-Driven Architecture

Decouples services via asynchronous events.

```typescript
// Event publisher
class EventPublisher {
  async publishProductApproved(productId: UUID): Promise<void> {
    const event = {
      eventType: 'product.approved',
      productId,
      approvedAt: new Date(),
      approvedBy: this.currentAdminId
    };
    
    await this.rabbitmq.publish('product.exchange', 'product.approved', event);
  }
}

// Event consumer
@Consumer('admin.product.approval.queue')
async handleProductApproved(event: ProductApprovedEvent) {
  await this.productService.markAsApproved(event.productId);
  await this.notificationService.sendApprovalNotification(event.productId);
}
```

### 5. Cache-Aside Pattern

Reduces database load for frequently accessed data.

```typescript
class DashboardService {
  async getKPIs(): Promise<KPIS> {
    const cacheKey = 'dashboard:kpis';
    
    // Check cache first
    const cached = await this.redis.get(cacheKey);
    if (cached) {
      return JSON.parse(cached);
    }
    
    // Cache miss - query database
    const kpis = await this.aggregateKPIsFromDatabase();
    
    // Populate cache
    await this.redis.setex(cacheKey, 300, JSON.stringify(kpis)); // 5 min TTL
    
    return kpis;
  }
}
```

### 6. Strategy Pattern

Different algorithms for report generation.

```typescript
interface ReportGenerator {
  generate(params: ReportParams): Promise<ReportData>;
}

class SalesReportGenerator implements ReportGenerator {
  async generate(params: ReportParams): Promise<ReportData> {
    // Sales-specific logic
  }
}

class RevenueReportGenerator implements ReportGenerator {
  async generate(params: ReportParams): Promise<ReportData> {
    // Revenue-specific logic
  }
}

class ReportFactory {
  static create(type: string): ReportGenerator {
    switch (type) {
      case 'sales': return new SalesReportGenerator();
      case 'revenue': return new RevenueReportGenerator();
      default: throw new InvalidReportTypeError(type);
    }
  }
}
```

---

## Folder Structure

```
services/admin-service/
├── src/
│   ├── app/                              # Next.js App Router
│   │   ├── (admin)/                      # Admin layout group
│   │   │   ├── layout.tsx              # Admin dashboard layout
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── products/               # Product management pages
│   │   │   │   ├── page.tsx           # Product list
│   │   │   │   ├── [id]/page.tsx      # Product detail
│   │   │   │   └── new/page.tsx      # Create product
│   │   │   ├── orders/                 # Order management pages
│   │   │   ├── inventory/              # Inventory pages
│   │   │   ├── customers/              # Customer pages
│   │   │   ├── reports/               # Reports pages
│   │   │   ├── vendors/               # Vendor pages
│   │   │   └── content/               # Content management pages
│   │   ├── api/                        # API routes
│   │   │   ├── v1/                     # API version 1
│   │   │   │   ├── health/
│   │   │   │   │   ├── live/route.ts
│   │   │   │   │   └── ready/route.ts
│   │   │   │   ├── auth/
│   │   │   │   │   ├── login/route.ts
│   │   │   │   │   ├── logout/route.ts
│   │   │   │   │   ├── me/route.ts
│   │   │   │   │   ├── 2fa/
│   │   │   │   │   │   ├── enable/route.ts
│   │   │   │   │   │   └── disable/route.ts
│   │   │   │   ├── products/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── [id]/route.ts
│   │   │   │   │   ├── bulk/route.ts
│   │   │   │   │   ├── approvals/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   ├── [id]/
│   │   │   │   │   │   │   ├── approve/route.ts
│   │   │   │   │   │   │   └── reject/route.ts
│   │   │   │   ├── orders/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   └── status/route.ts
│   │   │   │   │   ├── bulk/route.ts
│   │   │   │   │   └── analytics/route.ts
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── low-stock/route.ts
│   │   │   │   │   ├── adjust/route.ts
│   │   │   │   │   └── alerts/route.ts
│   │   │   │   ├── customers/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   ├── block/route.ts
│   │   │   │   │   │   ├── unblock/route.ts
│   │   │   │   │   │   ├── orders/route.ts
│   │   │   │   │   │   └── analytics/route.ts
│   │   │   │   ├── reports/
│   │   │   │   │   ├── sales/route.ts
│   │   │   │   │   ├── revenue/route.ts
│   │   │   │   │   ├── products/route.ts
│   │   │   │   │   ├── customers/route.ts
│   │   │   │   │   ├── custom/route.ts
│   │   │   │   │   └── save/route.ts
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── kpis/route.ts
│   │   │   │   │   ├── graphs/route.ts
│   │   │   │   │   └── alerts/route.ts
│   │   │   │   ├── vendors/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── [id]/
│   │   │   │   │   │   ├── route.ts
│   │   │   │   │   │   └── settlements/route.ts
│   │   │   │   ├── banners/
│   │   │   │   │   ├── route.ts
│   │   │   │   │   ├── [id]/route.ts
│   │   │   │   │   └── [id]/toggle/route.ts
│   │   │   │   └── notifications/
│   │   │   │       └── [id]/read/route.ts
│   │   │   └── metrics/route.ts
│   ├── components/                      # React components
│   │   ├── common/
│   │   │   ├── Layout.tsx
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   └── LoadingSpinner.tsx
│   │   ├── products/
│   │   │   ├── ProductTable.tsx
│   │   │   ├── ProductForm.tsx
│   │   │   ├── ProductDetail.tsx
│   │   │   ├── ProductApprovalCard.tsx
│   │   │   └── ProductFilters.tsx
│   │   ├── orders/
│   │   │   ├── OrderTable.tsx
│   │   │   ├── OrderDetail.tsx
│   │   │   ├── OrderStatusBadge.tsx
│   │   │   ├── OrderFilters.tsx
│   │   │   └── OrderTimeline.tsx
│   │   ├── inventory/
│   │   │   ├── InventoryTable.tsx
│   │   │   ├── LowStockAlerts.tsx
│   │   │   ├── StockAdjustmentForm.tsx
│   │   │   └── InventoryChart.tsx
│   │   ├── customers/
│   │   │   ├── CustomerTable.tsx
│   │   │   ├── CustomerDetail.tsx
│   │   │   ├── CustomerAnalytics.tsx
│   │   │   └── CustomerOrderHistory.tsx
│   │   ├── reports/
│   │   │   ├── ReportSelector.tsx
│   │   │   ├── ReportFilters.tsx
│   │   │   ├── ReportChart.tsx
│   │   │   ├── ReportTable.tsx
│   │   │   └── ExportButton.tsx
│   │   ├── dashboard/
│   │   │   ├── KPICards.tsx
│   │   │   ├── TrendChart.tsx
│   │   │   ├── AlertCenter.tsx
│   │   │   └── QuickActions.tsx
│   │   └── vendors/
│   │       ├── VendorTable.tsx
│   │       ├── VendorDetail.tsx
│   │       ├── VendorPerformance.tsx
│   │       └── SettlementForm.tsx
│   ├── modules/                        # Feature modules
│   │   ├── products/
│   │   │   ├── controllers/           # API controllers
│   │   │   │   ├── product.controller.ts
│   │   │   │   └── product-approval.controller.ts
│   │   │   ├── services/             # Business logic
│   │   │   │   ├── product.service.ts
│   │   │   │   └── product-approval.service.ts
│   │   │   ├── repositories/         # Data access
│   │   │   │   ├── product-approval.repository.ts
│   │   │   │   └── admin-product.repository.ts
│   │   │   ├── dto/                 # Data transfer objects
│   │   │   │   ├── create-product.dto.ts
│   │   │   │   ├── update-product.dto.ts
│   │   │   │   ├── product-query.dto.ts
│   │   │   │   └── product-approval.dto.ts
│   │   │   └── schemas/             # Zod validation
│   │   │       └── product.schema.ts
│   │   ├── orders/
│   │   │   ├── controllers/
│   │   │   │   ├── order.controller.ts
│   │   │   │   └── order-analytics.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── order.service.ts
│   │   │   │   └── order-analytics.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── admin-order.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── order-query.dto.ts
│   │   │   │   └── update-order-status.dto.ts
│   │   │   └── schemas/
│   │   │       └── order.schema.ts
│   │   ├── inventory/
│   │   │   ├── controllers/
│   │   │   │   ├── inventory.controller.ts
│   │   │   │   └── inventory-alert.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── inventory.service.ts
│   │   │   │   └── inventory-alert.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── inventory-alert.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── stock-adjustment.dto.ts
│   │   │   │   └── inventory-query.dto.ts
│   │   │   └── schemas/
│   │   │       └── inventory.schema.ts
│   │   ├── customers/
│   │   │   ├── controllers/
│   │   │   │   ├── customer.controller.ts
│   │   │   │   └── customer-analytics.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── customer.service.ts
│   │   │   │   └── customer-analytics.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── admin-customer.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── customer-query.dto.ts
│   │   │   │   └── block-customer.dto.ts
│   │   │   └── schemas/
│   │   │       └── customer.schema.ts
│   │   ├── reports/
│   │   │   ├── controllers/
│   │   │   │   ├── report.controller.ts
│   │   │   │   └── custom-report.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── report.service.ts
│   │   │   │   ├── sales-report.service.ts
│   │   │   │   ├── revenue-report.service.ts
│   │   │   │   ├── product-report.service.ts
│   │   │   │   └── customer-report.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── saved-report.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── report-query.dto.ts
│   │   │   │   ├── save-report.dto.ts
│   │   │   │   └── custom-report.dto.ts
│   │   │   └── schemas/
│   │   │       └── report.schema.ts
│   │   ├── dashboard/
│   │   │   ├── controllers/
│   │   │   │   ├── dashboard.controller.ts
│   │   │   │   ├── kpi.controller.ts
│   │   │   │   ├── graph.controller.ts
│   │   │   │   └── alert.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── dashboard.service.ts
│   │   │   │   ├── kpi.service.ts
│   │   │   │   ├── graph.service.ts
│   │   │   │   └── alert.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── dashboard-metrics.repository.ts
│   │   │   └── schemas/
│   │   │       └── dashboard.schema.ts
│   │   ├── vendors/
│   │   │   ├── controllers/
│   │   │   │   ├── vendor.controller.ts
│   │   │   │   └── settlement.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── vendor.service.ts
│   │   │   │   └── settlement.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── vendor-settlement.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── vendor-query.dto.ts
│   │   │   │   └── settlement.dto.ts
│   │   │   └── schemas/
│   │   │       └── vendor.schema.ts
│   │   ├── content/
│   │   │   ├── controllers/
│   │   │   │   └── banner.controller.ts
│   │   │   ├── services/
│   │   │   │   └── banner.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── banner.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── create-banner.dto.ts
│   │   │   │   └── update-banner.dto.ts
│   │   │   └── schemas/
│   │   │       └── banner.schema.ts
│   │   ├── notifications/
│   │   │   ├── controllers/
│   │   │   │   └── notification.controller.ts
│   │   │   ├── services/
│   │   │   │   └── admin-notification.service.ts
│   │   │   └── repositories/
│   │   │       └── admin-notification.repository.ts
│   │   ├── auth/
│   │   │   ├── controllers/
│   │   │   │   ├── auth.controller.ts
│   │   │   │   └── 2fa.controller.ts
│   │   │   ├── services/
│   │   │   │   ├── auth.service.ts
│   │   │   │   ├── 2fa.service.ts
│   │   │   │   └── session.service.ts
│   │   │   ├── repositories/
│   │   │   │   └── admin.repository.ts
│   │   │   ├── dto/
│   │   │   │   ├── login.dto.ts
│   │   │   │   └── 2fa.dto.ts
│   │   │   └── schemas/
│   │   │       └── auth.schema.ts
│   │   └── audit/
│   │       ├── services/
│   │       │   └── audit-log.service.ts
│   │       ├── repositories/
│   │       │   └── admin-log.repository.ts
│   │       ├── dto/
│   │       │   └── audit-log.dto.ts
│   │       └── schemas/
│   │           └── audit-log.schema.ts
│   ├── events/                         # RabbitMQ events
│   │   ├── consumers/                 # Event consumers
│   │   │   ├── order.consumer.ts
│   │   │   ├── product.consumer.ts
│   │   │   ├── inventory.consumer.ts
│   │   │   ├── payment.consumer.ts
│   │   │   └── user.consumer.ts
│   │   ├── publishers/               # Event publishers
│   │   │   ├── product-event-publisher.ts
│   │   │   ├── order-event-publisher.ts
│   │   │   ├── inventory-event-publisher.ts
│   │   │   └── customer-event-publisher.ts
│   │   ├── types.ts                  # Event type definitions
│   │   └── rabbitmq.service.ts       # RabbitMQ connection
│   ├── cache/                         # Redis caching
│   │   ├── redis.service.ts
│   │   └── cache-keys.ts
│   ├── middleware/                    # Next.js middleware
│   │   ├── auth.middleware.ts
│   │   ├── rbac.middleware.ts
│   │   ├── audit.middleware.ts
│   │   └── error-handler.middleware.ts
│   ├── lib/                          # Utilities
│   │   ├── api-client.ts             # Service-to-service API client
│   │   ├── logger.ts                # Structured logger
│   │   ├── errors.ts                # Error classes
│   │   ├── validators.ts             # Validation helpers
│   │   └── helpers.ts               # Utility functions
│   ├── types/                        # TypeScript types
│   │   └── index.ts
│   ├── config/                       # Configuration
│   │   ├── config.ts
│   │   ├── constants.ts
│   │   └── env.schema.ts            # Environment variable validation
│   └── layout.tsx                    # Root layout
├── tests/
│   ├── unit/                          # Unit tests
│   │   ├── services/
│   │   └── repositories/
│   ├── integration/                   # Integration tests
│   │   ├── api/
│   │   └── database/
│   └── e2e/                          # E2E tests
│       └── scenarios/
├── docs/
│   ├── openapi.yaml                  # API specification
│   └── architecture.md
├── prisma/                          # PostgreSQL ORM
│   ├── schema.prisma
│   ├── migrations/
│   └── seed.ts
├── public/                          # Static assets
│   └── images/
├── .env.example
├── .env
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
├── next.config.js
├── tailwind.config.ts
└── README.md
```

### Folder Structure Rationale

#### Admin API Service (NestJS 11) - Port 8007

#### `src/modules/` - Feature Modules
- **Domain-Driven**: Each feature is self-contained
- **Layers**: Controllers, Services, Repositories, DTOs, Schemas
- **Separation of Concerns**: Clear boundaries between layers

#### `src/events/` - Event Integration
- **Consumers**: Handle events from other services
- **Publishers**: Emit events to other services
- **Decoupling**: Async communication without direct dependencies

#### `src/cache/` - Caching Layer
- **Redis Integration**: Cache frequently accessed data
- **Cache Keys**: Centralized key management
- **TTL Management**: Configurable cache expiration

#### `src/middleware/` - Cross-cutting Concerns
- **Authentication**: JWT validation
- **Authorization**: RBAC enforcement
- **Audit Logging**: Track all admin actions
- **Error Handling**: Standardized error responses

#### Admin Frontend (React 18 + Vite) - Port 8008

#### `src/components/` - React Components
- **Reusable UI**: Shared across admin pages
- **Feature-Specific**: Components per domain
- **Consistent UX**: Unified design language

#### `src/pages/` - React Pages
- **Page Components**: Main page implementations
- **Route-Based**: Organized by domain
- **Lazy Loading**: Code splitting for performance

#### `src/hooks/` - Custom React Hooks
- **Data Fetching**: React Query hooks
- **State Management**: Zustand stores
- **Utilities**: Reusable hook logic

---

## Component Interaction

### Request Flow

```
1. HTTP Request
   ↓
2. Nginx API Gateway (Port 8007)
   ↓
3. Next.js API Route (app/api/v1/*)
   ↓
4. Auth Middleware (JWT validation)
   ↓
5. RBAC Middleware (permission check)
   ↓
6. Audit Middleware (log request start)
   ↓
7. Controller (DTO validation)
   ↓
8. Service (business logic)
   ↓
9. Repository (data access)
   ↓
10. Redis Cache (if applicable)
   ↓
11. PostgreSQL Database
   ↓
12. Service (transform result)
   ↓
13. Audit Middleware (log request end)
   ↓
14. Controller (format response)
   ↓
15. HTTP Response
```

### Event Consumption Flow

```
1. RabbitMQ Message Arrives
   ↓
2. Event Consumer (events/consumers/*)
   ↓
3. Event Validation (schema check)
   ↓
4. Idempotency Check (event already processed?)
   ↓
5. Service Layer (handle event)
   ↓
6. Database Transaction (update state)
   ↓
7. Publish New Events (if needed)
   ↓
8. Ack Message (RabbitMQ)
   ↓
9. Audit Log (record event processing)
```

### Dashboard Data Flow

```
1. Frontend requests /api/v1/dashboard/kpis
   ↓
2. Dashboard Service checks Redis cache
   ├─→ Cache Hit: Return cached data (fast)
   └─→ Cache Miss:
       ├─→ Query PostgreSQL (aggregate KPIs)
       ├─→ Call external services (Order, Product, Payment)
       ├─→ Aggregate results
       ├─→ Store in Redis (TTL: 5 min)
       └─→ Return data
```

---

## Data Flow

### Read Operations (CQRS Pattern)

```
Query Request → Controller → Service → Repository → Database
                                    ↓
                              Cache Check
                                    ↓
                              Return Data
```

### Write Operations (Event Sourcing Pattern)

```
Command Request → Controller → Service → Repository → Database
                                       ↓
                                 Transaction
                                       ↓
                              Publish Event → RabbitMQ
                                       ↓
                              Update Cache (Invalidate)
                                       ↓
                              Return Response
```

### Audit Trail Flow

```
Admin Action → Controller
                    ↓
              Service Layer
                    ↓
              Audit Service
                    ↓
              Admin Log Repository
                    ↓
              Database (admin_logs table)
```

---

## Scalability Strategy

### Horizontal Scaling

1. **Stateless Design**
   - No session state in memory
   - All state in Redis or database
   - Multiple instances behind load balancer

2. **Database Connection Pooling**
   - PgBouncer sidecar (transaction mode)
   - 20 server connections per instance
   - 100 max client connections

3. **Cache Distribution**
   - Redis Sentinel cluster
   - Cache keys with consistent hashing
   - Automatic cache warming on new instances

4. **Queue Processing**
   - RabbitMQ competing consumers
   - Multiple consumer instances
   - Automatic message distribution

### Vertical Scaling

1. **Query Optimization**
   - Database indexes on frequently queried columns
   - Materialized views for complex aggregations
   - Query result caching

2. **Resource Limits**
   - CPU: 1.0 cores per instance
   - RAM: 512 MB per instance
   - Auto-scaling based on metrics

3. **Database Read Replicas**
   - Read queries to replicas
   - Write queries to primary
   - Replica lag monitoring

---

## Performance Optimization

### Caching Strategy

| Cache Type | Key Pattern | TTL | Invalidation Strategy |
|-----------|-------------|-----|-------------------|
| Dashboard KPIs | `dashboard:kpis` | 5 min | Event-triggered refresh |
| Product List | `products:list:{hash}` | 10 min | Manual/Event refresh |
| Order Counts | `orders:counts:{period}` | 5 min | Event-triggered refresh |
| Report Data | `reports:{type}:{hash}` | 30 min | Event-triggered refresh |
| Admin Session | `session:{adminId}` | 15 min | Logout expiry |

### Database Optimization

1. **Indexes**
   - Composite indexes on frequently joined columns
   - Partial indexes for filtered queries
   - Covering indexes for hot paths

2. **Query Patterns**
   - Use prepared statements
   - Avoid N+1 queries with eager loading
   - Pagination with cursor-based approach

3. **Connection Management**
   - Connection pooling (PgBouncer)
   - Connection timeout configuration
   - Health check connections

### Frontend Optimization

1. **Code Splitting**
   - Route-based code splitting
   - Lazy loading of heavy components
   - Dynamic imports for charts

2. **Image Optimization**
   - Next.js Image component
   - WebP format with fallback
   - Lazy loading below fold

3. **Data Fetching**
   - Server-side rendering for initial load
   - Client-side incremental updates
   - Optimistic UI updates

---

## Technology Stack Rationale

### React 18 + Vite (Admin Frontend)

**Why:**
- **Simplicity**: Pure SPA for admin dashboard - no need for SSR/SEO
- **Performance**: Faster build times with Vite, smaller bundle size
- **Modern Stack**: React 18 concurrent features, Vite's HMR
- **Separation**: Clean separation from NestJS backend API
- **TypeScript**: Native TypeScript support
- **Ecosystem**: Vast React ecosystem and component libraries

**Alternatives Considered:**
- Next.js 14 (overkill for private admin dashboard, unused SSR features)
- Create React App (CRA deprecated, slower than Vite)
- Vue.js (team less familiar with Vue than React)

### NestJS 11 (Admin API Backend)

**Why:**
- **Enterprise-Ready**: Built-in support for modules, guards, interceptors, pipes
- **TypeScript**: Native TypeScript support with decorators
- **Consistency**: Same framework as other backend services (Product, Inventory, Order, Payment)
- **Patterns**: Enforces best practices (dependency injection, modular architecture)
- **Ecosystem**: Excellent tooling, testing, and community

**Alternatives Considered:**
- Express.js (no structure, harder to maintain at scale)
- Fastify (faster but less mature ecosystem)
- Next.js API Routes (would couple API to frontend framework)

### PostgreSQL 17

**Why:**
- **Reliability**: ACID compliance, proven in production
- **Features**: JSONB, full-text search, window functions
- **Ecosystem**: Prisma ORM support, excellent tooling
- **Performance**: Efficient for complex queries and joins

**Alternatives Considered:**
- MongoDB (better for unstructured data, but admin data is structured)
- MySQL (PostgreSQL has better JSON support)

### Redis 7.2

**Why:**
- **Speed**: In-memory, sub-millisecond latency
- **Features**: Pub/Sub, TTL, transactions
- **Sentinel**: High availability with automatic failover
- **Integration**: Excellent Prisma and NestJS support

**Alternatives Considered:**
- Memcached (simpler, but lacks persistence and advanced features)

### Elasticsearch

**Why:**
- **Search**: Full-text search across products, orders, customers
- **Aggregations**: Complex analytics and faceted search
- **Scalability**: Horizontal scaling with shards
- **Integration**: Prisma plugin support

**Alternatives Considered:**
- PostgreSQL full-text search (good, but Elasticsearch is more powerful)

### Prisma ORM

**Why:**
- **Type-Safe**: Auto-generated TypeScript types
- **Migrations**: Database version control
- **Query Builder**: Intuitive API, reduces boilerplate
- **Ecosystem**: Excellent tooling and community

**Alternatives Considered:**
- TypeORM (heavier, more complex)
- Knex.js (query builder only, no ORM)

---

## Conclusion

This architecture ensures:

1. **Maintainability**: Clear separation of concerns
2. **Scalability**: Stateless design with horizontal scaling
3. **Performance**: Caching, indexing, and optimization
4. **Reliability**: Event-driven design with fault tolerance
5. **Security**: Authentication, authorization, and audit logging

The Admin Service follows all project standards and integrates seamlessly with the existing microservices architecture.

---

**Last Updated**: 2026-04-21  
**Maintained By**: Engineering Team