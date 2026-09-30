/**
 * PayMongo provider - Hosted Checkout via POST /v2/checkout_sessions.
 *
 * Flow (docs.paymongo.com/docs/payment-channels-hosted-checkout-quick-start):
 *   1. create a Checkout Session server-side with the secret key
 *   2. redirect the customer to the returned `checkout_url`
 *   3. PayMongo calls our webhook with `checkout_session.payment.paid`
 *
 * Never expose the secret key to the client; the session is created here only.
 */

const env = require('../config/env');

const API_BASE = 'https://api.paymongo.com/v2/checkout_sessions';

const toCentavos = (pesos) => Math.round(Number(pesos) * 100);

function clientOrigin() {
    return (
        env.payments.publicUrl ||
        env.clientOrigins[0] ||
        `http://localhost:${env.port === 5000 ? 5173 : env.port}`
    );
}

class PayMongoProvider {
    constructor() {
        this.name = 'paymongo';
    }

    get enabled() {
        return Boolean(env.payments.paymongoSecretKey);
    }

    /**
     * @param {{order: object, itemCount: number}} input
     * @returns {Promise<{providerSessionId: string, checkoutUrl: string}>}
     */
    async createCheckout({ order, itemCount }) {
        const origin = clientOrigin();
        const secretKey = env.payments.paymongoSecretKey;

        // A single line item for the full amount avoids any ambiguity about
        // whether the gateway treats `amount` as unit or line total.
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                Authorization: `Basic ${Buffer.from(`${secretKey}:`).toString('base64')}`,
                'Content-Type': 'application/json',
                // Retrying the same logical operation returns the cached session.
                'Idempotency-Key': `order-${order.id}`
            },
            body: JSON.stringify({
                data: {
                    attributes: {
                        line_items: [
                            {
                                name: `BCP uniform order ${order.orderNumber} (${itemCount} item${
                                    itemCount === 1 ? '' : 's'
                                })`,
                                amount: toCentavos(order.totalAmount),
                                currency: 'PHP',
                                quantity: 1
                            }
                        ],
                        payment_method_types: env.payments.methodTypes,
                        success_url: `${origin}/checkout/result?order=${order.id}&status=success`,
                        cancel_url: `${origin}/checkout/result?order=${order.id}&status=cancelled`,
                        reference_number: order.orderNumber,
                        metadata: { order_id: order.id }
                    }
                }
            })
        });

        let payload = null;
        try {
            payload = await response.json();
        } catch {
            // Non-JSON error body: handled below.
        }

        if (!response.ok) {
            const detail =
                payload?.errors?.map((error) => error.detail || error.code).join('; ') ||
                `HTTP ${response.status}`;
            throw new Error(`PayMongo checkout failed: ${detail}`);
        }

        const checkoutUrl = payload?.data?.attributes?.checkout_url;
        const sessionId = payload?.data?.id;
        if (!checkoutUrl || !sessionId) {
            throw new Error('PayMongo returned no checkout_url');
        }

        return { providerSessionId: sessionId, checkoutUrl };
    }
}

module.exports = PayMongoProvider;
