import { Link } from 'react-router-dom';

/**
 * Site footer (Phase 8): links to the public routes plus honest project
 * attribution. Rendered once in App.tsx below the router outlet.
 */
export default function Footer() {
    return (
        <footer className="site-footer">
            <div className="container footer-grid">
                <div className="footer-brand">
                    <div className="footer-logo">
                        <i className="fas fa-graduation-cap"></i> BCP Uniform Guide
                    </div>
                    <p>
                        AI-assisted uniform sizing and ordering for the BCP community - measurements in,
                        confident sizes out.
                    </p>
                </div>

                <nav className="footer-col" aria-label="Explore">
                    <h4>Explore</h4>
                    <Link to="/sizing">
                        <i className="fas fa-camera"></i> Body Scan
                    </Link>
                    <Link to="/catalog">
                        <i className="fas fa-tshirt"></i> Catalog
                    </Link>
                    <Link to="/cart">
                        <i className="fas fa-shopping-cart"></i> Cart
                    </Link>
                </nav>

                <nav className="footer-col" aria-label="Account">
                    <h4>Account</h4>
                    <Link to="/login">
                        <i className="fas fa-sign-in-alt"></i> Login
                    </Link>
                    <Link to="/orders">
                        <i className="fas fa-receipt"></i> Order history
                    </Link>
                    <Link to="/admin">
                        <i className="fas fa-lock"></i> Admin
                    </Link>
                </nav>

                <div className="footer-col">
                    <h4>Good to know</h4>
                    <span>
                        <i className="fas fa-circle-info"></i> Cash and online payment
                    </span>
                    <span>
                        <i className="fas fa-circle-info"></i> Six theme presets
                    </span>
                    <span>
                        <i className="fas fa-circle-info"></i> Works offline after first load
                    </span>
                </div>
            </div>

            <div className="container footer-bottom">
                <span>
                    &copy; {new Date().getFullYear()} BCP Uniform Guide - built as an academic project.
                </span>
                <span className="footer-note">
                    <i className="fas fa-heart"></i> React + Vite + PostgreSQL
                </span>
            </div>
        </footer>
    );
}
