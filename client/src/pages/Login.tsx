/**
 * Placeholder until Phase 2 (Auth & roles).
 * The prototype's localStorage login is intentionally not ported: production
 * authentication lands as JWT + bcrypt on the API instead.
 */
export default function Login() {
    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-sign-in-alt"></i> Student Login
                    </h2>
                    <p>Login to access your profile and measurements</p>
                </div>

                <div className="sizing-container">
                    <div className="form-card">
                        <h3>
                            <i className="fas fa-lock"></i> Coming in Phase 2
                        </h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            Accounts are being moved from browser storage to the server. Until then the
                            catalog and body-scan sizing work without logging in.
                        </p>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            <i className="fas fa-info-circle"></i> Contact your administrator to get login
                            credentials once accounts go live.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
