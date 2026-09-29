// Simulated Database - Uniform Catalog
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
    {
        id: 2,
        name: 'Polo Shirt - Blue',
        category: 'Upper Wear',
        gender: 'Male',
        description: 'Blue polo shirt with BCP logo for alternate uniform days',
        icon: 'fa-shirt',
        sizes: [
            { size: 'XS', price: 350.00, stock: 22, chest_min: 76, chest_max: 81, waist_min: 61, waist_max: 66, height_min: 150, height_max: 160, weight_min: 40, weight_max: 50 },
            { size: 'S', price: 350.00, stock: 28, chest_min: 81, chest_max: 86, waist_min: 66, waist_max: 71, height_min: 160, height_max: 170, weight_min: 50, weight_max: 60 },
            { size: 'M', price: 350.00, stock: 32, chest_min: 86, chest_max: 91, waist_min: 71, waist_max: 76, height_min: 170, height_max: 175, weight_min: 60, weight_max: 70 },
            { size: 'L', price: 350.00, stock: 25, chest_min: 91, chest_max: 96, waist_min: 76, waist_max: 81, height_min: 175, height_max: 180, weight_min: 70, weight_max: 80 },
            { size: 'XL', price: 350.00, stock: 18, chest_min: 96, chest_max: 102, waist_min: 81, waist_max: 86, height_min: 180, height_max: 185, weight_min: 80, weight_max: 90 },
            { size: 'XXL', price: 350.00, stock: 12, chest_min: 102, chest_max: 107, waist_min: 86, waist_max: 91, height_min: 185, height_max: 190, weight_min: 90, weight_max: 100 }
        ]
    },
    {
        id: 3,
        name: 'Pants - Navy Blue',
        category: 'Lower Wear',
        gender: 'Male',
        description: 'Navy blue uniform pants with proper fit and comfort',
        icon: 'fa-person',
        sizes: [
            { size: '26', price: 450.00, stock: 20, chest_min: 66, chest_max: 71, waist_min: 66, waist_max: 71, height_min: 150, height_max: 165, weight_min: 40, weight_max: 55 },
            { size: '28', price: 450.00, stock: 25, chest_min: 71, chest_max: 76, waist_min: 71, waist_max: 76, height_min: 160, height_max: 170, weight_min: 50, weight_max: 65 },
            { size: '30', price: 450.00, stock: 30, chest_min: 76, chest_max: 81, waist_min: 76, waist_max: 81, height_min: 165, height_max: 175, weight_min: 60, weight_max: 75 },
            { size: '32', price: 450.00, stock: 28, chest_min: 81, chest_max: 86, waist_min: 81, waist_max: 86, height_min: 170, height_max: 180, weight_min: 70, weight_max: 85 },
            { size: '34', price: 450.00, stock: 22, chest_min: 86, chest_max: 91, waist_min: 86, waist_max: 91, height_min: 175, height_max: 185, weight_min: 80, weight_max: 95 },
            { size: '36', price: 450.00, stock: 18, chest_min: 91, chest_max: 97, waist_min: 91, waist_max: 97, height_min: 180, height_max: 190, weight_min: 90, weight_max: 105 }
        ]
    },
    {
        id: 4,
        name: 'PE Shirt',
        category: 'PE Uniform',
        gender: 'Male',
        description: 'Physical Education shirt with moisture-wicking fabric',
        icon: 'fa-person-running',
        sizes: [
            { size: 'XS', price: 300.00, stock: 30, chest_min: 76, chest_max: 81, waist_min: 61, waist_max: 66, height_min: 150, height_max: 160, weight_min: 40, weight_max: 50 },
            { size: 'S', price: 300.00, stock: 35, chest_min: 81, chest_max: 86, waist_min: 66, waist_max: 71, height_min: 160, height_max: 170, weight_min: 50, weight_max: 60 },
            { size: 'M', price: 300.00, stock: 40, chest_min: 86, chest_max: 91, waist_min: 71, waist_max: 76, height_min: 170, height_max: 175, weight_min: 60, weight_max: 70 },
            { size: 'L', price: 300.00, stock: 32, chest_min: 91, chest_max: 96, waist_min: 76, waist_max: 81, height_min: 175, height_max: 180, weight_min: 70, weight_max: 80 },
            { size: 'XL', price: 300.00, stock: 25, chest_min: 96, chest_max: 102, waist_min: 81, waist_max: 86, height_min: 180, height_max: 185, weight_min: 80, weight_max: 90 },
            { size: 'XXL', price: 300.00, stock: 20, chest_min: 102, chest_max: 107, waist_min: 86, waist_max: 91, height_min: 185, height_max: 190, weight_min: 90, weight_max: 100 }
        ]
    },
    {
        id: 5,
        name: 'PE Shorts',
        category: 'PE Uniform',
        gender: 'Male',
        description: 'Comfortable PE shorts for physical activities',
        icon: 'fa-person-running',
        sizes: [
            { size: 'S', price: 250.00, stock: 30, chest_min: 66, chest_max: 76, waist_min: 66, waist_max: 76, height_min: 150, height_max: 165, weight_min: 40, weight_max: 60 },
            { size: 'M', price: 250.00, stock: 35, chest_min: 76, chest_max: 86, waist_min: 76, waist_max: 86, height_min: 165, height_max: 175, weight_min: 60, weight_max: 75 },
            { size: 'L', price: 250.00, stock: 30, chest_min: 86, chest_max: 96, waist_min: 86, waist_max: 96, height_min: 175, height_max: 185, weight_min: 75, weight_max: 90 },
            { size: 'XL', price: 250.00, stock: 25, chest_min: 96, chest_max: 107, waist_min: 96, waist_max: 107, height_min: 185, height_max: 195, weight_min: 90, weight_max: 110 }
        ]
    },
    {
        id: 6,
        name: 'Blouse - White',
        category: 'Upper Wear',
        gender: 'Female',
        description: 'Standard white blouse with BCP logo embroidered on chest',
        icon: 'fa-shirt',
        sizes: [
            { size: 'XS', price: 350.00, stock: 25, chest_min: 71, chest_max: 76, waist_min: 56, waist_max: 61, height_min: 145, height_max: 155, weight_min: 35, weight_max: 45 },
            { size: 'S', price: 350.00, stock: 30, chest_min: 76, chest_max: 81, waist_min: 61, waist_max: 66, height_min: 155, height_max: 165, weight_min: 45, weight_max: 55 },
            { size: 'M', price: 350.00, stock: 35, chest_min: 81, chest_max: 86, waist_min: 66, waist_max: 71, height_min: 165, height_max: 170, weight_min: 55, weight_max: 65 },
            { size: 'L', price: 350.00, stock: 28, chest_min: 86, chest_max: 91, waist_min: 71, waist_max: 76, height_min: 170, height_max: 175, weight_min: 65, weight_max: 75 },
            { size: 'XL', price: 350.00, stock: 20, chest_min: 91, chest_max: 97, waist_min: 76, waist_max: 81, height_min: 175, height_max: 180, weight_min: 75, weight_max: 85 },
            { size: 'XXL', price: 350.00, stock: 15, chest_min: 97, chest_max: 102, waist_min: 81, waist_max: 86, height_min: 180, height_max: 185, weight_min: 85, weight_max: 95 }
        ]
    },
    {
        id: 7,
        name: 'Blouse - Blue',
        category: 'Upper Wear',
        gender: 'Female',
        description: 'Blue blouse with BCP logo for alternate uniform days',
        icon: 'fa-shirt',
        sizes: [
            { size: 'XS', price: 350.00, stock: 22, chest_min: 71, chest_max: 76, waist_min: 56, waist_max: 61, height_min: 145, height_max: 155, weight_min: 35, weight_max: 45 },
            { size: 'S', price: 350.00, stock: 28, chest_min: 76, chest_max: 81, waist_min: 61, waist_max: 66, height_min: 155, height_max: 165, weight_min: 45, weight_max: 55 },
            { size: 'M', price: 350.00, stock: 32, chest_min: 81, chest_max: 86, waist_min: 66, waist_max: 71, height_min: 165, height_max: 170, weight_min: 55, weight_max: 65 },
            { size: 'L', price: 350.00, stock: 25, chest_min: 86, chest_max: 91, waist_min: 71, waist_max: 76, height_min: 170, height_max: 175, weight_min: 65, weight_max: 75 },
            { size: 'XL', price: 350.00, stock: 18, chest_min: 91, chest_max: 97, waist_min: 76, waist_max: 81, height_min: 175, height_max: 180, weight_min: 75, weight_max: 85 },
            { size: 'XXL', price: 350.00, stock: 12, chest_min: 97, chest_max: 102, waist_min: 81, waist_max: 86, height_min: 180, height_max: 185, weight_min: 85, weight_max: 95 }
        ]
    },
    {
        id: 8,
        name: 'Skirt - Navy Blue',
        category: 'Lower Wear',
        gender: 'Female',
        description: 'Navy blue uniform skirt with proper length',
        icon: 'fa-person-dress',
        sizes: [
            { size: '24', price: 400.00, stock: 22, chest_min: 61, chest_max: 66, waist_min: 61, waist_max: 66, height_min: 145, height_max: 160, weight_min: 35, weight_max: 50 },
            { size: '26', price: 400.00, stock: 25, chest_min: 66, chest_max: 71, waist_min: 66, waist_max: 71, height_min: 155, height_max: 165, weight_min: 45, weight_max: 60 },
            { size: '28', price: 400.00, stock: 30, chest_min: 71, chest_max: 76, waist_min: 71, waist_max: 76, height_min: 160, height_max: 170, weight_min: 55, weight_max: 70 },
            { size: '30', price: 400.00, stock: 28, chest_min: 76, chest_max: 81, waist_min: 76, waist_max: 81, height_min: 165, height_max: 175, weight_min: 65, weight_max: 80 },
            { size: '32', price: 400.00, stock: 20, chest_min: 81, chest_max: 86, waist_min: 81, waist_max: 86, height_min: 170, height_max: 180, weight_min: 75, weight_max: 90 }
        ]
    },
    {
        id: 9,
        name: 'Pants - Navy Blue',
        category: 'Lower Wear',
        gender: 'Female',
        description: 'Navy blue uniform pants as alternative to skirt',
        icon: 'fa-person',
        sizes: [
            { size: '24', price: 450.00, stock: 18, chest_min: 61, chest_max: 66, waist_min: 61, waist_max: 66, height_min: 145, height_max: 160, weight_min: 35, weight_max: 50 },
            { size: '26', price: 450.00, stock: 22, chest_min: 66, chest_max: 71, waist_min: 66, waist_max: 71, height_min: 155, height_max: 165, weight_min: 45, weight_max: 60 },
            { size: '28', price: 450.00, stock: 25, chest_min: 71, chest_max: 76, waist_min: 71, waist_max: 76, height_min: 160, height_max: 170, weight_min: 55, weight_max: 70 },
            { size: '30', price: 450.00, stock: 22, chest_min: 76, chest_max: 81, waist_min: 76, waist_max: 81, height_min: 165, height_max: 175, weight_min: 65, weight_max: 80 },
            { size: '32', price: 450.00, stock: 18, chest_min: 81, chest_max: 86, waist_min: 81, waist_max: 86, height_min: 170, height_max: 180, weight_min: 75, weight_max: 90 }
        ]
    },
    {
        id: 10,
        name: 'PE Shirt',
        category: 'PE Uniform',
        gender: 'Female',
        description: 'Physical Education shirt with moisture-wicking fabric',
        icon: 'fa-person-running',
        sizes: [
            { size: 'XS', price: 300.00, stock: 30, chest_min: 71, chest_max: 76, waist_min: 56, waist_max: 61, height_min: 145, height_max: 155, weight_min: 35, weight_max: 45 },
            { size: 'S', price: 300.00, stock: 35, chest_min: 76, chest_max: 81, waist_min: 61, waist_max: 66, height_min: 155, height_max: 165, weight_min: 45, weight_max: 55 },
            { size: 'M', price: 300.00, stock: 40, chest_min: 81, chest_max: 86, waist_min: 66, waist_max: 71, height_min: 165, height_max: 170, weight_min: 55, weight_max: 65 },
            { size: 'L', price: 300.00, stock: 32, chest_min: 86, chest_max: 91, waist_min: 71, waist_max: 76, height_min: 170, height_max: 175, weight_min: 65, weight_max: 75 },
            { size: 'XL', price: 300.00, stock: 25, chest_min: 91, chest_max: 97, waist_min: 76, waist_max: 81, height_min: 175, height_max: 180, weight_min: 75, weight_max: 85 },
            { size: 'XXL', price: 300.00, stock: 20, chest_min: 97, chest_max: 102, waist_min: 81, waist_max: 86, height_min: 180, height_max: 185, weight_min: 85, weight_max: 95 }
        ]
    },
    {
        id: 11,
        name: 'PE Shorts',
        category: 'PE Uniform',
        gender: 'Female',
        description: 'Comfortable PE shorts for physical activities',
        icon: 'fa-person-running',
        sizes: [
            { size: 'S', price: 250.00, stock: 30, chest_min: 61, chest_max: 71, waist_min: 61, waist_max: 71, height_min: 145, height_max: 160, weight_min: 35, weight_max: 55 },
            { size: 'M', price: 250.00, stock: 35, chest_min: 71, chest_max: 81, waist_min: 71, waist_max: 81, height_min: 160, height_max: 170, weight_min: 55, weight_max: 70 },
            { size: 'L', price: 250.00, stock: 30, chest_min: 81, chest_max: 91, waist_min: 81, waist_max: 91, height_min: 170, height_max: 180, weight_min: 70, weight_max: 85 },
            { size: 'XL', price: 250.00, stock: 25, chest_min: 91, chest_max: 102, waist_min: 91, waist_max: 102, height_min: 180, height_max: 190, weight_min: 85, weight_max: 100 }
        ]
    }
];

module.exports = uniformsData;
