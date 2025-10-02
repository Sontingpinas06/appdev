// Admin Authentication (separate from student auth)
const ADMIN_CREDENTIALS = {
    username: 'admin',
    password: 'admin123',
    role: 'admin'
};

let isAdminLoggedIn = false;

// Login Handler
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            
            if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                isAdminLoggedIn = true;
                localStorage.setItem('bcpAdminSession', JSON.stringify({
                    username: ADMIN_CREDENTIALS.username,
                    role: ADMIN_CREDENTIALS.role,
                    loginTime: new Date().toISOString()
                }));
                document.getElementById('loginScreen').style.display = 'none';
                document.getElementById('adminDashboard').style.display = 'flex';
                loadDashboard();
                loadPermissionSettings();
                showAdminToast('Login successful! Welcome, Admin.', 'success');
            } else {
                showAdminToast('Invalid admin credentials. Please try again.', 'error');
            }
        });
    }
    
    // Initialize uniformsData from localStorage or use default
    const savedUniformsData = localStorage.getItem('uniformsData');
    if (savedUniformsData) {
        try {
            window.uniformsData = JSON.parse(savedUniformsData);
        } catch (e) {
            console.error('Error loading saved data:', e);
            window.uniformsData = uniformsData;
            localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
        }
    } else {
        // Save initial data to localStorage
        localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
    }
    
    // Check for existing admin session
    const adminSession = localStorage.getItem('bcpAdminSession');
    if (adminSession) {
        isAdminLoggedIn = true;
        showAdminPanel();
        loadPermissionSettings();
    }
    
    // Load saved theme
    loadSavedTheme();
});

// Logout
function logout() {
    document.getElementById('logoutModal').style.display = 'block';
}

function closeLogoutModal() {
    document.getElementById('logoutModal').style.display = 'none';
}

function confirmLogout() {
    isAdminLoggedIn = false;
    localStorage.removeItem('bcpAdminSession');
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminDashboard').style.display = 'none';
    document.getElementById('logoutModal').style.display = 'none';
    document.getElementById('loginForm').reset();
    showAdminToast('Logged out successfully', 'success');
}

// Section Navigation
function showAdminSection(sectionId) {
    document.querySelectorAll('.admin-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.admin-nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    document.getElementById(sectionId).classList.add('active');
    
    const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load section-specific data
    if (sectionId === 'dashboard') {
        loadDashboard();
    } else if (sectionId === 'inventory') {
        loadInventory();
    } else if (sectionId === 'pricing') {
        loadPricing();
    }
}

// Dashboard Functions
function loadDashboard() {
    updateDashboardStats();
    renderCategoryChart();
    renderLowStockAlerts();
}

function updateDashboardStats() {
    const totalItems = uniformsData.length;
    const totalStock = uniformsData.reduce((sum, uniform) => {
        return sum + uniform.sizes.reduce((sizeSum, size) => sizeSum + size.stock, 0);
    }, 0);
    
    let lowStockCount = 0;
    let totalValue = 0;
    
    uniformsData.forEach(uniform => {
        uniform.sizes.forEach(size => {
            if (size.stock > 0 && size.stock <= 20) {
                lowStockCount++;
            }
            totalValue += size.stock * size.price;
        });
    });
    
    document.getElementById('totalItems').textContent = totalItems;
    document.getElementById('totalStock').textContent = totalStock;
    document.getElementById('lowStock').textContent = lowStockCount;
    document.getElementById('totalValue').textContent = `₱${totalValue.toLocaleString('en-PH', {minimumFractionDigits: 2})}`;
}

function renderCategoryChart() {
    const categories = {};
    
    uniformsData.forEach(uniform => {
        if (!categories[uniform.category]) {
            categories[uniform.category] = 0;
        }
        categories[uniform.category] += uniform.sizes.reduce((sum, size) => sum + size.stock, 0);
    });
    
    const maxStock = Math.max(...Object.values(categories));
    const chartContainer = document.getElementById('categoryChart');
    chartContainer.innerHTML = '';
    
    Object.entries(categories).forEach(([category, stock]) => {
        const percentage = (stock / maxStock) * 100;
        
        const barDiv = document.createElement('div');
        barDiv.className = 'chart-bar';
        barDiv.innerHTML = `
            <div class="chart-label">${category}</div>
            <div class="chart-bar-fill">
                <div class="chart-bar-value" style="width: ${percentage}%">${stock}</div>
            </div>
        `;
        chartContainer.appendChild(barDiv);
    });
}

function renderLowStockAlerts() {
    const alertsContainer = document.getElementById('lowStockAlerts');
    alertsContainer.innerHTML = '';
    
    let alertCount = 0;
    
    uniformsData.forEach(uniform => {
        uniform.sizes.forEach(size => {
            if (size.stock > 0 && size.stock <= 20) {
                alertCount++;
                const alertDiv = document.createElement('div');
                alertDiv.className = 'alert-item';
                alertDiv.innerHTML = `
                    <i class="fas fa-exclamation-triangle"></i>
                    <div class="alert-info">
                        <h4>${uniform.name} - Size ${size.size}</h4>
                        <p>Only ${size.stock} items left in stock</p>
                    </div>
                `;
                alertsContainer.appendChild(alertDiv);
            }
        });
    });
    
    if (alertCount === 0) {
        alertsContainer.innerHTML = `
            <div class="empty-state" style="padding: 2rem;">
                <i class="fas fa-check-circle" style="color: var(--success-color);"></i>
                <p>All items are well stocked!</p>
            </div>
        `;
    }
}

function refreshDashboard() {
    loadDashboard();
    showAdminToast('Dashboard refreshed', 'success');
}

// Inventory Management
function loadInventory() {
    renderInventoryTable();
}

function renderInventoryTable() {
    const tbody = document.getElementById('inventoryTableBody');
    tbody.innerHTML = '';
    
    const filteredUniforms = getFilteredInventoryItems();
    
    filteredUniforms.forEach(uniform => {
        const totalStock = uniform.sizes.reduce((sum, size) => sum + size.stock, 0);
        const status = totalStock > 50 ? 'good' : totalStock > 0 ? 'warning' : 'danger';
        const statusText = totalStock > 50 ? 'Good Stock' : totalStock > 0 ? 'Low Stock' : 'Out of Stock';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${uniform.id}</td>
            <td><strong>${uniform.name}</strong></td>
            <td>${uniform.category}</td>
            <td>${uniform.gender}</td>
            <td>
                <div class="size-list">
                    ${uniform.sizes.map(s => `<span class="size-tag">${s.size}</span>`).join('')}
                </div>
            </td>
            <td><strong>${totalStock}</strong></td>
            <td><span class="status-badge status-${status}">${statusText}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-info btn-icon" onclick="viewItemDetails(${uniform.id})" title="View Details">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button class="btn btn-primary btn-icon" onclick="editStock(${uniform.id})" title="Edit Stock">
                        <i class="fas fa-edit"></i>
                    </button>
                </div>
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

function getFilteredInventoryItems() {
    const genderFilter = document.getElementById('adminGenderFilter')?.value || '';
    const categoryFilter = document.getElementById('adminCategoryFilter')?.value || '';
    const searchQuery = document.getElementById('adminSearchInput')?.value.toLowerCase() || '';
    
    return uniformsData.filter(uniform => {
        const matchesGender = !genderFilter || uniform.gender === genderFilter;
        const matchesCategory = !categoryFilter || uniform.category === categoryFilter;
        const matchesSearch = !searchQuery || 
                             uniform.name.toLowerCase().includes(searchQuery) ||
                             uniform.description.toLowerCase().includes(searchQuery);
        
        return matchesGender && matchesCategory && matchesSearch;
    });
}

function filterInventory() {
    renderInventoryTable();
}

function editStock(uniformId) {
    const uniform = uniformsData.find(u => u.id === uniformId);
    if (!uniform) return;
    
    const modal = document.getElementById('editStockModal');
    const modalBody = document.getElementById('editStockBody');
    
    modalBody.innerHTML = `
        <h2><i class="fas fa-boxes"></i> Edit Stock - ${uniform.name}</h2>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">${uniform.description}</p>
        
        <div class="stock-editor">
            ${uniform.sizes.map((size, index) => `
                <div class="stock-item">
                    <div>
                        <strong>Size ${size.size}</strong>
                        <div style="font-size: 0.9rem; color: var(--text-secondary);">₱${size.price.toFixed(2)}</div>
                    </div>
                    <div class="stock-controls">
                        <button class="btn btn-secondary btn-small" onclick="adjustStock(${uniformId}, ${index}, -10)">
                            <i class="fas fa-minus"></i> 10
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="adjustStock(${uniformId}, ${index}, -1)">
                            <i class="fas fa-minus"></i>
                        </button>
                        <input type="number" id="stock-${uniformId}-${index}" value="${size.stock}" min="0" 
                               onchange="updateStockValue(${uniformId}, ${index}, this.value)">
                        <button class="btn btn-secondary btn-small" onclick="adjustStock(${uniformId}, ${index}, 1)">
                            <i class="fas fa-plus"></i>
                        </button>
                        <button class="btn btn-secondary btn-small" onclick="adjustStock(${uniformId}, ${index}, 10)">
                            <i class="fas fa-plus"></i> 10
                        </button>
                    </div>
                    <div>
                        <span class="status-badge ${size.stock > 20 ? 'status-good' : size.stock > 0 ? 'status-warning' : 'status-danger'}">
                            ${size.stock > 20 ? 'In Stock' : size.stock > 0 ? 'Low' : 'Out'}
                        </span>
                    </div>
                </div>
            `).join('')}
        </div>
        
        <div style="margin-top: 2rem; display: flex; gap: 1rem;">
            <button class="btn btn-primary" onclick="saveStockChanges(${uniformId})">
                <i class="fas fa-save"></i> Save Changes
            </button>
            <button class="btn btn-secondary" onclick="closeEditModal()">
                <i class="fas fa-times"></i> Cancel
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function adjustStock(uniformId, sizeIndex, amount) {
    const uniform = uniformsData.find(u => u.id === uniformId);
    if (!uniform) return;
    
    uniform.sizes[sizeIndex].stock = Math.max(0, uniform.sizes[sizeIndex].stock + amount);
    document.getElementById(`stock-${uniformId}-${sizeIndex}`).value = uniform.sizes[sizeIndex].stock;
    
    // Update status badge
    const stockItem = document.querySelectorAll('.stock-item')[sizeIndex];
    const badge = stockItem.querySelector('.status-badge');
    const stock = uniform.sizes[sizeIndex].stock;
    
    badge.className = `status-badge ${stock > 20 ? 'status-good' : stock > 0 ? 'status-warning' : 'status-danger'}`;
    badge.textContent = stock > 20 ? 'In Stock' : stock > 0 ? 'Low' : 'Out';
}

function updateStockValue(uniformId, sizeIndex, value) {
    const uniform = uniformsData.find(u => u.id === uniformId);
    if (!uniform) return;
    
    uniform.sizes[sizeIndex].stock = Math.max(0, parseInt(value) || 0);
    
    // Save to localStorage for real-time sync
    localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
}

function saveStockChanges(uniformId) {
    // Save to localStorage
    localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
    
    closeEditModal();
    loadInventory();
    loadDashboard();
    showAdminToast('Stock updated successfully! Changes synced to student view.', 'success');
    
    // Trigger custom event for real-time sync
    window.dispatchEvent(new CustomEvent('stockUpdated', { 
        detail: { uniformsData: uniformsData }
    }));
}

function closeEditModal() {
    document.getElementById('editStockModal').style.display = 'none';
}

function viewDetails(uniformId) {
    const uniform = uniformsData.find(u => u.id === uniformId);
    if (!uniform) return;
    
    const totalStock = uniform.sizes.reduce((sum, size) => sum + size.stock, 0);
    const totalValue = uniform.sizes.reduce((sum, size) => sum + (size.stock * size.price), 0);
    
    alert(`Item Details:\n\nName: ${uniform.name}\nCategory: ${uniform.category}\nGender: ${uniform.gender}\nTotal Stock: ${totalStock}\nTotal Value: ₱${totalValue.toFixed(2)}\n\nSizes:\n${uniform.sizes.map(s => `- ${s.size}: ${s.stock} units @ ₱${s.price.toFixed(2)}`).join('\n')}`);
}

function showAddItemModal() {
    showAdminToast('Add item feature - Coming soon!', 'success');
}

function exportInventory() {
    let csv = 'ID,Name,Category,Gender,Size,Price,Stock\n';
    
    uniformsData.forEach(uniform => {
        uniform.sizes.forEach(size => {
            csv += `${uniform.id},"${uniform.name}","${uniform.category}","${uniform.gender}","${size.size}",${size.price},${size.stock}\n`;
        });
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `inventory_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    
    showAdminToast('Inventory exported successfully!', 'success');
}

// Pricing Management
function loadPricing() {
    const pricingGrid = document.getElementById('pricingGrid');
    pricingGrid.innerHTML = '';
    
    uniformsData.forEach(uniform => {
        const card = document.createElement('div');
        card.className = 'pricing-card';
        
        card.innerHTML = `
            <h3>${uniform.name}</h3>
            <p style="color: var(--text-secondary); margin-bottom: 1rem;">${uniform.category} - ${uniform.gender}</p>
            
            <div class="pricing-table">
                ${uniform.sizes.map((size, index) => `
                    <div class="pricing-row">
                        <div><strong>Size ${size.size}</strong></div>
                        <div class="price-input">
                            <span>₱</span>
                            <input type="number" id="price-${uniform.id}-${index}" value="${size.price}" 
                                   min="0" step="0.01" onchange="updatePrice(${uniform.id}, ${index}, this.value)">
                        </div>
                        <div>
                            <button class="btn btn-primary btn-small" onclick="savePrice(${uniform.id}, ${index})">
                                <i class="fas fa-save"></i> Save
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
        
        pricingGrid.appendChild(card);
    });
}

function updatePrice(uniformId, sizeIndex, value) {
    const uniform = uniformsData.find(u => u.id === uniformId);
    if (!uniform) return;
    
    uniform.sizes[sizeIndex].price = parseFloat(value) || 0;
    
    // Save to localStorage for real-time sync
    localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
}

function savePrice(uniformId, sizeIndex) {
    // Save to localStorage
    localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
    
    showAdminToast('Price updated successfully! Changes synced to student view.', 'success');
    loadDashboard();
    
    // Trigger real-time sync
    window.dispatchEvent(new CustomEvent('stockUpdated', { 
        detail: { uniformsData: uniformsData }
    }));
}

function bulkPriceUpdate() {
    document.getElementById('bulkUpdateModal').style.display = 'block';
    selectBulkOption('percentage');
}

function closeBulkUpdateModal() {
    document.getElementById('bulkUpdateModal').style.display = 'none';
    // Reset form
    document.getElementById('percentageValue').value = '';
    document.getElementById('fixedValue').value = '';
    document.getElementById('pricePreview').innerHTML = '<p class="preview-hint">Enter a percentage to see preview</p>';
    document.getElementById('pricePreviewFixed').innerHTML = '<p class="preview-hint">Enter an amount to see preview</p>';
}

function selectBulkOption(option) {
    const percentageTab = document.getElementById('percentageTab');
    const fixedTab = document.getElementById('fixedTab');
    const percentageUpdate = document.getElementById('percentageUpdate');
    const fixedUpdate = document.getElementById('fixedUpdate');
    
    if (option === 'percentage') {
        percentageTab.classList.add('active');
        fixedTab.classList.remove('active');
        percentageUpdate.classList.add('active');
        fixedUpdate.classList.remove('active');
    } else {
        fixedTab.classList.add('active');
        percentageTab.classList.remove('active');
        fixedUpdate.classList.add('active');
        percentageUpdate.classList.remove('active');
    }
}

function toggleBulkFilters(type) {
    if (type === 'gender') {
        const allChecked = document.getElementById('filterGenderAll').checked;
        document.getElementById('filterMale').disabled = allChecked;
        document.getElementById('filterFemale').disabled = allChecked;
        if (allChecked) {
            document.getElementById('filterMale').checked = false;
            document.getElementById('filterFemale').checked = false;
        }
    } else if (type === 'category') {
        const allChecked = document.getElementById('filterCategoryAll').checked;
        document.getElementById('filterUpperWear').disabled = allChecked;
        document.getElementById('filterLowerWear').disabled = allChecked;
        document.getElementById('filterPE').disabled = allChecked;
        if (allChecked) {
            document.getElementById('filterUpperWear').checked = false;
            document.getElementById('filterLowerWear').checked = false;
            document.getElementById('filterPE').checked = false;
        }
    } else if (type === 'genderFixed') {
        const allChecked = document.getElementById('filterGenderAllFixed').checked;
        document.getElementById('filterMaleFixed').disabled = allChecked;
        document.getElementById('filterFemaleFixed').disabled = allChecked;
        if (allChecked) {
            document.getElementById('filterMaleFixed').checked = false;
            document.getElementById('filterFemaleFixed').checked = false;
        }
    } else if (type === 'categoryFixed') {
        const allChecked = document.getElementById('filterCategoryAllFixed').checked;
        document.getElementById('filterUpperWearFixed').disabled = allChecked;
        document.getElementById('filterLowerWearFixed').disabled = allChecked;
        document.getElementById('filterPEFixed').disabled = allChecked;
        if (allChecked) {
            document.getElementById('filterUpperWearFixed').checked = false;
            document.getElementById('filterLowerWearFixed').checked = false;
            document.getElementById('filterPEFixed').checked = false;
        }
    }
}

function applyBulkUpdate() {
    const activeForm = document.querySelector('.bulk-update-form.active');
    const isPercentage = activeForm.id === 'percentageUpdate';
    
    if (isPercentage) {
        const percentage = parseFloat(document.getElementById('percentageValue').value);
        if (isNaN(percentage) || percentage === 0) {
            showAdminToast('Please enter a valid percentage', 'error');
            return;
        }
        
        const filters = {
            allGenders: document.getElementById('filterGenderAll').checked,
            male: document.getElementById('filterMale').checked,
            female: document.getElementById('filterFemale').checked,
            allCategories: document.getElementById('filterCategoryAll').checked,
            upperWear: document.getElementById('filterUpperWear').checked,
            lowerWear: document.getElementById('filterLowerWear').checked,
            pe: document.getElementById('filterPE').checked
        };
        
        let updatedCount = 0;
        uniformsData.forEach(uniform => {
            // Check gender filter
            if (!filters.allGenders) {
                if (filters.male && uniform.gender !== 'Male') return;
                if (filters.female && uniform.gender !== 'Female') return;
                if (!filters.male && !filters.female) return;
            }
            
            // Check category filter
            if (!filters.allCategories) {
                if (filters.upperWear && uniform.category !== 'Upper Wear') return;
                if (filters.lowerWear && uniform.category !== 'Lower Wear') return;
                if (filters.pe && uniform.category !== 'PE Uniform') return;
                if (!filters.upperWear && !filters.lowerWear && !filters.pe) return;
            }
            
            uniform.sizes.forEach(size => {
                size.price = size.price * (1 + percentage / 100);
                size.price = Math.round(size.price * 100) / 100;
                updatedCount++;
            });
        });
        
        // Save to localStorage
        localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
        
        closeBulkUpdateModal();
        loadPricing();
        loadDashboard();
        showAdminToast(`${updatedCount} prices updated by ${percentage > 0 ? '+' : ''}${percentage}%`, 'success');
        
        // Trigger real-time sync
        window.dispatchEvent(new CustomEvent('stockUpdated', { 
            detail: { uniformsData: uniformsData }
        }));
        
    } else {
        const fixedAmount = parseFloat(document.getElementById('fixedValue').value);
        if (isNaN(fixedAmount) || fixedAmount === 0) {
            showAdminToast('Please enter a valid amount', 'error');
            return;
        }
        
        const filters = {
            allGenders: document.getElementById('filterGenderAllFixed').checked,
            male: document.getElementById('filterMaleFixed').checked,
            female: document.getElementById('filterFemaleFixed').checked,
            allCategories: document.getElementById('filterCategoryAllFixed').checked,
            upperWear: document.getElementById('filterUpperWearFixed').checked,
            lowerWear: document.getElementById('filterLowerWearFixed').checked,
            pe: document.getElementById('filterPEFixed').checked
        };
        
        let updatedCount = 0;
        uniformsData.forEach(uniform => {
            // Check gender filter
            if (!filters.allGenders) {
                if (filters.male && uniform.gender !== 'Male') return;
                if (filters.female && uniform.gender !== 'Female') return;
                if (!filters.male && !filters.female) return;
            }
            
            // Check category filter
            if (!filters.allCategories) {
                if (filters.upperWear && uniform.category !== 'Upper Wear') return;
                if (filters.lowerWear && uniform.category !== 'Lower Wear') return;
                if (filters.pe && uniform.category !== 'PE Uniform') return;
                if (!filters.upperWear && !filters.lowerWear && !filters.pe) return;
            }
            
            uniform.sizes.forEach(size => {
                size.price = Math.max(0, size.price + fixedAmount);
                size.price = Math.round(size.price * 100) / 100;
                updatedCount++;
            });
        });
        
        // Save to localStorage
        localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
        
        closeBulkUpdateModal();
        loadPricing();
        loadDashboard();
        showAdminToast(`${updatedCount} prices updated by ${fixedAmount > 0 ? '+' : ''}₱${Math.abs(fixedAmount)}`, 'success');
        
        // Trigger real-time sync
        window.dispatchEvent(new CustomEvent('stockUpdated', { 
            detail: { uniformsData: uniformsData }
        }));
    }
}

// Add preview functionality
document.addEventListener('DOMContentLoaded', function() {
    const percentageInput = document.getElementById('percentageValue');
    const fixedInput = document.getElementById('fixedValue');
    
    if (percentageInput) {
        percentageInput.addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value) && value !== 0) {
                const preview = document.getElementById('pricePreview');
                const samplePrice = 350;
                const newPrice = samplePrice * (1 + value / 100);
                preview.innerHTML = `
                    <div class="preview-item">
                        <span>Example: ₱${samplePrice.toFixed(2)}</span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="new-price">₱${newPrice.toFixed(2)}</span>
                        <span class="change ${value > 0 ? 'positive' : 'negative'}">${value > 0 ? '+' : ''}${value}%</span>
                    </div>
                `;
            } else {
                document.getElementById('pricePreview').innerHTML = '<p class="preview-hint">Enter a percentage to see preview</p>';
            }
        });
    }
    
    if (fixedInput) {
        fixedInput.addEventListener('input', function() {
            const value = parseFloat(this.value);
            if (!isNaN(value) && value !== 0) {
                const preview = document.getElementById('pricePreviewFixed');
                const samplePrice = 350;
                const newPrice = Math.max(0, samplePrice + value);
                preview.innerHTML = `
                    <div class="preview-item">
                        <span>Example: ₱${samplePrice.toFixed(2)}</span>
                        <i class="fas fa-arrow-right"></i>
                        <span class="new-price">₱${newPrice.toFixed(2)}</span>
                        <span class="change ${value > 0 ? 'positive' : 'negative'}">${value > 0 ? '+' : ''}₱${value.toFixed(2)}</span>
                    </div>
                `;
            } else {
                document.getElementById('pricePreviewFixed').innerHTML = '<p class="preview-hint">Enter an amount to see preview</p>';
            }
        });
    }
});

// Theme Customization
const themePresets = {
    default: {
        primary: '#2563eb',
        primaryDark: '#1e40af',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#f8fafc',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0'
    },
    dark: {
        primary: '#3b82f6',
        primaryDark: '#2563eb',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#0f172a',
        cardBg: '#1e293b',
        textPrimary: '#f1f5f9',
        textSecondary: '#94a3b8',
        border: '#334155'
    },
    green: {
        primary: '#10b981',
        primaryDark: '#059669',
        secondary: '#64748b',
        success: '#22c55e',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#f0fdf4',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#bbf7d0'
    },
    purple: {
        primary: '#8b5cf6',
        primaryDark: '#7c3aed',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: '#faf5ff',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#e9d5ff'
    },
    red: {
        primary: '#ef4444',
        primaryDark: '#dc2626',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#f87171',
        warning: '#f59e0b',
        bg: '#fef2f2',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#fecaca'
    },
    orange: {
        primary: '#f59e0b',
        primaryDark: '#d97706',
        secondary: '#64748b',
        success: '#10b981',
        danger: '#ef4444',
        warning: '#fb923c',
        bg: '#fffbeb',
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#fed7aa'
    }
};

function openThemeCustomizer() {
    document.getElementById('themeCustomizer').style.display = 'block';
    
    // Load current theme colors
    const currentTheme = JSON.parse(localStorage.getItem('bcpTheme')) || themePresets.default;
    document.getElementById('primaryColor').value = currentTheme.primary;
    document.getElementById('secondaryColor').value = currentTheme.secondary;
    document.getElementById('successColor').value = currentTheme.success;
    document.getElementById('bgColor').value = currentTheme.bg;
}

function closeThemeCustomizer() {
    document.getElementById('themeCustomizer').style.display = 'none';
}

function applyPreset(presetName) {
    const theme = themePresets[presetName];
    applyTheme(theme);
    
    // Update color pickers
    document.getElementById('primaryColor').value = theme.primary;
    document.getElementById('secondaryColor').value = theme.secondary;
    document.getElementById('successColor').value = theme.success;
    document.getElementById('bgColor').value = theme.bg;
    
    showAdminToast(`${presetName.charAt(0).toUpperCase() + presetName.slice(1)} theme applied!`, 'success');
}

function updateCustomTheme() {
    const theme = {
        primary: document.getElementById('primaryColor').value,
        primaryDark: adjustColor(document.getElementById('primaryColor').value, -20),
        secondary: document.getElementById('secondaryColor').value,
        success: document.getElementById('successColor').value,
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: document.getElementById('bgColor').value,
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0'
    };
    
    applyTheme(theme);
}

function applyTheme(theme) {
    const root = document.documentElement;
    root.style.setProperty('--primary-color', theme.primary);
    root.style.setProperty('--primary-dark', theme.primaryDark);
    root.style.setProperty('--secondary-color', theme.secondary);
    root.style.setProperty('--success-color', theme.success);
    root.style.setProperty('--danger-color', theme.danger);
    root.style.setProperty('--warning-color', theme.warning);
    root.style.setProperty('--bg-color', theme.bg);
    root.style.setProperty('--card-bg', theme.cardBg);
    root.style.setProperty('--text-primary', theme.textPrimary);
    root.style.setProperty('--text-secondary', theme.textSecondary);
    root.style.setProperty('--border-color', theme.border);
}

function adjustColor(color, percent) {
    const num = parseInt(color.replace('#', ''), 16);
    const amt = Math.round(2.55 * percent);
    const R = (num >> 16) + amt;
    const G = (num >> 8 & 0x00FF) + amt;
    const B = (num & 0x0000FF) + amt;
    return '#' + (0x1000000 + (R < 255 ? R < 1 ? 0 : R : 255) * 0x10000 +
        (G < 255 ? G < 1 ? 0 : G : 255) * 0x100 +
        (B < 255 ? B < 1 ? 0 : B : 255))
        .toString(16).slice(1);
}

function saveTheme() {
    const theme = {
        primary: document.getElementById('primaryColor').value,
        primaryDark: adjustColor(document.getElementById('primaryColor').value, -20),
        secondary: document.getElementById('secondaryColor').value,
        success: document.getElementById('successColor').value,
        danger: '#ef4444',
        warning: '#f59e0b',
        bg: document.getElementById('bgColor').value,
        cardBg: '#ffffff',
        textPrimary: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0'
    };
    
    localStorage.setItem('bcpTheme', JSON.stringify(theme));
    applyTheme(theme);
    showAdminToast('Theme saved successfully!', 'success');
}

function loadSavedTheme() {
    const savedTheme = localStorage.getItem('bcpTheme');
    if (savedTheme) {
        const theme = JSON.parse(savedTheme);
        applyTheme(theme);
    }
}

function previewTheme() {
    window.open('index.html', '_blank');
}

function resetTheme() {
    if (confirm('Reset theme to default?')) {
        localStorage.removeItem('bcpTheme');
        applyTheme(themePresets.default);
        document.getElementById('primaryColor').value = themePresets.default.primary;
        document.getElementById('secondaryColor').value = themePresets.default.secondary;
        document.getElementById('successColor').value = themePresets.default.success;
        document.getElementById('bgColor').value = themePresets.default.bg;
        showAdminToast('Theme reset to default', 'success');
    }
}

// Settings Functions
function backupData() {
    const backup = {
        uniforms: uniformsData,
        timestamp: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `bcp_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    showAdminToast('Data backed up successfully!', 'success');
}

function restoreData() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = function(e) {
        const file = e.target.files[0];
        const reader = new FileReader();
        reader.onload = function(event) {
            try {
                const backup = JSON.parse(event.target.result);
                // In a real app, you would restore the data here
                showAdminToast('Data restored successfully!', 'success');
                loadDashboard();
                loadInventory();
            } catch (error) {
                showAdminToast('Invalid backup file', 'error');
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function resetData() {
    if (confirm('This will reset all data to default values. Are you sure?')) {
        if (confirm('This action cannot be undone. Continue?')) {
            location.reload();
            showAdminToast('Data reset to default', 'success');
        }
    }
}

function changePassword() {
    const newPassword = prompt('Enter new password:');
    if (newPassword && newPassword.length >= 6) {
        ADMIN_CREDENTIALS.password = newPassword;
        showAdminToast('Password changed successfully!', 'success');
    } else if (newPassword) {
        showAdminToast('Password must be at least 6 characters', 'error');
    }
}

// Toast Notification
function showAdminToast(message, type = 'success') {
    const toast = document.getElementById('adminToast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// View Item Details
function viewItemDetails(uniformId) {
    const uniform = uniformsData.find(u => u.id === uniformId);
    if (!uniform) return;
    
    const modal = document.getElementById('itemDetailsModal');
    const modalBody = document.getElementById('itemDetailsBody');
    
    const totalStock = uniform.sizes.reduce((sum, size) => sum + size.stock, 0);
    const avgPrice = uniform.sizes.reduce((sum, size) => sum + size.price, 0) / uniform.sizes.length;
    
    modalBody.innerHTML = `
        <div class="item-details-header">
            <div class="item-details-icon">
                <i class="${uniform.icon}"></i>
            </div>
            <div>
                <h2>${uniform.name}</h2>
                <div class="item-details-meta">
                    <span class="badge badge-${uniform.category.toLowerCase().replace(' ', '-')}">${uniform.category}</span>
                    <span class="badge badge-${uniform.gender.toLowerCase()}">${uniform.gender}</span>
                </div>
            </div>
        </div>
        
        <div class="item-details-description">
            <h3><i class="fas fa-info-circle"></i> Description</h3>
            <p>${uniform.description}</p>
        </div>
        
        <div class="item-details-stats">
            <div class="stat-box">
                <i class="fas fa-boxes"></i>
                <div>
                    <h4>Total Stock</h4>
                    <p>${totalStock} units</p>
                </div>
            </div>
            <div class="stat-box">
                <i class="fas fa-dollar-sign"></i>
                <div>
                    <h4>Average Price</h4>
                    <p>₱${avgPrice.toFixed(2)}</p>
                </div>
            </div>
            <div class="stat-box">
                <i class="fas fa-ruler"></i>
                <div>
                    <h4>Available Sizes</h4>
                    <p>${uniform.sizes.length} sizes</p>
                </div>
            </div>
        </div>
        
        <div class="item-details-sizes">
            <h3><i class="fas fa-list"></i> Size Details</h3>
            <div class="size-details-grid">
                ${uniform.sizes.map(size => `
                    <div class="size-detail-card ${size.stock === 0 ? 'out-of-stock' : ''}">
                        <div class="size-detail-header">
                            <h4>${size.size}</h4>
                            <span class="status-badge ${size.stock > 10 ? 'in-stock' : size.stock > 0 ? 'low-stock' : 'out-of-stock'}">
                                ${size.stock > 10 ? 'In Stock' : size.stock > 0 ? 'Low Stock' : 'Out of Stock'}
                            </span>
                        </div>
                        <div class="size-detail-info">
                            <div class="info-row">
                                <span><i class="fas fa-tag"></i> Price:</span>
                                <strong>₱${size.price.toFixed(2)}</strong>
                            </div>
                            <div class="info-row">
                                <span><i class="fas fa-boxes"></i> Stock:</span>
                                <strong>${size.stock} units</strong>
                            </div>
                        </div>
                        <div class="size-measurements">
                            <h5>Measurements (cm)</h5>
                            <div class="measurements-grid">
                                <div><i class="fas fa-ruler-horizontal"></i> Chest: ${size.chest_min}-${size.chest_max}</div>
                                <div><i class="fas fa-ruler-horizontal"></i> Waist: ${size.waist_min}-${size.waist_max}</div>
                                <div><i class="fas fa-ruler-vertical"></i> Height: ${size.height_min}-${size.height_max}</div>
                                <div><i class="fas fa-weight"></i> Weight: ${size.weight_min}-${size.weight_max}kg</div>
                            </div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
        
        <div class="modal-actions" style="margin-top: 2rem;">
            <button class="btn btn-secondary" onclick="closeItemDetailsModal()">
                <i class="fas fa-times"></i> Close
            </button>
            <button class="btn btn-primary" onclick="editStock(${uniform.id})">
                <i class="fas fa-edit"></i> Edit Stock
            </button>
        </div>
    `;
    
    modal.style.display = 'block';
}

function closeItemDetailsModal() {
    document.getElementById('itemDetailsModal').style.display = 'none';
}

// Student Permission Management
function toggleProfileEditPermission() {
    const isAllowed = document.getElementById('allowProfileEdit').checked;
    localStorage.setItem('allowProfileEdit', JSON.stringify(isAllowed));
    
    // Trigger sync to student side
    window.dispatchEvent(new CustomEvent('permissionUpdated', { 
        detail: { 
            allowProfileEdit: isAllowed,
            allowMeasurementEdit: JSON.parse(localStorage.getItem('allowMeasurementEdit') || 'true')
        }
    }));
    
    showAdminToast(
        isAllowed ? 'Students can now edit their profiles' : 'Profile editing disabled for students',
        isAllowed ? 'success' : 'warning'
    );
}

function toggleMeasurementEditPermission() {
    const isAllowed = document.getElementById('allowMeasurementEdit').checked;
    localStorage.setItem('allowMeasurementEdit', JSON.stringify(isAllowed));
    
    // Trigger sync to student side
    window.dispatchEvent(new CustomEvent('permissionUpdated', { 
        detail: { 
            allowProfileEdit: JSON.parse(localStorage.getItem('allowProfileEdit') || 'true'),
            allowMeasurementEdit: isAllowed
        }
    }));
    
    showAdminToast(
        isAllowed ? 'Students can now edit their measurements' : 'Measurement editing disabled for students',
        isAllowed ? 'success' : 'warning'
    );
}

// Load permission settings on page load
function loadPermissionSettings() {
    const allowProfileEdit = JSON.parse(localStorage.getItem('allowProfileEdit') || 'true');
    const allowMeasurementEdit = JSON.parse(localStorage.getItem('allowMeasurementEdit') || 'true');
    
    const profileEditCheckbox = document.getElementById('allowProfileEdit');
    const measurementEditCheckbox = document.getElementById('allowMeasurementEdit');
    
    if (profileEditCheckbox) profileEditCheckbox.checked = allowProfileEdit;
    if (measurementEditCheckbox) measurementEditCheckbox.checked = allowMeasurementEdit;
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const logoutModal = document.getElementById('logoutModal');
    const itemDetailsModal = document.getElementById('itemDetailsModal');
    
    if (event.target === logoutModal) {
        closeLogoutModal();
    }
    if (event.target === itemDetailsModal) {
        closeItemDetailsModal();
    }
});
