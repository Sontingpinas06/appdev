const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { z } = require('zod');
const { Op } = require('sequelize');
const env = require('../config/env');
const { User } = require('../models');

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const registerSchema = z.object({
    name: z.string().trim().min(2, 'Name is required').max(80),
    email: z.string().trim().toLowerCase().email('Enter a valid email').max(120),
    password: z
        .string()
        .min(8, 'Password must be at least 8 characters')
        .max(128)
        .regex(/[A-Za-z]/, 'Password must include at least one letter')
        .regex(/\d/, 'Password must include at least one number'),
    studentId: z
        .string()
        .trim()
        .min(3, 'Student ID looks too short')
        .max(30)
        .optional()
        .transform((value) => (value === '' ? undefined : value)),
    gender: z.enum(['Male', 'Female'], {
        errorMap: () => ({ message: 'Gender must be Male or Female' })
    })
});

const loginSchema = z.object({
    identifier: z.string().trim().min(1, 'Email or student ID is required'),
    password: z.string().min(1, 'Password is required')
});

// ---------------------------------------------------------------------------
// Tokens
// ---------------------------------------------------------------------------
const JWT_ALGORITHM = 'HS256';

/**
 * Precomputed cost-12 hash of a throwaway string (never a real password).
 * Compared when an account does not exist so unknown-user and wrong-password
 * logins burn the same bcrypt time and cannot be told apart by a stopwatch.
 */
const DUMMY_PASSWORD_HASH = '$2b$12$EEYZVZ4Zwf4f.hUZ0bMR6OVFbC/4wbuB2Hr1.MgdGWJVQYZnWZViq';

function signAccessToken(user) {
    return jwt.sign({ sub: user.id, role: user.role, type: 'access' }, env.jwt.secret, {
        expiresIn: env.jwt.accessTtl
    });
}

function signRefreshToken(user) {
    return jwt.sign(
        { sub: user.id, v: user.tokenVersion, type: 'refresh' },
        env.jwt.refreshSecret,
        { expiresIn: Math.floor(env.jwt.refreshTtlMs / 1000) }
    );
}

function setRefreshCookie(res, token) {
    res.cookie(env.cookie.name, token, {
        httpOnly: true,
        sameSite: 'lax',
        secure: env.cookie.secure,
        path: '/api/auth',
        maxAge: env.jwt.refreshTtlMs
    });
}

function issueSession(res, user) {
    setRefreshCookie(res, signRefreshToken(user));
    return { user: user.toPublic(), accessToken: signAccessToken(user) };
}

// ---------------------------------------------------------------------------
// Controller
// ---------------------------------------------------------------------------
const authController = {
    schemas: { register: registerSchema, login: loginSchema },

    register: async (req, res, next) => {
        try {
            const { name, email, password, studentId, gender } = req.body;

            const existing = await User.findOne({
                where: {
                    [Op.or]: [{ email }, ...(studentId ? [{ studentId }] : [])]
                },
                paranoid: false
            });

            if (existing) {
                const field = existing.email === email ? 'email' : 'student ID';
                return res.status(409).json({ message: `That ${field} is already registered` });
            }

            const user = await User.create({ name, email, password, studentId, gender, role: 'student' });
            return res.status(201).json(issueSession(res, user));
        } catch (error) {
            next(error);
        }
    },

    login: async (req, res, next) => {
        try {
            const { identifier, password } = req.body;

            const user = await User.scope('withSecrets').findOne({
                where: {
                    [Op.or]: [
                        { email: identifier.toLowerCase() },
                        { studentId: identifier }
                    ]
                }
            });

            // Constant message: never reveal which field was wrong.
            const invalid = () => res.status(401).json({ message: 'Invalid credentials' });

            if (!user) {
                // Same bcrypt work as a real compare: no timing oracle for
                // "does this account exist?".
                await bcrypt.compare(password, DUMMY_PASSWORD_HASH);
                return invalid();
            }
            if (!(await user.verifyPassword(password))) return invalid();

            return res.json(issueSession(res, user));
        } catch (error) {
            next(error);
        }
    },

    refresh: async (req, res, next) => {
        try {
            const token = req.cookies?.[env.cookie.name];
            if (!token) return res.status(401).json({ message: 'No active session' });

            let payload;
            try {
                payload = jwt.verify(token, env.jwt.refreshSecret, { algorithms: [JWT_ALGORITHM] });
            } catch {
                return res.status(401).json({ message: 'No active session' });
            }

            if (payload.type !== 'refresh') return res.status(401).json({ message: 'No active session' });

            const user = await User.scope('withSecrets').findByPk(payload.sub);
            if (!user || user.tokenVersion !== payload.v) {
                return res.status(401).json({ message: 'No active session' });
            }

            return res.json(issueSession(res, user));
        } catch (error) {
            next(error);
        }
    },

    logout: async (req, res, next) => {
        try {
            const token = req.cookies?.[env.cookie.name];
            if (token) {
                try {
                    const payload = jwt.verify(token, env.jwt.refreshSecret, {
                        algorithms: [JWT_ALGORITHM]
                    });
                    if (payload.type === 'refresh') {
                        const user = await User.scope('withSecrets').findByPk(payload.sub);
                        // Invalidate every refresh token already issued.
                        if (user && user.tokenVersion === payload.v) {
                            await user.increment('tokenVersion');
                        }
                    }
                } catch {
                    // Expired/invalid cookie: still clear it below.
                }
            }

            res.clearCookie(env.cookie.name, { path: '/api/auth' });
            return res.json({ message: 'Logged out' });
        } catch (error) {
            next(error);
        }
    },

    me: async (req, res) => {
        res.json({ user: req.user.toPublic() });
    }
};

module.exports = authController;
