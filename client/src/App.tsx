import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import ThemeModal from './components/ThemeModal';
import Toast from './components/Toast';
import Admin from './pages/Admin';
import Catalog from './pages/Catalog';
import Home from './pages/Home';
import Login from './pages/Login';
import Sizing from './pages/Sizing';

/** The prototype swapped sections in place; scrolling to top matches that behaviour. */
function ScrollToTop() {
    const { pathname } = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [pathname]);

    return null;
}

export default function App() {
    return (
        <BrowserRouter>
            <ScrollToTop />
            <Navbar />
            <main className="main-content">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/sizing" element={<Sizing />} />
                    <Route path="/catalog" element={<Catalog />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/admin" element={<Admin />} />
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </main>
            <ThemeModal />
            <Toast />
        </BrowserRouter>
    );
}
