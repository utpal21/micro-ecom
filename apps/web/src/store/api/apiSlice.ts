/**
 * API Slice with RTK Query
 * Handles all API calls to backend services
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type {
    User,
    Permission,
    Vendor,
    Product,
    Order,
    Banner,
    DashboardStats,
    RevenueData,
    TopProduct,
    TableParams,
} from '../../types';

// ============================================================================
// BASE QUERY CONFIGURATION
// ============================================================================

const baseQuery = fetchBaseQuery({
    baseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8007/api/v1',
    prepareHeaders: (headers, { getState }) => {
        // Get token from auth state
        const token = (getState() as RootState).auth.token;
        if (token) {
            headers.set('Authorization', `Bearer ${token}`);
        }
        headers.set('Content-Type', 'application/json');
        return headers;
    },
});

// ============================================================================
// API SLICE
// ============================================================================

export const apiSlice = createApi({
    reducerPath: 'api',
    baseQuery,
    tagTypes: [
        'Auth',
        'User',
        'Vendor',
        'Product',
        'Order',
        'Banner',
        'Dashboard',
    ],
    endpoints: (builder) => ({
        // ============================================================
        // AUTH ENDPOINTS
        // ============================================================

        login: builder.mutation<
            {
                user: User;
                token: string;
                refreshToken: string;
                permissions: Permission[];
            },
            { email: string; password: string }
        >({
            query: (credentials) => ({
                url: '/auth/login',
                method: 'POST',
                body: credentials,
            }),
            transformResponse: (response: {
                accessToken: string;
                refreshToken: string;
                expiresAt: string;
                user: {
                    id: string;
                    email: string;
                    role: string;
                    permissions: string[];
                };
            }) => {
                // Transform Admin Service response to match frontend expectations
                return {
                    user: {
                        id: response.user.id,
                        email: response.user.email,
                        name: response.user.email,
                        roles: [{ id: '1', name: response.user.role }],
                        permissions: response.user.permissions.map((perm) => ({
                            id: perm,
                            name: perm,
                            description: perm,
                        })),
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                    token: response.accessToken,
                    refreshToken: response.refreshToken,
                    permissions: response.user.permissions.map((perm) => ({
                        id: perm,
                        name: perm,
                        description: perm,
                    })),
                };
            },
            invalidatesTags: ['Auth'],
        }),

        logout: builder.mutation<void, void>({
            query: () => ({
                url: '/auth/logout',
                method: 'POST',
            }),
            invalidatesTags: ['Auth'],
        }),

        refreshToken: builder.mutation<
            { token: string; refreshToken: string },
            { refreshToken: string }
        >({
            query: (body) => ({
                url: '/auth/refresh',
                method: 'POST',
                body,
            }),
        }),

        getMe: builder.query<User, void>({
            query: () => '/auth/me',
            providesTags: ['User'],
        }),

        // ============================================================
        // VENDOR ENDPOINTS
        // ============================================================

        getVendors: builder.query<{ data: Vendor[]; total: number }, TableParams>({
            query: (params) => ({
                url: '/vendors',
                params: {
                    page: params.pagination.page,
                    limit: params.pagination.pageSize,
                    ...params.filters,
                },
            }),
            providesTags: ['Vendor'],
        }),

        getVendorById: builder.query<Vendor, string>({
            query: (id) => `/vendors/${id}`,
            providesTags: (result, error, id) => [{ type: 'Vendor', id }],
        }),

        createVendor: builder.mutation<Vendor, Partial<Vendor>>({
            query: (data) => ({
                url: '/vendors',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Vendor'],
        }),

        updateVendor: builder.mutation<
            Vendor,
            { id: string; data: Partial<Vendor> }
        >({
            query: ({ id, data }) => ({
                url: `/vendors/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                'Vendor',
                { type: 'Vendor', id },
            ],
        }),

        deleteVendor: builder.mutation<void, string>({
            query: (id) => ({
                url: `/vendors/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Vendor'],
        }),

        approveVendor: builder.mutation<Vendor, string>({
            query: (id) => ({
                url: `/vendors/${id}/approve`,
                method: 'POST',
            }),
            invalidatesTags: ['Vendor'],
        }),

        rejectVendor: builder.mutation<Vendor, { id: string; reason: string }>({
            query: ({ id, reason }) => ({
                url: `/vendors/${id}/reject`,
                method: 'POST',
                body: { reason },
            }),
            invalidatesTags: ['Vendor'],
        }),

        // ============================================================
        // PRODUCT ENDPOINTS
        // ============================================================

        getProducts: builder.query<{ data: Product[]; total: number }, TableParams>({
            query: (params) => ({
                url: '/products',
                params: {
                    page: params.pagination.page,
                    limit: params.pagination.pageSize,
                    ...params.filters,
                },
            }),
            providesTags: ['Product'],
        }),

        getProductById: builder.query<Product, string>({
            query: (id) => `/products/${id}`,
            providesTags: (result, error, id) => [{ type: 'Product', id }],
        }),

        createProduct: builder.mutation<Product, Partial<Product>>({
            query: (data) => ({
                url: '/products',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Product', 'Dashboard'],
        }),

        updateProduct: builder.mutation<
            Product,
            { id: string; data: Partial<Product> }
        >({
            query: ({ id, data }) => ({
                url: `/products/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                'Product',
                { type: 'Product', id },
            ],
        }),

        deleteProduct: builder.mutation<void, string>({
            query: (id) => ({
                url: `/products/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Product', 'Dashboard'],
        }),

        // ============================================================
        // ORDER ENDPOINTS
        // ============================================================

        getOrders: builder.query<{ data: Order[]; total: number }, TableParams>({
            query: (params) => ({
                url: '/orders',
                params: {
                    page: params.pagination.page,
                    limit: params.pagination.pageSize,
                    ...params.filters,
                },
            }),
            providesTags: ['Order'],
        }),

        getOrderById: builder.query<Order, string>({
            query: (id) => `/orders/${id}`,
            providesTags: (result, error, id) => [{ type: 'Order', id }],
        }),

        updateOrderStatus: builder.mutation<
            Order,
            { id: string; status: string }
        >({
            query: ({ id, status }) => ({
                url: `/orders/${id}/status`,
                method: 'PATCH',
                body: { status },
            }),
            invalidatesTags: ['Order', 'Dashboard'],
        }),

        // ============================================================
        // BANNER ENDPOINTS
        // ============================================================

        getBanners: builder.query<Banner[], void>({
            query: () => '/banners',
            providesTags: ['Banner'],
        }),

        getBannerById: builder.query<Banner, string>({
            query: (id) => `/banners/${id}`,
            providesTags: (result, error, id) => [{ type: 'Banner', id }],
        }),

        createBanner: builder.mutation<Banner, Partial<Banner>>({
            query: (data) => ({
                url: '/banners',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Banner'],
        }),

        updateBanner: builder.mutation<
            Banner,
            { id: string; data: Partial<Banner> }
        >({
            query: ({ id, data }) => ({
                url: `/banners/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                'Banner',
                { type: 'Banner', id },
            ],
        }),

        deleteBanner: builder.mutation<void, string>({
            query: (id) => ({
                url: `/banners/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Banner'],
        }),

        // ============================================================
        // DASHBOARD ENDPOINTS
        // ============================================================

        getDashboardStats: builder.query<DashboardStats, void>({
            query: () => '/dashboard/stats',
            providesTags: ['Dashboard'],
        }),

        getRevenueData: builder.query<RevenueData[], { period: string }>({
            query: ({ period }) => `/dashboard/revenue?period=${period}`,
            providesTags: ['Dashboard'],
        }),

        getTopProducts: builder.query<TopProduct[], { limit?: number }>({
            query: ({ limit = 10 }) => `/dashboard/top-products?limit=${limit}`,
            providesTags: ['Dashboard'],
        }),
    }),
});

// ============================================================================
// EXPORTED HOOKS
// ============================================================================

export const {
    // Auth
    useLoginMutation,
    useLogoutMutation,
    useRefreshTokenMutation,
    useGetMeQuery,
    // Vendors
    useGetVendorsQuery,
    useGetVendorByIdQuery,
    useCreateVendorMutation,
    useUpdateVendorMutation,
    useDeleteVendorMutation,
    useApproveVendorMutation,
    useRejectVendorMutation,
    // Products
    useGetProductsQuery,
    useGetProductByIdQuery,
    useCreateProductMutation,
    useUpdateProductMutation,
    useDeleteProductMutation,
    // Orders
    useGetOrdersQuery,
    useGetOrderByIdQuery,
    useUpdateOrderStatusMutation,
    // Banners
    useGetBannersQuery,
    useGetBannerByIdQuery,
    useCreateBannerMutation,
    useUpdateBannerMutation,
    useDeleteBannerMutation,
    // Dashboard
    useGetDashboardStatsQuery,
    useGetRevenueDataQuery,
    useGetTopProductsQuery,
} = apiSlice;

// ============================================================================
// EXPORT SLICE
// ============================================================================

export default apiSlice;