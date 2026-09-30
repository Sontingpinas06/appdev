import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ApiError, getOrder, postPaymentCheckout } from '../api/client';
import type { Order } from '../types';
import { formatDate } from './Orders';

/**
 * Payment page for an online order: creates the checkout session (the server
 * reuses a live one, so re-renders never mint duplicates) and hands the
 * customer off to the gateway - the built-in sandbox page locally, the
 * PayMongo-hosted page once keys are configured.
 */
export default function Checkout() {
    const { orderId } = useParams();
    const [order, setOrder] = useState<Order | null>(null);
    const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const started = useRef(false);

    useEffect(() => {
        if (!orderId || started.current) return;
        started.current = true;

        (async () => {
            try {
                const { order: loaded } = await getOrder(orderId);
                setOrder(loaded);

                if (loaded.status !== 'pending') return; // already paid / cancelled
                if (loaded.paymentMethod !== 'online') {
                    setError('This order pays cash at pickup.');
                    return;
                }

                const session = await postPaymentCheckout(orderId);
                setCheckoutUrl(session.checkoutUrl);
            } catch (err) {
                setError(err instanceof ApiError ? err.message : 'Could not start payment');
            }
        })();
    }, [orderId]);

    const paid = order?.status === 'paid' || order?.payment?.status === 'succeeded';
    const cancelled = order?.status === 'cancelled';

    if (error && !order) {
        return (
            <section className="section active">
                <div className="container">
                    <div className="empty-cart">
                        <i className="fas fa-triangle-exclamation"></i>
                        <h3>Payment unavailable</h3>
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

    if (paid || cancelled) {
        return (
            <section className="section active">
                <div className="container">
                    <div className="empty-cart">
                        <i
                            className={`fas ${paid ? 'fa-circle-check' : 'fa-circle-xmark'}`}
                            style={{ color: paid ? 'var(--success-color, #16a34a)' : undefined }}
                        ></i>
                        <h3>{paid ? 'Payment received' : 'Order cancelled'}</h3>
                        <p>
                            {order.orderNumber} is{' '}
                            {paid ? 'paid - collect it at the pickup point.' : 'no longer payable.'}
                        </p>
                        <Link to="/orders" className="btn btn-primary">
                            <i className="fas fa-receipt"></i> View order
                        </Link>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-lock"></i> Secure Payment
                    </h2>
                    <p>
                        {order.orderNumber} &middot; placed {formatDate(order.createdAt)}
                    </p>
                </div>

                <div className="cart-content">
                    <div className="cart-items">
                        {order.items.map((item) => (
                            <div className="cart-item" key={item.id}>
                                <div className="cart-item-icon">
                                    <i className={`fas ${item.icon || 'fa-shirt'}`}></i>
                                </div>
                                <div className="cart-item-info">
                                    <h4>{item.uniformName}</h4>
                                    <p>
                                        Size {item.sizeLabel} &middot; ₱{item.price.toFixed(2)} each
                                    </p>
                                </div>
                                <div className="cart-item-price">
                                    ₱{(item.price * item.quantity).toFixed(2)}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="cart-summary">
                        <div className="summary-card">
                            <h3>
                                <i className="fas fa-receipt"></i> Amount due
                            </h3>
                            <div className="summary-row total">
                                <span>Total</span>
                                <span>₱{order.totalAmount.toFixed(2)}</span>
                            </div>
                            <p className="checkout-note">
                                You'll complete payment on the gateway page
                                {order.payment?.provider === 'sandbox'
                                    ? ' (built-in test gateway - no real money moves).'
                                    : ' (GCash, Maya, QR Ph or card).'}
                            </p>

                            {error && <p className="form-error">{error}</p>}

                            <button
                                className="btn btn-primary btn-large"
                                style={{ width: '100%' }}
                                disabled={!checkoutUrl}
                                onClick={() => checkoutUrl && window.location.assign(checkoutUrl)}
                            >
                                {checkoutUrl ? (
                                    <>
                                        <i className="fas fa-arrow-up-right-from-square"></i>{' '}
                                        Continue to payment
                                    </>
                                ) : (
                                    <>
                                        <i className="fas fa-spinner fa-spin"></i> Preparing…
                                    </>
                                )}
                            </button>
                            <Link
                                to="/orders"
                                className="btn btn-secondary"
                                style={{ width: '100%', marginTop: '0.5rem' }}
                            >
                                <i className="fas fa-arrow-left"></i> Back to orders
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}
