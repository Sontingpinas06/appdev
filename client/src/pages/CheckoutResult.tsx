import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ApiError, getPayment } from '../api/client';
import type { Payment } from '../types';

type Phase = 'checking' | 'succeeded' | 'failed' | 'timeout';

const MAX_ATTEMPTS = 30;
const POLL_MS = 2000;

/**
 * Where the gateway redirects back (and where the sandbox flow lands after
 * settling). The redirect parameters are only hints - truth comes from
 * polling the payment row, because the webhook can arrive a beat after we do.
 */
export default function CheckoutResult() {
    const [searchParams] = useSearchParams();
    const orderId = searchParams.get('order');
    const hint = searchParams.get('status');

    const [phase, setPhase] = useState<Phase>('checking');
    const [payment, setPayment] = useState<Payment | null>(null);
    const [orderNumber, setOrderNumber] = useState('');
    const [error, setError] = useState<string | null>(null);
    const timerRef = useRef<number | null>(null);

    useEffect(() => {
        if (!orderId) {
            setPhase('failed');
            setError('Missing order reference.');
            return;
        }

        // A cancel redirect gets a short grace period instead of 30 polls.
        const maxAttempts = hint === 'cancelled' ? 2 : MAX_ATTEMPTS;
        let cancelled = false;
        let attempts = 0;

        const stop = () => {
            if (timerRef.current !== null) {
                window.clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };

        const tick = async () => {
            try {
                const data = await getPayment(orderId);
                if (cancelled) return;

                setPayment(data.payment);
                setOrderNumber(data.order?.orderNumber || '');

                const status = data.payment?.status;
                if (status === 'succeeded' || data.order?.status === 'paid') {
                    setPhase('succeeded');
                    return;
                }
                if (
                    status === 'failed' ||
                    status === 'cancelled' ||
                    status === 'expired' ||
                    data.order?.status === 'cancelled'
                ) {
                    setPhase('failed');
                    return;
                }

                attempts += 1;
                if (attempts >= maxAttempts) {
                    setPhase(hint === 'cancelled' ? 'failed' : 'timeout');
                    return;
                }
                timerRef.current = window.setTimeout(() => void tick(), POLL_MS);
            } catch (err) {
                if (cancelled) return;
                attempts += 1;
                if (attempts >= maxAttempts) {
                    setError(err instanceof ApiError ? err.message : 'Lost contact with the server');
                    setPhase('timeout');
                    return;
                }
                timerRef.current = window.setTimeout(() => void tick(), POLL_MS);
            }
        };

        void tick();

        return () => {
            cancelled = true;
            stop();
        };
    }, [orderId, hint]);

    if (phase === 'checking') {
        return (
            <section className="section active">
                <div className="container">
                    <div className="checkout-result">
                        <i className="fas fa-circle-notch fa-spin result-spinner"></i>
                        <h2>Confirming your payment…</h2>
                        <p>
                            {orderNumber
                                ? `We're verifying ${orderNumber} with the payment provider.`
                                : "We're verifying your payment with the provider."}
                        </p>
                        <p className="result-muted">This usually takes a few seconds.</p>
                    </div>
                </div>
            </section>
        );
    }

    if (phase === 'succeeded') {
        return (
            <section className="section active">
                <div className="container">
                    <div className="checkout-result">
                        <i className="fas fa-circle-check result-icon success"></i>
                        <h2>Payment successful</h2>
                        <p>
                            {orderNumber ? `${orderNumber} - ` : ''}₱
                            {Number(payment?.amount ?? 0).toFixed(2)} paid
                            {payment?.method ? ` via ${payment.method.toUpperCase()}` : ''}.
                        </p>
                        <div className="result-actions">
                            <Link to="/orders" className="btn btn-primary">
                                <i className="fas fa-receipt"></i> View my orders
                            </Link>
                            <Link to="/catalog" className="btn btn-secondary">
                                <i className="fas fa-tshirt"></i> Continue shopping
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    if (phase === 'timeout') {
        return (
            <section className="section active">
                <div className="container">
                    <div className="checkout-result">
                        <i className="fas fa-hourglass-half result-icon pending"></i>
                        <h2>Still confirming</h2>
                        <p>
                            {orderNumber || 'Your order'} hasn't been confirmed yet. Your payment is
                            safe - we'll mark it paid as soon as the gateway reports back.
                        </p>
                        {error && <p className="result-muted">{error}</p>}
                        <div className="result-actions">
                            <Link to="/orders" className="btn btn-primary">
                                <i className="fas fa-receipt"></i> Check my orders
                            </Link>
                            <Link to={`/checkout/${orderId}`} className="btn btn-secondary">
                                <i className="fas fa-rotate-right"></i> Check again
                            </Link>
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section className="section active">
            <div className="container">
                <div className="checkout-result">
                    <i className="fas fa-circle-xmark result-icon failure"></i>
                    <h2>Payment not completed</h2>
                    <p>
                        {error
                            ? error
                            : 'The payment did not go through, so nothing was charged. Your order is still reserved - you can try again.'}
                    </p>
                    <div className="result-actions">
                        <Link to={`/checkout/${orderId}`} className="btn btn-primary">
                            <i className="fas fa-rotate-right"></i> Try again
                        </Link>
                        <Link to="/orders" className="btn btn-secondary">
                            <i className="fas fa-receipt"></i> My orders
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}
