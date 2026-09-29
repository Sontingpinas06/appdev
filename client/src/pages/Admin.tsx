/**
 * Placeholder until Phase 3 (Admin orders/inventory) is ported.
 * The legacy static admin panel still lives in prototype/admin.html.
 */
export default function Admin() {
    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-shield-halved"></i> Admin Panel
                    </h2>
                    <p>Inventory, pricing and orders management</p>
                </div>

                <div className="sizing-container">
                    <div className="form-card">
                        <h3>
                            <i className="fas fa-screwdriver-wrench"></i> Under construction
                        </h3>
                        <p style={{ color: 'var(--text-secondary)' }}>
                            The admin dashboard is being rebuilt against the API with login-protected
                            routes. Stock and pricing changes will sync to the catalog automatically.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
