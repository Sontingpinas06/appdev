import { useEffect, useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { useThemeStore } from '../store/theme';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' active' : ''}`;

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const openThemeModal = useThemeStore((state) => state.openModal);

    const closeMenu = () => {
        setMenuOpen(false);
        document.body.style.overflow = '';
    };

    const toggleMenu = () => {
        setMenuOpen((open) => {
            document.body.style.overflow = open ? '' : 'hidden';
            return !open;
        });
    };

    // Mirror the prototype: closing the menu when resizing to desktop width.
    useEffect(() => {
        const onResize = () => {
            if (window.innerWidth > 768) closeMenu();
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
    }, []);

    const openTheme = () => {
        openThemeModal();
        closeMenu();
    };

    return (
        <>
            <nav className="navbar">
                <div className="container">
                    <div className="nav-brand">
                        <i className="fas fa-graduation-cap"></i>
                        <span>BCP Uniform Guide</span>
                    </div>

                    <button className="mobile-menu-toggle" onClick={toggleMenu} aria-label="Toggle menu">
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                        <span className="hamburger-line"></span>
                    </button>

                    <div className={`nav-menu${menuOpen ? ' active' : ''}`} id="navMenu">
                        <div className="mobile-menu-header">
                            <div className="nav-brand">
                                <i className="fas fa-graduation-cap"></i>
                                <span>BCP Uniform Guide</span>
                            </div>
                            <button className="mobile-menu-close" onClick={closeMenu}>
                                <i className="fas fa-times"></i>
                            </button>
                        </div>

                        <NavLink to="/" className={navLinkClass} onClick={closeMenu} end>
                            <i className="fas fa-home"></i> <span>Home</span>
                        </NavLink>
                        <NavLink to="/sizing" className={navLinkClass} onClick={closeMenu}>
                            <i className="fas fa-ruler"></i> <span>Body Scan</span>
                        </NavLink>
                        <NavLink to="/catalog" className={navLinkClass} onClick={closeMenu}>
                            <i className="fas fa-tshirt"></i> <span>Catalog</span>
                        </NavLink>

                        <div className="mobile-menu-footer">
                            <button className="btn btn-secondary btn-small" onClick={openTheme} title="Change Theme">
                                <i className="fas fa-palette"></i> <span>Change Theme</span>
                            </button>
                            <Link to="/admin" className="btn btn-secondary btn-small" onClick={closeMenu} title="Admin Panel">
                                <i className="fas fa-shield-halved"></i> <span>Admin Panel</span>
                            </Link>
                        </div>
                    </div>

                    <div className="nav-actions desktop-only">
                        <div id="authButtons" className="auth-buttons">
                            <Link to="/login" className="btn btn-primary btn-small">
                                <i className="fas fa-sign-in-alt"></i> Login
                            </Link>
                        </div>

                        <button
                            className="btn btn-secondary btn-small"
                            onClick={openThemeModal}
                            title="Change Theme"
                            aria-label="Change theme"
                        >
                            <i className="fas fa-palette"></i>
                        </button>
                        <Link to="/admin" className="btn btn-secondary btn-small" title="Admin Panel" aria-label="Admin panel">
                            <i className="fas fa-shield-halved"></i>
                        </Link>
                    </div>
                </div>
            </nav>

            <div
                className={`mobile-menu-overlay${menuOpen ? ' active' : ''}`}
                id="mobileMenuOverlay"
                onClick={closeMenu}
            />
        </>
    );
}
