const express = require('express');
const rateLimit = require('express-rate-limit');
const router = express.Router();

const orderController = require('../controllers/orderController');
const env = require('../config/env');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// A pending order holds stock, so checkout gets its own (generous) budget
// beyond the global API limit. Placed after requireAuth: only signed-in
// attempts count.
const orderLimiter = rateLimit({
    windowMs: 60 * 60 * 1000,
    limit: env.rateLimits.orders,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
    message: { message: 'Too many orders. Please try again later.' }
});

// Any signed-in user can check out and read their own orders.
router.post('/', requireAuth, orderLimiter, validate(orderController.schemas.create), orderController.create);
router.get('/', requireAuth, orderController.list);
router.get('/:id', requireAuth, orderController.get);

// Admin workflow: mark orders paid / ready / completed / cancelled.
router.patch(
    '/:id/status',
    requireAuth,
    requireAdmin,
    validate(orderController.schemas.status),
    orderController.updateStatus
);

module.exports = router;
