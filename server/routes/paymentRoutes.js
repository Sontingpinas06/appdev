const express = require('express');
const router = express.Router();

const paymentController = require('../controllers/paymentController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

// Signed-in students start checkout and poll their own payment status.
router.post('/checkout', requireAuth, validate(paymentController.schemas.checkout), paymentController.create);
router.post(
    '/sandbox/confirm',
    requireAuth,
    validate(paymentController.schemas.confirm),
    paymentController.confirm
);
router.get('/:orderId', requireAuth, paymentController.get);

// Gateway callback: no session auth - verified against the raw body signature.
router.post('/webhook', paymentController.webhook);

module.exports = router;
