const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const env = require('./config/env');
const { sequelize, User, Uniform, Size } = require('./models');
const uniformRoutes = require('./routes/uniformRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const { getProvider } = require('./payments');

const app = express();

const captureRawBody = (req, _res, buf) => {
    req.rawBody = Buffer.from(buf);
};

// X-Powered-By advertises the stack for no benefit.
app.disable('x-powered-by');
// Behind a reverse proxy Express must trust it (TRUST_PROXY=1) to see the real
// client IP - rate limiting and any IP-based logic depend on req.ip.
app.set('trust proxy', env.trustProxy);

// Global per-IP budget across all API routes. Mounted before the body parsers
// so floods are cut off before payloads are buffered.
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.rateLimits.api,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many requests. Please slow down.' }
});

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: env.clientOrigins.length ? env.clientOrigins : true,
        credentials: true
    })
);
app.use('/api', apiLimiter);
// The photo-scan endpoint carries a base64 image, so it gets its own parser
// with a larger cap ahead of the global 100kb guard; express.json skips
// bodies that were already parsed.
app.use('/api/uniforms/scan', express.json({ limit: '8mb', verify: captureRawBody }));
// rawBody must be the original bytes: webhook signatures are verified over it.
app.use(express.json({ limit: '100kb', verify: captureRawBody }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/uniforms', uniformRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.get('/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date() });
});

// 404
app.use((req, res) => {
    res.status(404).json({ message: 'Not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err.type === 'entity.parse.failed') {
        return res.status(400).json({ message: 'Malformed JSON body' });
    }
    if (err.type === 'entity.too.large') {
        return res.status(413).json({ message: 'Payload too large' });
    }

    console.error(err);
    res.status(err.status || 500).json({
        message: 'Something went wrong!',
        ...(env.isProduction ? {} : { error: err.message })
    });
});

/** Idempotent admin bootstrap from ADMIN_* env vars. Never overwrites a password. */
async function seedAdmin() {
    if (!env.admin.password) {
        if (env.isProduction) console.warn('ADMIN_PASSWORD not set - no admin account seeded');
        return;
    }

    const email = env.admin.email.toLowerCase();
    const [user, created] = await User.findOrCreate({
        where: { email },
        defaults: {
            name: env.admin.name,
            email,
            password: env.admin.password,
            gender: 'Unisex',
            role: 'admin'
        }
    });

    if (user.role !== 'admin') {
        user.role = 'admin';
        await user.save();
    }

    console.log(`Admin account ready: ${email}${created ? ' (seeded)' : ''}`);
}

/** Loads the reference catalogue into an empty database (idempotent). */
async function seedUniforms() {
    if ((await Uniform.count()) > 0) return;

    const catalogue = require('./data/initialData');
    await Uniform.bulkCreate(
        catalogue.map((uniform) => ({ ...uniform, sizes: uniform.sizes })),
        { include: [{ model: Size, as: 'sizes' }] }
    );

    // Keep auto-increment ahead of the explicit ids we just inserted.
    if (sequelize.getDialect() === 'postgres') {
        await sequelize.query(
            `SELECT setval(pg_get_serial_sequence('"Uniforms"', 'id'), (SELECT MAX(id) FROM "Uniforms"))`
        );
    }

    console.log(`Seeded ${catalogue.length} uniforms`);
}

/**
 * Minimal column shim until Sequelize migrations land (Phase 0/7): sync()
 * creates tables but never alters existing ones, so columns added to already
 * -created tables need an idempotent statement here.
 */
async function ensureSchema() {
    if (sequelize.getDialect() === 'postgres') {
        await sequelize.query(
            'ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(255) NOT NULL DEFAULT \'cash_on_pickup\''
        );
    } else {
        try {
            await sequelize.query(
                "ALTER TABLE Orders ADD COLUMN paymentMethod VARCHAR(255) NOT NULL DEFAULT 'cash_on_pickup'"
            );
        } catch (error) {
            if (!/duplicate column/i.test(error.message)) throw error;
        }
    }
}

async function start() {
    try {
        await sequelize.authenticate();
        console.log(`Database connected (${sequelize.getDialect()})`);

        if (env.dbSync) {
            await sequelize.sync();
            await ensureSchema();
            console.log('Schema synced (DB_SYNC=true - replace with migrations before production)');
        }

        await seedUniforms();
        await seedAdmin();

        const provider = getProvider();
        console.log(`Payment provider: ${provider.name}`);
        if (provider.name === 'paymongo') {
            const origin = env.payments.publicUrl || env.clientOrigins[0] || 'https://your-app.example';
            console.log(`Register the webhook in PayMongo: ${origin}/api/payments/webhook`);
        }

        app.listen(env.port, () => {
            console.log(`Server running on port ${env.port}`);
        });
    } catch (error) {
        console.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

start();
