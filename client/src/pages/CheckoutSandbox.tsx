import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ApiError, getOrder, postSandboxConfirm } from '../api/client';
import { useAuthStore } from '../store/auth';
import type { GatewayMethod, Order } from '../types';

const METHODS: { id: GatewayMethod; label: string; icon: string }[] = [
    { id: 'gcash', label: 'GCash', icon: 'fa-mobile-screen' },
    { id: 'maya', label: 'Maya', icon: 'fa-wallet' },
    { id: 'qrph', label: 'QR Ph', icon: 'fa-qrcode' },
    { id: 'card', label: 'Debit / Credit card', icon: 'fa-credit-card' }
];

/**
 * Stand-in for the PayMongo-hosted checkout page. Reached from the sandbox
 * checkout URL the server hands out when no payment keys are configured, so
 * the whole pay flow stays testable without an external gateway. The approval
 * posts to the sandbox confirm endpoint, which feeds the same event pipeline
 * as the real webhook.
 */
export default function CheckoutSandbox() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('orderId');
    const navigate = useNavigate();
    const user = useAuthStore((state) => state.user);

    const [order, setOrder] = useState<Order | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [method, setMethod] = useState<GatewayMethod>('gcash');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        if (!orderId) {
            setError('Missing order reference.');
            return;
        }
        let cancelled = false;

        getOrder(orderId)
            .then(({ order: loaded }) => {
                if (cancelled) return;
                if (loaded.status === 'paid' || loaded.payment?.status === 'succeeded') {
                    navigate(`/checkout/result?order=${orderId}&status=success`, {
                        replace: true
                    });
                    return;
                }
                setOrder(loaded);
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            });

        return () => {
            cancelled = true;
        };
    }, [orderId, navigate]);

    async function settle(result: 'success' | 'declined') {
        if (!orderId || busy) return;
        setBusy(true);
        try {
            await postSandboxConfirm(orderId, result, method);
            navigate(`/checkout/result?order=${orderId}&status=${result}`, { replace: true });
        } catch (err) {
            setError(
                err instanceof ApiError ? err.message : 'Could not complete the simulated payment'
            );
            setBusy(false);
        }
    }

    if (error && !order) {
        return (
            <section className="section active">
                <div className="container">
                    <div className="empty-cart">
                        <i className="fas fa-triangle-exclamation"></i>
                        <h3>Gateway unavailable</h3>
                        <p>{error}</p>
                        <Link to="/orders" className="btn btn-primary">
                            <i className="fas fa-receipt"></i> My Orders
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    if (!order) {
        return (
            <section className="section active">
                <div className="container" style={{ textAlign: 'center', padding: '3rem' }}>
                    <i
                        className="fas fa-spinner fa-spin"
                        style={{ fontSize: '2rem', color: 'var(--primary-color)' }}
                    ></i>
                </div>
            </section>
        );
    }

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-shield-halved"></i> Gateway Checkout
                    </h2>
                    <p>Simulated payment page - test mode only</p>
                </div>

                <div className="sandbox-panel">
                    <div className="sandbox-header">
                        <span className="sandbox-brand">
                            <i className="fas fa-bolt"></i> PayMongo{' '}
                            <strong>TEST MODE</strong>
                        </span>
                        <span className="sandbox-badge">Sandbox</span>
                    </div>

                    <div className="sandbox-body">
                        <div className="sandbox-order">
                            <div>
                                <span>Order</span>
                                <strong>{order.orderNumber}</strong>
                            </div>
                            <div>
                                <span>Pay as</span>
                                <strong>{user?.name || 'BCP student'}</strong>
                            </div>
                            <div className="sandbox-amount">
                                <span>Amount due</span>
                                <strong>₱{order.totalAmount.toFixed(2)}</strong>
                            </div>
                        </div>

                        <p className="sandbox-methods-label">Choose a payment method</p>
                        <div className="sandbox-methods" role="radiogroup" aria-label="Payment method">
                            {METHODS.map((option) => (
                                <label
                                    key={option.id}
                                    className={`sandbox-method${method === option.id ? ' active' : ''}`}
                                >
                                    <input
                                        type="radio"
                                        name="gateway-method"
                                        value={option.id}
                                        checked={method === option.id}
                                        onChange={() => setMethod(option.id)}
                                    />
                                    <i className={`fas ${option.icon}`}></i> {option.label}
                                </label>
                            ))}
                        </div>

                        {error && <p className="form-error">{error}</p>}

                        <div className="sandbox-actions">
                            <button
                                className="btn btn-primary btn-large"
                                onClick={() => void settle('success')}
                                disabled={busy}
                            >
                                <i className="fas fa-check"></i>{' '}
                                {busy ? 'Processing…' : 'Simulate successful payment'}
                            </button>
                            <button
                                className="btn btn-secondary"
                                onClick={() => void settle('declined')}
                                disabled={busy}
                            >
                                <i className="fas fa-xmark"></i> Simulate declined payment
                            </button>
                        </div>

                        <p className="sandbox-disclaimer">
                            No real money moves here. Configure PAYMONGO_SECRET_KEY to load the
                            real hosted checkout page instead.
                        </p>
                    </div>
                </div>
            </div>
        </section>
    );
}
