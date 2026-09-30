import { create } from 'zustand';
import { showToast } from './toast';

export const themePresets = {
    default: {
        primary: '#2563eb',
        primaryDark: '#1e40af',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#f8fafc',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        // Ink on primary fills: white passes AA on #2563eb.
        onPrimary: '#ffffff'
    },
    dark: {
        primary: '#3b82f6',
        primaryDark: '#2563eb',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#0f172a',
        cardBg: '#1e293b',
        textPrimary: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#334155',
        // White reaches only 3.7:1 on #3b82f6; near-black ink reaches ~5:1.
        onPrimary: '#0b1220'
    },
    green: {
        primary: '#10b981',
        primaryDark: '#059669',
        secondary: '#64748b',
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#f0fdf4',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#bbf7d0',
        onPrimary: '#042f1e'
    },
    purple: {
        primary: '#7c3aed',
        primaryDark: '#6d28d9',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#faf5ff',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#e9d5ff',
        onPrimary: '#ffffff'
    },
    red: {
        primary: '#ef4444',
        primaryDark: '#dc2626',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#f87171',
        warning: '#f59e0b',
        bg: '#fef2f2',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#fecaca',
        onPrimary: '#2c0707'
    },
    orange: {
        primary: '#f59e0b',
        primaryDark: '#d97706',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#fb923c',
        bg: '#fffbeb',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#fed7aa',
        onPrimary: '#431407'
    }
} as const;

export type ThemeName = keyof typeof themePresets;
type Theme = (typeof themePresets)[ThemeName];

const THEME_STORAGE = 'bcpTheme';
const THEME_NAME_STORAGE = 'bcpThemeName';

function applyTheme(theme: Theme): void {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--success-color', theme.success);
    root.style.setProperty('--danger-color', theme.danger);
    root.style.setProperty('--warning-color', theme.warning);
    root.style.setProperty('--bg-color', theme.bg);
    root.style.setProperty('--card-bg', theme.cardBg);
    root.style.setProperty('--text-primary', theme.textPrimary);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--border-color', theme.border);
    // Ink for text/icons rendered on primary fills (AA contrast per preset).
    root.style.setProperty('--on-primary', theme.onPrimary);
    // Derived surfaces recompute from the new card/primary values.
    root.style.setProperty(
        '--backdrop-tint',
        `color-mix(in srgb, ${theme.primary} 12%, ${theme.bg})`
    );
    // Standalone PWA status bar follows the active theme.
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', theme.primary);
}

/**
 * The named preset is the source of truth, so newly added keys (e.g.
 * onPrimary) and refreshed palette values always reach the app. Older builds
 * also stored a full theme snapshot under THEME_STORAGE; it is intentionally
 * not read back - a stale blob could silently miss new keys. The snapshot is
 * still written for debuggability.
 */
function readStoredTheme(): { name: ThemeName; theme: Theme } {
    const stored = localStorage.getItem(THEME_NAME_STORAGE) as ThemeName | null;
    const name = stored && stored in themePresets ? stored : 'default';
    return { name, theme: themePresets[name] };
}

interface ThemeState {
    themeName: ThemeName;
    modalOpen: boolean;
    openModal: () => void;
    closeModal: () => void;
    selectTheme: (name: ThemeName) => void;
    resetTheme: () => void;
}

const initial = readStoredTheme();
applyTheme(initial.theme);

export const useThemeStore = create<ThemeState>((set, get) => ({
    themeName: initial.name,
    modalOpen: false,
    openModal: () => set({ modalOpen: true }),
    closeModal: () => set({ modalOpen: false }),
    selectTheme: (name) => {
        const theme = themePresets[name];
        if (!theme) return;

        applyTheme(theme);
        localStorage.setItem(THEME_STORAGE, JSON.stringify(theme));
        localStorage.setItem(THEME_NAME_STORAGE, name);
        set({ themeName: name });
        showToast(`${name.charAt(0).toUpperCase() + name.slice(1)} theme applied!`, 'success');
    },
    resetTheme: () => {
        get().selectTheme('default');
        showToast('Theme reset to default', 'success');
    }
}));
