# Admin Service Database Schema

> **Version**: 1.0.0 | **Last Updated**: April 21, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Schema Design](#schema-design)
3. [Tables](#tables)
4. [Relationships](#relationships)
5. [Indexes](#indexes)
6. [Constraints](#constraints)
7. [Migrations](#migrations)

---

## Overview

The Admin Service uses PostgreSQL 17 for persistent storage. The database follows these principles:

- **Naming Convention**: `snake_case` for tables and columns
- **Primary Keys**: UUID with auto-generation
- **Timestamps**: `created_at` and `updated_at` on all tables
- **Soft Deletes**: `deleted_at` for soft deletion where applicable
- **Audit Trail**: Comprehensive logging of all admin actions

### Database Information

| Attribute | Value |
|-----------|--------|
| **Database Name** | `emp_admin` |
| **Schema** | `public` |
| **Character Set** | UTF8 |
| **Collation** | `en_US.UTF-8` |

---

## Schema Design

### Entity Relationship Diagram

```
┌──────────────┐         ┌──────────────────┐         ┌──────────────────┐
│    admins    │─────────│   admin_logs    │         │product_approvals│
└──────────────┘         └──────────────────┘         └──────────────────┘
       │                         │                             │
       │ 1                    │ 1                           │ 1
       │                        │                             │
       │ N                    │ N                           │ N
       │                        │                             │
       ▼                        ▼                             ▼
┌──────────────────┐   ┌──────────────────┐   ┌──────────────────┐
│inventory_alerts  │   │  saved_reports  │   │  vendor_settlements│
└──────────────────┘   └──────────────────┘   └──────────────────┘

┌──────────────────┐         ┌──────────────────┐
│dashboard_metrics │         │     banners     │
└──────────────────┘         └──────────────────┘
```

---

## Tables

### 1. admins

Admin user accounts separate from regular users in Auth Service.

```sql
CREATE TABLE admins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE,
  role              VARCHAR(50) NOT NULL,
  permissions       JSONB,
  last_login_at     TIMESTAMPTZ,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ,
  
  CONSTRAINT fk_admins_user 
    FOREIGN KEY (user_id) REFERENCES emp_auth.users(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_admins_created_at ON admins(created_at);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `user_id` | UUID | NOT NULL, UNIQUE, FK | Reference to Auth Service user |
| `role` | VARCHAR(50) | NOT NULL | Admin role (admin, finance_manager, etc.) |
| `permissions` | JSONB | NULL | Additional granular permissions |
| `last_login_at` | TIMESTAMPTZ | NULL | Last successful login timestamp |
| `two_factor_enabled` | BOOLEAN | NOT NULL, DEFAULT false | 2FA enabled status |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Record creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |
| `deleted_at` | TIMESTAMPTZ | NULL | Soft delete timestamp |

#### Role Values

| Role | Description |
|------|-------------|
| `super_admin` | Full system access; can manage other admins |
| `admin` | Platform operations; user management |
| `finance_manager` | Financial reports, settlements, refunds |
| `inventory_manager` | Stock adjustments, low-stock management |
| `content_manager` | Banners, promotions, CMS pages |
| `support_manager` | Order management, customer support, returns |
| `product_manager` | Product approval, category management |

---

### 2. admin_logs

Audit trail for all admin actions.

```sql
CREATE TABLE admin_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id       UUID NOT NULL,
  action         VARCHAR(100) NOT NULL,
  resource_type  VARCHAR(50) NOT NULL,
  resource_id    UUID,
  old_values     JSONB,
  new_values     JSONB,
  ip_address     INET,
  user_agent     TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_admin_logs_admin 
    FOREIGN KEY (admin_id) REFERENCES admins(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_admin_logs_admin_id ON admin_logs(admin_id);
CREATE INDEX idx_admin_logs_created_at ON admin_logs(created_at);
CREATE INDEX idx_admin_logs_resource ON admin_logs(resource_type, resource_id);
CREATE INDEX idx_admin_logs_action ON admin_logs(action);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `admin_id` | UUID | NOT NULL, FK | Admin who performed action |
| `action` | VARCHAR(100) | NOT NULL | Action performed (product.updated, etc.) |
| `resource_type` | VARCHAR(50) | NOT NULL | Type of resource (product, order, etc.) |
| `resource_id` | UUID | NULL | ID of affected resource |
| `old_values` | JSONB | NULL | Previous state (for updates) |
| `new_values` | JSONB | NULL | New state (for updates) |
| `ip_address` | INET | NULL | Admin's IP address |
| `user_agent` | TEXT | NULL | Browser user agent |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Log timestamp |

#### Action Values

| Action | Description |
|--------|-------------|
| `admin.created` | New admin account created |
| `admin.updated` | Admin account updated |
| `product.approved` | Product approved |
| `product.rejected` | Product rejected |
| `product.deleted` | Product deleted |
| `order.status_updated` | Order status changed |
| `inventory.adjusted` | Stock adjusted |
| `customer.blocked` | Customer account blocked |
| `customer.unblocked` | Customer account unblocked |
| `banner.created` | Banner created |
| `banner.updated` | Banner updated |
| `banner.deleted` | Banner deleted |

---

### 3. product_approvals

Product approval workflow for vendor-submitted products.

```sql
CREATE TABLE product_approvals (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id       UUID NOT NULL UNIQUE,
  vendor_id        UUID NOT NULL,
  status           VARCHAR(20) NOT NULL,
  reviewed_by      UUID,
  reviewed_at      TIMESTAMPTZ,
  rejection_reason TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_product_approvals_reviewed_by 
    FOREIGN KEY (reviewed_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_product_approvals_product_id ON product_approvals(product_id);
CREATE INDEX idx_product_approvals_vendor_id ON product_approvals(vendor_id);
CREATE INDEX idx_product_approvals_status ON product_approvals(status);
CREATE INDEX idx_product_approvals_reviewed_by ON product_approvals(reviewed_by);
CREATE INDEX idx_product_approvals_created_at ON product_approvals(created_at);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `product_id` | UUID | NOT NULL, UNIQUE | Reference to Product Service |
| `vendor_id` | UUID | NOT NULL | Reference to vendor user |
| `status` | VARCHAR(20) | NOT NULL | Approval status |
| `reviewed_by` | UUID | NULL, FK | Admin who reviewed |
| `reviewed_at` | TIMESTAMPTZ | NULL | Review timestamp |
| `rejection_reason` | TEXT | NULL | Reason for rejection |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Approval request timestamp |

#### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Awaiting admin review |
| `approved` | Approved and published |
| `rejected` | Rejected by admin |

---

### 4. inventory_alerts

Low stock and inventory alerts.

```sql
CREATE TABLE inventory_alerts (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sku               VARCHAR(100) NOT NULL,
  threshold         INTEGER NOT NULL,
  current_quantity  INTEGER NOT NULL,
  alert_type        VARCHAR(20) NOT NULL,
  acknowledged      BOOLEAN NOT NULL DEFAULT false,
  acknowledged_by  UUID,
  acknowledged_at  TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_inventory_alerts_acknowledged_by 
    FOREIGN KEY (acknowledged_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_inventory_alerts_sku ON inventory_alerts(sku);
CREATE INDEX idx_inventory_alerts_alert_type ON inventory_alerts(alert_type);
CREATE INDEX idx_inventory_alerts_acknowledged ON inventory_alerts(acknowledged);
CREATE INDEX idx_inventory_alerts_acknowledged_by ON inventory_alerts(acknowledged_by);
CREATE INDEX idx_inventory_alerts_created_at ON inventory_alerts(created_at);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `sku` | VARCHAR(100) | NOT NULL | Product SKU |
| `threshold` | INTEGER | NOT NULL | Alert threshold |
| `current_quantity` | INTEGER | NOT NULL | Current stock level |
| `alert_type` | VARCHAR(20) | NOT NULL | Type of alert |
| `acknowledged` | BOOLEAN | NOT NULL, DEFAULT false | Alert acknowledged status |
| `acknowledged_by` | UUID | NULL, FK | Admin who acknowledged |
| `acknowledged_at` | TIMESTAMPTZ | NULL | Acknowledgment timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Alert creation timestamp |

#### Alert Type Values

| Alert Type | Description |
|-----------|-------------|
| `low_stock` | Stock below threshold |
| `out_of_stock` | Stock at zero |

---

### 5. saved_reports

Custom saved reports with filters and schedules.

```sql
CREATE TABLE saved_reports (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name              VARCHAR(100) NOT NULL,
  created_by        UUID NOT NULL,
  report_config     JSONB NOT NULL,
  schedule          VARCHAR(50),
  last_generated_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_saved_reports_created_by 
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_saved_reports_created_by ON saved_reports(created_by);
CREATE INDEX idx_saved_reports_schedule ON saved_reports(schedule);
CREATE INDEX idx_saved_reports_created_at ON saved_reports(created_at);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `name` | VARCHAR(100) | NOT NULL | Report name |
| `created_by` | UUID | NOT NULL, FK | Admin who created report |
| `report_config` | JSONB | NOT NULL | Report filters, metrics, time range |
| `schedule` | VARCHAR(50) | NULL | Report schedule (daily, weekly, monthly) |
| `last_generated_at` | TIMESTAMPTZ | NULL | Last generation timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### Schedule Values

| Schedule | Description |
|----------|-------------|
| `daily` | Generate daily at midnight |
| `weekly` | Generate weekly on Sunday |
| `monthly` | Generate monthly on 1st |
| NULL | Manual generation only |

---

### 6. dashboard_metrics

Cached dashboard metrics for performance.

```sql
CREATE TABLE dashboard_metrics (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  metric_name     VARCHAR(100) NOT NULL,
  metric_data     JSONB NOT NULL,
  period_start    TIMESTAMPTZ NOT NULL,
  period_end      TIMESTAMPTZ NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT uq_dashboard_metrics_unique 
    UNIQUE(metric_name, period_start, period_end)
);

-- Indexes
CREATE INDEX idx_dashboard_metrics_metric_name ON dashboard_metrics(metric_name);
CREATE INDEX idx_dashboard_metrics_period ON dashboard_metrics(period_start, period_end);
CREATE INDEX idx_dashboard_metrics_generated_at ON dashboard_metrics(generated_at);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `metric_name` | VARCHAR(100) | NOT NULL | Metric identifier |
| `metric_data` | JSONB | NOT NULL | Cached metric data |
| `period_start` | TIMESTAMPTZ | NOT NULL | Period start time |
| `period_end` | TIMESTAMPTZ | NOT NULL | Period end time |
| `generated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Generation timestamp |

#### Metric Name Values

| Metric Name | Description |
|-------------|-------------|
| `dashboard_kpis` | Key performance indicators |
| `sales_trend` | Sales over time |
| `revenue_breakdown` | Revenue by category |
| `order_funnel` | Order conversion rates |
| `top_products` | Top-selling products |
| `customer_analytics` | Customer behavior data |

---

### 7. banners

Promotional banners and homepage content.

```sql
CREATE TABLE banners (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title         VARCHAR(200) NOT NULL,
  image_url     TEXT NOT NULL,
  link_url      TEXT,
  position      INTEGER NOT NULL,
  status        VARCHAR(20) NOT NULL,
  display_from  TIMESTAMPTZ NOT NULL,
  display_until TIMESTAMPTZ,
  created_by    UUID NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_banners_created_by 
    FOREIGN KEY (created_by) REFERENCES admins(id) ON DELETE CASCADE
);

-- Indexes
CREATE INDEX idx_banners_status ON banners(status);
CREATE INDEX idx_banners_position ON banners(position);
CREATE INDEX idx_banners_display_period ON banners(display_from, display_until);
CREATE INDEX idx_banners_created_by ON banners(created_by);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `title` | VARCHAR(200) | NOT NULL | Banner title |
| `image_url` | TEXT | NOT NULL | Image URL (S3/MinIO) |
| `link_url` | TEXT | NULL | Clickthrough link |
| `position` | INTEGER | NOT NULL | Display order |
| `status` | VARCHAR(20) | NOT NULL | Banner status |
| `display_from` | TIMESTAMPTZ | NOT NULL | Display start date |
| `display_until` | TIMESTAMPTZ | NULL | Display end date |
| `created_by` | UUID | NOT NULL, FK | Admin who created |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |
| `updated_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Last update timestamp |

#### Status Values

| Status | Description |
|--------|-------------|
| `active` | Currently displayed |
| `inactive` | Not displayed |

---

### 8. vendor_settlements

Vendor payment settlements and commissions.

```sql
CREATE TABLE vendor_settlements (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_id                  UUID NOT NULL,
  settlement_period_start   DATE NOT NULL,
  settlement_period_end     DATE NOT NULL,
  total_orders              INTEGER NOT NULL,
  total_revenue_paisa      BIGINT NOT NULL,
  commission_paisa          BIGINT NOT NULL,
  net_payout_paisa        BIGINT NOT NULL,
  status                    VARCHAR(20) NOT NULL,
  processed_by              UUID,
  processed_at              TIMESTAMPTZ,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  CONSTRAINT fk_vendor_settlements_processed_by 
    FOREIGN KEY (processed_by) REFERENCES admins(id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX idx_vendor_settlements_vendor_id ON vendor_settlements(vendor_id);
CREATE INDEX idx_vendor_settlements_status ON vendor_settlements(status);
CREATE INDEX idx_vendor_settlements_period ON vendor_settlements(settlement_period_start, settlement_period_end);
CREATE INDEX idx_vendor_settlements_processed_by ON vendor_settlements(processed_by);
```

#### Columns

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | UUID | PRIMARY KEY | Unique identifier |
| `vendor_id` | UUID | NOT NULL | Reference to vendor user |
| `settlement_period_start` | DATE | NOT NULL | Settlement start date |
| `settlement_period_end` | DATE | NOT NULL | Settlement end date |
| `total_orders` | INTEGER | NOT NULL | Total orders in period |
| `total_revenue_paisa` | BIGINT | NOT NULL | Total revenue (in paisa) |
| `commission_paisa` | BIGINT | NOT NULL | Platform commission (in paisa) |
| `net_payout_paisa` | BIGINT | NOT NULL | Net payout to vendor (in paisa) |
| `status` | VARCHAR(20) | NOT NULL | Settlement status |
| `processed_by` | UUID | NULL, FK | Admin who processed |
| `processed_at` | TIMESTAMPTZ | NULL | Processing timestamp |
| `created_at` | TIMESTAMPTZ | NOT NULL, DEFAULT NOW() | Creation timestamp |

#### Status Values

| Status | Description |
|--------|-------------|
| `pending` | Awaiting processing |
| `processing` | Being processed |
| `paid` | Payment sent to vendor |
| `failed` | Payment failed |

---

## Relationships

### Foreign Key Relationships

| Table | Column | References | On Delete |
|-------|---------|------------|------------|
| `admin_logs` | `admin_id` | `admins(id)` | CASCADE |
| `product_approvals` | `reviewed_by` | `admins(id)` | SET NULL |
| `inventory_alerts` | `acknowledged_by` | `admins(id)` | SET NULL |
| `saved_reports` | `created_by` | `admins(id)` | CASCADE |
| `banners` | `created_by` | `admins(id)` | CASCADE |
| `vendor_settlements` | `processed_by` | `admins(id)` | SET NULL |

### Cross-Database References

| Table | Column | References Database | References Table |
|-------|---------|-------------------|-----------------|
| `admins` | `user_id` | `emp_auth` | `users` |
| `product_approvals` | `product_id` | `emp_product` (MongoDB) | `products` |
| `product_approvals` | `vendor_id` | `emp_auth` | `users` |
| `vendor_settlements` | `vendor_id` | `emp_auth` | `users` |

---

## Indexes

### Primary Indexes

All tables have a primary index on the `id` column (UUID).

### Foreign Key Indexes

All foreign key columns are indexed for performance.

### Composite Indexes

| Table | Index | Columns | Purpose |
|-------|--------|----------|---------|
| `admin_logs` | `idx_admin_logs_resource` | `resource_type, resource_id` | Fast resource-based queries |
| `dashboard_metrics` | `uq_dashboard_metrics_unique` | `metric_name, period_start, period_end` | Prevent duplicate metrics |

### Performance Indexes

| Table | Index | Columns | Purpose |
|-------|--------|----------|---------|
| `admins` | `idx_admins_role` | `role` | Filter by role |
| `admin_logs` | `idx_admin_logs_created_at` | `created_at` | Time-based queries |
| `product_approvals` | `idx_product_approvals_status` | `status` | Filter by status |
| `inventory_alerts` | `idx_inventory_alerts_alert_type` | `alert_type` | Filter by alert type |
| `saved_reports` | `idx_saved_reports_schedule` | `schedule` | Filter by schedule |
| `banners` | `idx_banners_display_period` | `display_from, display_until` | Active banners query |
| `vendor_settlements` | `idx_vendor_settlements_period` | `settlement_period_start, settlement_period_end` | Period-based queries |

---

## Constraints

### Foreign Key Constraints

All foreign keys are defined with appropriate actions:

```sql
CONSTRAINT fk_{table}_{column} 
  FOREIGN KEY (column) REFERENCES {referenced_table}(referenced_column) 
  ON DELETE {CASCADE | SET NULL}
```

### Unique Constraints

| Table | Constraint | Columns |
|-------|-------------|----------|
| `admins` | `uq_admins_user_id` | `user_id` |
| `product_approvals` | `uq_product_approvals_product_id` | `product_id` |
| `dashboard_metrics` | `uq_dashboard_metrics_unique` | `metric_name, period_start, period_end` |

### Check Constraints

```sql
-- Admin role validation
ALTER TABLE admins 
  ADD CONSTRAINT chk_admins_role 
  CHECK (role IN (
    'super_admin', 'admin', 'finance_manager', 
    'inventory_manager', 'content_manager', 
    'support_manager', 'product_manager'
  ));

-- Product approval status validation
ALTER TABLE product_approvals 
  ADD CONSTRAINT chk_product_approvals_status 
  CHECK (status IN ('pending', 'approved', 'rejected'));

-- Inventory alert type validation
ALTER TABLE inventory_alerts 
  ADD CONSTRAINT chk_inventory_alerts_type 
  CHECK (alert_type IN ('low_stock', 'out_of_stock'));

-- Banner status validation
ALTER TABLE banners 
  ADD CONSTRAINT chk_banners_status 
  CHECK (status IN ('active', 'inactive'));

-- Settlement status validation
ALTER TABLE vendor_settlements 
  ADD CONSTRAINT chk_vendor_settlements_status 
  CHECK (status IN ('pending', 'processing', 'paid', 'failed'));

-- Display period validation
ALTER TABLE banners 
  ADD CONSTRAINT chk_banners_display_period 
  CHECK (display_until IS NULL OR display_until > display_from);

-- Settlement period validation
ALTER TABLE vendor_settlements 
  ADD CONSTRAINT chk_vendor_settlements_period 
  CHECK (settlement_period_end >= settlement_period_start);

-- Positive values
ALTER TABLE vendor_settlements 
  ADD CONSTRAINT chk_vendor_settlements_positive 
  CHECK (
    total_orders >= 0 AND 
    total_revenue_paisa >= 0 AND 
    commission_paisa >= 0 AND 
    net_payout_paisa >= 0
  );
```

---

## Migrations

### Migration Naming Convention

Format: `V{VERSION}__{DESCRIPTION}.sql`

Example: `V001__create_admins_table.sql`

### Migration Structure

```sql
-- Migration: V001__create_admins_table.sql
-- Description: Create admins table with indexes and constraints
-- Author: Admin Service Team
-- Date: 2026-04-21

-- Begin transaction
BEGIN;

-- Create table
CREATE TABLE admins (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL UNIQUE,
  role              VARCHAR(50) NOT NULL,
  permissions       JSONB,
  last_login_at     TIMESTAMPTZ,
  two_factor_enabled BOOLEAN NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  deleted_at        TIMESTAMPTZ
);

-- Create indexes
CREATE INDEX idx_admins_user_id ON admins(user_id);
CREATE INDEX idx_admins_role ON admins(role);
CREATE INDEX idx_admins_created_at ON admins(created_at);

-- Create check constraint
ALTER TABLE admins 
  ADD CONSTRAINT chk_admins_role 
  CHECK (role IN (
    'super_admin', 'admin', 'finance_manager', 
    'inventory_manager', 'content_manager', 
    'support_manager', 'product_manager'
  ));

-- Commit transaction
COMMIT;
```

### Rollback Migrations

Create rollback scripts in `migrations/rollback/` directory:

```sql
-- Rollback: V001__create_admins_table.sql
-- Description: Drop admins table
-- Author: Admin Service Team
-- Date: 2026-04-21

DROP TABLE IF EXISTS admins CASCADE;
```

### Migration Order

| Version | Migration | Dependencies |
|---------|------------|--------------|
| V001 | Create admins table | None |
| V002 | Create admin_logs table | V001 |
| V003 | Create product_approvals table | None |
| V004 | Create inventory_alerts table | None |
| V005 | Create saved_reports table | V001 |
| V006 | Create dashboard_metrics table | None |
| V007 | Create banners table | V001 |
| V008 | Create vendor_settlements table | None |
| V009 | Add foreign key constraints | V001-V008 |
| V010 | Add check constraints | V001-V008 |

---

## Data Types

### UUID

Used for all primary keys and foreign keys.

```sql
id UUID PRIMARY KEY DEFAULT gen_random_uuid()
```

### JSONB

Used for flexible data storage (permissions, metrics, etc.).

```sql
permissions JSONB,
metric_data JSONB,
report_config JSONB
```

### TIMESTAMPTZ

Used for all timestamp columns (timezone-aware).

```sql
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
```

### ENUM vs VARCHAR

Using VARCHAR with CHECK constraints for better flexibility:

```sql
-- Instead of:
role ENUM('admin', 'finance_manager', ...)

-- Use:
role VARCHAR(50) NOT NULL
CHECK (role IN ('admin', 'finance_manager', ...))
```

### BIGINT

Used for monetary values (stored in paisa, not BDT).

```sql
total_revenue_paisa BIGINT NOT NULL,  -- Stored as paisa (1 BDT = 100 paisa)
```

---

## Backup & Recovery

### Backup Strategy

1. **Daily Full Backups**: `pg_dump` at 02:00 UTC
2. **Continuous WAL Archiving**: For point-in-time recovery
3. **Retention**: 7 days daily, 4 weeks weekly, 12 months monthly

### Recovery Procedure

```bash
# Restore from backup
pg_restore -h localhost -U emp -d emp_admin -v backup.sql

# Point-in-time recovery using WAL
# 1. Stop PostgreSQL
# 2. Copy backup files
# 3. Configure recovery target time
# 4. Start PostgreSQL
```

---

## Security

### Access Control

- **Read-Only Access**: For reporting queries
- **Read-Write Access**: For admin operations
- **No Direct Access**: Applications must use service layer

### Data Encryption

- **At Rest**: AES-256 encryption on production volumes
- **In Transit**: TLS 1.3 for all connections
- **Sensitive Data**: PII encrypted at application level

### Audit Trail

All admin actions logged in `admin_logs` table with:
- Admin ID
- Action performed
- Resource affected
- Before/after values
- IP address and user agent

---

## Performance

### Query Optimization

1. **Use Indexes**: All frequently queried columns indexed
2. **Avoid SELECT ***`: Specify only needed columns
3. **Use Prepared Statements**: Prevent SQL injection and improve performance
4. **Connection Pooling**: PgBouncer for efficient connection management

### Materialized Views

Create materialized views for complex aggregations:

```sql
CREATE MATERIALIZED VIEW mv_admin_dashboard_kpis AS
SELECT 
  COUNT(*) as total_orders,
  SUM(total_amount_paisa) as total_revenue,
  COUNT(DISTINCT customer_id) as total_customers,
  MAX(created_at) as last_order_at
FROM admin_service.orders;
```

Refresh materialized views periodically:

```sql
REFRESH MATERIALIZED VIEW mv_admin_dashboard_kpis;
```

---

## Conclusion

This database schema provides:

1. **Data Integrity**: Foreign keys and constraints
2. **Performance**: Proper indexing and query optimization
3. **Audit Trail**: Comprehensive logging of all admin actions
4. **Flexibility**: JSONB for evolving data structures
5. **Scalability**: Designed for horizontal scaling

The schema follows all project standards and integrates seamlessly with the microservices architecture.

---

**Last Updated**: 2026-04-21  
**Maintained By**: Engineering Team