import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError, postOrder } from '../api/client';
import { useAuthStore } from '../store/auth';
import { cartCount, cartTotal, useCartStore } from '../store/cart';
import { showToast } from '../store/toast';
import type { PaymentMethod } from '../types';

export default function Cart() {
    const items = useCartStore((state) => state.items);
    const setQuantity = useCartStore((state) => state.setQuantity);
    const remove = useCartStore((state) => state.remove);
    const clear = useCartStore((state) => state.clear);
    const user = useAuthStore((state) => state.user);
    const navigate = useNavigate();

    const [placing, setPlacing] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_pickup');
    const count = cartCount(items);
    const subtotal = cartTotal(items);

    async function handleCheckout() {
        if (!user) {
            showToast('Login to place your order', 'error');
            navigate('/login', { state: { from: '/cart' } });
            return;
        }

        setPlacing(true);
        try {
            const { order } = await postOrder(
                items.map((item) => ({
                    uniformId: item.uniformId,
                    sizeId: item.sizeId,
                    quantity: item.quantity
                })),
                undefined,
                paymentMethod
            );
            clear();
            showToast(`Order ${order.orderNumber} placed!`, 'success');
            // Online orders go straight to the payment page; cash orders to history.
            navigate(paymentMethod === 'online' ? `/checkout/${order.id}` : '/orders');
        } catch (error) {
            if (error instanceof ApiError && error.status === 409) {
                const detail = error.body?.conflicts
                    ?.map((conflict) => `only ${conflict.available} left`)
                    .join(', ');
                showToast(detail ? `Not enough stock: ${detail}` : error.message, 'error');
            } else {
                showToast(error instanceof Error ? error.message : 'Checkout failed', 'error');
            }
        } finally {
            setPlacing(false);
        }
    }

    return (
        <section className="section active">
            <div className="container">
                <div className="section-header">
                    <h2>
                        <i className="fas fa-shopping-cart"></i> Your Cart
                    </h2>
                    <p>
                        {count === 0
                            ? 'Nothing here yet'
                            : `${count} item${count === 1 ? '' : 's'} ready for checkout`}
                    </p>
                </div>

                <div className="cart-content">
                    {items.length === 0 ? (
                        <div className="empty-cart">
                            <i className="fas fa-cart-plus"></i>
                            <h3>Your cart is empty</h3>
                            <p>Browse the catalog and add the uniforms you need.</p>
                            <Link to="/catalog" className="btn btn-primary">
                                <i className="fas fa-tshirt"></i> Browse Catalog
                            </Link>
                        </div>
                    ) : (
                        <>
                            <div className="cart-items">
                                {items.map((item) => (
                                    <div className="cart-item" key={item.sizeId}>
                                        <div className="cart-item-icon">
                                            <i className={`fas ${item.icon}`}></i>
                                        </div>
                                        <div className="cart-item-info">
                                            <h4>{item.uniformName}</h4>
                                            <p>
                                                Size {item.sizeLabel} &middot; {item.category} &middot;{' '}
                                                ₱{item.price.toFixed(2)} each
                                            </p>
                                            <button
                                                className="btn btn-secondary btn-small"
                                                onClick={() => remove(item.sizeId)}
                                            >
                                                <i className="fas fa-trash"></i> Remove
                                            </button>
                                        </div>
                                        <div className="cart-item-quantity">
                                            <button
                                                className="qty-btn"
                                                onClick={() =>
                                                    setQuantity(item.sizeId, item.quantity - 1)
                                                }
                                                disabled={item.quantity <= 1}
                                                aria-label="Decrease quantity"
                                            >
                                                -
                                            </button>
                                            <span className="qty-display">{item.quantity}</span>
                                            <button
                                                className="qty-btn"
                                                onClick={() =>
                                                    setQuantity(item.sizeId, item.quantity + 1)
                                                }
                                                disabled={item.quantity >= item.stock}
                                                aria-label="Increase quantity"
                                            >
                                                +
                                            </button>
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
                                        <i className="fas fa-receipt"></i> Order Summary
                                    </h3>
                                    <div className="summary-row">
                                        <span>Subtotal ({count} items)</span>
                                        <span>₱{subtotal.toFixed(2)}</span>
                                    </div>
                                    <div className="summary-row">
                                        <span>Pickup</span>
                                        <span>At the BCP canteen</span>
                                    </div>
                                    <div className="summary-row total">
                                        <span>Total</span>
                                        <span>₱{subtotal.toFixed(2)}</span>
                                    </div>

                                    <div
                                        className="payment-choice"
                                        role="radiogroup"
                                        aria-label="Payment method"
                                    >
                                        <label
                                            className={`payment-option${
                                                paymentMethod === 'cash_on_pickup' ? ' active' : ''
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="cash_on_pickup"
                                                checked={paymentMethod === 'cash_on_pickup'}
                                                onChange={() => setPaymentMethod('cash_on_pickup')}
                                            />
                                            <i className="fas fa-money-bill-wave"></i>
                                            <span>
                                                Cash at pickup
                                                <small>Pay when you claim your order</small>
                                            </span>
                                        </label>
                                        <label
                                            className={`payment-option${
                                                paymentMethod === 'online' ? ' active' : ''
                                            }`}
                                        >
                                            <input
                                                type="radio"
                                                name="paymentMethod"
                                                value="online"
                                                checked={paymentMethod === 'online'}
                                                onChange={() => setPaymentMethod('online')}
                                            />
                                            <i className="fas fa-credit-card"></i>
                                            <span>
                                                Pay online now
                                                <small>GCash, Maya, QR Ph or card</small>
                                            </span>
                                        </label>
                                    </div>

                                    <button
                                        className="btn btn-primary btn-large"
                                        style={{ width: '100%' }}
                                        onClick={() => void handleCheckout()}
                                        disabled={placing}
                                    >
                                        <i className="fas fa-check"></i>{' '}
                                        {placing ? 'Placing order…' : 'Place Order'}
                                    </button>
                                    <Link
                                        to="/catalog"
                                        className="btn btn-secondary"
                                        style={{ width: '100%', marginTop: '0.5rem' }}
                                    >
                                        <i className="fas fa-arrow-left"></i> Continue shopping
                                    </Link>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </section>
    );
}
