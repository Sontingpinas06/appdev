/**
 * Scan provider registry.
 * SCAN_PROVIDER=auto (default) prefers a real AI provider when one is
 * configured and falls back to the sandbox, so local setups need no keys.
 */

const env = require('../config/env');
const SandboxScanProvider = require('./sandbox');

const sandbox = new SandboxScanProvider();

const providers = [sandbox];

let resolved = null;

function getScanProvider() {
    if (resolved) return resolved;

    const configured = env.scan.provider;
    if (configured === 'sandbox') {
        resolved = sandbox;
    } else {
        // 'auto': first enabled real provider, else the sandbox. When a real
        // provider lands it registers here with an `enabled` getter.
        resolved = providers.find((provider) => provider.enabled !== false && provider !== sandbox) || sandbox;
    }
    return resolved;
}

module.exports = { getScanProvider };
