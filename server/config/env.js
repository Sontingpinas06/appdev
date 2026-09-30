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
    dbSync: (process.env.DB_SYNC ?? (!isProduction ? 'true' : 'false')) === 'true'
};
