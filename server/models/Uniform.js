/**
 * Uniform Model
 * Defines Uniforms and their associated sizes
 */

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Uniform = sequelize.define('Uniform', {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        category: {
            type: DataTypes.STRING,
            allowNull: false
        },
        gender: {
            type: DataTypes.ENUM('Male', 'Female', 'Unisex'),
            allowNull: false
        },
        description: DataTypes.TEXT,
        icon: DataTypes.STRING // FontAwesome icon class
    });

    const Size = sequelize.define('Size', {
        size: {
            type: DataTypes.STRING,
            allowNull: false
        },
        price: {
            type: DataTypes.DECIMAL(10, 2),
            allowNull: false
        },
        stock: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        // Sizing Chart Ranges
        height_min: DataTypes.FLOAT,
        height_max: DataTypes.FLOAT,
        weight_min: DataTypes.FLOAT,
        weight_max: DataTypes.FLOAT,
        chest_min: DataTypes.FLOAT,
        chest_max: DataTypes.FLOAT,
        waist_min: DataTypes.FLOAT,
        waist_max: DataTypes.FLOAT
    });

    Uniform.hasMany(Size, { as: 'sizes', onDelete: 'CASCADE' });
    Size.belongsTo(Uniform);

    return { Uniform, Size };
};
