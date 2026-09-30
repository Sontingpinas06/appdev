/**
 * Payment provider registry.
 * PAYMENT_PROVIDER=auto (default) prefers PayMongo when a secret key exists
 * and falls back to the sandbox otherwise, so local setups work with no keys.
 */

const env = require('../config/env');
const PayMongoProvider = require('./paymongo');
const SandboxProvider = require('./sandbox');

const paymongo = new PayMongoProvider();
const sandbox = new SandboxProvider();

let resolved = null;

function getProvider() {
    if (resolved) return resolved;

    const configured = env.payments.provider;
    if (configured === 'paymongo') {
        resolved = paymongo;
    } else if (configured === 'sandbox') {
        resolved = sandbox;
    } else {
        resolved = paymongo.enabled ? paymongo : sandbox;
    }
    return resolved;
}

module.exports = { getProvider };
