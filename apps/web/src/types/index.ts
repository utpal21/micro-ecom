// Auth Types
export interface Permission {
    id: string
    name: string
    description: string
    resource: string
    action: string
}

export interface Role {
    id: string
    name: string
    description: string
    permissions: Permission[]
    createdAt: string
    updatedAt: string
}

export interface User {
    id: string
    email: string
    name: string
    roles: Role[]
    avatar?: string
    createdAt: string
    updatedAt: string
}

export interface AuthState {
    user: User | null
    token: string | null
    isAuthenticated: boolean
}

// Vendor Types
export interface Vendor {
    id: string
    userId: string
    businessName: string
    contactEmail: string
    contactPhone?: string
    taxId?: string
    status: 'pending' | 'active' | 'suspended' | 'rejected'
    rating: number
    totalProducts: number
    totalSales: number
    createdAt: string
    updatedAt: string
}

// Product Types
export interface Product {
    id: string
    vendorId: string
    name: string
    description: string
    sku: string
    price: number
    currency: string
    stock: number
    category: string
    images: string[]
    status: 'draft' | 'active' | 'inactive' | 'deleted'
    createdAt: string
    updatedAt: string
}

// Order Types
export type OrderStatus =
    | 'pending'
    | 'confirmed'
    | 'processing'
    | 'shipped'
    | 'delivered'
    | 'cancelled'
    | 'refunded'

export type PaymentStatus =
    | 'pending'
    | 'processing'
    | 'completed'
    | 'failed'
    | 'refunded'

export interface OrderItem {
    id: string
    productId: string
    productName: string
    quantity: number
    unitPrice: number
    totalPrice: number
}

export interface Order {
    id: string
    orderNumber: string
    userId: string
    items: OrderItem[]
    subtotal: number
    tax: number
    shipping: number
    total: number
    currency: string
    status: OrderStatus
    paymentStatus: PaymentStatus
    shippingAddress: {
        street: string
        city: string
        state: string
        postalCode: string
        country: string
    }
    createdAt: string
    updatedAt: string
}

// Banner Types
export interface Banner {
    id: string
    title: string
    description?: string
    imageUrl: string
    targetUrl?: string
    position: 'home' | 'category' | 'product'
    status: 'active' | 'inactive'
    startDate: string
    endDate: string
    createdAt: string
    updatedAt: string
}

// Dashboard Types
export interface DashboardStats {
    totalOrders: number
    totalRevenue: number
    totalUsers: number
    totalVendors: number
    ordersToday: number
    revenueToday: number
    pendingOrders: number
    processingOrders: number
}

export interface RevenueData {
    date: string
    revenue: number
    orders: number
}

export interface TopProduct {
    id: string
    name: string
    sales: number
    revenue: number
}

// Table Types
export interface ColumnDef<T> {
    id: string
    header: string
    accessorKey?: keyof T
    cell?: (props: { row: { original: T } }) => React.ReactNode
    sortable?: boolean
    filterable?: boolean
}

export interface Pagination {
    page: number
    pageSize: number
    total: number
    totalPages: number
}

export interface TableParams {
    pagination: Pagination
    sorting?: {
        field: string
        direction: 'asc' | 'desc'
    }
    filters?: Record<string, any>
}

// Form Types
export interface FormField {
    name: string
    label: string
    type: 'text' | 'email' | 'password' | 'number' | 'select' | 'textarea' | 'date'
    placeholder?: string
    required?: boolean
    options?: { label: string; value: string }[]
    validation?: {
        pattern?: RegExp
        min?: number
        max?: number
        minLength?: number
        maxLength?: number
    }
}

// Notification Types
export interface Notification {
    id: string
    title: string
    message: string
    type: 'info' | 'success' | 'warning' | 'error'
    read: boolean
    createdAt: string
}

// Theme Types
export type Theme = 'light' | 'dark' | 'system'

export interface ThemeState {
    theme: Theme
    setTheme: (theme: Theme) => void
}