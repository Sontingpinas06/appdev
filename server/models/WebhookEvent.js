/**
 * WebhookEvent Model
 * Dedup ledger for gateway webhooks. The event id is the primary key, so a
 * retried delivery fails the insert and can be acknowledged without re-running
 * any financial side effects (PayMongo retries up to 12 times).
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
    sequelize.define('WebhookEvent', {
        eventId: {
            type: DataTypes.STRING,
            primaryKey: true
        },
        type: {
            type: DataTypes.STRING,
            allowNull: true
        },
        livemode: {
            type: DataTypes.BOOLEAN,
            allowNull: true
        },
        paymentId: {
            type: DataTypes.UUID,
            allowNull: true
        },
        processedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        }
    });
