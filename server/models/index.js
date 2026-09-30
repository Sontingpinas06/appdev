/**
 * Model registry: boots Sequelize and exports every model.
 * Callers should never construct their own connection.
 */
const sequelize = require('../config/db');
const defineUser = require('./User');
const defineUniform = require('./Uniform');
const defineOrder = require('./Order');
const definePayment = require('./Payment');
const defineWebhookEvent = require('./WebhookEvent');

const User = defineUser(sequelize);
const { Uniform, Size } = defineUniform(sequelize);
const { Order, OrderItem } = defineOrder(sequelize);
const Payment = definePayment(sequelize);
const WebhookEvent = defineWebhookEvent(sequelize);

User.hasMany(Order, { as: 'orders', foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { as: 'user', foreignKey: 'userId' });

Order.hasMany(Payment, { as: 'payments', foreignKey: 'orderId', onDelete: 'CASCADE' });
Payment.belongsTo(Order, { foreignKey: 'orderId' });

module.exports = {
    sequelize,
    User,
    Uniform,
    Size,
    Order,
    OrderItem,
    Payment,
    WebhookEvent
};
