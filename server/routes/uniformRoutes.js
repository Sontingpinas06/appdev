const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();
const uniformController = require('../controllers/uniformController');
const env = require('../config/env');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Photo scans are public (like manual sizing) but capped per IP so a real AI
// provider behind this seam can never be flooded.
const scanLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: env.scan.rateLimit,
    standardHeaders: true,
    legacyHeaders: false,
    message: { message: 'Too many scan requests. Please try again later.' }
});

// Student routes
router.get('/', uniformController.getAllUniforms);
router.post('/recommendations', uniformController.getRecommendations);
router.post('/scan', scanLimiter, validate(uniformController.schemas.scan), uniformController.scan);

// Admin routes (authenticated admins only)
router.patch(
    '/stock',
    requireAuth,
    requireAdmin,
    validate(uniformController.schemas.stock),
    uniformController.updateStock
);

module.exports = router;
