const express = require('express');
const router = express.Router();

const orderController = require('../controllers/orderController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Any signed-in user can check out and read their own orders.
router.post('/', requireAuth, validate(orderController.schemas.create), orderController.create);
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
