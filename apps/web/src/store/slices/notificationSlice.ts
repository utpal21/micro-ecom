/**
 * Notification Slice
 * Manages application notifications (toasts, alerts, etc.)
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../../types';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface NotificationState {
    notifications: Notification[];
    unreadCount: number;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: NotificationState = {
    notifications: [],
    unreadCount: 0,
};

// ============================================================================
// NOTIFICATION SLICE
// ============================================================================

const notificationSlice = createSlice({
    name: 'notifications',
    initialState,
    reducers: {
        // Add a new notification
        addNotification: (state, action: PayloadAction<Omit<Notification, 'id' | 'createdAt'>>) => {
            const newNotification: Notification = {
                id: Date.now().toString(),
                createdAt: new Date().toISOString(),
                ...action.payload,
            };
            state.notifications.unshift(newNotification);
            if (!newNotification.read) {
                state.unreadCount += 1;
            }
        },

        // Mark notification as read
        markAsRead: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find((n) => n.id === action.payload);
            if (notification && !notification.read) {
                notification.read = true;
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },

        // Mark all notifications as read
        markAllAsRead: (state) => {
            state.notifications.forEach((notification) => {
                notification.read = true;
            });
            state.unreadCount = 0;
        },

        // Remove notification
        removeNotification: (state, action: PayloadAction<string>) => {
            const notification = state.notifications.find((n) => n.id === action.payload);
            state.notifications = state.notifications.filter((n) => n.id !== action.payload);
            if (notification && !notification.read) {
                state.unreadCount = Math.max(0, state.unreadCount - 1);
            }
        },

        // Clear all notifications
        clearAll: (state) => {
            state.notifications = [];
            state.unreadCount = 0;
        },

        // Update notification
        updateNotification: (
            state,
            action: PayloadAction<{ id: string; updates: Partial<Notification> }>,
        ) => {
            const notification = state.notifications.find((n) => n.id === action.payload.id);
            if (notification) {
                Object.assign(notification, action.payload.updates);
            }
        },
    },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAll,
    updateNotification,
} = notificationSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectNotifications = (state: { notifications: NotificationState }) =>
    state.notifications.notifications;
export const selectUnreadCount = (state: { notifications: NotificationState }) =>
    state.notifications.unreadCount;
export const selectReadNotifications = (state: { notifications: NotificationState }) =>
    state.notifications.notifications.filter((n) => n.read);
export const selectUnreadNotifications = (state: { notifications: NotificationState }) =>
    state.notifications.notifications.filter((n) => !n.read);

// ============================================================================
// REDUCER
// ============================================================================

export default notificationSlice.reducer;