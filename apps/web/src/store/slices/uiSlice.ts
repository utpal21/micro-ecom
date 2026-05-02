/**
 * UI State Slice
 * Manages UI-related state like sidebar, theme, modals, etc.
 */

import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Theme } from '../../types';

// ============================================================================
// STATE INTERFACE
// ============================================================================

interface UIState {
    // Sidebar state
    sidebarCollapsed: boolean;
    sidebarWidth: number;

    // Theme
    theme: Theme;

    // Loading states
    globalLoading: boolean;
    pageLoading: boolean;

    // Modal states
    activeModal: string | null;
    modalData: any;

    // Drawer states
    activeDrawer: string | null;
    drawerData: any;

    // Breadcrumb
    breadcrumb: Array<{ path: string; label: string }>;

    // Layout
    contentPadding: number;

    // Responsive
    isMobile: boolean;
    isTablet: boolean;
}

// ============================================================================
// INITIAL STATE
// ============================================================================

const initialState: UIState = {
    sidebarCollapsed: false,
    sidebarWidth: 256,
    theme: 'light',
    globalLoading: false,
    pageLoading: false,
    activeModal: null,
    modalData: null,
    activeDrawer: null,
    drawerData: null,
    breadcrumb: [],
    contentPadding: 24,
    isMobile: false,
    isTablet: false,
};

// ============================================================================
// UI SLICE
// ============================================================================

const uiSlice = createSlice({
    name: 'ui',
    initialState,
    reducers: {
        // Sidebar actions
        toggleSidebar: (state) => {
            state.sidebarCollapsed = !state.sidebarCollapsed;
            state.sidebarWidth = state.sidebarCollapsed ? 80 : 256;
        },
        setSidebarCollapsed: (state, action: PayloadAction<boolean>) => {
            state.sidebarCollapsed = action.payload;
            state.sidebarWidth = action.payload ? 80 : 256;
        },

        // Theme actions
        setTheme: (state, action: PayloadAction<Theme>) => {
            state.theme = action.payload;
        },

        // Loading actions
        setGlobalLoading: (state, action: PayloadAction<boolean>) => {
            state.globalLoading = action.payload;
        },
        setPageLoading: (state, action: PayloadAction<boolean>) => {
            state.pageLoading = action.payload;
        },

        // Modal actions
        openModal: (state, action: PayloadAction<{ modal: string; data?: any }>) => {
            state.activeModal = action.payload.modal;
            state.modalData = action.payload.data || null;
        },
        closeModal: (state) => {
            state.activeModal = null;
            state.modalData = null;
        },

        // Drawer actions
        openDrawer: (state, action: PayloadAction<{ drawer: string; data?: any }>) => {
            state.activeDrawer = action.payload.drawer;
            state.drawerData = action.payload.data || null;
        },
        closeDrawer: (state) => {
            state.activeDrawer = null;
            state.drawerData = null;
        },

        // Breadcrumb actions
        setBreadcrumb: (state, action: PayloadAction<Array<{ path: string; label: string }>>) => {
            state.breadcrumb = action.payload;
        },
        addBreadcrumbItem: (state, action: PayloadAction<{ path: string; label: string }>) => {
            state.breadcrumb.push(action.payload);
        },
        clearBreadcrumb: (state) => {
            state.breadcrumb = [];
        },

        // Layout actions
        setContentPadding: (state, action: PayloadAction<number>) => {
            state.contentPadding = action.payload;
        },

        // Responsive actions
        setDeviceType: (
            state,
            action: PayloadAction<{
                isMobile: boolean;
                isTablet: boolean;
            }>,
        ) => {
            state.isMobile = action.payload.isMobile;
            state.isTablet = action.payload.isTablet;
        },
    },
});

// ============================================================================
// ACTIONS
// ============================================================================

export const {
    toggleSidebar,
    setSidebarCollapsed,
    setTheme,
    setGlobalLoading,
    setPageLoading,
    openModal,
    closeModal,
    openDrawer,
    closeDrawer,
    setBreadcrumb,
    addBreadcrumbItem,
    clearBreadcrumb,
    setContentPadding,
    setDeviceType,
} = uiSlice.actions;

// ============================================================================
// SELECTORS
// ============================================================================

export const selectUI = (state: { ui: UIState }) => state.ui;
export const selectSidebarCollapsed = (state: { ui: UIState }) => state.ui.sidebarCollapsed;
export const selectSidebarWidth = (state: { ui: UIState }) => state.ui.sidebarWidth;
export const selectTheme = (state: { ui: UIState }) => state.ui.theme;
export const selectGlobalLoading = (state: { ui: UIState }) => state.ui.globalLoading;
export const selectPageLoading = (state: { ui: UIState }) => state.ui.pageLoading;
export const selectActiveModal = (state: { ui: UIState }) => state.ui.activeModal;
export const selectModalData = (state: { ui: UIState }) => state.ui.modalData;
export const selectActiveDrawer = (state: { ui: UIState }) => state.ui.activeDrawer;
export const selectDrawerData = (state: { ui: UIState }) => state.ui.drawerData;
export const selectBreadcrumb = (state: { ui: UIState }) => state.ui.breadcrumb;
export const selectContentPadding = (state: { ui: UIState }) => state.ui.contentPadding;
export const selectIsMobile = (state: { ui: UIState }) => state.ui.isMobile;
export const selectIsTablet = (state: { ui: UIState }) => state.ui.isTablet;

// Check if device is mobile or tablet
export const selectIsMobileOrTablet = (state: { ui: UIState }) =>
    state.ui.isMobile || state.ui.isTablet;

// ============================================================================
// REDUCER
// ============================================================================

export default uiSlice.reducer;