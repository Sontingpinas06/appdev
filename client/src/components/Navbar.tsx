import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../store/auth';
import { cartCount, useCartStore } from '../store/cart';
import { useThemeStore } from '../store/theme';
import { useModalA11y } from '../hooks/useModalA11y';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `nav-link${isActive ? ' active' : ''}`;

function initialsOf(name: string): string {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return 'U';
    return parts.slice(0, 2).map((part) => part[0].toUpperCase()).join('');
}

export default function Navbar() {
    const [menuOpen, setMenuOpen] = useState(false);
    const [profileOpen, setProfileOpen] = useState(false);
    const [confirmLogout, setConfirmLogout] = useState(false);

    const openThemeModal = useThemeStore((state) => state.openModal);
    const { user, logout } = useAuthStore();
    const cartItems = useCartStore((state) => state.items);
    const itemCount = cartCount(cartItems);
    const navigate = useNavigate();
    const profileRef = useRef<HTMLDivElement>(null);
    const logoutDialogRef = useRef<HTMLDivElement>(null);

    // Esc / focus trap / focus restore for the logout confirmation dialog.
    useModalA11y(confirmLogout, true, logoutDialogRef, () => setConfirmLogout(false));

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

    // Close the profile dropdown on outside click.
    useEffect(() => {
        if (!profileOpen) return;
        const onDocumentClick = (event: MouseEvent) => {
            if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
                setProfileOpen(false);
            }
        };
        document.addEventListener('click', onDocumentClick);
        return () => document.removeEventListener('click', onDocumentClick);
    }, [profileOpen]);

    const openTheme = () => {
        openThemeModal();
        closeMenu();
    };

    const handleLogout = async () => {
        setConfirmLogout(false);
        setProfileOpen(false);
        await logout();
        navigate('/');
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
                            <Link to="/cart" className="btn btn-secondary btn-small" onClick={closeMenu} title="Cart">
                                <i className="fas fa-shopping-cart"></i>
                                <span>Cart{itemCount > 0 ? ` (${itemCount})` : ''}</span>
                            </Link>
                            <button className="btn btn-secondary btn-small" onClick={openTheme} title="Change Theme">
                                <i className="fas fa-palette"></i> <span>Change Theme</span>
                            </button>
                            <Link to="/admin" className="btn btn-secondary btn-small" onClick={closeMenu} title="Admin Panel">
                                <i className="fas fa-shield-halved"></i> <span>Admin Panel</span>
                            </Link>
                        </div>
                    </div>

                    <div className="nav-actions desktop-only">
                        {user ? (
                            <div className="user-profile" ref={profileRef} id="userProfile">
                                <button
                                    className="profile-button"
                                    onClick={() => setProfileOpen((open) => !open)}
                                    aria-expanded={profileOpen}
                                >
                                    <div className="profile-avatar">{initialsOf(user.name)}</div>
                                    <span>{user.name.split(' ')[0]}</span>
                                    <i className={`fas fa-chevron-${profileOpen ? 'up' : 'down'}`}></i>
                                </button>
                                <div className={`profile-dropdown${profileOpen ? ' active' : ''}`} id="profileDropdown">
                                    <div className="dropdown-header">
                                        <div className="dropdown-avatar">{initialsOf(user.name)}</div>
                                        <div>
                                            <div className="dropdown-name">{user.name}</div>
                                            <div className="dropdown-email">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="dropdown-divider"></div>
                                    <button
                                        className="dropdown-item"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate('/orders');
                                        }}
                                    >
                                        <i className="fas fa-receipt"></i> My Orders
                                    </button>
                                    <button
                                        className="dropdown-item"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            navigate('/sizing');
                                        }}
                                    >
                                        <i className="fas fa-ruler"></i> My Measurements
                                    </button>
                                    {user.role === 'admin' && (
                                        <button
                                            className="dropdown-item"
                                            onClick={() => {
                                                setProfileOpen(false);
                                                navigate('/admin');
                                            }}
                                        >
                                            <i className="fas fa-shield-halved"></i> Admin Panel
                                        </button>
                                    )}
                                    <div className="dropdown-divider"></div>
                                    <button
                                        className="dropdown-item danger"
                                        onClick={() => {
                                            setProfileOpen(false);
                                            setConfirmLogout(true);
                                        }}
                                    >
                                        <i className="fas fa-sign-out-alt"></i> Logout
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div id="authButtons" className="auth-buttons">
                                <Link to="/login" className="btn btn-primary btn-small">
                                    <i className="fas fa-sign-in-alt"></i> Login
                                </Link>
                            </div>
                        )}

                        <Link
                            to="/cart"
                            className="btn btn-secondary btn-small nav-cart"
                            title="Cart"
                            aria-label={`Cart, ${itemCount} item${itemCount === 1 ? '' : 's'}`}
                        >
                            <i className="fas fa-shopping-cart"></i>
                            {itemCount > 0 && <span className="cart-count">{itemCount}</span>}
                        </Link>
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

            {confirmLogout && (
                <div className="modal" style={{ display: 'block' }}>
                    <div
                        className="modal-content modal-small"
                        ref={logoutDialogRef}
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby="logoutConfirmTitle"
                        tabIndex={-1}
                    >
                        <div className="modal-icon-header">
                            <div className="modal-icon warning">
                                <i className="fas fa-sign-out-alt"></i>
                            </div>
                            <h2 id="logoutConfirmTitle">Confirm Logout</h2>
                            <p>Are you sure you want to logout?</p>
                        </div>
                        <div className="modal-actions">
                            <button className="btn btn-secondary" onClick={() => setConfirmLogout(false)}>
                                <i className="fas fa-times"></i> Cancel
                            </button>
                            <button className="btn btn-danger" onClick={() => void handleLogout()}>
                                <i className="fas fa-sign-out-alt"></i> Logout
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
