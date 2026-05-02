# Coding Agent Implementation Prompt: Phase 9b - Admin Frontend (React 18 + Vite)

> **Version**: 2.0.0  
> **Target Agent**: Cline/GLM 4.6  
> **Service**: Admin Frontend  
> **Framework**: React 18 + Vite + TypeScript  
> **Port**: 8008  
> **Duration Estimate**: 10 weeks  
> **Last Updated**: May 1, 2026

---

## 📋 TABLE OF CONTENTS

1. [Overview & Context](#overview--context)
2. [Tech Stack & Rationale](#tech-stack--rationale)
3. [Architecture & Design Patterns](#architecture--design-patterns)
4. [Implementation Phases](#implementation-phases)
5. [Coding Standards & Best Practices](#coding-standards--best-practices)
6. [Testing Strategy](#testing-strategy)
7. [Performance Optimization](#performance-optimization)
8. [Security Implementation](#security-implementation)
9. [Deployment & Infrastructure](#deployment--infrastructure)
10. [Phase 9a Fixes Required](#phase-9a-fixes-required)
11. [Deliverables Checklist](#deliverables-checklist)

---

## 1. OVERVIEW & CONTEXT

### Project Background

You are implementing **Phase 9b - Admin Frontend** for the Enterprise Marketplace Platform (EMP), a production-grade React 18 + Vite Single Page Application (SPA) that provides comprehensive administrative capabilities.

**Current Status**: 
- Phases 1-8 are COMPLETE (Auth, Product, Inventory, Order, Payment, Notification services)
- Phase 9a: Admin API Service (NestJS 11) - **COMPLETE** (port 8007)
- Phase 9b: Admin Frontend (React 18 + Vite) - **CURRENT TASK**

### Integration Model

**CRITICAL ARCHITECTURAL PRINCIPLE**: The Admin Frontend calls **ONLY** the Admin Backend API (port 8007). The Admin Backend handles all microservice communication internally.

**Architecture Flow:**
```
Admin Frontend (Port 8008)
        ↓
Admin API Service (Port 8007)
        ↓
    Microservices
    ├─ Product Service (8001)
    ├─ Order Service (8002)
    ├─ Inventory Service (8003)
    ├─ Auth Service (8000)
    ├─ Payment Service (8006)
    └─ Notification Service (8004)
```

**Why This Model?**
- **Simplified Frontend**: Single API endpoint, single authentication mechanism
- **Centralized Logic**: Admin Backend handles all business logic and service orchestration
- **Better Security**: No direct microservice exposure to frontend
- **Easier Maintenance**: API changes only need to be made in Admin Backend
- **Consistent Data**: Admin Backend ensures data consistency across services
- **Service-to-Service Auth**: Admin Backend handles service authentication internally
- **Reduced Complexity**: No need for multiple API clients or token management

### Service Specifications

- **Port**: 8008
- **Framework**: React 18 + Vite 5.x
- **Language**: TypeScript 5.x
- **UI Library**: Ant Design 5.x
- **State Management**: Redux Toolkit 2.x
- **Data Fetching**: RTK Query 2.x
- **HTTP Client**: Axios 1.x
- **Testing**: Vitest + React Testing Library + Playwright
- **Build**: Vite (production-optimized)

### Success Criteria

**Functionality:**
- [ ] All 10 core modules implemented (Auth, Dashboard, Products, Orders, Inventory, Customers, Vendors, Content, Reports, Settings)
- [ ] All admin features from Phase 9a API integrated
- [ ] All API calls go through Admin Backend (port 8007)
- [ ] Product approval workflow functional
- [ ] Vendor settlement tracking functional
- [ ] Content/banner management functional
- [ ] Custom report builder functional

**Quality:**
- [ ] 80%+ test coverage (unit, integration, E2E)
- [ ] Performance: < 2s initial load, < 100ms page transitions
- [ ] Lighthouse score > 90
- [ ] Zero console errors in production
- [ ] All TypeScript strict mode enabled

**Infrastructure:**
- [ ] Docker production-ready
- [ ] CI/CD pipeline automated
- [ ] Monitoring and logging set up
- [ ] Error tracking (Sentry) configured

---

## 2. TECH STACK & RATIONALE

### 2.1 Core Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | React | 18.3 | UI framework with concurrent features |
| **Build Tool** | Vite | 5.x | Fast HMR, optimized builds, native ESM |
| **Language** | TypeScript | 5.x | Type safety, excellent DX |
| **Router** | React Router | 6.x | Nested routes, data APIs, code splitting |
| **UI Library** | Ant Design | 5.x | Enterprise-grade components, accessible |
| **State Mgmt** | Redux Toolkit | 2.x | Global state (auth, theme, UI, server state) |
| **Data Fetching** | RTK Query | 2.x | API calls, caching, synchronization |
| **HTTP Client** | Axios | 1.x | Interceptors, cancellation, retry logic |
| **Forms** | React Hook Form | 7.x | Performance, minimal re-renders |
| **Validation** | Zod | 3.x | Type-safe validation (matches backend) |
| **Date Handling** | Day.js | 1.x | Lightweight date library |
| **Charts** | @ant-design/plots | 2.x | Data visualization (G2Plot-based) |
| **Testing** | Vitest + RTL | Latest | Fast, Vite-native testing |
| **E2E** | Playwright | Latest | Cross-browser E2E tests |

### 2.2 Why This Tech Stack?

#### React 18 + Vite
- **React 18**: Concurrent rendering, automatic batching, improved performance
- **Vite**: 10-100x faster HMR than webpack, optimized production builds
- **Combined**: Best developer experience, superior performance

#### Ant Design 5.x
- **Enterprise-Grade**: Used by Alibaba, Tencent, Baidu
- **Comprehensive**: 60+ components covering all admin needs
- **Accessible**: WCAG 2.1 AA compliant out of the box
- **Theming**: Powerful CSS-in-JS theming system
- **Pro Components**: AdvancedTable, Form, List for complex admin UIs
- **TypeScript**: First-class TypeScript support

#### Redux Toolkit + RTK Query (Enterprise-Grade State Management)
- **All-in-One Solution**: Redux Toolkit includes RTK Query for server state
- **Redux Toolkit**: Perfect for global app state (auth, theme, UI)
  - Simplified Redux API (createSlice, configureStore)
  - Immer for immutable updates
  - TypeScript-first design
  - Excellent DevTools with time-travel debugging
  - Proven at massive scale (Meta, Amazon, Netflix)
- **RTK Query**: Integrated server state management
  - Automatic caching and synchronization
  - Optimistic updates
  - Background refetching
  - Loading and error states
  - No separate library needed
- **Industry Standard**: Used by enterprise applications worldwide
- **Middleware Ecosystem**: Redux-logger, Redux-persist, etc.
- **Battle-Tested**: Proven reliability at scale

#### Why Redux Toolkit?
- **Enterprise-Grade**: Used by major tech companies
- **Proven Scalability**: Handles complex state interactions
- **Excellent DevTools**: Time-travel debugging, state inspection
- **Comprehensive Middleware**: Logging, persistence, etc.
- **Industry Standard**: Widely adopted and well-supported
- **Better for Complex Apps**: More control and predictability

### 2.3 State Management Architecture

```
┌─────────────────────────────────────────┐
│         Redux Store (Redux Toolkit)     │
│  • Authentication (user, token, perms)  │
│  • UI (theme, sidebar, modals)          │
│  • Notifications (unread count, list)   │
│  • Products, Orders, Customers, etc.    │
│  • Automatic caching & synchronization  │
│  • Loading & error states               │
│  • Optimistic updates                   │
└─────────────────────────────────────────┘
```

---

## 3. ARCHITECTURE & DESIGN PATTERNS

### 3.1 Design Patterns to Implement

**Pattern 1: Smart vs. Dumb Components**
- **Smart Components (Containers)**: Have state, handle business logic, connect to Redux
- **Dumb Components (Presentational)**: Receive props, render UI only, no business logic

**Pattern 2: Custom Hooks Pattern**
- Encapsulate reusable logic
- Hook naming: `use` prefix (e.g., `useProducts`, `useAuth`)
- Return consistent interface from Redux selectors

**Pattern 3: Service Layer Pattern**
- Centralize API calls in service modules
- One service per domain (product.service.ts, order.service.ts, etc.)
- Use Axios with interceptors for HTTP client
- All services call Admin Backend API

**Pattern 4: Repository Pattern (RTK Query)**
- Use RTK Query as a data repository
- Query keys follow consistent pattern: `['resource', params]`
- Automatic caching, refetching, deduplication

**Pattern 5: Error Boundary Pattern**
- Wrap components with Error Boundaries
- Graceful error handling
- User-friendly error messages

### 3.2 Layered Architecture

```
┌─────────────────────────────────────────┐
│   Presentation Layer (Components)       │
│   • Ant Design Components               │
│   • Custom UI Components                │
│   • Page Components                     │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   State Management Layer (Redux)       │
│   • Redux Store (RTK Query)             │
│   • Slices (auth, ui, products, etc.)   │
│   • API Slices (RTK Query)              │
│   • Caching & Synchronization           │
│   • Loading/Error States                │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Service Layer (Axios)                 │
│   • API Client                          │
│   • Request/Response Interceptors       │
│   • Error Handling                      │
│   • Token Management                    │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│   Backend Service                       │
│   • Admin API (8007)                    │
│   (Handles all microservice calls)      │
└─────────────────────────────────────────┘
```

### 3.3 Directory Structure (MANDATORY)

```
apps/web/
├── public/                          # Static assets
│   ├── favicon.ico
│   └── logo.svg
├── src/
│   ├── api/                        # API client & configurations
│   │   ├── client.ts               # Axios instance setup
│   │   ├── interceptors.ts         # Request/response interceptors
│   │   ├── endpoints.ts            # API endpoint definitions
│   │   └── services/               # Service-specific API calls
│   │       ├── admin.service.ts    # Admin API calls
│   │       ├── product.service.ts  # Product API calls (via Admin)
│   │       ├── order.service.ts    # Order API calls (via Admin)
│   │       ├── inventory.service.ts
│   │       ├── customer.service.ts
│   │       └── payment.service.ts
│   ├── components/                 # Reusable components
│   │   ├── common/                # Shared components
│   │   │   ├── Button/
│   │   │   ├── Modal/
│   │   │   ├── DataTable/
│   │   │   ├── ProtectedRoute.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── dashboard/             # Dashboard components
│   │   ├── products/              # Product components
│   │   ├── orders/                # Order components
│   │   ├── inventory/             # Inventory components
│   │   ├── customers/             # Customer components
│   │   ├── vendors/               # Vendor components
│   │   ├── content/               # Content components
│   │   └── reports/               # Report components
│   ├── layouts/                   # Layout components
│   │   ├── MainLayout.tsx
│   │   ├── AuthLayout.tsx
│   │   └── components/
│   │       ├── Sidebar.tsx
│   │       ├── Header.tsx
│   │       ├── Footer.tsx
│   │       └── Breadcrumb.tsx
│   ├── pages/                     # Page components
│   │   ├── auth/
│   │   ├── dashboard/
│   │   ├── products/
│   │   ├── orders/
│   │   ├── inventory/
│   │   ├── customers/
│   │   ├── vendors/
│   │   ├── content/
│   │   ├── reports/
│   │   └── settings/
│   ├── hooks/                     # Custom React hooks
│   │   ├── useAuth.ts
│   │   ├── usePermission.ts
│   │   ├── useToast.ts
│   │   ├── useModal.ts
│   │   └── useDebounce.ts
│   ├── store/                     # Redux store
│   │   ├── index.ts               # Store configuration
│   │   ├── slices/                # Redux slices
│   │   │   ├── authSlice.ts
│   │   │   ├── uiSlice.ts
│   │   │   └── notificationSlice.ts
│   │   └── api/                   # RTK Query API slices
│   │       ├── apiSlice.ts        # Base API configuration
│   │       ├── productsApi.ts
│   │       ├── ordersApi.ts
│   │       ├── inventoryApi.ts
│   │       ├── customersApi.ts
│   │       ├── vendorsApi.ts
│   │       ├── reportsApi.ts
│   │       └── adminApi.ts
│   ├── types/                     # TypeScript types
│   │   ├── api.types.ts
│   │   ├── auth.types.ts
│   │   ├── product.types.ts
│   │   ├── order.types.ts
│   │   ├── inventory.types.ts
│   │   ├── customer.types.ts
│   │   ├── vendor.types.ts
│   │   ├── report.types.ts
│   │   └── index.ts
│   ├── utils/                     # Utility functions
│   │   ├── formatters.ts          # Date, currency formatters
│   │   ├── validators.ts          # Custom validators
│   │   ├── constants.ts           # App constants
│   │   ├── errorHandler.ts        # API error handler
│   │   └── helpers.ts             # Helper functions
│   ├── config/                    # Configuration
│   │   ├── app.config.ts          # App configuration
│   │   ├── theme.config.ts        # Ant Design theme
│   │   └── routes.config.ts       # Route configuration
│   ├── context/                   # React contexts (if needed)
│   ├── App.tsx                    # Root component
│   ├── main.tsx                   # Application entry point
│   └── vite-env.d.ts              # Vite type definitions
├── tests/                         # Test files
│   ├── unit/                     # Unit tests
│   ├── integration/              # Integration tests
│   └── e2e/                      # E2E tests (Playwright)
├── .env                           # Environment variables
├── .env.example                  # Environment variables template
├── .eslintrc.cjs                 # ESLint configuration
├── .prettierrc                   # Prettier configuration
├── docker-compose.yml             # Docker configuration
├── Dockerfile                     # Docker image
├── nginx.conf                     # Nginx configuration
├── package.json                   # Dependencies
├── tsconfig.json                  # TypeScript configuration
├── tsconfig.node.json             # TypeScript config for Node
├── vite.config.ts                 # Vite configuration
├── index.html                     # HTML entry point
└── README.md                      # Documentation
```

### 3.4 Component Architecture Patterns

**Smart Component Example:**
```typescript
// src/components/products/ProductTable/index.tsx
import { useSelector, useDispatch } from 'react-redux';
import { selectProducts, fetchProducts } from '@/store/api/productsApi';
import { deleteProduct } from '@/store/api/productsApi';
import { useNavigate } from 'react-router-dom';

export function ProductTable() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { data, isLoading, error } = useSelector(selectProducts);
  
  useEffect(() => {
    dispatch(fetchProducts({ page: 1, limit: 10 }));
  }, [dispatch]);
  
  if (isLoading) return <Spin size="large" />;
  if (error) return <Alert type="error" message={error.message} />;
  
  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Price',
      dataIndex: 'price',
      key: 'price',
      render: (price: number) => formatCurrency(price),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_, record: Product) => (
        <Space>
          <Button 
            type="link" 
            onClick={() => navigate(`/products/${record.id}`)}
          >
            View
          </Button>
          <Button 
            type="link" 
            danger 
            onClick={() => dispatch(deleteProduct(record.id))}
          >
            Delete
          </Button>
        </Space>
      ),
    },
  ];
  
  return (
    <Table
      dataSource={data?.items}
      columns={columns}
      rowKey="id"
      pagination={{
        total: data?.total,
        pageSize: 10,
        onChange: (page) => dispatch(fetchProducts({ page, limit: 10 })),
      }}
    />
  );
}
```

**Dumb Component Example:**
```typescript
// src/components/products/ProductCard/index.tsx
interface ProductCardProps {
  product: Product;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProductCard({ product, onEdit, onDelete }: ProductCardProps) {
  return (
    <Card
      hoverable
      cover={<img alt={product.name} src={product.imageUrl} />}
      actions={[
        <Button 
          type="text" 
          icon={<EditOutlined />} 
          onClick={() => onEdit(product.id)}
        >
          Edit
        </Button>,
        <Button 
          type="text" 
          danger 
          icon={<DeleteOutlined />} 
          onClick={() => onDelete(product.id)}
        >
          Delete
        </Button>,
      ]}
    >
      <Card.Meta
        title={product.name}
        description={product.description}
      />
      <div style={{ marginTop: 16 }}>
        <Statistic
          title="Price"
          value={product.price}
          prefix="$"
          precision={2}
        />
      </div>
    </Card>
  );
}
```

---

## 4. IMPLEMENTATION PHASES

### PHASE 1: FOUNDATION SETUP (Week 1)

**Week 1, Day 1-2: Project Initialization**

```bash
# Navigate to apps directory
cd /Applications/MAMP/htdocs/micro-ecom/apps

# Create Vite project with React + TypeScript
npm create vite@latest web -- --template react-ts

# Navigate into project
cd web

# Install core dependencies
npm install react@^18.3.1 react-dom@^18.3.1
npm install react-router-dom@^6.22.0
npm install antd@^5.14.0 @ant-design/icons@^5.2.6
npm install @reduxjs/toolkit@^2.0.0
npm install react-redux@^9.0.0
npm install axios@^1.6.5
npm install react-hook-form@^7.49.3
npm install zod@^3.22.4
npm install @hookform/resolvers@^3.3.2
npm install dayjs@^1.11.10
npm install @ant-design/plots@^2.0.0
npm install redux-persist@^6.0.0
npm install redux-logger@^3.0.6

# Install development dependencies
npm install -D @types/react@^18.2.48
npm install -D @types/react-dom@^18.2.18
npm install -D @typescript-eslint/eslint-plugin@^6.19.0
npm install -D @typescript-eslint/parser@^6.19.0
npm install -D eslint@^8.56.0
npm install -D eslint-plugin-react-hooks@^4.6.0
npm install -D eslint-plugin-react-refresh@^0.4.5
npm install -D prettier@^3.2.4
npm install -D @vitejs/plugin-react@^4.2.1
npm install -D vitest@^1.2.0
npm install -D @testing-library/react@^14.2.0
npm install -D @testing-library/jest-dom@^6.1.6
npm install -D @testing-library/user-event@^14.5.2
npm install -D msw@^2.1.3
npm install -D @playwright/test@^1.41.0
npm install -D husky@^9.0.10
npm install -D lint-staged@^15.2.0
npm install -D @types/node@^20.11.5
```

**Week 1, Day 3-4: Configuration Setup**

```typescript
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  },
  "include": ["src"],
  "references": [{ "path": "./tsconfig.node.json" }]
}

// vite.config.ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 8008,
    proxy: {
      '/api': {
        target: 'http://localhost:8007',
        changeOrigin: true,
      },
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom', 'react-router-dom', 'react-redux'],
          'redux-vendor': ['@reduxjs/toolkit', 'redux-persist', 'redux-logger'],
          'antd-vendor': ['antd', '@ant-design/icons', '@ant-design/plots'],
          'utils': ['dayjs', 'axios'],
        },
      },
    },
    chunkSizeWarningLimit: 1000,
  },
});

// .eslintrc.cjs
module.exports = {
  root: true,
  env: { browser: true, es2020: true },
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', '.eslintrc.cjs'],
  parser: '@typescript-eslint/parser',
  plugins: ['react-refresh'],
  rules: {
    'react-refresh/only-export-components': [
      'warn',
      { allowConstantExport: true },
    ],
  },
};

// .prettierrc
{
  "semi": true,
  "singleQuote": true,
  "tabWidth": 2,
  "trailingComma": "es5",
  "printWidth": 100,
  "arrowParens": "avoid"
}

// package.json - Add scripts
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "lint": "eslint . --ext ts,tsx --report-unused-disable-directives --max-warnings 0",
    "preview": "vite preview",
    "test:unit": "vitest",
    "test:e2e": "playwright test",
    "format": "prettier --write \"src/**/*.{ts,tsx,css}\"",
    "prepare": "husky install"
  }
}
```

**Week 1, Day 5: Directory Structure Creation**

Create the complete directory structure as specified in Section 3.3.

### PHASE 2: CORE INFRASTRUCTURE (Week 2)

**Task 2.1: Axios Client with Interceptors**

```typescript
// src/api/client.ts
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8007/api/v1';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 30000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors() {
    // Request interceptor: Add auth token
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = localStorage.getItem('access_token');
        if (token && config.headers) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error: AxiosError) => Promise.reject(error)
    );

    // Response interceptor: Handle errors and token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Token expired, try to refresh
        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            const response = await axios.post(`${API_BASE_URL}/auth/refresh`, {
              refreshToken,
            });

            const { access_token, refresh_token } = response.data;
            localStorage.setItem('access_token', access_token);
            localStorage.setItem('refresh_token', refresh_token);

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }
            return this.client(originalRequest);
          } catch (refreshError) {
            // Refresh failed, logout user
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
            return Promise.reject(refreshError);
          }
        }

        return Promise.reject(error);
      }
    );
  }

  public getInstance(): AxiosInstance {
    return this.client;
  }
}

export const apiClient = new ApiClient().getInstance();
```

**Task 2.2: API Endpoint Configuration**

```typescript
// src/api/endpoints.ts
export const API_ENDPOINTS = {
  // All endpoints go through Admin Backend
  AUTH: {
    LOGIN: '/auth/login',
    LOGOUT: '/auth/logout',
    REFRESH: '/auth/refresh',
    VERIFY_2FA: '/auth/verify-2fa',
    ENABLE_2FA: '/auth/enable-2fa',
    ME: '/auth/me',
  },
  DASHBOARD: {
    KPIS: '/dashboard/kpis',
    GRAPHS: '/dashboard/graphs',
    ALERTS: '/dashboard/alerts',
    QUICK_ACTIONS: '/dashboard/quick-actions',
  },
  PRODUCTS: {
    LIST: '/products',
    DETAIL: (id: string) => `/products/${id}`,
    CREATE: '/products',
    UPDATE: (id: string) => `/products/${id}`,
    DELETE: (id: string) => `/products/${id}`,
    SEARCH: '/products/search',
    CATEGORIES: '/categories',
    APPROVALS: '/products/approvals',
    APPROVE: (id: string) => `/products/${id}/approve`,
    REJECT: (id: string) => `/products/${id}/reject`,
  },
  ORDERS: {
    LIST: '/orders',
    DETAIL: (id: string) => `/orders/${id}`,
    UPDATE_STATUS: (id: string) => `/orders/${id}/status`,
    CUSTOMER: (customerId: string) => `/orders/customer/${customerId}`,
  },
  INVENTORY: {
    LIST: '/inventory',
    DETAIL: (id: string) => `/inventory/${id}`,
    SKU: (sku: string) => `/inventory/sku/${sku}`,
    ALERTS: '/inventory/alerts',
    ADJUST: (id: string) => `/inventory/${id}/adjust`,
    BULK_ADJUST: '/inventory/bulk-adjust',
  },
  CUSTOMERS: {
    LIST: '/customers',
    DETAIL: (id: string) => `/customers/${id}`,
    SEARCH: '/customers/search',
    BLOCK: (id: string) => `/customers/${id}/block`,
    UNBLOCK: (id: string) => `/customers/${id}/unblock`,
    ANALYTICS: (id: string) => `/customers/${id}/analytics`,
  },
  VENDORS: {
    LIST: '/vendors',
    DETAIL: (id: string) => `/vendors/${id}`,
    PERFORMANCE: (id: string) => `/vendors/${id}/performance`,
    SETTLEMENTS: '/vendors/settlements',
    PROCESS_SETTLEMENT: (id: string) => `/vendors/settlements/${id}/process`,
  },
  CONTENT: {
    BANNERS: '/banners',
    CREATE_BANNER: '/banners',
    UPDATE_BANNER: (id: string) => `/banners/${id}`,
    DELETE_BANNER: (id: string) => `/banners/${id}`,
    TOGGLE_BANNER: (id: string) => `/banners/${id}/toggle`,
  },
  REPORTS: {
    SALES: '/reports/sales',
    REVENUE: '/reports/revenue',
    PRODUCTS: '/reports/products',
    CUSTOMERS: '/reports/customers',
    CUSTOM: '/reports/custom',
    SAVE: '/reports/save',
    SAVED: '/reports/saved',
    EXPORT: (id: string) => `/reports/${id}/export`,
  },
  AUDIT: {
    LOGS: '/audit/logs',
    EXPORT: '/audit/logs/export',
  },
  ADMIN: {
    USERS: '/admins',
    CREATE_USER: '/admins',
    UPDATE_USER: (id: string) => `/admins/${id}`,
    DELETE_USER: (id: string) => `/admins/${id}`,
  },
  ROLES: {
    LIST: '/roles',
    CREATE: '/roles',
    UPDATE: (id: string) => `/roles/${id}`,
    DELETE: (id: string) => `/roles/${id}`,
  },
};
```

**Task 2.3: Redux Store Configuration**

```typescript
// src/store/index.ts
import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { apiSlice } from './api/apiSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';

// Persist config for auth slice
const authPersistConfig = {
  key: 'auth',
  storage,
  whitelist: ['user', 'token', 'refreshToken', 'permissions', 'isAuthenticated'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

export const store = configureStore({
  reducer: {
    [apiSlice.reducerPath]: apiSlice.reducer,
    auth: persistedAuthReducer,
    ui: uiReducer,
    notifications: notificationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }).concat(
      apiSlice.middleware,
      // Add redux-logger only in development
      process.env.NODE_ENV !== 'production' ? require('redux-logger').default : () => (next) => (action) => next(action)
    ),
  devTools: process.env.NODE_ENV !== 'production',
});

setupListeners(store.dispatch);

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
```

**Task 2.4: Redux Slices**

```typescript
// src/store/slices/authSlice.ts
import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { apiClient } from '@/api/client';
import { API_ENDPOINTS } from '@/api/endpoints';
import { AdminUser, LoginCredentials } from '@/types';

interface AuthState {
  user: AdminUser | null;
  token: string | null;
  refreshToken: string | null;
  permissions: string[];
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: null,
  refreshToken: null,
  permissions: [],
  isAuthenticated: false,
  isLoading: false,
  error: null,
};

export const loginAsync = createAsyncThunk(
  'auth/login',
  async (credentials: LoginCredentials) => {
    const response = await apiClient.post(API_ENDPOINTS.AUTH.LOGIN, credentials);
    return response.data;
  }
);

export const logoutAsync = createAsyncThunk('auth/logout', async () => {
  await apiClient.post(API_ENDPOINTS.AUTH.LOGOUT);
});

export const fetchMeAsync = createAsyncThunk('auth/fetchMe', async () => {
  const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
  return response.data;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setToken: (state, action: PayloadAction<{ token: string; refreshToken: string }>) => {
      state.token = action.payload.token;
      state.refreshToken = action.payload.refreshToken;
    },
  },
  extraReducers: (builder) => {
    builder
      // Login
      .addCase(loginAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(loginAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.token = action.payload.access_token;
        state.refreshToken = action.payload.refresh_token;
        state.permissions = action.payload.user.permissions || [];
        state.isAuthenticated = true;
        localStorage.setItem('access_token', action.payload.access_token);
        localStorage.setItem('refresh_token', action.payload.refresh_token);
      })
      .addCase(loginAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Login failed';
      })
      // Logout
      .addCase(logoutAsync.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.refreshToken = null;
        state.permissions = [];
        state.isAuthenticated = false;
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
      })
      // Fetch Me
      .addCase(fetchMeAsync.fulfilled, (state, action) => {
        state.user = action.payload;
        state.permissions = action.payload.permissions || [];
        state.isAuthenticated = true;
      });
  },
});

export const { clearError, setToken } = authSlice.actions;
export default authSlice.reducer;
```

```typescript
// src/store/slices/uiSlice.ts
import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UIState {
  theme: 'light' | 'dark';
  sidebarCollapsed: boolean;
  currentRoute: string;
  loading: boolean;
}

const initialState: UIState = {
  theme: 'light',
  sidebarCollapsed: false,
  currentRoute: '/dashboard',
  loading: false,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setTheme: (state, action: PayloadAction<'light' | 'dark'>) => {
      state.theme = action.payload;
    },
    toggleSidebar: (state) => {
      state.sidebarCollapsed = !state.sidebarCollapsed;
    },
    setCurrentRoute: (state, action: PayloadAction<string>) => {
      state.currentRoute = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
  },
});

export const { setTheme, toggleSidebar, setCurrentRoute, setLoading } = uiSlice.actions;
export default uiSlice.reducer;
```

```typescript
// src/store/slices/notificationSlice.ts
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { apiClient } from '@/api/client';
import { Notification } from '@/types';

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
}

const initialState: NotificationState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
};

export const fetchNotificationsAsync = createAsyncThunk(
  'notifications/fetch',
  async () => {
    const response = await apiClient.get('/notifications');
    return response.data;
  }
);

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    markAsRead: (state, action) => {
      const notification = state.notifications.find((n) => n.id === action.payload);
      if (notification) {
        notification.read = true;
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },
    markAllAsRead: (state) => {
      state.notifications.forEach((n) => (n.read = true));
      state.unreadCount = 0;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotificationsAsync.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotificationsAsync.fulfilled, (state, action) => {
        state.isLoading = false;
        state.notifications = action.payload.items;
        state.unreadCount = action.payload.unreadCount;
      })
      .addCase(fetchNotificationsAsync.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch notifications';
      });
  },
});

export const { markAsRead, markAllAsRead } = notificationSlice.actions;
export default notificationSlice.reducer;
```

**Task 2.5: RTK Query API Slice Configuration**

```typescript
// src/store/api/apiSlice.ts
import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const baseQuery = fetchBaseQuery({
  baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8007/api/v1',
  prepareHeaders: (headers, { getState }) => {
    const token = (getState() as any).auth.token;
    if (token) {
      headers.set('authorization', `Bearer ${token}`);
    }
    return headers;
  },
});

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery,
  tagTypes: [
    'Products',
    'Orders',
    'Inventory',
    'Customers',
    'Vendors',
    'Banners',
    'Reports',
    'Admins',
    'Roles',
    'Dashboard',
    'Notifications',
  ],
  endpoints: () => ({}),
});
```

**Task 2.6: Products API Slice (RTK Query)**

```typescript
// src/store/api/productsApi.ts
import { apiSlice } from './apiSlice';
import { API_ENDPOINTS } from '@/api/endpoints';
import { Product, ProductListParams, CreateProductDto, UpdateProductDto } from '@/types';

interface ProductListResponse {
  items: Product[];
  total: number;
}

export const productsApi = apiSlice.injectEndpoints({
  endpoints: (builder) => ({
    getProducts: builder.query<ProductListResponse, ProductListParams>({
      query: (params) => ({
        url: API_ENDPOINTS.PRODUCTS.LIST,
        params,
      }),
      providesTags: (result) =>
        result
          ? [
              ...result.items.map(({ id }) => ({ type: 'Products' as const, id })),
              { type: 'Products', id: 'LIST' },
            ]
          : [{ type: 'Products', id: 'LIST' }],
    }),

    getProduct: builder.query<Product, string>({
      query: (id) => API_ENDPOINTS.PRODUCTS.DETAIL(id),
      providesTags: (result, error, id) => [{ type: 'Products', id }],
    }),

    createProduct: builder.mutation<Product, CreateProductDto>({
      query: (data) => ({
        url: API_ENDPOINTS.PRODUCTS.CREATE,
        method: 'POST',
        body: data,
      }),
      invalidatesTags: [{ type: 'Products', id: 'LIST' }],
    }),

    updateProduct: builder.mutation<Product, { id: string; data: UpdateProductDto }>({
      query: ({ id, data }) => ({
        url: API_ENDPOINTS.PRODUCTS.UPDATE(id),
        method: 'PATCH',
        body: data,
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Products', id },
        { type: 'Products', id: 'LIST' },
      ],
    }),

    deleteProduct: builder.mutation<void, string>({
      query: (id) => ({
        url: API_ENDPOINTS.PRODUCTS.DELETE(id),
        method: 'DELETE',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Products', id },
        { type: 'Products', id: 'LIST' },
      ],
    }),

    searchProducts: builder.query<Product[], string>({
      query: (query) => ({
        url: API_ENDPOINTS.PRODUCTS.SEARCH,
        params: { q: query },
      }),
    }),

    getCategories: builder.query<any[], void>({
      query: () => API_ENDPOINTS.PRODUCTS.CATEGORIES,
    }),

    approveProduct: builder.mutation<Product, string>({
      query: (id) => ({
        url: API_ENDPOINTS.PRODUCTS.APPROVE(id),
        method: 'POST',
      }),
      invalidatesTags: (result, error, id) => [
        { type: 'Products', id },
        { type: 'Products', id: 'LIST' },
      ],
    }),

    rejectProduct: builder.mutation<Product, { id: string; reason: string }>({
      query: ({ id, reason }) => ({
        url: API_ENDPOINTS.PRODUCTS.REJECT(id),
        method: 'POST',
        body: { reason },
      }),
      invalidatesTags: (result, error, { id }) => [
        { type: 'Products', id },
        { type: 'Products', id: 'LIST' },
      ],
    }),
  }),
});

export const {
  useGetProductsQuery,
  useGetProductQuery,
  useCreateProductMutation,
  useUpdateProductMutation,
  useDeleteProductMutation,
  useSearchProductsQuery,
  useGetCategoriesQuery,
  useApproveProductMutation,
  useRejectProductMutation,
} = productsApi;
```

**Task 2.7: Error Handler**

```typescript
// src/utils/errorHandler.ts
import { message } from 'antd';

export const handleApiError = (error: any) => {
  console.error('API Error:', error);

  if (error.response) {
    // Server responded with error status
    const { status, data } = error.response;

    switch (status) {
      case 400:
        message.error(data.message || 'Invalid request');
        break;
      case 401:
        message.error('Unauthorized. Please login again.');
        // Redirect to login
        window.location.href = '/login';
        break;
      case 403:
        message.error('Access denied. You do not have permission.');
        break;
      case 404:
        message.error('Resource not found');
        break;
      case 429:
        message.error('Too many requests. Please try again later.');
        break;
      case 500:
        message.error('Server error. Please try again later.');
        break;
      default:
        message.error(data.message || 'An error occurred');
    }
  } else if (error.request) {
    // Request made but no response received
    message.error('Network error. Please check your connection.');
  } else {
    // Error in request setup
    message.error('An error occurred. Please try again.');
  }

  return Promise.reject(error);
};
```

### PHASE 3: AUTHENTICATION SYSTEM (Week 3)

**Task 3.1: Login Page**

```typescript
// src/pages/auth/LoginPage.tsx
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Form, Input, Button, Card, Checkbox, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { useAppDispatch, useAppSelector } from '@/store';
import { loginAsync, selectAuthLoading, selectAuthError, clearError } from '@/store/slices/authSlice';
import { LoginCredentials } from '@/types';

export function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const isLoading = useAppSelector(selectAuthLoading);
  const error = useAppSelector(selectAuthError);
  const [form] = Form.useForm();

  const from = (location.state as any)?.from?.pathname || '/dashboard';

  const onFinish = async (values: LoginCredentials) => {
    try {
      const result = await dispatch(loginAsync(values)).unwrap();
      message.success('Login successful');
      navigate(from, { replace: true });
    } catch (error: any) {
      message.error(error.response?.data?.message || 'Login failed');
    }
  };

  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    }}>
      <Card
        title="Admin Portal"
        style={{ width: 400, boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
      >
        <Form
          form={form}
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          layout="vertical"
        >
          <Form.Item
            name="email"
            rules={[{ required: true, message: 'Please input your email!' }]}
          >
            <Input
              prefix={<UserOutlined />}
              placeholder="Email"
              size="large"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: 'Please input your password!' }]}
          >
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="Password"
              size="large"
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>Remember me</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              block
              size="large"
              loading={isLoading}
            >
              Log in
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
```

**Task 3.2: Protected Route Component**

```typescript
// src/components/common/ProtectedRoute.tsx
import { Navigate, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useAppSelector } from '@/store';
import { selectIsAuthenticated } from '@/store/slices/authSlice';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
}
```

**Task 3.3: Permission Hook**

```typescript
// src/hooks/usePermission.ts
import { useAppSelector } from '@/store';
import { selectUser } from '@/store/slices/authSlice';

export function usePermission() {
  const user = useAppSelector(selectUser);

  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'super_admin') return true;
    return user.permissions?.includes(permission) || false;
  };

  const hasAnyPermission = (permissions: string[]): boolean => {
    return permissions.some((p) => hasPermission(p));
  };

  const hasAllPermissions = (permissions: string[]): boolean => {
    return permissions.every((p) => hasPermission(p));
  };

  return { hasPermission, hasAnyPermission, hasAllPermissions };
}
```

### PHASE 4: LAYOUT & NAVIGATION (Week 4)

**Task 4.1: Main Layout**

```typescript
// src/layouts/MainLayout.tsx
import { Layout } from 'antd';
import { Outlet } from 'react-router-dom';
import { useAppSelector } from '@/store';
import { selectTheme, selectSidebarCollapsed } from '@/store/slices/uiSlice';
import Sidebar from './components/Sidebar';
import Header from './components/Header';

const { Content } = Layout;

export function MainLayout() {
  const theme = useAppSelector(selectTheme);
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sidebar />
      <Layout>
        <Header />
        <Content
          style={{
            margin: '24px 16px',
            padding: 24,
            minHeight: 280,
            background: theme === 'dark' ? '#141414' : '#f0f2f5',
          }}
        >
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
```

**Task 4.2: Sidebar Component**

```typescript
// src/layouts/components/Sidebar.tsx
import { Layout, Menu } from 'antd';
import {
  DashboardOutlined,
  ShoppingOutlined,
  ShoppingCartOutlined,
  InboxOutlined,
  UserOutlined,
  TeamOutlined,
  FileTextOutlined,
  SettingOutlined,
  BarsOutlined,
} from '@ant-design/icons';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import { toggleSidebar, selectSidebarCollapsed } from '@/store/slices/uiSlice';

const { Sider } = Layout;

export function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const sidebarCollapsed = useAppSelector(selectSidebarCollapsed);

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: 'Dashboard',
    },
    {
      key: '/products',
      icon: <ShoppingOutlined />,
      label: 'Products',
    },
    {
      key: '/orders',
      icon: <ShoppingCartOutlined />,
      label: 'Orders',
    },
    {
      key: '/inventory',
      icon: <InboxOutlined />,
      label: 'Inventory',
    },
    {
      key: '/customers',
      icon: <UserOutlined />,
      label: 'Customers',
    },
    {
      key: '/vendors',
      icon: <TeamOutlined />,
      label: 'Vendors',
    },
    {
      key: '/content',
      icon: <BarsOutlined />,
      label: 'Content',
    },
    {
      key: '/reports',
      icon: <FileTextOutlined />,
      label: 'Reports',
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: 'Settings',
    },
  ];

  return (
    <Sider
      collapsible
      collapsed={sidebarCollapsed}
      onCollapse={() => dispatch(toggleSidebar())}
      theme="dark"
      width={240}
    >
      <div style={{
        height: 64,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#001529',
        color: '#fff',
        fontSize: 20,
        fontWeight: 'bold',
      }}>
        {sidebarCollapsed ? 'EMP' : 'Admin Portal'}
      </div>
      <Menu
        theme="dark"
        mode="inline"
        selectedKeys={[location.pathname]}
        items={menuItems}
        onClick={({ key }) => navigate(key)}
      />
    </Sider>
  );
}
```

**Task 4.3: Header Component**

```typescript
// src/layouts/components/Header.tsx
import { Layout, Space, Dropdown, Badge, Button, Avatar } from 'antd';
import {
  BellOutlined,
  UserOutlined,
  LogoutOutlined,
  MoonOutlined,
  SunOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '@/store';
import {
  setTheme,
  selectTheme,
} from '@/store/slices/uiSlice';
import {
  selectUser,
  logoutAsync,
} from '@/store/slices/authSlice';
import { selectUnreadCount } from '@/store/slices/notificationSlice';

const { Header: AntHeader } = Layout;

export function Header() {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const theme = useAppSelector(selectTheme);
  const user = useAppSelector(selectUser);
  const unreadCount = useAppSelector(selectUnreadCount);

  const handleLogout = async () => {
    await dispatch(logoutAsync()).unwrap();
    navigate('/login');
  };

  const userMenuItems = [
    {
      key: 'profile',
      label: 'Profile',
      icon: <UserOutlined />,
      onClick: () => navigate('/settings/profile'),
    },
    {
      key: 'logout',
      label: 'Logout',
      icon: <LogoutOutlined />,
      onClick: handleLogout,
    },
  ];

  return (
    <AntHeader
      style={{
        background: '#fff',
        padding: '0 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 1px 4px rgba(0,21,41,0.08)',
      }}
    >
      <div />
      <Space size="large">
        <Button
          type="text"
          icon={theme === 'light' ? <MoonOutlined /> : <SunOutlined />}
          onClick={() => dispatch(setTheme(theme === 'light' ? 'dark' : 'light'))}
        />
        <Badge count={unreadCount} offset={[-5, 5]}>
          <Button type="text" icon={<BellOutlined />} onClick={() => navigate('/notifications')} />
        </Badge>
        <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
          <Space style={{ cursor: 'pointer' }}>
            <Avatar icon={<UserOutlined />} />
            <span>{user?.name}</span>
          </Space>
        </Dropdown>
      </Space>
    </AntHeader>
  );
}
```

### PHASE 5-10: CONTINUE SIMILAR IMPLEMENTATION

Continue implementing the remaining phases following the same patterns:

**Phase 5: Dashboard** (Week 5)
- Dashboard page with KPIs
- Revenue and order charts
- Top products and recent orders tables
- Alerts center

**Phase 6: Product Management** (Week 6)
- Product list, detail, and form pages
- Product approval workflow
- Bulk operations
- Image upload

**Phase 7: Order Management** (Week 7)
- Order list and detail pages
- Order status updates
- Order filtering and export

**Phase 8: Inventory & Customers** (Week 8)
- Inventory management pages
- Stock adjustment functionality
- Customer management pages
- Customer analytics

**Phase 9: Vendors, Content & Reports** (Week 9)
- Vendor management pages
- Settlement tracking
- Content/banner management
- Report pages with custom builder

**Phase 10: Settings, Testing & Deployment** (Week 10)
- Settings pages (admin users, roles, audit logs)
- Comprehensive testing
- Performance optimization
- Production deployment

---

## 5. CODING STANDARDS & BEST PRACTICES

[Same as before - TypeScript, React, naming conventions, component structure, error handling, code organization]

---

## 6. TESTING STRATEGY

[Same as before - Unit tests, integration tests, E2E tests, coverage targets]

---

## 7. PERFORMANCE OPTIMIZATION

[Same as before - Code splitting, bundle optimization, performance targets]

---

## 8. SECURITY IMPLEMENTATION

[Same as before - Authentication flow, security best practices]

---

## 9. DEPLOYMENT & INFRASTRUCTURE

### 9.1 Docker Configuration

```dockerfile
# Dockerfile
FROM node:22-alpine AS build

WORKDIR /app

# Install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy source code
COPY . .

# Build application
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
```

### 9.2 Docker Compose

```yaml
# docker-compose.yml
version: '3.8'

services:
  admin-frontend:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8008:80"
    environment:
      - NODE_ENV=production
      # All API calls go through Admin Backend
      - VITE_API_BASE_URL=http://admin-service:8007/api/v1
    depends_on:
      - admin-service
    networks:
      - emp-network
    restart: unless-stopped

networks:
  emp-network:
    external: true
```

### 9.3 Environment Configuration

```bash
# .env.production
# All API calls go through Admin Backend
VITE_API_BASE_URL=https://api.example.com/api/v1

VITE_SENTRY_DSN=https://xxx@sentry.io/xxx
VITE_ENABLE_ANALYTICS=true
```

---

## 10. PHASE 9A FIXES REQUIRED

No fixes required in Phase 9b. The Admin Backend (Phase 9a) handles all microservice communication internally, so the Admin Frontend only needs to call the Admin Backend API.

If there are any issues with the Admin Backend, they should be addressed in the Admin Backend service itself, not in the frontend.

---

## 11. DELIVERABLES CHECKLIST

[Same checklist structure as before, but updated to reflect Redux Toolkit and single API architecture]

### Phase 1: Foundation Setup (Week 1)
- [ ] Vite project initialized with React + TypeScript
- [ ] All dependencies installed (including Redux Toolkit)
- [ ] TypeScript configuration (strict mode)
- [ ] ESLint and Prettier configured
- [ ] Directory structure created
- [ ] Git hooks configured (Husky + lint-staged)
- [ ] Environment variables configured
- [ ] Docker development environment set up
- [ ] Build and dev server verified

### Phase 2: Core Infrastructure (Week 2)
- [ ] Axios client with interceptors
- [ ] API endpoint configuration (Admin Backend only)
- [ ] Redux store configuration
- [ ] Redux slices (auth, UI, notifications)
- [ ] RTK Query API slice configuration
- [ ] Products API slice
- [ ] Protected route component
- [ ] Error handling utilities
- [ ] Permission hook

### Phase 3: Authentication System (Week 3)
- [ ] Login page with form validation
- [ ] 2FA verification page
- [ ] JWT token management
- [ ] Protected routes with auth guard
- [ ] Logout functionality
- [ ] Session persistence
- [ ] Token refresh logic

### Phase 4: Layout & Navigation (Week 4)
- [ ] Main layout component
- [ ] Sidebar with navigation
- [ ] Header with notifications
- [ ] User menu with profile and logout
- [ ] Theme switcher (light/dark)
- [ ] Breadcrumb navigation
- [ ] Responsive design

### Phase 5: Dashboard (Week 5)
- [ ] Dashboard page layout
- [ ] KPI cards component
- [ ] Revenue chart component
- [ ] Order trend chart component
- [ ] Top products table
- [ ] Recent orders table
- [ ] Alerts center component
- [ ] Real-time updates (polling)

### Phase 6: Product Management (Week 6)
- [ ] Product list page with filters
- [ ] Product detail page
- [ ] Product create/edit form
- [ ] Product approval workflow
- [ ] Bulk operations
- [ ] Image upload to S3/MinIO
- [ ] Product search functionality

### Phase 7: Order Management (Week 7)
- [ ] Order list page with filters
- [ ] Order detail page
- [ ] Order status update functionality
- [ ] Order filtering and search
- [ ] Export to CSV/PDF
- [ ] Customer order history
- [ ] Order analytics

### Phase 8: Inventory & Customers (Week 8)
- [ ] Inventory list page
- [ ] Stock adjustment functionality
- [ ] Low stock alerts
- [ ] Customer list page
- [ ] Customer detail page
- [ ] Customer analytics (CLV, AOV)
- [ ] Customer blocking functionality

### Phase 9: Vendors, Content & Reports (Week 9)
- [ ] Vendor list page
- [ ] Vendor detail page
- [ ] Vendor performance metrics
- [ ] Settlement tracking
- [ ] Content/banner management
- [ ] Report pages (sales, revenue, products, customers)
- [ ] Custom report builder
- [ ] Export to CSV/PDF

### Phase 10: Settings, Testing & Deployment (Week 10)
- [ ] Settings pages (admin users, roles, audit logs)
- [ ] Audit log viewer
- [ ] System health status page
- [ ] Unit tests (80%+ coverage)
- [ ] Integration tests
- [ ] E2E tests for critical flows
- [ ] Performance optimization
- [ ] Docker production build
- [ ] CI/CD pipeline
- [ ] Production deployment
- [ ] Monitoring and logging setup

### Overall Deliverables
- [ ] All 10 core modules implemented
- [ ] All admin features from Phase 9a integrated
- [ ] All API calls go through Admin Backend
- [ ] 80%+ test coverage
- [ ] Performance targets met
- [ ] Docker production-ready
- [ ] CI/CD pipeline automated
- [ ] Monitoring and logging set up
- [ ] Complete documentation

---

## CONCLUSION

This comprehensive prompt provides all necessary information for implementing Phase 9b: Admin Frontend. The coding agent should follow the architectural patterns, coding standards, and implementation phases outlined above to successfully deliver a production-ready admin frontend.

**Key Principles to Remember:**

1. **Quality Over Speed**: Write clean, maintainable code
2. **Test Thoroughly**: Aim for 80%+ test coverage
3. **Follow Patterns**: Use the established patterns consistently
4. **Document Decisions**: Comment complex logic
5. **Optimize Performance**: Keep bundle size small, load times fast
6. **Security First**: Implement proper auth, validation, and error handling
7. **User Experience**: Make it intuitive and responsive
8. **Single API Gateway**: All calls go through Admin Backend
9. **Redux Toolkit**: Use for all state management
10. **RTK Query**: Use for all API data fetching

**Next Steps for Coding Agent:**

1. Start with Phase 1: Foundation Setup
2. Follow each phase sequentially
3. Implement all deliverables in each phase
4. Test thoroughly before moving to next phase
5. Document any deviations or issues
6. Deliver a production-ready admin frontend

---

**Document Version**: 2.0.0  
**Last Updated**: May 1, 2026  
**Target Agent**: Cline/GLM 4.6  
**Status**: Ready for Implementation

**Remember**: This is a 10-week project. Take your time, write quality code, and follow the patterns established. The success of this project depends on attention to detail and adherence to best practices.