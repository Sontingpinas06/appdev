/**
 * Central, validated environment configuration.
 * Fails fast on boot instead of surfacing errors mid-request.
 */
require('dotenv').config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const isProduction = NODE_ENV === 'production';

function required(name, fallback) {
    const value = process.env[name] ?? fallback;
    if (value === undefined || value === '') {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const jwtSecret = required('JWT_SECRET', isProduction ? undefined : 'dev-only-access-secret');
const jwtRefreshSecret = required(
    'JWT_REFRESH_SECRET',
    isProduction ? undefined : 'dev-only-refresh-secret'
);

if (isProduction && jwtSecret === jwtRefreshSecret) {
    throw new Error('JWT_SECRET and JWT_REFRESH_SECRET must differ in production');
}

const DEV_ADMIN_PASSWORD = 'Admin123!';

const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? '' : DEV_ADMIN_PASSWORD);

if (isProduction && adminPassword === DEV_ADMIN_PASSWORD) {
    throw new Error('Refusing to start in production with the default ADMIN_PASSWORD');
}

// ---------------------------------------------------------------------------
// Payments
// ---------------------------------------------------------------------------
const PAYMENT_PROVIDER = process.env.PAYMENT_PROVIDER || 'auto'; // auto | sandbox | paymongo
if (!['auto', 'sandbox', 'paymongo'].includes(PAYMENT_PROVIDER)) {
    throw new Error('PAYMENT_PROVIDER must be one of: auto, sandbox, paymongo');
}

const paymongoSecretKey = process.env.PAYMONGO_SECRET_KEY || '';

if (PAYMENT_PROVIDER === 'paymongo' && !paymongoSecretKey) {
    throw new Error('PAYMENT_PROVIDER=paymongo requires PAYMONGO_SECRET_KEY');
}

if (isProduction && PAYMENT_PROVIDER === 'sandbox' && !process.env.PAYMENT_WEBHOOK_SECRET) {
    throw new Error('The sandbox provider in production requires an explicit PAYMENT_WEBHOOK_SECRET');
}

// ---------------------------------------------------------------------------
// Photo-scan sizing
// ---------------------------------------------------------------------------
const SCAN_PROVIDER = process.env.SCAN_PROVIDER || 'auto'; // auto | sandbox
if (!['auto', 'sandbox'].includes(SCAN_PROVIDER)) {
    throw new Error('SCAN_PROVIDER must be one of: auto, sandbox');
}

const scanMaxBytes = Number(process.env.SCAN_MAX_BYTES || 5 * 1024 * 1024);
if (!Number.isFinite(scanMaxBytes) || scanMaxBytes < 1024) {
    throw new Error('SCAN_MAX_BYTES must be a number >= 1024');
}

module.exports = {
    nodeEnv: NODE_ENV,
    isProduction,
    port: Number(process.env.PORT || 5000),
    clientOrigins: (process.env.CLIENT_ORIGINS || '')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),

    database: {
        url: process.env.DATABASE_URL || null,
        dialect: process.env.DB_DIALECT || null,
        host: process.env.DB_HOST || 'localhost',
        port: Number(process.env.DB_PORT || 5432),
        name: process.env.DB_NAME || 'uniguide',
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD || '',
        // Managed/cloud databases require TLS; local Postgres usually does not.
        ssl: (process.env.DB_SSL || 'false') === 'true'
    },

    jwt: {
        secret: jwtSecret,
        refreshSecret: jwtRefreshSecret,
        accessTtl: process.env.JWT_ACCESS_TTL || '15m',
        refreshTtlMs: Number(process.env.JWT_REFRESH_TTL_DAYS || 7) * 24 * 60 * 60 * 1000
    },

    cookie: {
        name: 'bcp_rt',
        secure: isProduction
    },

    // Seeded admin account (idempotent, runs at boot).
    admin: {
        name: process.env.ADMIN_NAME || 'BCP Administrator',
        email: process.env.ADMIN_EMAIL || 'admin@bcp.edu.ph',
        password: adminPassword
    },

    // Dev-only schema sync until Sequelize migrations land (Phase 0/7).
    dbSync: (process.env.DB_SYNC ?? (!isProduction ? 'true' : 'false')) === 'true',

    payments: {
        // 'auto' uses PayMongo when a secret key is configured, sandbox otherwise.
        provider: PAYMENT_PROVIDER,
        paymongoSecretKey,
        // Secret for the webhook endpoint registered in the PayMongo dashboard.
        paymongoWebhookSecret: process.env.PAYMONGO_WEBHOOK_SECRET || '',
        // Effective webhook signing secret: PayMongo's endpoint secret wins in
        // production; the dev default lets tests sign synthetic events locally.
        webhookSecret:
            process.env.PAYMONGO_WEBHOOK_SECRET ||
            process.env.PAYMENT_WEBHOOK_SECRET ||
            (isProduction ? '' : 'uniguide-dev-sandbox-secret'),
        // Hosted checkout methods (documented values: card, gcash, qrph).
        methodTypes: (process.env.PAYMONGO_PAYMENT_METHOD_TYPES || 'card,gcash,qrph')
            .split(',')
            .map((method) => method.trim())
            .filter(Boolean),
        // Public origin used for hosted-checkout return URLs.
        publicUrl: process.env.PUBLIC_URL || ''
    },

    scan: {
        // 'auto' prefers a configured AI provider; today only the sandbox
        // exists, so auto resolves to it (a later phase adds real providers).
        provider: SCAN_PROVIDER,
        // Decoded image size cap before a request is refused with 413.
        maxBytes: scanMaxBytes,
        // Requests allowed per IP per 15-minute window.
        rateLimit: Number(process.env.SCAN_RATE_LIMIT || 60)
    }
};
