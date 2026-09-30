/**
 * User Model
 * Students and admins, with bcrypt-hashed passwords.
 */
const { DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');

const BCRYPT_ROUNDS = 12;

module.exports = (sequelize) => {
    const User = sequelize.define(
        'User',
        {
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
                allowNull: false,
                validate: { len: [8, 128] }
            },
            gender: {
                type: DataTypes.ENUM('Male', 'Female', 'Unisex'),
                allowNull: false
            },
            role: {
                type: DataTypes.ENUM('student', 'admin'),
                defaultValue: 'student'
            },
            // Bumping this invalidates every outstanding refresh token.
            tokenVersion: {
                type: DataTypes.INTEGER,
                allowNull: false,
                defaultValue: 0
            },
            // Physical measurements (Current)
            height: DataTypes.FLOAT,
            weight: DataTypes.FLOAT,
            chest: DataTypes.FLOAT,
            waist: DataTypes.FLOAT,
            lastScanDate: DataTypes.DATE
        },
        {
            defaultScope: {
                // Never leak the hash unless explicitly requested.
                attributes: { exclude: ['password', 'tokenVersion'] }
            },
            scopes: {
                withSecrets: { attributes: { include: ['password', 'tokenVersion'] } }
            },
            hooks: {
                beforeCreate: hashPasswordIfChanged,
                beforeUpdate: hashPasswordIfChanged
            }
        }
    );

    async function hashPasswordIfChanged(user) {
        if (!user.changed('password')) return;
        user.password = await bcrypt.hash(user.password, BCRYPT_ROUNDS);
    }

    User.prototype.verifyPassword = function verifyPassword(plain) {
        return bcrypt.compare(plain, this.password);
    };

    /** Safe representation for API responses. */
    User.prototype.toPublic = function toPublic() {
        const plain = this.get({ plain: true });
        delete plain.password;
        delete plain.tokenVersion;
        delete plain.deletedAt;
        return plain;
    };

    return User;
};
