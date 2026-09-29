const express = require('express');
const router = express.Router();
const uniformController = require('../controllers/uniformController');
// const authMiddleware = require('../middleware/auth'); // For production

// Student routes
router.get('/', uniformController.getAllUniforms);
router.post('/recommendations', uniformController.getRecommendations);

// Admin routes (should be protected by admin middleware in production)
router.patch('/stock', uniformController.updateStock);

module.exports = router;
