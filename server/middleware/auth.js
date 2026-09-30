const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');

function extractToken(req) {
    const header = req.headers.authorization || '';
    return header.startsWith('Bearer ') ? header.slice(7) : null;
}

/** Verifies the access token and loads the user so roles are always fresh. */
async function requireAuth(req, res, next) {
    const token = extractToken(req);
    if (!token) {
        return res.status(401).json({ message: 'Authentication required' });
    }

    let payload;
    try {
        payload = jwt.verify(token, env.jwt.secret);
    } catch {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    if (payload.type !== 'access') {
        return res.status(401).json({ message: 'Invalid or expired token' });
    }

    try {
        const user = await User.findByPk(payload.sub);
        if (!user) return res.status(401).json({ message: 'Invalid or expired token' });
        req.user = user;
        next();
    } catch (error) {
        next(error);
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Admin access required' });
    }
    next();
}

module.exports = { requireAuth, requireAdmin, extractToken };
