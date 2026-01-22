export const COLORS = {
    light: {
        background: '#FFFFFF',
        surface: '#F7F7F7',
        primaryText: '#111111',
        secondaryText: '#c0c0c0',
        placeholderText: '#9CA3AF',
        divider: '#E5E5E5',
        primaryAction: '#6ca749',
        secondaryAction: '#111111',
        success: '#2da249',
        error: '#DC2626',
        white: '#FFFFFF',
        black: '#000000',
        inputBackground: '#F3F4F6',
        modalOverlay: 'rgba(0,0,0,0.5)',
        cardBackground: '#FFFFFF',
        headerBackground: '#f7ede2',
        headerText: '#3e2723',
        headerIcon: '#8d6e63',
        iconBackground: 'rgba(255,255,255,0.6)',
    },
    dark: {
        background: '#0F0F0F',
        surface: '#252728',
        primaryText: '#F5F5F5',
        secondaryText: '#9CA3AF',
        placeholderText: '#6B7280',
        divider: '#2A2A2A',
        primaryAction: '#6ca749',
        secondaryAction: '#FFFFFF',
        success: '#2da249',
        error: '#EF4444',
        white: '#FFFFFF',
        black: '#000000',
        inputBackground: '#272727',
        modalOverlay: 'rgba(0,0,0,0.7)',
        cardBackground: '#252728',
        headerBackground: '#1A1A1A',
        headerText: '#F5F5F5',
        headerIcon: '#9CA3AF',
        iconBackground: 'rgba(255,255,255,0.1)',
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
