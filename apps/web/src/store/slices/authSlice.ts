/**
 * Authentication Slice
 * Manages user authentication state, tokens, and permissions
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User, Permission, Role } from '../../types';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface AuthState {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    permissions: Permission[];
    isAuthenticated: boolean;
    isLoading: boolean;
    error: string | null;
    lastLoginTime: string | null;
    isRehydrated: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: AuthState = {
    user: null,
    token: null,
    refreshToken: null,
    permissions: [],
    isAuthenticated: false,
    isLoading: false,
    error: null,
    lastLoginTime: null,
    isRehydrated: false,
};

// ============================================================================
// AUTH SLICE
// ============================================================================

const authSlice = createSlice({
    name: 'auth',
    initialState,
    reducers: {
        // Set loading state
        setLoading: (state, action: PayloadAction<boolean>) => {
            state.isLoading = action.payload;
        },

        // Set error message
        setError: (state, action: PayloadAction<string | null>) => {
            state.error = action.payload;
            state.isLoading = false;
        },

        // Login successful
        loginSuccess: (
            state,
            action: PayloadAction<{
                user: User;
                token: string;
                refreshToken: string;
                permissions: Permission[];
            }>,
        ) => {
            state.user = action.payload.user;
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
            state.permissions = action.payload.permissions;
            state.isAuthenticated = true;
            state.isLoading = false;
            state.error = null;
            state.lastLoginTime = new Date().toISOString();
        },

        // Logout
        logout: (state) => {
            state.user = null;
            state.token = null;
            state.refreshToken = null;
            state.permissions = [];
            state.isAuthenticated = false;
            state.isLoading = false;
            state.error = null;
            state.lastLoginTime = null;
        },

        // Update user information
        updateUser: (state, action: PayloadAction<Partial<User>>) => {
            if (state.user) {
                state.user = { ...state.user, ...action.payload };
            }
        },

        // Update token (for token refresh)
        updateToken: (state, action: PayloadAction<{ token: string; refreshToken: string }>) => {
            state.token = action.payload.token;
            state.refreshToken = action.payload.refreshToken;
        },

        // Update permissions
        updatePermissions: (state, action: PayloadAction<Permission[]>) => {
            state.permissions = action.payload;
        },

        // Clear error
        clearError: (state) => {
            state.error = null;
        },
    },
    extraReducers: (builder) => {
        builder.addCase(
            'persist/REHYDRATE',
            (state: AuthState, action: any) => {
                // Handle rehydration from localStorage
                if (action.payload?.auth) {
                    const persistedAuth = action.payload.auth;

                    // Restore persisted state
                    state.user = persistedAuth.user || null;
                    state.token = persistedAuth.token || null;
                    state.refreshToken = persistedAuth.refreshToken || null;
                    state.permissions = persistedAuth.permissions || [];
                    state.isAuthenticated = persistedAuth.isAuthenticated || false;
                    state.lastLoginTime = persistedAuth.lastLoginTime || null;

                    // Mark as rehydrated
                    state.isRehydrated = true;
                } else {
                    state.isRehydrated = true;
                }
            }
        );
    },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
    setLoading,
    setError,
    loginSuccess,
    logout,
    updateUser,
    updateToken,
    updatePermissions,
    clearError,
} = authSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectAuth = (state: { auth: AuthState }) => state.auth;
export const selectUser = (state: { auth: AuthState }) => state.auth.user;
export const selectToken = (state: { auth: AuthState }) => state.auth.token;
export const selectRefreshToken = (state: { auth: AuthState }) => state.auth.refreshToken;
export const selectPermissions = (state: { auth: AuthState }) => state.auth.permissions;
export const selectIsAuthenticated = (state: { auth: AuthState }) => state.auth.isAuthenticated;
export const selectIsLoading = (state: { auth: AuthState }) => state.auth.isLoading;
export const selectError = (state: { auth: AuthState }) => state.auth.error;
export const selectIsRehydrated = (state: { auth: AuthState }) => state.auth.isRehydrated;

// Permission check selector
export const selectHasPermission = (permission: string) => (state: { auth: AuthState }) =>
    state.auth.permissions.some((perm) => perm.name === permission);

// Role check selector
export const selectHasRole = (role: string) => (state: { auth: AuthState }) =>
    state.auth.user?.roles.some((r) => r.name === role) ?? false;

// Get user roles
export const selectUserRoles = (state: { auth: AuthState }) => state.auth.user?.roles ?? [];

// ============================================================================
// REDUCER
// ============================================================================

export default authSlice.reducer;