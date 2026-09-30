/**
 * sequelize-cli connection config.
 * Reuses config/env.js so migrations connect with exactly the same rules as
 * the app: DATABASE_URL wins over discrete DB_* variables, TLS via DB_SSL,
 * and the production fail-fasts (JWT/TRUST_PROXY/CLIENT_ORIGINS) apply to a
 * migration run too - configure the environment before you migrate.
 */
const env = require('./env');

const base = {
    ...(env.database.url
        ? { use_env_variable: 'DATABASE_URL' }
        : {
              dialect: env.database.dialect || 'postgres',
              host: env.database.host,
              port: env.database.port,
              database: env.database.name,
              username: env.database.user,
              password: env.database.password
          }),
    dialectOptions: env.database.ssl ? { ssl: { rejectUnauthorized: false } } : {},
    logging: false
};

module.exports = {
    development: base,
    test: base,
    production: base
};
