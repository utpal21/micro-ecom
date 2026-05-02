/**
 * Global Ant Design Theme Configuration
 * Enterprise-grade color system and design tokens
 */

import type { ThemeConfig } from 'antd';

// ============================================================================
// COLOR SYSTEM - Professional Enterprise Palette
// ============================================================================

// Primary Brand Colors
const PRIMARY_COLORS = {
    50: '#e6f4ff',
    100: '#bae0ff',
    200: '#91caff',
    300: '#69b1ff',
    400: '#4096ff',
    500: '#1677ff', // Primary
    600: '#0958d9',
    700: '#003eb3',
    800: '#002c8c',
    900: '#001d66',
    950: '#001329',
} as const;

// Success Colors
const SUCCESS_COLORS = {
    50: '#f6ffed',
    100: '#d9f7be',
    200: '#b7eb8f',
    300: '#95de64',
    400: '#73d13d',
    500: '#52c41a', // Success
    600: '#389e0d',
    700: '#237804',
    800: '#135200',
    900: '#092b00',
} as const;

// Warning Colors
const WARNING_COLORS = {
    50: '#fffbe6',
    100: '#fff1b8',
    200: '#ffe58f',
    300: '#ffd666',
    400: '#ffc53d',
    500: '#faad14', // Warning
    600: '#d48806',
    700: '#ad6800',
    800: '#874d00',
    900: '#613400',
} as const;

// Error Colors
const ERROR_COLORS = {
    50: '#fff2f0',
    100: '#ffccc7',
    200: '#ffa39e',
    300: '#ff7875',
    400: '#ff4d4f',
    500: '#f5222d', // Error
    600: '#cf1322',
    700: '#a8071a',
    800: '#820014',
    900: '#5c0011',
} as const;

// Info Colors
const INFO_COLORS = {
    50: '#e6f4ff',
    100: '#bae0ff',
    200: '#91caff',
    300: '#69b1ff',
    400: '#4096ff',
    500: '#1677ff', // Info
    600: '#0958d9',
    700: '#003eb3',
    800: '#002c8c',
    900: '#001d66',
} as const;

// Neutral Colors (Grays)
const NEUTRAL_COLORS = {
    50: '#fafafa',
    100: '#f5f5f5',
    200: '#e8e8e8',
    300: '#d9d9d9',
    400: '#bfbfbf',
    500: '#8c8c8c',
    600: '#595959',
    700: '#434343',
    800: '#262626',
    900: '#1f1f1f',
    950: '#141414',
} as const;

// ============================================================================
// TYPOGRAPHY SYSTEM
// ============================================================================

const FONT_FAMILY = {
    base: `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif, 'Apple Color Emoji', 'Segoe UI Emoji', 'Segoe UI Symbol', 'Noto Color Emoji'`,
    code: `'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace`,
} as const;

const FONT_SIZES = {
    xs: '12px',
    sm: '14px',
    md: '16px',
    lg: '18px',
    xl: '20px',
    '2xl': '24px',
    '3xl': '30px',
    '4xl': '36px',
    '5xl': '48px',
} as const;

// ============================================================================
// SPACING SYSTEM
// ============================================================================

const SPACING = {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px',
    '2xl': '48px',
    '3xl': '64px',
    '4xl': '96px',
} as const;

// ============================================================================
// BORDER RADIUS
// ============================================================================

const BORDER_RADIUS = {
    sm: '4px',
    md: '8px',
    lg: '12px',
    xl: '16px',
    full: '9999px',
} as const;

// ============================================================================
// SHADOW SYSTEM
// ============================================================================

const SHADOWS = {
    xs: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
    '2xl': '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
} as const;

// ============================================================================
// ANIMATION TIMING
// ============================================================================

const ANIMATION = {
    durationFast: '0.1s',
    durationBase: '0.2s',
    durationSlow: '0.3s',
    durationSlower: '0.5s',
    easingBase: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    easingIn: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
    easingOut: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',
    easingInOut: 'cubic-bezier(0.645, 0.045, 0.355, 1)',
} as const;

// ============================================================================
// BREAKPOINTS
// ============================================================================

const BREAKPOINTS = {
    xs: '480px',
    sm: '576px',
    md: '768px',
    lg: '992px',
    xl: '1200px',
    xxl: '1600px',
} as const;

// ============================================================================
// LAYOUT CONFIGURATION
// ============================================================================

const LAYOUT = {
    headerHeight: '64px',
    sidebarWidth: '256px',
    sidebarCollapsedWidth: '80px',
    footerHeight: '48px',
    contentMaxWidth: '1400px',
    contentPadding: '24px',
} as const;

// ============================================================================
// ANT DESIGN THEME CONFIGURATION
// ============================================================================

export const antdTheme: ThemeConfig = {
    token: {
        // Color Palette
        colorPrimary: PRIMARY_COLORS[500],
        colorSuccess: SUCCESS_COLORS[500],
        colorWarning: WARNING_COLORS[500],
        colorError: ERROR_COLORS[500],
        colorInfo: INFO_COLORS[500],

        // Text Colors
        colorText: NEUTRAL_COLORS[900],
        colorTextSecondary: NEUTRAL_COLORS[600],
        colorTextTertiary: NEUTRAL_COLORS[500],
        colorTextQuaternary: NEUTRAL_COLORS[400],
        colorTextHeading: NEUTRAL_COLORS[900],

        // Background Colors
        colorBgContainer: '#ffffff',
        colorBgElevated: '#ffffff',
        colorBgLayout: NEUTRAL_COLORS[50],
        colorBgSpotlight: NEUTRAL_COLORS[100],
        colorBorder: NEUTRAL_COLORS[200],
        colorBorderSecondary: NEUTRAL_COLORS[100],

        // Typography
        fontFamily: FONT_FAMILY.base,
        fontSize: FONT_SIZES.sm,
        fontSizeHeading1: FONT_SIZES['4xl'],
        fontSizeHeading2: FONT_SIZES['3xl'],
        fontSizeHeading3: FONT_SIZES['2xl'],
        fontSizeHeading4: FONT_SIZES.xl,
        fontSizeHeading5: FONT_SIZES.lg,
        lineHeight: 1.5715,
        lineHeightHeading1: 1.35,
        lineHeightHeading2: 1.35,
        lineHeightHeading3: 1.35,
        lineHeightHeading4: 1.4,
        lineHeightHeading5: 1.5,

        // Border Radius
        borderRadius: BORDER_RADIUS.md,
        borderRadiusLG: BORDER_RADIUS.lg,
        borderRadiusSM: BORDER_RADIUS.sm,
        borderRadiusXS: '2px',

        // Shadows
        boxShadow: SHADOWS.sm,
        boxShadowSecondary: SHADOWS.xs,
        boxShadowTertiary: SHADOWS.lg,

        // Animation
        motionDurationFast: ANIMATION.durationFast,
        motionDurationMid: ANIMATION.durationBase,
        motionDurationSlow: ANIMATION.durationSlow,
        motionEaseOutBack: 'cubic-bezier(0.215, 0.610, 0.355, 1.000)',

        // Spacing
        padding: SPACING.md,
        paddingXS: SPACING.xs,
        paddingSM: SPACING.sm,
        paddingLG: SPACING.lg,
        paddingXL: SPACING.xl,
        marginXS: SPACING.xs,
        marginSM: SPACING.sm,
        margin: SPACING.md,
        marginLG: SPACING.lg,
        marginXL: SPACING.xl,
    },

    components: {
        // Button Component Customization
        Button: {
            borderRadius: BORDER_RADIUS.md,
            fontWeight: 500,
            controlHeight: 36,
            controlHeightSM: 28,
            controlHeightLG: 44,
        },

        // Input Component Customization
        Input: {
            borderRadius: BORDER_RADIUS.md,
            controlHeight: 36,
            controlHeightSM: 28,
            controlHeightLG: 44,
        },

        // Table Component Customization
        Table: {
            headerBg: NEUTRAL_COLORS[50],
            headerColor: NEUTRAL_COLORS[900],
            borderRadiusLG: BORDER_RADIUS.lg,
            borderColor: NEUTRAL_COLORS[200],
        },

        // Card Component Customization
        Card: {
            borderRadiusLG: BORDER_RADIUS.lg,
        },

        // Modal Component Customization
        Modal: {
            borderRadiusLG: BORDER_RADIUS.lg,
        },

        // Menu Component Customization
        Menu: {
            itemBorderRadius: BORDER_RADIUS.md,
            itemHeight: 44,
        },

        // Layout Component Customization
        Layout: {
            headerBg: '#ffffff',
            headerHeight: LAYOUT.headerHeight,
            siderBg: '#ffffff',
            footerBg: NEUTRAL_COLORS[50],
        },

        // Form Component Customization
        Form: {
            itemMarginBottom: SPACING.md,
            verticalLabelPadding: SPACING.sm,
        },

        // Select Component Customization
        Select: {
            borderRadius: BORDER_RADIUS.md,
            controlHeight: 36,
            controlHeightSM: 28,
            controlHeightLG: 44,
        },

        // DatePicker Component Customization
        DatePicker: {
            borderRadius: BORDER_RADIUS.md,
            controlHeight: 36,
            controlHeightSM: 28,
            controlHeightLG: 44,
        },

        // Tabs Component Customization
        Tabs: {
            itemActiveColor: PRIMARY_COLORS[500],
            itemHoverColor: PRIMARY_COLORS[600],
            itemSelectedColor: PRIMARY_COLORS[500],
            inkBarColor: PRIMARY_COLORS[500],
        },

        // Alert Component Customization
        Alert: {
            borderRadius: BORDER_RADIUS.md,
            padding: SPACING.md,
        },

        // Message Component Customization
        Message: {
            borderRadius: BORDER_RADIUS.md,
        },

        // Notification Component Customization
        Notification: {
            borderRadius: BORDER_RADIUS.lg,
        },

        // Drawer Component Customization
        Drawer: {
            borderRadiusLG: BORDER_RADIUS.lg,
        },
    },

    algorithm: [], // Use light theme by default
};

// ============================================================================
// DARK THEME CONFIGURATION
// ============================================================================

export const darkAntdTheme: ThemeConfig = {
    token: {
        ...antdTheme.token,

        // Dark Mode Colors
        colorPrimary: PRIMARY_COLORS[400],
        colorText: NEUTRAL_COLORS[100],
        colorTextSecondary: NEUTRAL_COLORS[300],
        colorTextTertiary: NEUTRAL_COLORS[400],
        colorTextQuaternary: NEUTRAL_COLORS[500],
        colorTextHeading: NEUTRAL_COLORS[100],

        // Dark Mode Backgrounds
        colorBgContainer: NEUTRAL_COLORS[900],
        colorBgElevated: NEUTRAL_COLORS[800],
        colorBgLayout: NEUTRAL_COLORS[950],
        colorBgSpotlight: NEUTRAL_COLORS[800],
        colorBorder: NEUTRAL_COLORS[700],
        colorBorderSecondary: NEUTRAL_COLORS[800],
    },

    components: antdTheme.components,
};

// ============================================================================
// EXPORT THEME TOKENS FOR CUSTOM USAGE
// ============================================================================

export const themeTokens = {
    colors: {
        primary: PRIMARY_COLORS,
        success: SUCCESS_COLORS,
        warning: WARNING_COLORS,
        error: ERROR_COLORS,
        info: INFO_COLORS,
        neutral: NEUTRAL_COLORS,
    },
    typography: {
        fontFamily: FONT_FAMILY,
        fontSize: FONT_SIZES,
    },
    spacing: SPACING,
    borderRadius: BORDER_RADIUS,
    shadows: SHADOWS,
    animation: ANIMATION,
    breakpoints: BREAKPOINTS,
    layout: LAYOUT,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Get color from palette with opacity
 */
export const getColorWithOpacity = (color: string, opacity: number): string => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
};

/**
 * Check if color is light or dark
 */
export const isColorLight = (color: string): boolean => {
    const hex = color.replace('#', '');
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 128;
};