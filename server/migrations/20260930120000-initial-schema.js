'use strict';

/**
 * Initial schema: every table the API needs, mirroring server/models.
 *
 * Each table is created only when it is missing, so this migration is safe on
 * a development database that DB_SYNC already built (it was written against
 * that database's live schema) and mandatory for fresh ones (Docker/CI), where
 * DB_SYNC is false. The catalogue and admin account are seeded at boot, not by
 * a seeder - the app owns that data.
 */

module.exports = {
    async up(queryInterface, Sequelize) {
        const { DataTypes } = Sequelize;
        const dialect = queryInterface.sequelize.getDialect();

        const existing = new Set(
            (await queryInterface.showAllTables()).map((entry) =>
                String(typeof entry === 'string' ? entry : entry.tableName).toLowerCase()
            )
        );
        const missing = (name) => !existing.has(name.toLowerCase());

        /** Orphaned enum types from an interrupted create would fail CREATE TYPE. */
        const dropEnumsIfPresent = async (types) => {
            if (dialect !== 'postgres') return;
            for (const type of types) {
                await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}"`);
            }
        };

        // --- Users ----------------------------------------------------------
        if (missing('Users')) {
            await dropEnumsIfPresent(['enum_Users_gender', 'enum_Users_role']);
            await queryInterface.createTable('Users', {
                id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
                name: { type: DataTypes.STRING, allowNull: false },
                email: { type: DataTypes.STRING, allowNull: false, unique: true },
                studentId: { type: DataTypes.STRING, allowNull: true, unique: true },
                password: { type: DataTypes.STRING, allowNull: false },
                gender: { type: DataTypes.ENUM('Male', 'Female', 'Unisex'), allowNull: false },
                role: { type: DataTypes.ENUM('student', 'admin'), allowNull: true, defaultValue: 'student' },
                tokenVersion: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
                height: { type: DataTypes.FLOAT, allowNull: true },
                weight: { type: DataTypes.FLOAT, allowNull: true },
                chest: { type: DataTypes.FLOAT, allowNull: true },
                waist: { type: DataTypes.FLOAT, allowNull: true },
                lastScanDate: { type: DataTypes.DATE, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            });
        }

        // --- Uniforms (Size references it) ----------------------------------
        if (missing('Uniforms')) {
            await dropEnumsIfPresent(['enum_Uniforms_gender']);
            await queryInterface.createTable('Uniforms', {
                id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
                name: { type: DataTypes.STRING, allowNull: false },
                category: { type: DataTypes.STRING, allowNull: false },
                gender: { type: DataTypes.ENUM('Male', 'Female', 'Unisex'), allowNull: false },
                description: { type: DataTypes.TEXT, allowNull: true },
                icon: { type: DataTypes.STRING, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            });
        }

        if (missing('Sizes')) {
            await queryInterface.createTable('Sizes', {
                id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
                size: { type: DataTypes.STRING, allowNull: false },
                price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
                stock: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 0 },
                height_min: { type: DataTypes.FLOAT, allowNull: true },
                height_max: { type: DataTypes.FLOAT, allowNull: true },
                weight_min: { type: DataTypes.FLOAT, allowNull: true },
                weight_max: { type: DataTypes.FLOAT, allowNull: true },
                chest_min: { type: DataTypes.FLOAT, allowNull: true },
                chest_max: { type: DataTypes.FLOAT, allowNull: true },
                waist_min: { type: DataTypes.FLOAT, allowNull: true },
                waist_max: { type: DataTypes.FLOAT, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false },
                UniformId: {
                    type: DataTypes.INTEGER,
                    allowNull: true,
                    references: { model: 'Uniforms', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE'
                }
            });
        }

        // --- Orders (OrderItems/Payments reference it) ----------------------
        if (missing('Orders')) {
            await dropEnumsIfPresent(['enum_Orders_status']);
            await queryInterface.createTable('Orders', {
                id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
                orderNumber: { type: DataTypes.STRING, allowNull: false, unique: true },
                userId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'Users', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE'
                },
                status: {
                    type: DataTypes.ENUM('pending', 'paid', 'ready', 'completed', 'cancelled'),
                    allowNull: true,
                    defaultValue: 'pending'
                },
                totalAmount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
                paymentMethod: { type: DataTypes.STRING, allowNull: false, defaultValue: 'cash_on_pickup' },
                notes: { type: DataTypes.TEXT, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            });
        } else if (dialect === 'postgres') {
            // A database predating Phase 4 may miss this column; additive only.
            await queryInterface.sequelize.query(
                `ALTER TABLE "Orders" ADD COLUMN IF NOT EXISTS "paymentMethod" VARCHAR(255) NOT NULL DEFAULT 'cash_on_pickup'`
            );
        }

        if (missing('OrderItems')) {
            await queryInterface.createTable('OrderItems', {
                id: { type: DataTypes.INTEGER, allowNull: false, primaryKey: true, autoIncrement: true },
                uniformId: { type: DataTypes.INTEGER, allowNull: false },
                sizeId: { type: DataTypes.INTEGER, allowNull: false },
                uniformName: { type: DataTypes.STRING, allowNull: false },
                category: { type: DataTypes.STRING, allowNull: true },
                icon: { type: DataTypes.STRING, allowNull: true },
                sizeLabel: { type: DataTypes.STRING, allowNull: false },
                price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
                quantity: { type: DataTypes.INTEGER, allowNull: false },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false },
                orderId: {
                    type: DataTypes.UUID,
                    allowNull: true,
                    references: { model: 'Orders', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE'
                }
            });
        }

        if (missing('Payments')) {
            await dropEnumsIfPresent(['enum_Payments_status']);
            await queryInterface.createTable('Payments', {
                id: { type: DataTypes.UUID, allowNull: false, primaryKey: true },
                orderId: {
                    type: DataTypes.UUID,
                    allowNull: false,
                    references: { model: 'Orders', key: 'id' },
                    onDelete: 'CASCADE',
                    onUpdate: 'CASCADE'
                },
                provider: { type: DataTypes.STRING, allowNull: false },
                providerSessionId: { type: DataTypes.STRING, allowNull: false, unique: true },
                checkoutUrl: { type: DataTypes.TEXT, allowNull: true },
                referenceNumber: { type: DataTypes.STRING, allowNull: false },
                amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
                status: {
                    type: DataTypes.ENUM('pending', 'succeeded', 'failed', 'cancelled', 'expired'),
                    allowNull: true,
                    defaultValue: 'pending'
                },
                method: { type: DataTypes.STRING, allowNull: true },
                failureReason: { type: DataTypes.STRING, allowNull: true },
                paidAt: { type: DataTypes.DATE, allowNull: true },
                providerData: { type: DataTypes.JSON, allowNull: true },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            });
        }

        // --- WebhookEvents (dedup ledger) -----------------------------------
        if (missing('WebhookEvents')) {
            await queryInterface.createTable('WebhookEvents', {
                eventId: { type: DataTypes.STRING, allowNull: false, primaryKey: true },
                type: { type: DataTypes.STRING, allowNull: true },
                livemode: { type: DataTypes.BOOLEAN, allowNull: true },
                paymentId: { type: DataTypes.UUID, allowNull: true },
                processedAt: { type: DataTypes.DATE, allowNull: true, defaultValue: DataTypes.NOW },
                createdAt: { type: DataTypes.DATE, allowNull: false },
                updatedAt: { type: DataTypes.DATE, allowNull: false }
            });
        }
    },

    async down(queryInterface) {
        const dialect = queryInterface.sequelize.getDialect();
        // Reverse dependency order so no FK blocks a drop.
        for (const table of ['WebhookEvents', 'Payments', 'OrderItems', 'Orders', 'Sizes', 'Uniforms', 'Users']) {
            await queryInterface.dropTable(table);
        }
        if (dialect === 'postgres') {
            for (const type of [
                'enum_Users_gender',
                'enum_Users_role',
                'enum_Uniforms_gender',
                'enum_Orders_status',
                'enum_Payments_status'
            ]) {
                await queryInterface.sequelize.query(`DROP TYPE IF EXISTS "${type}"`);
            }
        }
    }
};
