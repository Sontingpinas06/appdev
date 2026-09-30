/**
 * Payment Model
 * One row per checkout attempt against a provider (PayMongo or the built-in
 * sandbox). Amount mirrors the order total at the time of the attempt.
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

const STATUSES = ['pending', 'succeeded', 'failed', 'cancelled', 'expired'];

module.exports = (sequelize) => {
    const Payment = sequelize.define(
        'Payment',
        {
            id: {
                type: DataTypes.UUID,
                defaultValue: DataTypes.UUIDV4,
                primaryKey: true
            },
            orderId: {
                type: DataTypes.UUID,
                allowNull: false
            },
            provider: {
                // 'sandbox' | 'paymongo' - which gateway created the session.
                type: DataTypes.STRING,
                allowNull: false
            },
            providerSessionId: {
                // PayMongo checkout session id (cs_...) or the sandbox equivalent.
                type: DataTypes.STRING,
                allowNull: false,
                unique: true
            },
            checkoutUrl: {
                type: DataTypes.TEXT,
                allowNull: true
            },
            referenceNumber: {
                // Our order number; PayMongo echoes it back as reference_number.
                type: DataTypes.STRING,
                allowNull: false
            },
            amount: money('amount'),
            status: {
                type: DataTypes.ENUM(STATUSES),
                defaultValue: 'pending'
            },
            method: {
                // Set when the gateway reports how the customer paid
                // (card, gcash, paymaya, qrph, ...).
                type: DataTypes.STRING,
                allowNull: true
            },
            failureReason: {
                type: DataTypes.STRING,
                allowNull: true
            },
            paidAt: {
                type: DataTypes.DATE,
                allowNull: true
            },
            providerData: {
                // Selected fields from the provider payload for reconciliation.
                type: DataTypes.JSON,
                allowNull: true
            }
        }
    );

    return Payment;
};

module.exports.STATUSES = STATUSES;
