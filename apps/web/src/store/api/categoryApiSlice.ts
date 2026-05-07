/**
 * Category API Slice
 * Handles category API calls to product-service
 */

import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type { RootState } from '../index';
import type { Category } from '../../types';

// ============================================================================
// BASE QUERY CONFIGURATION FOR PRODUCT SERVICE
// ============================================================================

const categoryBaseQuery = fetchBaseQuery({
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
// CATEGORY API SLICE
// ============================================================================

export const categoryApiSlice = createApi({
    reducerPath: 'categoryApi',
    baseQuery: categoryBaseQuery,
    tagTypes: ['Category'],
    endpoints: (builder) => ({
        // ============================================================
        // CATEGORY ENDPOINTS
        // ============================================================

        getCategories: builder.query<Category[], void>({
            query: () => '/categories',
            providesTags: ['Category'],
        }),

        getCategoryById: builder.query<Category, string>({
            query: (id) => `/categories/${id}`,
            providesTags: (result, error, id) => [{ type: 'Category', id }],
        }),

        createCategory: builder.mutation<Category, Partial<Category>>({
            query: (data) => ({
                url: '/categories',
                method: 'POST',
                body: data,
            }),
            invalidatesTags: ['Category'],
        }),

        updateCategory: builder.mutation<
            Category,
            { id: string; data: Partial<Category> }
        >({
            query: ({ id, data }) => ({
                url: `/categories/${id}`,
                method: 'PATCH',
                body: data,
            }),
            invalidatesTags: (result, error, { id }) => [
                'Category',
                { type: 'Category', id },
            ],
        }),

        deleteCategory: builder.mutation<void, string>({
            query: (id) => ({
                url: `/categories/${id}`,
                method: 'DELETE',
            }),
            invalidatesTags: ['Category'],
        }),
    }),
});

// ============================================================================
// EXPORTED HOOKS
// ============================================================================

export const {
    useGetCategoriesQuery,
    useGetCategoryByIdQuery,
    useCreateCategoryMutation,
    useUpdateCategoryMutation,
    useDeleteCategoryMutation,
} = categoryApiSlice;

// ============================================================================
// EXPORT SLICE
// ============================================================================

export default categoryApiSlice;