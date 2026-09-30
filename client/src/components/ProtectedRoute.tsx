import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../store/auth';

interface Props {
    children: ReactNode;
    /** Restrict to admins (students get a 403-style screen, not a redirect). */
    adminOnly?: boolean;
}

export default function ProtectedRoute({ children, adminOnly = false }: Props) {
    const { user, status } = useAuthStore();
    const location = useLocation();

    if (status === 'loading') {
        return (
            <section className="section active">
                <div className="container" style={{ textAlign: 'center', padding: '4rem 0' }}>
                    <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>Checking your session…</p>
                </div>
            </section>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace state={{ from: location.pathname }} />;
    }

    if (adminOnly && user.role !== 'admin') {
        return (
            <section className="section active">
                <div className="container">
                    <div className="section-header">
                        <h2>
                            <i className="fas fa-lock"></i> Admin access required
                        </h2>
                        <p>You are signed in as a student ({user.email})</p>
                    </div>
                    <div className="sizing-container">
                        <div className="form-card">
                            <p style={{ color: 'var(--text-secondary)' }}>
                                Your account does not have permission to view the admin panel. Contact an
                                administrator if you believe this is a mistake.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return <>{children}</>;
}
