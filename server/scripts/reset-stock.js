/**
 * Restores every size's stock to the value declared in data/initialData.js.
 * The acceptance gates and smoke tests decrement stock as they place orders,
 * so run this to get back to a clean catalogue.
 *
 *   npm run reset:stock
 */
const sequelize = require('../config/db');
const { Uniform, Size } = require('../models');
const catalogue = require('../data/initialData');

(async () => {
    try {
        await sequelize.authenticate();

        const uniforms = await Uniform.findAll({
            include: [{ model: Size, as: 'sizes' }],
            order: [['id', 'ASC'], [{ model: Size, as: 'sizes' }, 'id', 'ASC']]
        });

        let updated = 0;
        let missing = 0;

        for (const uniform of uniforms) {
            const source = catalogue.find((entry) => entry.id === uniform.id);
            if (!source) {
                missing += 1;
                continue;
            }

            for (const size of uniform.sizes) {
                const match = source.sizes.find((entry) => entry.size === size.size);
                if (!match) continue;
                if (size.stock !== match.stock) {
                    size.stock = match.stock;
                    await size.save();
                    updated += 1;
                }
            }
        }

        console.log(`Stock reset complete: ${updated} size row(s) restored`);
        if (missing > 0) {
            console.warn(`${missing} catalogue row(s) had no seed entry (left untouched)`);
        }
        process.exit(0);
    } catch (error) {
        console.error(`Stock reset failed: ${error.message}`);
        process.exit(1);
    }
})();
