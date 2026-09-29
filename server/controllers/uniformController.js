/**
 * Uniform Controller
 * Handles business logic for uniforms, sizing, and stock management
 */

// In a real app, this would be a database model (e.g., Sequelize or Mongoose)
// For now, we'll keep the data structure in mind
let uniformsData = require('../data/initialData'); 

const uniformController = {
    // Get all uniforms with optional filtering
    getAllUniforms: async (req, res) => {
        try {
            const { gender, category, search } = req.query;
            let filtered = [...uniformsData];

            if (gender) {
                filtered = filtered.filter(u => u.gender === gender || u.gender === 'Unisex');
            }
            if (category) {
                filtered = filtered.filter(u => u.category === category);
            }
            if (search) {
                const query = search.toLowerCase();
                filtered = filtered.filter(u => 
                    u.name.toLowerCase().includes(query) || 
                    u.description.toLowerCase().includes(query)
                );
            }

            res.json(filtered);
        } catch (error) {
            res.status(500).json({ message: "Error fetching uniforms", error: error.message });
        }
    },

    // Get size recommendations based on measurements
    getRecommendations: async (req, res) => {
        try {
            const { height, weight, chest, waist, gender } = req.body;

            if (!height || !weight || !gender) {
                return res.status(400).json({ message: "Height, weight, and gender are required" });
            }

            const recommendations = [];
            const relevantUniforms = uniformsData.filter(u => u.gender === gender || u.gender === 'Unisex');

            relevantUniforms.forEach(uniform => {
                let bestSize = null;
                let bestScore = 0;

                uniform.sizes.forEach(size => {
                    let score = 0;
                    
                    // Height matching (40 pts)
                    if (height >= size.height_min && height <= size.height_max) {
                        score += 40;
                    } else {
                        const diff = Math.min(Math.abs(height - size.height_min), Math.abs(height - size.height_max));
                        score += Math.max(0, 40 - diff * 2);
                    }

                    // Weight matching (30 pts)
                    if (weight >= size.weight_min && weight <= size.weight_max) {
                        score += 30;
                    } else {
                        const diff = Math.min(Math.abs(weight - size.weight_min), Math.abs(weight - size.weight_max));
                        score += Math.max(0, 30 - diff);
                    }

                    // Optional measurements (15 pts each)
                    if (chest) {
                        if (chest >= size.chest_min && chest <= size.chest_max) {
                            score += 15;
                        } else {
                            const diff = Math.min(Math.abs(chest - size.chest_min), Math.abs(chest - size.chest_max));
                            score += Math.max(0, 15 - diff);
                        }
                    } else score += 10;

                    if (waist) {
                        if (waist >= size.waist_min && waist <= size.waist_max) {
                            score += 15;
                        } else {
                            const diff = Math.min(Math.abs(waist - size.waist_min), Math.abs(waist - size.waist_max));
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
                        price: bestSize.price,
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
            res.status(500).json({ message: "Error processing recommendations", error: error.message });
        }
    },

    // Admin: Update stock
    updateStock: async (req, res) => {
        try {
            const { uniformId, sizeIndex, newStock } = req.body;
            
            const uniform = uniformsData.find(u => u.id === parseInt(uniformId));
            if (!uniform || !uniform.sizes[sizeIndex]) {
                return res.status(404).json({ message: "Uniform or size not found" });
            }

            uniform.sizes[sizeIndex].stock = parseInt(newStock);
            
            // In production, you'd save to DB here
            res.json({ message: "Stock updated successfully", uniform });
        } catch (error) {
            res.status(500).json({ message: "Error updating stock", error: error.message });
        }
    }
};

module.exports = uniformController;
