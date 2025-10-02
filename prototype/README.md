# BCP Uniform Guide - Body Scan Sizing Prototype

A fully functional prototype featuring AI-powered body scan sizing, real-time stock availability, and transparent pricing for BCP school uniforms.

## Features

### 🤖 AI Body Scan Sizing
- **Manual Entry**: Input height, weight, chest, and waist measurements for precise size recommendations
- **Photo Scan**: Upload a photo for AI-powered measurement extraction (simulated)
- **Smart Algorithm**: Advanced sizing algorithm that matches measurements to optimal sizes with confidence scores
- **Multi-factor Analysis**: Considers height, weight, chest, and waist measurements

### 📦 Stock Availability
- **Real-time Stock Display**: Live stock counts for all uniform items and sizes
- **Stock Status Indicators**: Visual badges showing "In Stock", "Low Stock", or "Out of Stock"
- **Size-specific Availability**: See exactly which sizes are available before ordering

### 💰 Transparent Pricing
- **Clear Price Display**: All prices shown in Philippine Pesos (₱)
- **Size-based Pricing**: Different sizes may have different prices
- **Tax Calculation**: Automatic 12% tax calculation at checkout
- **Order Summary**: Complete breakdown of subtotal, tax, and total

### 🛍️ Complete Shopping Experience
- **Interactive Catalog**: Browse all 11 uniform items with filtering and search
- **Shopping Cart**: Add items, adjust quantities, and manage your order
- **Gender Filtering**: Separate uniforms for Male and Female students
- **Category Organization**: Upper Wear, Lower Wear, and PE Uniform categories

## Uniform Catalog

### Male Uniforms
1. **Polo Shirt - White** (₱350.00) - XS to XXL
2. **Polo Shirt - Blue** (₱350.00) - XS to XXL
3. **Pants - Navy Blue** (₱450.00) - Size 26 to 36
4. **PE Shirt** (₱300.00) - XS to XXL
5. **PE Shorts** (₱250.00) - S to XL

### Female Uniforms
1. **Blouse - White** (₱350.00) - XS to XXL
2. **Blouse - Blue** (₱350.00) - XS to XXL
3. **Skirt - Navy Blue** (₱400.00) - Size 24 to 32
4. **Pants - Navy Blue** (₱450.00) - Size 24 to 32
5. **PE Shirt** (₱300.00) - XS to XXL
6. **PE Shorts** (₱250.00) - S to XL

## How to Use

### 1. Getting Started
Simply open `index.html` in any modern web browser. No installation or server required!

### 2. Get Your Size Recommendations

#### Option A: Manual Entry
1. Click "Start Body Scan" or navigate to the Body Scan section
2. Select "Manual Entry"
3. Fill in your information:
   - Student Name (required)
   - Student ID (optional)
   - Gender (required)
   - Height in cm (required)
   - Weight in kg (required)
   - Chest in cm (optional but recommended)
   - Waist in cm (optional but recommended)
4. Click "Get Size Recommendations"
5. View your personalized size recommendations with confidence scores

#### Option B: Photo Scan
1. Click "Start Body Scan" or navigate to the Body Scan section
2. Select "Photo Scan"
3. Upload a photo (drag & drop or click to browse)
4. Enter your name and gender
5. Click "Analyze with AI"
6. Wait for AI processing (simulated)
7. View your size recommendations

### 3. Browse Catalog
1. Navigate to the "Catalog" section
2. Use filters to narrow down by:
   - Gender (Male/Female/Unisex)
   - Category (Upper Wear/Lower Wear/PE Uniform)
   - Search by name or description
3. Click on any item to view details
4. Select your size and add to cart

### 4. Shopping Cart
1. Navigate to the "Cart" section
2. Review your selected items
3. Adjust quantities using +/- buttons
4. Remove items if needed
5. Review order summary with tax calculation
6. Click "Proceed to Checkout" to complete your order

## Technical Details

### Files Structure
```
prototype/
├── index.html          # Main HTML structure
├── styles.css          # Complete styling and responsive design
├── data.js            # Simulated database with uniform catalog
├── app.js             # Application logic and AI sizing algorithm
└── README.md          # This file
```

### Technologies Used
- **HTML5**: Semantic markup and structure
- **CSS3**: Modern styling with CSS Grid, Flexbox, animations
- **JavaScript (ES6+)**: Interactive functionality and AI algorithm
- **Font Awesome 6.4.0**: Icons and visual elements

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

### Responsive Design
Fully responsive design that works on:
- Desktop computers (1200px+)
- Tablets (768px - 1199px)
- Mobile phones (320px - 767px)

## AI Sizing Algorithm

The sizing algorithm uses a multi-factor scoring system:

1. **Height Matching (40 points)**: Primary factor for size determination
2. **Weight Matching (30 points)**: Secondary factor for overall fit
3. **Chest Measurement (15 points)**: Fine-tuning for upper body fit
4. **Waist Measurement (15 points)**: Fine-tuning for lower body fit

**Confidence Score**: Calculated as a percentage (0-100%) based on how well measurements match the size ranges.

### Size Recommendation Logic
- Measurements are compared against predefined ranges for each size
- Perfect matches within range receive full points
- Near matches receive partial points based on proximity
- Final recommendation shows the best-matching size with confidence level

## Features Demonstration

### Stock Management
- Each size has individual stock tracking
- Visual indicators show stock status at a glance
- Out-of-stock items cannot be added to cart
- Low stock warnings help with decision making

### Price Transparency
- All prices clearly displayed
- No hidden fees (except standard 12% tax)
- Size-specific pricing where applicable
- Complete order summary before checkout

### User Experience
- Smooth animations and transitions
- Intuitive navigation
- Toast notifications for user actions
- Modal dialogs for detailed views
- Drag-and-drop photo upload
- Real-time cart updates

## Future Enhancements (Not Implemented)

This is a frontend prototype. For production use, consider adding:
- Backend API integration
- Real database connectivity
- Actual AI/ML model for photo analysis
- User authentication and accounts
- Order history and tracking
- Payment gateway integration
- Admin panel for inventory management
- Email notifications
- Print receipt functionality
- Multi-language support

## Support

For questions or issues with this prototype, please contact the development team.

## License

This is a prototype for BCP (educational purposes).

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Status**: Fully Functional Prototype
