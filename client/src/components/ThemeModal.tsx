import { useRef } from 'react';
import { useThemeStore, type ThemeName } from '../store/theme';
import { useModalA11y } from '../hooks/useModalA11y';

const themeOptions: { name: ThemeName; title: string; description: string; preview: string }[] = [
    { name: 'default', title: 'Default Blue', description: 'Classic and professional', preview: 'linear-gradient(135deg, #2563eb, #1e40af)' },
    { name: 'dark', title: 'Dark Mode', description: 'Easy on the eyes', preview: 'linear-gradient(135deg, #1e293b, #0f172a)' },
    { name: 'green', title: 'Green', description: 'Fresh and natural', preview: 'linear-gradient(135deg, #10b981, #059669)' },
    { name: 'purple', title: 'Purple', description: 'Creative and modern', preview: 'linear-gradient(135deg, #8b5cf6, #7c3aed)' },
    { name: 'red', title: 'Red', description: 'Bold and energetic', preview: 'linear-gradient(135deg, #ef4444, #dc2626)' },
    { name: 'orange', title: 'Orange', description: 'Warm and vibrant', preview: 'linear-gradient(135deg, #f59e0b, #d97706)' }
];

export default function ThemeModal() {
    const { modalOpen, closeModal, themeName, selectTheme, resetTheme } = useThemeStore();
    const dialogRef = useRef<HTMLDivElement>(null);

    // Hook must run before the early return below (rules of hooks).
    useModalA11y(modalOpen, true, dialogRef, closeModal);

    if (!modalOpen) return null;

    return (
        <div
            className="modal"
            style={{ display: 'block' }}
            onClick={(e) => {
                if (e.target === e.currentTarget) closeModal();
            }}
        >
            <div className="modal-content" ref={dialogRef} role="dialog" aria-modal="true" aria-label="Choose your theme" tabIndex={-1}>
                <span
                    className="close"
                    role="button"
                    tabIndex={0}
                    aria-label="Close dialog"
                    onClick={closeModal}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            closeModal();
                        }
                    }}
                >
                    &times;
                </span>
                <h2>
                    <i className="fas fa-palette"></i> Choose Your Theme
                </h2>
                <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                    Select a theme that suits your preference
                </p>

                <div className="theme-selector-grid">
                    {themeOptions.map((option) => (
                        <div
                            key={option.name}
                            className="theme-option"
                            role="button"
                            tabIndex={0}
                            aria-pressed={themeName === option.name}
                            onClick={() => selectTheme(option.name)}
                            onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                    event.preventDefault();
                                    selectTheme(option.name);
                                }
                            }}
                        >
                            <div className="theme-preview" style={{ background: option.preview }}>
                                <i
                                    className={`fas fa-check theme-check ${themeName === option.name ? 'active' : ''}`}
                                ></i>
                            </div>
                            <h4>{option.title}</h4>
                            <p>{option.description}</p>
                        </div>
                    ))}
                </div>

                <div style={{ marginTop: '2rem', textAlign: 'center' }}>
                    <button className="btn btn-secondary" onClick={resetTheme}>
                        <i className="fas fa-undo"></i> Reset to Default
                    </button>
                </div>
            </div>
        </div>
    );
}
