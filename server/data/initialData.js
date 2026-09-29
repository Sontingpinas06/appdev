const uniformsData = [
    {
        id: 1,
        name: 'Polo Shirt - White',
        category: 'Upper Wear',
        gender: 'Male',
        description: 'Standard white polo shirt with BCP logo embroidered on chest',
        icon: 'fa-shirt',
        sizes: [
            { size: 'XS', price: 350.00, stock: 25, chest_min: 76, chest_max: 81, waist_min: 61, waist_max: 66, height_min: 150, height_max: 160, weight_min: 40, weight_max: 50 },
            { size: 'S', price: 350.00, stock: 30, chest_min: 81, chest_max: 86, waist_min: 66, waist_max: 71, height_min: 160, height_max: 170, weight_min: 50, weight_max: 60 },
            { size: 'M', price: 350.00, stock: 35, chest_min: 86, chest_max: 91, waist_min: 71, waist_max: 76, height_min: 170, height_max: 175, weight_min: 60, weight_max: 70 },
            { size: 'L', price: 350.00, stock: 28, chest_min: 91, chest_max: 96, waist_min: 76, waist_max: 81, height_min: 175, height_max: 180, weight_min: 70, weight_max: 80 },
            { size: 'XL', price: 350.00, stock: 20, chest_min: 96, chest_max: 102, waist_min: 81, waist_max: 86, height_min: 180, height_max: 185, weight_min: 80, weight_max: 90 },
            { size: 'XXL', price: 350.00, stock: 15, chest_min: 102, chest_max: 107, waist_min: 86, waist_max: 91, height_min: 185, height_max: 190, weight_min: 90, weight_max: 100 }
        ]
    },
    // ... other items would be here
];

module.exports = uniformsData;
