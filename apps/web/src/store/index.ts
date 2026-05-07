/**
 * Redux Store Configuration
 * Enterprise-grade state management with RTK Query
 */

import { configureStore } from '@reduxjs/toolkit';
import { setupListeners } from '@reduxjs/toolkit/query';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import { apiSlice } from './api/apiSlice';
import { categoryApiSlice } from './api/categoryApiSlice';
import authReducer from './slices/authSlice';
import uiReducer from './slices/uiSlice';
import notificationReducer from './slices/notificationSlice';

// ============================================================================
// PERSISTENCE CONFIGURATION
// ============================================================================

// Persist configuration for auth slice only
const authPersistConfig = {
    key: 'auth',
    storage,
    whitelist: ['user', 'token', 'refreshToken', 'permissions', 'isAuthenticated', 'isRehydrated'],
};

// ============================================================================
// REDUX STORE CONFIGURATION
// ============================================================================

export const store = configureStore({
    reducer: {
        [apiSlice.reducerPath]: apiSlice.reducer,
        [categoryApiSlice.reducerPath]: categoryApiSlice.reducer,
        auth: persistReducer(authPersistConfig, authReducer) as any,
        ui: uiReducer,
        notifications: notificationReducer,
    },
    middleware: (getDefaultMiddleware) => {
        const middleware = getDefaultMiddleware({
            serializableCheck: {
                // Ignore these action types from redux-persist
                ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE', 'persist/PAUSE', 'persist/PERSIST', 'persist/PURGE', 'persist/REGISTER'],
                // Ignore these field paths in all actions
                ignoredActionPaths: ['meta.arg', 'payload.timestamp'],
                // Ignore these paths in the state
                ignoredPaths: ['api', 'categoryApi'],
            },
        });

        return middleware.concat(apiSlice.middleware, categoryApiSlice.middleware);
    },
    devTools: process.env.NODE_ENV !== 'production',
});

// Enable refetchOnFocus/refetchOnReconnect behaviors
setupListeners(store.dispatch);

// ============================================================================
// PERSISTOR
// ============================================================================

export const persistor = persistStore(store);

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;