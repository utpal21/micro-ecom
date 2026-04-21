# Admin Service Documentation

> **Version**: 1.0.0 | **Status**: Design Phase | **Last Updated**: April 21, 2026  
> **Service**: Admin Service | **Port**: 8007

---

## Overview

The Admin Service provides a centralized management interface for the Enterprise Marketplace Platform, enabling administrators to manage products, orders, inventory, customers, reports, and content through a unified dashboard.

**Purpose**: Centralized admin dashboard backend with role-based access control for platform operations.

---

## Quick Links

- [Architecture](ARCHITECTURE.md)
- [API Specification](API_SPECIFICATION.md)
- [Database Schema](DATABASE_SCHEMA.md)
- [Event Integration](EVENT_INTEGRATION.md)
- [Implementation Plan](IMPLEMENTATION_PLAN.md)
- [Security](SECURITY.md)

---

## Service Information

| Attribute | Value |
|-----------|--------|
| **Service Name** | admin-service |
| **Framework** | Next.js 14 (App Router) |
| **Port** | 8007 |
| **Database** | PostgreSQL 17 |
| **Cache** | Redis 7.2 |
| **Search** | Elasticsearch |
| **File Storage** | AWS S3 / MinIO |

---

## Core Features

### 1. Authentication & Authorization
- Admin login/logout with enhanced security
- Multi-factor authentication (2FA) for admin accounts
- Enhanced RBAC with admin-specific permissions
- Audit logging for all admin actions
- Session management with concurrent session limits

### 2. Product Management
- Unified product catalog view (aggregates from Product Service)
- Bulk product operations (import/export, bulk publish/unpublish)
- Product approval workflow (for vendor-submitted products)
- Category management with drag-and-drop hierarchy
- Tag and attribute management
- Product analytics (views, conversions, stock levels)

### 3. Inventory & Stock
- Real-time inventory dashboard across all SKUs
- Low-stock alerts and auto-reorder suggestions
- Bulk stock adjustments
- Inventory movement history
- Warehouse location management (multi-warehouse support)

### 4. Order Management
- Unified order view with advanced filtering
- Order status workflow management
- Bulk order operations
- Refund processing
- Return management
- Order analytics and trends

### 5. Customer Management
- Customer profile management
- Order history per customer
- Customer segmentation and tags
- Account blocking/unblocking
- Customer analytics (CLV, AOV, retention)

### 6. Vendor Management
- Vendor onboarding and verification
- Vendor performance metrics
- Product approval workflow
- Commission and settlement management
- Vendor payouts

### 7. Reports & Analytics
- Sales reports (daily, weekly, monthly)
- Revenue insights with breakdowns
- Top-selling products and categories
- Customer behavior analytics
- Conversion funnel analysis
- Custom report builder

### 8. Dashboard
- Real-time KPIs (orders, revenue, users, products)
- Graph-ready aggregated data endpoints
- Performance metrics across all services
- Alert and notification center

### 9. Content Management
- Banner and promotion management
- Homepage configuration (featured products, collections)
- CMS for static pages (About, Terms, Privacy)
- SEO management

---

## Admin Roles

| Role | Description | Permissions |
|------|-------------|--------------|
| `super_admin` | Full system access; can manage other admins | All permissions |
| `admin` | Platform operations; user management | products.*, orders.*, customers.*, users.manage |
| `finance_manager` | Payment reports, reconciliation, refunds | payments.read, payments.refund, reports.financial |
| `inventory_manager` | Stock adjustments, low-stock management | inventory.read, inventory.adjust |
| `content_manager` | Banners, promotions, CMS pages | content.* |
| `support_manager` | Order management, customer support, returns | orders.manage, customers.read, orders.read |
| `product_manager` | Product approval, category management | products.read, products.approve |

---

## Technology Stack

| Component | Technology | Version | Purpose |
|------------|-----------|---------|---------|
| **Framework** | Next.js | 14 (App Router) | Backend + Frontend |
| **Language** | TypeScript | 5.x | Type safety |
| **Database ORM** | Prisma | 6.x | PostgreSQL queries |
| **Cache** | Redis | 7.2 | Dashboard metrics caching |
| **Search** | Elasticsearch | 8.x | Admin search |
| **Styling** | Tailwind CSS | 3.x | UI styling |
| **Validation** | Zod | 3.x | Runtime validation |
| **HTTP Client** | Axios | 1.x | Service-to-service calls |

---

## API Endpoints Overview

### Authentication
- `POST /api/v1/auth/login` - Admin login
- `POST /api/v1/auth/logout` - Admin logout
- `GET /api/v1/auth/me` - Current admin profile
- `POST /api/v1/auth/2fa/enable` - Enable 2FA
- `POST /api/v1/auth/2fa/disable` - Disable 2FA

### Products
- `GET /api/v1/products` - List products (paginated, filtered)
- `GET /api/v1/products/:id` - Product detail
- `POST /api/v1/products` - Create product
- `PUT /api/v1/products/:id` - Update product
- `DELETE /api/v1/products/:id` - Soft-delete product
- `POST /api/v1/products/bulk` - Bulk operations
- `GET /api/v1/products/approvals` - Pending approvals
- `POST /api/v1/products/:id/approve` - Approve product
- `POST /api/v1/products/:id/reject` - Reject product

### Orders
- `GET /api/v1/orders` - List orders (advanced filtering)
- `GET /api/v1/orders/:id` - Order detail
- `PATCH /api/v1/orders/:id/status` - Update order status
- `POST /api/v1/orders/bulk` - Bulk operations
- `GET /api/v1/orders/analytics` - Order analytics

### Inventory
- `GET /api/v1/inventory` - Inventory overview
- `GET /api/v1/inventory/low-stock` - Low stock items
- `POST /api/v1/inventory/adjust` - Adjust stock
- `GET /api/v1/inventory/alerts` - Inventory alerts

### Customers
- `GET /api/v1/customers` - List customers
- `GET /api/v1/customers/:id` - Customer detail
- `POST /api/v1/customers/:id/block` - Block customer
- `POST /api/v1/customers/:id/unblock` - Unblock customer
- `GET /api/v1/customers/:id/orders` - Customer orders
- `GET /api/v1/customers/analytics` - Customer analytics

### Reports
- `GET /api/v1/reports/sales` - Sales report
- `GET /api/v1/reports/revenue` - Revenue report
- `GET /api/v1/reports/products` - Product performance
- `GET /api/v1/reports/customers` - Customer analytics
- `GET /api/v1/reports/custom` - Custom report
- `POST /api/v1/reports/save` - Save custom report

### Dashboard
- `GET /api/v1/dashboard/kpis` - Real-time KPIs
- `GET /api/v1/dashboard/graphs` - Graph data (charts)
- `GET /api/v1/dashboard/alerts` - Active alerts

### Content
- `GET /api/v1/banners` - List banners
- `POST /api/v1/banners` - Create banner
- `PUT /api/v1/banners/:id` - Update banner
- `DELETE /api/v1/banners/:id` - Delete banner
- `POST /api/v1/banners/:id/toggle` - Toggle active/inactive

---

## Event Integration

### Consumed Events
| Event | Source | Purpose |
|-------|--------|---------|
| `order.created` | Order Service | Update order dashboard, send notifications |
| `order.updated` | Order Service | Sync order status changes |
| `order.cancelled` | Order Service | Update analytics, adjust inventory view |
| `product.created` | Product Service | Update product dashboard, trigger approval workflow |
| `product.updated` | Product Service | Sync product changes to admin view |
| `inventory.updated` | Inventory Service | Update stock levels dashboard |
| `inventory.low_stock` | Inventory Service | Send low-stock alerts |
| `payment.completed` | Payment Service | Update revenue metrics |
| `payment.failed` | Payment Service | Track failed transactions |
| `payment.refunded` | Payment Service | Update financial reports |
| `user.registered` | Auth Service | Update user dashboard |
| `user.blocked` | Auth Service | Update customer management view |

### Published Events
| Event | Purpose |
|-------|---------|
| `product.approved` | Notify Product Service to publish product |
| `product.rejected` | Notify vendor of rejection |
| `order.status.updated` | Notify Order Service of admin status change |
| `inventory.adjusted` | Notify Inventory Service of stock adjustment |
| `customer.blocked` | Notify Auth Service to block user |
| `customer.unblocked` | Notify Auth Service to unblock user |

---

## Getting Started

### Prerequisites
- Node.js 22 LTS
- PostgreSQL 17
- Redis 7.2
- Docker & Docker Compose

### Local Development

```bash
# Install dependencies
cd services/admin-service
npm install

# Setup environment
cp .env.example .env
# Edit .env with your configuration

# Setup database
npx prisma migrate dev

# Seed database (optional)
npx prisma db seed

# Start development server
npm run dev

# Run tests
npm test

# Run type checking
npm run type-check

# Run linting
npm run lint
```

### Docker Development

```bash
# Build and start all services
docker-compose up -d admin-service

# View logs
docker-compose logs -f admin-service

# Stop services
docker-compose down
```

---

## Documentation Structure

- **README.md** - This file (overview and quick start)
- **ARCHITECTURE.md** - System architecture, design patterns, folder structure
- **API_SPECIFICATION.md** - Complete API documentation with request/response examples
- **DATABASE_SCHEMA.md** - Database schema, relationships, indexes
- **EVENT_INTEGRATION.md** - Event-driven integration details
- **IMPLEMENTATION_PLAN.md** - Step-by-step implementation roadmap
- **SECURITY.md** - Security measures, authentication, authorization

---

## Status

**Current Phase**: Design & Planning

**Progress**:
- [x] Requirements analysis
- [x] Architecture design
- [x] Database schema design
- [x] API specification
- [x] Event integration plan
- [ ] Project initialization
- [ ] Foundation implementation
- [ ] Feature development
- [ ] Testing & QA
- [ ] Deployment

---

## Contact & Support

For questions or issues related to the Admin Service, please:
1. Check the documentation in this folder
2. Review the implementation plan
3. Consult the main project README in `.ai/`
4. Contact the architecture team for design decisions

---

**Last Updated**: 2026-04-21  
**Maintained By**: Engineering Team