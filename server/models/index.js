/**
 * Model registry: boots Sequelize and exports every model.
 * Callers should never construct their own connection.
 */
const sequelize = require('../config/db');
const defineUser = require('./User');
const defineUniform = require('./Uniform');
const defineOrder = require('./Order');

const User = defineUser(sequelize);
const { Uniform, Size } = defineUniform(sequelize);
const { Order, OrderItem } = defineOrder(sequelize);

User.hasMany(Order, { as: 'orders', foreignKey: 'userId', onDelete: 'CASCADE' });
Order.belongsTo(User, { as: 'user', foreignKey: 'userId' });

module.exports = {
    sequelize,
    User,
    Uniform,
    Size,
    Order,
    OrderItem
};
