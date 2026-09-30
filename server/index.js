const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const env = require('./config/env');
const { sequelize, User, Uniform, Size } = require('./models');
const uniformRoutes = require('./routes/uniformRoutes');
const authRoutes = require('./routes/authRoutes');
const orderRoutes = require('./routes/orderRoutes');

const app = express();

// Middleware
app.use(helmet());
app.use(
    cors({
        origin: env.clientOrigins.length ? env.clientOrigins : true,
        credentials: true
    })
);
app.use(express.json({ limit: '100kb' }));
app.use(cookieParser());
app.use(morgan('dev'));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/uniforms', uniformRoutes);
app.use('/api/orders', orderRoutes);

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

async function start() {
    try {
        await sequelize.authenticate();
        console.log(`Database connected (${sequelize.getDialect()})`);

        if (env.dbSync) {
            await sequelize.sync();
            console.log('Schema synced (DB_SYNC=true - replace with migrations before production)');
        }

        await seedUniforms();
        await seedAdmin();

        app.listen(env.port, () => {
            console.log(`Server running on port ${env.port}`);
        });
    } catch (error) {
        console.error(`Failed to start server: ${error.message}`);
        process.exit(1);
    }
}

start();
