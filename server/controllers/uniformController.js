/**
 * Uniform Controller
 * Catalogue, size recommendations and admin stock management.
 * Reads/writes PostgreSQL (seeded from ../data/initialData on first boot).
 */

const { Op } = require('sequelize');
const { z } = require('zod');
const { sequelize, Uniform, Size } = require('../models');

const stockSchema = z
    .object({
        sizeId: z.number().int().positive().optional(),
        uniformId: z.number().int().positive().optional(),
        sizeIndex: z.number().int().min(0).optional(),
        newStock: z.number().int().min(0).max(100000)
    })
    .refine((value) => value.sizeId != null || (value.uniformId != null && value.sizeIndex != null), {
        message: 'Provide sizeId, or uniformId together with sizeIndex'
    });

const SIZE_ORDER = [{ model: Size, as: 'sizes' }, 'id', 'ASC'];
const FIND_OPTIONS = {
    include: [{ model: Size, as: 'sizes' }],
    order: [['id', 'ASC'], SIZE_ORDER]
};

/** Case-insensitive "contains" on every dialect we support. */
const contains = sequelize.getDialect() === 'postgres' ? Op.iLike : Op.like;
const escapeLike = (value) => value.replace(/[\\%_]/g, (char) => `\\${char}`);

function serializeUniform(uniform) {
    const plain = uniform.get({ plain: true });
    plain.sizes = plain.sizes.map((size) => ({
        id: size.id,
        size: size.size,
        price: Number(size.price),
        stock: size.stock,
        height_min: size.height_min,
        height_max: size.height_max,
        weight_min: size.weight_min,
        weight_max: size.weight_max,
        chest_min: size.chest_min,
        chest_max: size.chest_max,
        waist_min: size.waist_min,
        waist_max: size.waist_max
    }));
    return plain;
}

const uniformController = {
    schemas: { stock: stockSchema },

    // Get all uniforms with optional filtering
    getAllUniforms: async (req, res, next) => {
        try {
            const { gender, category, search } = req.query;
            const where = {};

            if (gender) {
                where[Op.or] = [{ gender }, { gender: 'Unisex' }];
            }
            if (category) {
                where.category = category;
            }
            if (search) {
                const query = `%${escapeLike(String(search).trim())}%`;
                where[Op.and] = [
                    {
                        [Op.or]: [{ name: { [contains]: query } }, { description: { [contains]: query } }]
                    }
                ];
            }

            const uniforms = await Uniform.findAll({ ...FIND_OPTIONS, where });
            res.json(uniforms.map(serializeUniform));
        } catch (error) {
            next(error);
        }
    },

    // Get size recommendations based on measurements
    getRecommendations: async (req, res, next) => {
        try {
            const { height, weight, chest, waist, gender } = req.body;

            if (!height || !weight || !gender) {
                return res.status(400).json({ message: 'Height, weight, and gender are required' });
            }

            const recommendations = [];
            const all = await Uniform.findAll(FIND_OPTIONS);
            const relevantUniforms = all.filter(
                (uniform) => uniform.gender === gender || uniform.gender === 'Unisex'
            );

            relevantUniforms.forEach((uniform) => {
                let bestSize = null;
                let bestScore = 0;

                uniform.sizes.forEach((size) => {
                    let score = 0;

                    // Height matching (40 pts)
                    if (height >= size.height_min && height <= size.height_max) {
                        score += 40;
                    } else {
                        const diff = Math.min(
                            Math.abs(height - size.height_min),
                            Math.abs(height - size.height_max)
                        );
                        score += Math.max(0, 40 - diff * 2);
                    }

                    // Weight matching (30 pts)
                    if (weight >= size.weight_min && weight <= size.weight_max) {
                        score += 30;
                    } else {
                        const diff = Math.min(
                            Math.abs(weight - size.weight_min),
                            Math.abs(weight - size.weight_max)
                        );
                        score += Math.max(0, 30 - diff);
                    }

                    // Optional measurements (15 pts each)
                    if (chest) {
                        if (chest >= size.chest_min && chest <= size.chest_max) {
                            score += 15;
                        } else {
                            const diff = Math.min(
                                Math.abs(chest - size.chest_min),
                                Math.abs(chest - size.chest_max)
                            );
                            score += Math.max(0, 15 - diff);
                        }
                    } else score += 10;

                    if (waist) {
                        if (waist >= size.waist_min && waist <= size.waist_max) {
                            score += 15;
                        } else {
                            const diff = Math.min(
                                Math.abs(waist - size.waist_min),
                                Math.abs(waist - size.waist_max)
                            );
                            score += Math.max(0, 15 - diff);
                        }
                    } else score += 10;

                    if (score > bestScore) {
                        bestScore = score;
                        bestSize = size;
                    }
                });

                if (bestSize) {
                    recommendations.push({
                        uniformId: uniform.id,
                        uniformName: uniform.name,
                        category: uniform.category,
                        icon: uniform.icon,
                        recommendedSize: bestSize.size,
                        sizeId: bestSize.id,
                        price: Number(bestSize.price),
                        stock: bestSize.stock,
                        confidence: Math.min(100, bestScore)
                    });
                }
            });

            res.json({
                measurements: { height, weight, chest, waist, gender },
                recommendations: recommendations.sort((a, b) => b.confidence - a.confidence)
            });
        } catch (error) {
            next(error);
        }
    },

    // Admin: update the stock of a single size entry.
    // Accepts { sizeId, newStock } or the legacy { uniformId, sizeIndex, newStock }.
    updateStock: async (req, res, next) => {
        try {
            const { sizeId, uniformId, sizeIndex, newStock } = req.body;

            let size = null;
            if (sizeId) {
                size = await Size.findByPk(sizeId);
            } else if (uniformId != null && Number.isInteger(sizeIndex)) {
                const uniform = await Uniform.findOne({
                    ...FIND_OPTIONS,
                    where: { id: uniformId }
                });
                if (uniform) {
                    size = uniform.sizes.find((_, index) => index === sizeIndex) || null;
                    if (size) size = await Size.findByPk(size.id);
                }
            }

            if (!size) {
                return res.status(404).json({ message: 'Uniform or size not found' });
            }

            size.stock = newStock;
            await size.save();

            const uniform = await Uniform.findOne({
                ...FIND_OPTIONS,
                where: { id: size.UniformId }
            });
            res.json({ message: 'Stock updated successfully', uniform: serializeUniform(uniform) });
        } catch (error) {
            next(error);
        }
    }
};

module.exports = uniformController;
