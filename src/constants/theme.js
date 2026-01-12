export const COLORS = {
    light: {
        background: '#FFFFFF',
        surface: '#F7F7F7',
        primaryText: '#111111',
        secondaryText: '#c0c0c0',
        divider: '#E5E5E5',
        primaryAction: '#111111',
        success: '#16A34A',
        error: '#DC2626',
        white: '#FFFFFF',
        black: '#000000',
    },
    dark: {
        background: '#0F0F0F',
        surface: '#1A1A1A',
        primaryText: '#F5F5F5',
        secondaryText: '#9CA3AF',
        divider: '#2A2A2A',
        primaryAction: '#FFFFFF',
        success: '#22C55E',
        error: '#EF4444',
        white: '#FFFFFF',
        black: '#000000',
    },
};

export const TYPOGRAPHY = {
    fontFamily: {
        regular: 'System', // Fallback to System for now, can be configured for Inter later
        medium: 'System',
        semiBold: 'System',
        bold: 'System',
    },
    size: {
        hero: 32,
        h1: 28,
        h2: 24,
        h3: 20,
        body: 16,
        caption: 13,
        small: 11,
    },
    lineHeight: {
        hero: 40,
        h1: 36,
        h2: 32,
        h3: 28,
        body: 24,
        caption: 16,
    },
    weight: {
        regular: '400',
        medium: '500',
        semiBold: '600',
        bold: '700',
    },
};

export const SPACING = {
    xs: 4,
    s: 8,
    m: 12, // 1.5x8
    l: 16, // 2x8
    xl: 24, // 3x8
    xxl: 32, // 4x8
    screenPadding: 16,
    cardBorderRadius: 16,
};
