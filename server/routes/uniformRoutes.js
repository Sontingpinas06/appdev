const express = require('express');
const router = express.Router();
const uniformController = require('../controllers/uniformController');
const { requireAuth, requireAdmin } = require('../middleware/auth');

// Student routes
router.get('/', uniformController.getAllUniforms);
router.post('/recommendations', uniformController.getRecommendations);

// Admin routes (authenticated admins only)
router.patch('/stock', requireAuth, requireAdmin, uniformController.updateStock);

module.exports = router;
