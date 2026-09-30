import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getOrders } from '../api/client';
import type { Order, OrderStatus } from '../types';

export const STATUS_LABELS: Record<OrderStatus, { label: string; className: string }> = {
    pending: { label: 'Awaiting payment', className: 'status-pending' },
    paid: { label: 'Paid', className: 'status-paid' },
    ready: { label: 'Ready for pickup', className: 'status-ready' },
    completed: { label: 'Completed', className: 'status-completed' },
    cancelled: { label: 'Cancelled', className: 'status-cancelled' }
};

export function formatDate(value: string): string {
    return new Date(value).toLocaleString(undefined, {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

/** Payment chip label/state for an order (shared with the admin table). */
export function paymentSummary(order: Order): {
    label: string;
    className: string;
    canPay: boolean;
} {
    if (order.paymentMethod !== 'online') {
        return { label: 'Cash at pickup', className: 'payment-cash', canPay: false };
    }

    const status = order.payment?.status;
    const method = order.payment?.method ? order.payment.method.toUpperCase() : null;
    const payable = order.status === 'pending';

    if (status === 'succeeded' || order.status === 'paid') {
        return {
            label: method ? `Paid · ${method}` : 'Paid online',
            className: 'payment-paid',
            canPay: false
        };
    }
    if (status === 'failed' || status === 'expired') {
        return { label: 'Payment failed', className: 'payment-failed', canPay: payable };
    }
    if (status === 'cancelled') {
        return { label: 'Payment cancelled', className: 'payment-failed', canPay: payable };
    }
    return { label: 'Payment pending', className: 'payment-pending', canPay: payable };
}

export default function Orders() {
    const [orders, setOrders] = useState<Order[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;

        getOrders()
            .then((data) => {
                if (!cancelled) {
                    setOrders(data.orders);
                    setError(null);
                }
            })
            .catch((err: Error) => {
                if (!cancelled) setError(err.message);
            });

        return () => {
            cancelled = true;
        };
    }, []);

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-receipt"></i> My Orders
                    </h2>
                    <p>Track your uniform orders and pick-up status</p>
                </div>

                {orders === null && !error && (
                    <div style={{ textAlign: 'center', padding: '3rem' }}>
                        <i className="fas fa-spinner fa-spin" style={{ fontSize: '2rem', color: 'var(--primary-color)' }}></i>
                    </div>
                )}

                {error && (
                    <div className="empty-cart">
                        <i className="fas fa-triangle-exclamation"></i>
                        <h3>Could not load your orders</h3>
                        <p>{error}</p>
                    </div>
                )}

                {orders !== null && orders.length === 0 && (
                    <div className="empty-cart">
                        <i className="fas fa-box-open"></i>
                        <h3>No orders yet</h3>
                        <p>When you check out, your orders will show up here.</p>
                        <Link to="/catalog" className="btn btn-primary">
                            <i className="fas fa-tshirt"></i> Browse Catalog
                        </Link>
                    </div>
                )}

                {orders !== null && orders.length > 0 && (
                    <div className="order-list">
                        {orders.map((order) => {
                            const status = STATUS_LABELS[order.status];
                            const payment = paymentSummary(order);
                            return (
                                <div className="order-card" key={order.id}>
                                    <div className="order-card-header">
                                        <div>
                                            <h4>
                                                <i className="fas fa-box"></i> {order.orderNumber}
                                            </h4>
                                            <p>
                                                <i className="fas fa-clock"></i>{' '}
                                                {formatDate(order.createdAt)}
                                            </p>
                                        </div>
                                        <span className={`status-badge ${status.className}`}>
                                            {status.label}
                                        </span>
                                    </div>

                                    <div className="order-card-items">
                                        {order.items.map((item) => (
                                            <div className="order-line" key={item.id}>
                                                <span>
                                                    <i className={`fas ${item.icon || 'fa-shirt'}`}></i>{' '}
                                                    {item.uniformName} ({item.sizeLabel}) x
                                                    {item.quantity}
                                                </span>
                                                <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                                            </div>
                                        ))}
                                    </div>

                                    <div className="order-card-footer">
                                        {order.notes && <span className="order-notes">{order.notes}</span>}
                                        <span className={`payment-chip ${payment.className}`}>
                                            <i className="fas fa-credit-card"></i> {payment.label}
                                        </span>
                                        {payment.canPay && (
                                            <Link
                                                to={`/checkout/${order.id}`}
                                                className="btn btn-primary btn-small pay-now"
                                            >
                                                <i className="fas fa-lock"></i> Pay now
                                            </Link>
                                        )}
                                        <strong>Total: ₱{order.totalAmount.toFixed(2)}</strong>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </section>
    );
}
