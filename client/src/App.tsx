import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
import ThemeModal from './components/ThemeModal';
import Toast from './components/Toast';
import Admin from './pages/Admin';
import Cart from './pages/Cart';
import Catalog from './pages/Catalog';
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
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/sizing" element={<Sizing />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/cart" element={<Cart />} />
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
            <ThemeModal />
            <Toast />
        </BrowserRouter>
    );
}
