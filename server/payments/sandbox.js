/**
 * Sandbox provider - the no-keys fallback that keeps checkout working end to
 * end while a PayMongo account is being set up (or in CI).
 *
 * It mirrors the hosted-checkout contract: create a session, hand back a URL,
 * settle through the same event pipeline. The URL points at an in-app page
 * that lets you simulate an approved or declined payment; approval posts an
 * authenticated confirm request that feeds the same handler the webhook uses.
 */

const crypto = require('crypto');
const env = require('../config/env');

function clientOrigin() {
    return (
        env.payments.publicUrl ||
        env.clientOrigins[0] ||
        `http://localhost:${env.port === 5000 ? 5173 : env.port}`
    );
}

class SandboxProvider {
    constructor() {
        this.name = 'sandbox';
    }

    get enabled() {
        return true;
    }

    /**
     * @param {{order: object}} input
     * @returns {Promise<{providerSessionId: string, checkoutUrl: string}>}
     */
    async createCheckout({ order }) {
        const providerSessionId = `cs_sandbox_${crypto.randomBytes(10).toString('hex')}`;
        return {
            providerSessionId,
            checkoutUrl: `${clientOrigin()}/checkout/sandbox?orderId=${order.id}`
        };
    }
}

module.exports = SandboxProvider;
