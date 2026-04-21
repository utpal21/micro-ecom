# Admin Service API Specification

> **Version**: 1.0.0 | **Last Updated**: April 21, 2026

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Common Response Format](#common-response-format)
4. [API Endpoints](#api-endpoints)
5. [Error Codes](#error-codes)

---

## Overview

Base URL: `http://localhost:8007/api/v1`

All endpoints require JWT authentication except health and auth endpoints.

### API Versioning

- **Current Version**: v1
- **Version Strategy**: URL-based versioning
- **Deprecation Policy**: 6 months notice before removing old versions

---

## Authentication

### Login

Admin login endpoint.

```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "secure_password"
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "admin": {
      "id": "uuid",
      "user_id": "uuid",
      "role": "admin",
      "permissions": ["products.read", "orders.manage"],
      "two_factor_enabled": false
    },
    "tokens": {
      "access_token": "jwt_access_token",
      "refresh_token": "jwt_refresh_token",
      "expires_in": 900
    }
  }
}
```

### Logout

Invalidate current session.

```http
POST /api/v1/auth/logout
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

### Current Admin Profile

Get current admin profile.

```http
GET /api/v1/auth/me
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "email": "admin@example.com",
    "role": "admin",
    "permissions": ["products.read", "orders.manage"],
    "last_login_at": "2026-04-21T12:00:00Z",
    "two_factor_enabled": false
  }
}
```

---

## Common Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### Error Response

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      }
    ]
  }
}
```

---

## API Endpoints

### Health Check

#### Liveness Probe

```http
GET /health/live
```

**Response (200 OK):**
```json
{
  "status": "ok",
  "timestamp": "2026-04-21T12:00:00Z"
}
```

#### Readiness Probe

```http
GET /health/ready
```

**Response (200 OK):**
```json
{
  "status": "ready",
  "checks": {
    "database": "ok",
    "redis": "ok",
    "rabbitmq": "ok"
  }
}
```

---

### Products

#### List Products

```http
GET /api/v1/products?page=1&limit=20&status=active&category=electronics
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "uuid",
        "name": "Product Name",
        "sku": "SKU-001",
        "price_paisa": 15000,
        "stock": 100,
        "status": "active",
        "category_id": "uuid",
        "created_at": "2026-04-21T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### Product Detail

```http
GET /api/v1/products/{id}
Authorization: Bearer {access_token}
```

#### Create Product

```http
POST /api/v1/products
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Product Name",
  "sku": "SKU-001",
  "price_paisa": 15000,
  "stock": 100,
  "category_id": "uuid",
  "description": "Product description",
  "images": ["https://s3.../image1.jpg"]
}
```

#### Update Product

```http
PUT /api/v1/products/{id}
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Updated Product Name",
  "price_paisa": 16000
}
```

#### Delete Product

```http
DELETE /api/v1/products/{id}
Authorization: Bearer {access_token}
```

#### Bulk Product Operations

```http
POST /api/v1/products/bulk
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "action": "publish",
  "product_ids": ["uuid1", "uuid2", "uuid3"]
}
```

#### Pending Product Approvals

```http
GET /api/v1/products/approvals?status=pending
Authorization: Bearer {access_token}
```

#### Approve Product

```http
POST /api/v1/products/{id}/approve
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "review_notes": "Product meets all quality standards"
}
```

#### Reject Product

```http
POST /api/v1/products/{id}/reject
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "reason": "Insufficient product images"
}
```

---

### Orders

#### List Orders

```http
GET /api/v1/orders?page=1&limit=20&status=pending&from=2026-04-01&to=2026-04-30
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "uuid",
        "order_number": "ORD-001",
        "customer_id": "uuid",
        "total_amount_paisa": 15000,
        "status": "pending",
        "payment_status": "paid",
        "created_at": "2026-04-21T12:00:00Z"
      }
    ],
    "pagination": {
      "page": 1,
      "limit": 20,
      "total": 100,
      "pages": 5
    }
  }
}
```

#### Order Detail

```http
GET /api/v1/orders/{id}
Authorization: Bearer {access_token}
```

#### Update Order Status

```http
PATCH /api/v1/orders/{id}/status
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "status": "shipped",
  "notes": "Order shipped via courier"
}
```

#### Bulk Order Operations

```http
POST /api/v1/orders/bulk
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "action": "cancel",
  "order_ids": ["uuid1", "uuid2"],
  "reason": "Payment failed"
}
```

#### Order Analytics

```http
GET /api/v1/orders/analytics?period=7d
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_orders": 1500,
    "total_revenue_paisa": 22500000,
    "average_order_value_paisa": 15000,
    "status_breakdown": {
      "pending": 100,
      "confirmed": 800,
      "shipped": 500,
      "delivered": 100
    }
  }
}
```

---

### Inventory

#### Inventory Overview

```http
GET /api/v1/inventory
Authorization: Bearer {access_token}
```

#### Low Stock Items

```http
GET /api/v1/inventory/low-stock?threshold=10
Authorization: Bearer {access_token}
```

#### Adjust Stock

```http
POST /api/v1/inventory/adjust
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "sku": "SKU-001",
  "quantity": 50,
  "reason": "Stock adjustment",
  "adjustment_type": "add"
}
```

#### Inventory Alerts

```http
GET /api/v1/inventory/alerts?status=unacknowledged
Authorization: Bearer {access_token}
```

---

### Customers

#### List Customers

```http
GET /api/v1/customers?page=1&limit=20&search=john&status=active
Authorization: Bearer {access_token}
```

#### Customer Detail

```http
GET /api/v1/customers/{id}
Authorization: Bearer {access_token}
```

#### Block Customer

```http
POST /api/v1/customers/{id}/block
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "reason": "Violated terms of service"
}
```

#### Unblock Customer

```http
POST /api/v1/customers/{id}/unblock
Authorization: Bearer {access_token}
```

#### Customer Orders

```http
GET /api/v1/customers/{id}/orders?page=1&limit=20
Authorization: Bearer {access_token}
```

#### Customer Analytics

```http
GET /api/v1/customers/{id}/analytics
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "total_orders": 25,
    "total_spent_paisa": 375000,
    "average_order_value_paisa": 15000,
    "lifetime_value_paisa": 375000,
    "last_order_at": "2026-04-20T12:00:00Z"
  }
}
```

---

### Reports

#### Sales Report

```http
GET /api/v1/reports/sales?period=monthly&year=2026&month=4
Authorization: Bearer {access_token}
```

#### Revenue Report

```http
GET /api/v1/reports/revenue?period=7d&breakdown=category
Authorization: Bearer {access_token}
```

#### Product Performance

```http
GET /api/v1/reports/products?period=30d&sort=top_selling&limit=10
Authorization: Bearer {access_token}
```

#### Customer Analytics Report

```http
GET /api/v1/reports/customers?period=90d&metrics=retention,clv,aov
Authorization: Bearer {access_token}
```

#### Custom Report

```http
GET /api/v1/reports/custom?report_id={id}
Authorization: Bearer {access_token}
```

#### Save Custom Report

```http
POST /api/v1/reports/save
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "name": "Daily Sales Report",
  "report_config": {
    "type": "sales",
    "period": "daily",
    "metrics": ["total_orders", "total_revenue"],
    "filters": {
      "status": ["confirmed", "delivered"]
    }
  },
  "schedule": "daily"
}
```

---

### Dashboard

#### KPIs

```http
GET /api/v1/dashboard/kpis
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "orders": {
      "today": 150,
      "week": 1050,
      "month": 4500,
      "change_percent": 12.5
    },
    "revenue": {
      "today_paisa": 2250000,
      "week_paisa": 15750000,
      "month_paisa": 67500000,
      "change_percent": 8.3
    },
    "users": {
      "total": 25000,
      "new_today": 150,
      "active_this_week": 5000,
      "change_percent": 15.2
    },
    "products": {
      "total": 5000,
      "active": 4500,
      "out_of_stock": 50,
      "low_stock": 100
    }
  }
}
```

#### Graph Data

```http
GET /api/v1/dashboard/graphs?type=sales_trend&period=7d
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "type": "sales_trend",
    "period": "7d",
    "data_points": [
      {
        "date": "2026-04-15",
        "value": 1450000,
        "count": 145
      },
      {
        "date": "2026-04-16",
        "value": 1520000,
        "count": 152
      }
    ]
  }
}
```

#### Active Alerts

```http
GET /api/v1/dashboard/alerts
Authorization: Bearer {access_token}
```

**Response (200 OK):**
```json
{
  "success": true,
  "data": {
    "alerts": [
      {
        "id": "uuid",
        "type": "low_stock",
        "severity": "warning",
        "message": "5 products are low on stock",
        "count": 5,
        "created_at": "2026-04-21T12:00:00Z"
      },
      {
        "id": "uuid",
        "type": "pending_approvals",
        "severity": "info",
        "message": "12 products awaiting approval",
        "count": 12,
        "created_at": "2026-04-21T11:00:00Z"
      }
    ]
  }
}
```

---

### Banners

#### List Banners

```http
GET /api/v1/banners?status=active
Authorization: Bearer {access_token}
```

#### Create Banner

```http
POST /api/v1/banners
Authorization: Bearer {access_token}
Content-Type: application/json

{
  "title": "Summer Sale",
  "image_url": "https://s3.../banner.jpg",
  "link_url": "/products?category=summer",
  "position": 1,
  "display_from": "2026-06-01T00:00:00Z",
  "display_until": "2026-08-31T23:59:59Z"
}
```

#### Update Banner

```http
PUT /api/v1/banners/{id}
Authorization: Bearer {access_token}
```

#### Delete Banner

```http
DELETE /api/v1/banners/{id}
Authorization: Bearer {access_token}
```

#### Toggle Banner Status

```http
POST /api/v1/banners/{id}/toggle
Authorization: Bearer {access_token}
```

---

### Vendors

#### List Vendors

```http
GET /api/v1/vendors?page=1&limit=20&status=active
Authorization: Bearer {access_token}
```

#### Vendor Detail

```http
GET /api/v1/vendors/{id}
Authorization: Bearer {access_token}
```

#### Vendor Performance

```http
GET /api/v1/vendors/{id}/performance?period=30d
Authorization: Bearer {access_token}
```

#### Vendor Settlements

```http
GET /api/v1/vendors/{id}/settlements?status=pending
Authorization: Bearer {access_token}
```

---

### Notifications

#### Mark Notification as Read

```http
POST /api/v1/notifications/{id}/read
Authorization: Bearer {access_token}
```

#### Mark All Notifications as Read

```http
POST /api/v1/notifications/read-all
Authorization: Bearer {access_token}
```

---

## Error Codes

### HTTP Status Codes

| Code | Description |
|------|-------------|
| 200 | Success |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict |
| 422 | Unprocessable Entity (Validation Error) |
| 429 | Too Many Requests (Rate Limited) |
| 500 | Internal Server Error |
| 503 | Service Unavailable |

### Error Codes

| Code | HTTP | Description |
|------|------|-------------|
| `VALIDATION_ERROR` | 422 | Request validation failed |
| `AUTHENTICATION_ERROR` | 401 | Invalid or expired token |
| `AUTHORIZATION_ERROR` | 403 | Insufficient permissions |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests |
| `INTERNAL_ERROR` | 500 | Unexpected server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Error Response Examples

#### Validation Error

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
      {
        "field": "email",
        "message": "Invalid email format"
      },
      {
        "field": "password",
        "message": "Password must be at least 8 characters"
      }
    ]
  }
}
```

#### Authorization Error

```json
{
  "success": false,
  "error": {
    "code": "AUTHORIZATION_ERROR",
    "message": "You don't have permission to perform this action",
    "required_permission": "products.delete",
    "current_permissions": ["products.read", "products.update"]
  }
}
```

#### Not Found Error

```json
{
  "success": false,
  "error": {
    "code": "NOT_FOUND",
    "message": "Product not found",
    "resource_type": "product",
    "resource_id": "uuid"
  }
}
```

---

## Rate Limiting

| Endpoint | Rate Limit | Window |
|----------|-----------|--------|
| `GET /api/v1/*` | 100 requests | 1 minute |
| `POST /api/v1/auth/login` | 5 requests | 5 minutes |
| `POST /api/v1/*` | 50 requests | 1 minute |
| `DELETE /api/v1/*` | 30 requests | 1 minute |

Rate limit headers are included in all responses:

```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1619044800
```

---

## Pagination

List endpoints support pagination using query parameters:

| Parameter | Default | Description |
|-----------|---------|-------------|
| `page` | 1 | Page number (1-based) |
| `limit` | 20 | Items per page (max 100) |
| `sort` | `created_at` | Sort field |
| `order` | `desc` | Sort order (`asc` or `desc`) |

**Example:**
```
GET /api/v1/products?page=2&limit=50&sort=name&order=asc
```

---

## Filtering & Search

### Filter Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `status` | string | Filter by status |
| `category` | string | Filter by category |
| `from` | date | Start date (ISO 8601) |
| `to` | date | End date (ISO 8601) |
| `search` | string | Full-text search |

**Example:**
```
GET /api/v1/orders?status=confirmed&from=2026-04-01&to=2026-04-30
```

---

## OpenAPI Specification

The complete OpenAPI 3.0 specification is available at:

```
GET /api/v1/docs/openapi.yaml
```

Or view the interactive Swagger UI at:

```
GET /api/v1/docs
```

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-04-21 | Initial release |

---

**Last Updated**: 2026-04-21  
**Maintained By**: Engineering Team