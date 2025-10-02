// Theme Management System

const themePresets = {
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
};

// Apply theme to document
function applyTheme(theme) {
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

// Load saved theme on page load
function loadSavedTheme() {
    const savedTheme = localStorage.getItem('bcpTheme');
    const themeName = localStorage.getItem('bcpThemeName') || 'default';
    
    if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        applyTheme(theme);
    }
    
    // Update active indicator
    updateActiveThemeIndicator(themeName);
}

// Open theme selector modal
function openThemeSelector() {
    document.getElementById('themeSelectorModal').style.display = 'block';
    const currentTheme = localStorage.getItem('bcpThemeName') || 'default';
    updateActiveThemeIndicator(currentTheme);
}

// Close theme selector modal
function closeThemeSelector() {
    document.getElementById('themeSelectorModal').style.display = 'none';
}

// Select and apply theme
function selectTheme(themeName) {
    const theme = themePresets[themeName];
    if (!theme) return;
    
    // Apply theme
    applyTheme(theme);
    
    // Save to localStorage
    localStorage.setItem('bcpTheme', JSON.stringify(theme));
    localStorage.setItem('bcpThemeName', themeName);
    
    // Update active indicator
    updateActiveThemeIndicator(themeName);
    
    // Show confirmation
    showToast(`${themeName.charAt(0).toUpperCase() + themeName.slice(1)} theme applied!`, 'success');
}

// Update active theme indicator
function updateActiveThemeIndicator(themeName) {
    // Remove all active classes
    document.querySelectorAll('.theme-check').forEach(check => {
        check.classList.remove('active');
    });
    
    // Add active class to selected theme
    const activeCheck = document.getElementById(`check-${themeName}`);
    if (activeCheck) {
        activeCheck.classList.add('active');
    }
}

// Reset to default theme
function resetToDefaultTheme() {
    selectTheme('default');
    showToast('Theme reset to default', 'success');
}

// Initialize theme on page load
document.addEventListener('DOMContentLoaded', function() {
    loadSavedTheme();
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('themeSelectorModal');
        if (event.target === modal) {
            closeThemeSelector();
        }
    });
});

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.themePresets = themePresets;
    window.applyTheme = applyTheme;
    window.loadSavedTheme = loadSavedTheme;
}
