const express = require('express');
const router = express.Router();
const uniformController = require('../controllers/uniformController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Student routes
router.get('/', uniformController.getAllUniforms);
router.post('/recommendations', uniformController.getRecommendations);

// Admin routes (authenticated admins only)
router.patch(
    '/stock',
    requireAuth,
    requireAdmin,
    validate(uniformController.schemas.stock),
    uniformController.updateStock
);

module.exports = router;
