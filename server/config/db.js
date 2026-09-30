const { Sequelize } = require('sequelize');
const env = require('./env');

/**
 * One Sequelize instance for the whole API.
 * Accepts either a full DATABASE_URL or discrete DB_* variables.
 */
const sequelize = env.database.url
    ? new Sequelize(env.database.url, {
          logging: false,
          dialectOptions: env.database.ssl ? { ssl: { rejectUnauthorized: false } } : {}
      })
    : new Sequelize({
          dialect: env.database.dialect || 'postgres',
          host: env.database.host,
          port: env.database.port,
          database: env.database.name,
          username: env.database.user,
          password: env.database.password,
          logging: false,
          dialectOptions: env.database.ssl ? { ssl: { rejectUnauthorized: false } } : {},
          define: {
              timestamps: true
          }
      });

module.exports = sequelize;
