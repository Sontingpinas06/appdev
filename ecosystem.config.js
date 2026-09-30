/**
 * PM2 process file for a bare-metal/VPS deploy (the alternative to Docker).
 *
 *   npm --prefix server run migrate   # schema first (DB_SYNC=false in prod)
 *   pm2 start ecosystem.config.js --env production
 *   pm2 save && pm2 startup           # resurrect on reboot
 *
 * One instance on purpose: rate-limit counters live in process memory, and a
 * PM2 cluster would give every worker its own bucket. Point it at server/.env
 * (cwd is server/, so dotenv picks it up automatically).
 */
module.exports = {
    apps: [
        {
            name: 'uniguide-api',
            script: 'index.js',
            cwd: './server',
            instances: 1,
            exec_mode: 'fork',
            max_memory_restart: '300M',
            env_production: {
                NODE_ENV: 'production'
            }
        }
    ]
};
