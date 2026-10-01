import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import { OfflineBanner } from './components/OfflineBanner';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeModal from './components/ThemeModal';
import Toast from './components/Toast';
import Admin from './pages/Admin';
import Cart from './pages/Cart';
import Catalog from './pages/Catalog';
import Checkout from './pages/Checkout';
import CheckoutResult from './pages/CheckoutResult';
import CheckoutSandbox from './pages/CheckoutSandbox';
import Home from './pages/Home';
import Login from './pages/Login';
import Orders from './pages/Orders';
import Sizing from './pages/Sizing';
import { useAuthStore } from './store/auth';

/** The prototype swapped sections in place; scrolling to top matches that behaviour. */
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

/** Restores a session from the httpOnly refresh cookie on first load. */
function SessionBootstrap() {
    const restoreSession = useAuthStore((state) => state.restoreSession);

    useEffect(() => {
        void restoreSession();
    }, [restoreSession]);

    return null;
}

export default function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <SessionBootstrap />
            <a className="skip-link" href="#main-content">
                Skip to content
            </a>
            <Navbar />
            <OfflineBanner />
            <main className="main-content" id="main-content" tabIndex={-1}>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/sizing" element={<Sizing />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/cart" element={<Cart />} />
                    <Route
                        path="/checkout/:orderId"
                        element={
                            <ProtectedRoute>
                                <Checkout />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/checkout/sandbox"
                        element={
                            <ProtectedRoute>
                                <CheckoutSandbox />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/checkout/result"
                        element={
                            <ProtectedRoute>
                                <CheckoutResult />
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/orders"
                        element={
                            <ProtectedRoute>
                                <Orders />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="/login" element={<Login />} />
                    <Route
                        path="/admin"
                        element={
                            <ProtectedRoute adminOnly>
                                <Admin />
                            </ProtectedRoute>
                        }
                    />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            <Footer />
            <ThemeModal />
            <Toast />
        </BrowserRouter>
    );
}
