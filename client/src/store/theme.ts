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
        border: '#e2e8f0'
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
        border: '#334155'
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
        border: '#bbf7d0'
    },
    purple: {
        primary: '#8b5cf6',
        primaryDark: '#7c3aed',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#faf5ff',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#e9d5ff'
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
        border: '#fecaca'
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
        border: '#fed7aa'
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
}

function readStoredTheme(): { name: ThemeName; theme: Theme } {
    const name = (localStorage.getItem(THEME_NAME_STORAGE) || 'default') as ThemeName;
    const raw = localStorage.getItem(THEME_STORAGE);

    if (raw) {
        try {
            return { name, theme: JSON.parse(raw) as Theme };
        } catch {
            // Corrupt payload: fall through to the preset.
        }
    }
    return { name: 'default', theme: themePresets.default };
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
