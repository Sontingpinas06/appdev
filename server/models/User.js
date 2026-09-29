/**
 * User Model
 * Defines the schema for Students and Admins
 */

// This is a conceptual Sequelize model definition
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const User = sequelize.define('User', {
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: { isEmail: true }
        },
        studentId: {
            type: DataTypes.STRING,
            unique: true,
            allowNull: true // Optional for admins
        },
        password: {
            type: DataTypes.STRING,
            allowNull: false
        },
        gender: {
            type: DataTypes.ENUM('Male', 'Female', 'Unisex'),
            allowNull: false
        },
        role: {
            type: DataTypes.ENUM('student', 'admin'),
            defaultValue: 'student'
        },
        // Physical Measurements (Current)
        height: DataTypes.FLOAT,
        weight: DataTypes.FLOAT,
        chest: DataTypes.FLOAT,
        waist: DataTypes.FLOAT,
        lastScanDate: DataTypes.DATE
    });

    return User;
};
