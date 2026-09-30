/**
 * Order Controller
 * Checkout validates stock and decrements it inside one DB transaction,
 * so two students can never buy the same last unit.
 */

const { z } = require('zod');
const { sequelize, Uniform, Size, Order, OrderItem, User } = require('../models');

const ORDER_STATUSES = ['pending', 'paid', 'ready', 'completed', 'cancelled'];

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------
const createOrderSchema = z.object({
    items: z
        .array(
            z.object({
                uniformId: z.number().int().positive(),
                sizeId: z.number().int().positive(),
                quantity: z.number().int().min(1).max(50)
            })
        )
        .min(1, 'Your cart is empty')
        .max(30, 'Too many distinct items in one order'),
    notes: z.string().trim().max(500).optional()
});

const statusSchema = z.object({
    status: z.enum(ORDER_STATUSES, {
        errorMap: () => ({ message: `Status must be one of: ${ORDER_STATUSES.join(', ')}` })
    })
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function newOrderNumber() {
    const now = new Date();
    const ymd = [
        String(now.getFullYear()).slice(2),
        String(now.getMonth() + 1).padStart(2, '0'),
        String(now.getDate()).padStart(2, '0')
    ].join('');
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `BCP-${ymd}-${suffix}`;
}

function serializeOrder(order, { withUser = false } = {}) {
    const plain = order.get({ plain: true });
    if (!withUser) {
        delete plain.userId;
        delete plain.user;
    } else if (plain.user) {
        plain.user = {
            id: plain.user.id,
            name: plain.user.name,
            email: plain.user.email,
            studentId: plain.user.studentId || null
        };
    }
    plain.totalAmount = Number(plain.totalAmount);
    plain.items = (plain.items || []).map((item) => ({ ...item, price: Number(item.price) }));
    return plain;
}

const orderController = {
    schemas: { create: createOrderSchema, status: statusSchema },

    // POST /api/orders - checkout
    create: async (req, res, next) => {
        const transaction = await sequelize.transaction();
        try {
            // Merge duplicate size lines (defensive: the client de-dupes too).
            const wanted = new Map();
            for (const item of req.body.items) {
                const previous = wanted.get(item.sizeId);
                if (previous && previous.uniformId !== item.uniformId) {
                    await transaction.rollback();
                    return res.status(400).json({ message: 'Conflicting items in cart' });
                }
                wanted.set(item.sizeId, {
                    uniformId: item.uniformId,
                    quantity: (previous?.quantity || 0) + item.quantity
                });
            }

            const conflicts = [];
            const lines = [];

            for (const [sizeId, { uniformId, quantity }] of wanted) {
                const size = await Size.findByPk(sizeId, {
                    transaction,
                    lock: transaction.LOCK.UPDATE
                });

                if (!size || size.UniformId !== uniformId) {
                    conflicts.push({ sizeId, requested: quantity, available: 0, reason: 'unknown' });
                    continue;
                }
                if (size.stock < quantity) {
                    conflicts.push({
                        sizeId,
                        requested: quantity,
                        available: size.stock,
                        reason: 'insufficient_stock'
                    });
                    continue;
                }
                lines.push({ size, quantity });
            }

            if (conflicts.length > 0) {
                await transaction.rollback();
                const message = conflicts.some((c) => c.reason === 'insufficient_stock')
                    ? 'Some items no longer have enough stock'
                    : 'Your cart contains items that are no longer available';
                return res.status(409).json({ message, conflicts });
            }

            // Snapshot the catalogue entries for the receipt.
            const uniformIds = [...new Set(lines.map((line) => line.size.UniformId))];
            const uniforms = await Uniform.findAll({
                where: { id: uniformIds },
                attributes: ['id', 'name', 'category', 'icon'],
                transaction
            });
            const byId = new Map(uniforms.map((uniform) => [uniform.id, uniform]));

            let totalAmount = 0;
            const itemRows = lines.map(({ size, quantity }) => {
                const uniform = byId.get(size.UniformId);
                const price = Number(size.price);
                totalAmount += price * quantity;
                return {
                    uniformId: size.UniformId,
                    sizeId: size.id,
                    uniformName: uniform.name,
                    category: uniform.category,
                    icon: uniform.icon,
                    sizeLabel: size.size,
                    price,
                    quantity
                };
            });

            // Stock decrement happens under the row locks taken above.
            for (const { size, quantity } of lines) {
                await size.decrement('stock', { by: quantity, transaction });
            }

            const order = await Order.create(
                {
                    orderNumber: newOrderNumber(),
                    userId: req.user.id,
                    totalAmount: Math.round(totalAmount * 100) / 100,
                    notes: req.body.notes || null,
                    items: itemRows
                },
                { include: [{ model: OrderItem, as: 'items' }], transaction }
            );

            await transaction.commit();

            const created = await Order.findByPk(order.id, {
                include: [{ model: OrderItem, as: 'items' }]
            });
            return res.status(201).json({ order: serializeOrder(created) });
        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    },

    // GET /api/orders - own orders, or every order for admins (?scope=all)
    list: async (req, res, next) => {
        try {
            const wantsAll = req.query.scope === 'all';
            if (wantsAll && req.user.role !== 'admin') {
                return res.status(403).json({ message: 'Admin access required' });
            }

            const include = [{ model: OrderItem, as: 'items' }];
            if (wantsAll) {
                include.push({
                    model: User,
                    as: 'user',
                    attributes: ['id', 'name', 'email', 'studentId']
                });
            }

            const orders = await Order.findAll({
                where: wantsAll ? {} : { userId: req.user.id },
                include,
                order: [['createdAt', 'DESC']]
            });

            res.json({ orders: orders.map((order) => serializeOrder(order, { withUser: wantsAll })) });
        } catch (error) {
            next(error);
        }
    },

    // GET /api/orders/:id - owner or admin
    get: async (req, res, next) => {
        try {
            const order = await Order.findByPk(req.params.id, {
                include: [
                    { model: OrderItem, as: 'items' },
                    {
                        model: User,
                        as: 'user',
                        attributes: ['id', 'name', 'email', 'studentId']
                    }
                ]
            });

            // 404 (not 403) so order IDs can't be probed.
            if (!order || (order.userId !== req.user.id && req.user.role !== 'admin')) {
                return res.status(404).json({ message: 'Order not found' });
            }

            res.json({ order: serializeOrder(order, { withUser: req.user.role === 'admin' }) });
        } catch (error) {
            next(error);
        }
    },

    // PATCH /api/orders/:id/status - admin workflow
    updateStatus: async (req, res, next) => {
        const transaction = await sequelize.transaction();
        try {
            const { status } = req.body;
            // Lock the order row on its own: FOR UPDATE cannot be combined
            // with the outer joins produced by include().
            const order = await Order.findByPk(req.params.id, {
                transaction,
                lock: transaction.LOCK.UPDATE
            });

            if (!order) {
                await transaction.rollback();
                return res.status(404).json({ message: 'Order not found' });
            }

            if (order.status === status) {
                await transaction.rollback();
                const unchanged = await Order.findByPk(req.params.id, {
                    include: [{ model: OrderItem, as: 'items' }]
                });
                return res.json({ order: serializeOrder(unchanged) });
            }

            const items = await OrderItem.findAll({
                where: { orderId: order.id },
                transaction
            });

            const wasCancelled = order.status === 'cancelled';
            const nowCancelled = status === 'cancelled';

            if (wasCancelled !== nowCancelled) {
                for (const item of items) {
                    const size = await Size.findByPk(item.sizeId, {
                        transaction,
                        lock: transaction.LOCK.UPDATE
                    });
                    if (!size) continue;

                    if (nowCancelled) {
                        // Return the reserved stock to the shelf.
                        await size.increment('stock', { by: item.quantity, transaction });
                    } else if (size.stock < item.quantity) {
                        await transaction.rollback();
                        return res.status(409).json({
                            message: `Not enough stock to restore ${item.uniformName} (${item.sizeLabel})`,
                            conflicts: [{ sizeId: size.id, available: size.stock }]
                        });
                    } else {
                        await size.decrement('stock', { by: item.quantity, transaction });
                    }
                }
            }

            order.status = status;
            await order.save({ transaction });
            await transaction.commit();

            const updated = await Order.findByPk(order.id, {
                include: [{ model: OrderItem, as: 'items' }]
            });
            res.json({ order: serializeOrder(updated) });
        } catch (error) {
            await transaction.rollback();
            next(error);
        }
    }
};

module.exports = orderController;
module.exports.ORDER_STATUSES = ORDER_STATUSES;
