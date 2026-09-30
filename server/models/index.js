/**
 * Model registry: boots Sequelize and exports every model.
 * Callers should never construct their own connection.
 */
const sequelize = require('../config/db');
const defineUser = require('./User');
const defineUniform = require('./Uniform');

const User = defineUser(sequelize);
const { Uniform, Size } = defineUniform(sequelize);

module.exports = {
    sequelize,
    User,
    Uniform,
    Size
};
