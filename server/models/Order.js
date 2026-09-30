/**
 * Order Model
 * Placed orders with line-item snapshots of the catalogue at purchase time
 * (name, size and price are copied so history survives catalog edits).
 */

const { DataTypes } = require('sequelize');

const money = (field) => ({
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    get() {
        const value = this.getDataValue(field);
        return value == null ? null : Number(value);
    }
});

module.exports = (sequelize) => {
    const Order = sequelize.define(
        'Order',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            orderNumber: {
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            userId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            status: {
                type: DataTypes.ENUM('pending', 'paid', 'ready', 'completed', 'cancelled'),
                defaultValue: 'pending'
            },
            totalAmount: money('totalAmount'),
            // 'cash_on_pickup' (default) or 'online' (PayMongo checkout).
            paymentMethod: {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: 'cash_on_pickup'
            },
            notes: {
                type: DataTypes.TEXT,
                allowNull: true
            }
        }
    );

    const OrderItem = sequelize.define('OrderItem', {
        uniformId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        sizeId: {
            type: DataTypes.INTEGER,
            allowNull: false
        },
        // Snapshots of the catalogue at checkout time
        uniformName: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: true
        },
        icon: {
            type: DataTypes.STRING,
            allowNull: true
        },
        sizeLabel: {
            type: DataTypes.STRING,
            allowNull: false
        },
        price: money('price'),
        quantity: {
            type: DataTypes.INTEGER,
            allowNull: false,
            validate: { min: 1 }
        }
    });

    Order.hasMany(OrderItem, { as: 'items', foreignKey: 'orderId', onDelete: 'CASCADE' });
    OrderItem.belongsTo(Order, { foreignKey: 'orderId' });

    return { Order, OrderItem };
};
