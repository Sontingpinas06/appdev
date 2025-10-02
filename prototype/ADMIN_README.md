# BCP Uniform Guide - Admin Panel Documentation

## Admin Panel Features

### 🔐 Secure Login
- **Default Credentials:**
  - Username: `admin`
  - Password: `admin123`
- Secure authentication system
- Session management

### 📊 Dashboard Overview
- **Real-time Statistics:**
  - Total uniform items
  - Total stock count
  - Low stock alerts
  - Total inventory value
- **Visual Analytics:**
  - Stock by category chart
  - Low stock alerts list
- Auto-refresh capability

### 📦 Inventory Management
**Features:**
- View all uniform items in a comprehensive table
- Filter by gender, category, or search
- Real-time stock status indicators
- Edit stock levels for each size
- Quick adjustment buttons (+1, +10, -1, -10)
- Manual stock input
- Export inventory to CSV

**Stock Status Indicators:**
- 🟢 **Good Stock**: More than 20 items
- 🟡 **Low Stock**: 1-20 items
- 🔴 **Out of Stock**: 0 items

**How to Edit Stock:**
1. Navigate to Inventory section
2. Click the edit icon (pencil) on any item
3. Use +/- buttons or type directly
4. Click "Save Changes"

### 💰 Pricing Management
**Features:**
- View and edit prices for all items and sizes
- Individual price updates per size
- Bulk price adjustment (percentage-based)
- Real-time price calculation

**How to Update Prices:**

**Individual Price Update:**
1. Navigate to Pricing section
2. Find the item and size
3. Enter new price
4. Click "Save"

**Bulk Price Update:**
1. Click "Bulk Update" button
2. Enter percentage (e.g., 10 for +10%, -5 for -5%)
3. Confirm changes
4. All prices will be adjusted automatically

### 🎨 Theme Customization
**Features:**
- 6 preset themes (Default Blue, Dark, Green, Purple, Red, Orange)
- Custom color picker for advanced customization
- Live preview
- Save and apply themes to main site
- Reset to default option

**Available Themes:**
1. **Default Blue** - Classic and professional
2. **Dark Mode** - Easy on the eyes
3. **Green** - Fresh and natural
4. **Purple** - Creative and modern
5. **Red** - Bold and energetic
6. **Orange** - Warm and vibrant

**How to Customize Theme:**
1. Navigate to Settings section
2. Click "Customize Theme"
3. Choose a preset or use custom colors
4. Click "Save Theme"
5. Theme applies to both admin and main site

**Custom Colors:**
- Primary Color: Main brand color
- Secondary Color: Supporting elements
- Success Color: Positive actions
- Background Color: Page background

### 📋 Order History
- View all customer orders (when implemented)
- Export orders to CSV
- Order status tracking

### ⚙️ System Settings
**Features:**
- Theme customization access
- Data backup and restore
- Reset to default data
- Notification preferences
- Password change

**Data Management:**
- **Backup Data**: Export all data to JSON file
- **Restore Data**: Import previously backed up data
- **Reset to Default**: Restore original inventory and prices

**Notifications:**
- Low stock alerts toggle
- New order notifications toggle

**Security:**
- Change admin password
- Secure session management

## Quick Start Guide

### Accessing Admin Panel
1. Open `admin.html` in your browser
2. Or click the shield icon in the main site navigation
3. Login with credentials: `admin` / `admin123`

### Common Tasks

**Update Stock Levels:**
1. Login to admin panel
2. Go to Inventory
3. Click edit icon on item
4. Adjust stock quantities
5. Save changes

**Change Prices:**
1. Login to admin panel
2. Go to Pricing
3. Update individual prices or use bulk update
4. Save changes

**Apply New Theme:**
1. Login to admin panel
2. Go to Settings
3. Click "Customize Theme"
4. Select preset or customize colors
5. Save theme

**Export Data:**
1. Login to admin panel
2. Go to Inventory or Orders
3. Click "Export" button
4. CSV file will download automatically

**Backup Data:**
1. Login to admin panel
2. Go to Settings
3. Click "Backup Data"
4. JSON file will download with timestamp

## User Theme Selection

Users can now customize their viewing experience on the main site:

### How Users Change Themes
1. Click the palette icon (🎨) in the navigation bar
2. Select from 6 available themes
3. Theme is saved automatically
4. Theme persists across sessions

### Theme Features for Users
- Instant theme switching
- No login required
- Saved in browser localStorage
- Works across all pages
- Visual preview before selection

## Technical Details

### Files Structure
```
prototype/
├── admin.html          # Admin panel interface
├── admin-styles.css    # Admin-specific styling
├── admin.js           # Admin functionality
├── theme.js           # Theme management system
├── index.html         # Main site (updated with theme support)
├── styles.css         # Main site styles (updated)
├── app.js            # Main site functionality
├── data.js           # Shared data
└── ADMIN_README.md   # This file
```

### Data Persistence
- **Theme Settings**: Stored in localStorage as `bcpTheme` and `bcpThemeName`
- **Inventory Changes**: Stored in memory (resets on page reload)
- **For Production**: Connect to backend API for persistent storage

### Browser Compatibility
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Opera (latest)

### Security Notes
⚠️ **Important for Production:**
- Change default admin credentials
- Implement proper backend authentication
- Use HTTPS for all connections
- Add CSRF protection
- Implement rate limiting
- Use secure session management
- Hash passwords properly
- Add role-based access control

## Keyboard Shortcuts

### Admin Panel
- `Ctrl/Cmd + R`: Refresh dashboard
- `Esc`: Close modals

## Troubleshooting

### Login Issues
- **Problem**: Cannot login
- **Solution**: Ensure credentials are `admin` / `admin123`
- **Solution**: Clear browser cache and try again

### Theme Not Applying
- **Problem**: Theme changes don't save
- **Solution**: Check browser localStorage is enabled
- **Solution**: Clear localStorage and reapply theme

### Stock Updates Not Saving
- **Problem**: Stock changes disappear on refresh
- **Solution**: This is expected behavior in prototype
- **Solution**: For production, connect to backend database

### Export Not Working
- **Problem**: CSV/JSON export fails
- **Solution**: Check browser allows downloads
- **Solution**: Disable popup blockers

## Best Practices

### Inventory Management
1. Check low stock alerts daily
2. Update stock after receiving new shipments
3. Export inventory weekly for records
4. Monitor stock trends by category

### Pricing Management
1. Review prices monthly
2. Use bulk updates for seasonal changes
3. Keep backup before major price changes
4. Document price change reasons

### Theme Management
1. Test theme on different devices
2. Consider user accessibility
3. Maintain brand consistency
4. Get user feedback before major changes

### Data Management
1. Backup data before major changes
2. Keep multiple backup copies
3. Test restore process periodically
4. Document all significant changes

## Support & Maintenance

### Regular Tasks
- **Daily**: Check low stock alerts
- **Weekly**: Review inventory levels, export data
- **Monthly**: Review pricing, backup data
- **Quarterly**: Update theme if needed, review system settings

### Monitoring
- Watch for low stock items
- Track inventory value trends
- Monitor user theme preferences
- Review system performance

## Future Enhancements

Potential features for production version:
- User role management (Super Admin, Manager, Staff)
- Advanced analytics and reporting
- Automated reorder alerts
- Supplier management
- Purchase order system
- Sales analytics
- Customer management
- Email notifications
- Mobile app version
- Multi-language support
- API integration
- Real-time sync across devices

## Contact & Support

For questions or issues with the admin panel:
- Check this documentation first
- Review the main README.md
- Contact development team

---

**Version**: 1.0.0  
**Last Updated**: October 2025  
**Status**: Fully Functional Prototype
