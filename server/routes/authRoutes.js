const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const authController = require('../controllers/authController');
const env = require('../config/env');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Brute-force protection on credential endpoints (per IP).
const credentialLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.rateLimits.auth,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many attempts. Please try again in a few minutes.' }
});

router.post('/register', credentialLimiter, validate(authController.schemas.register), authController.register);
router.post('/login', credentialLimiter, validate(authController.schemas.login), authController.login);
router.post('/refresh', authController.refresh);
router.post('/logout', authController.logout);
router.get('/me', requireAuth, authController.me);

module.exports = router;
