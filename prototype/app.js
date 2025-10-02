// Navigation and Section Management
function showSection(sectionId) {
    // Hide all sections
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Remove active class from all nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Show selected section
    document.getElementById(sectionId).classList.add('active');
    
    // Add active class to corresponding nav link
    const activeLink = document.querySelector(`a[href="#${sectionId}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }
    
    // Load catalog if catalog section is shown
    if (sectionId === 'catalog') {
        renderCatalog();
    }
    
}

// Method Selection for Sizing
function selectMethod(method) {
    // Update button states
    document.querySelectorAll('.method-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    if (method === 'manual') {
        document.getElementById('manual-btn').classList.add('active');
        document.getElementById('manual-form').classList.add('active');
        document.getElementById('photo-form').classList.remove('active');
    } else {
        document.getElementById('photo-btn').classList.add('active');
        document.getElementById('photo-form').classList.add('active');
        document.getElementById('manual-form').classList.remove('active');
    }
}

// Manual Measurement Form Handler
document.addEventListener('DOMContentLoaded', function() {
    const measurementForm = document.getElementById('measurementForm');
    if (measurementForm) {
        measurementForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const measurements = {
                studentName: document.getElementById('studentName').value,
                studentId: document.getElementById('studentId').value,
                gender: document.getElementById('gender').value,
                height: parseFloat(document.getElementById('height').value),
                weight: parseFloat(document.getElementById('weight').value),
                chest: document.getElementById('chest').value ? parseFloat(document.getElementById('chest').value) : null,
                waist: document.getElementById('waist').value ? parseFloat(document.getElementById('waist').value) : null,
                method: 'manual'
            };
            
            currentMeasurements = measurements;
            processMeasurements(measurements);
        });
    }
    
    // Photo upload handler
    const photoInput = document.getElementById('photoInput');
    if (photoInput) {
        photoInput.addEventListener('change', handlePhotoUpload);
    }
    
    // Photo scan form handler
    const photoScanForm = document.getElementById('photoScanForm');
    if (photoScanForm) {
        photoScanForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPhotoScan();
        });
    }
    
    // Drag and drop for photo upload
    const uploadZone = document.getElementById('uploadZone');
    if (uploadZone) {
        uploadZone.addEventListener('click', function() {
            photoInput.click();
        });
        
        uploadZone.addEventListener('dragover', function(e) {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--primary-color)';
            uploadZone.style.background = '#eff6ff';
        });
        
        uploadZone.addEventListener('dragleave', function(e) {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--border-color)';
            uploadZone.style.background = 'transparent';
        });
        
        uploadZone.addEventListener('drop', function(e) {
            e.preventDefault();
            uploadZone.style.borderColor = 'var(--border-color)';
            uploadZone.style.background = 'transparent';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                photoInput.files = files;
                handlePhotoUpload({ target: { files: files } });
            }
        });
    }
    
    // Initial catalog render
    renderCatalog();
});

// Photo Upload Handler
function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
        const reader = new FileReader();
        reader.onload = function(event) {
            document.getElementById('uploadZone').style.display = 'none';
            document.getElementById('photoPreview').style.display = 'block';
            document.getElementById('previewImage').src = event.target.result;
            document.getElementById('photoScanForm').style.display = 'block';
        };
        reader.readAsDataURL(file);
    } else {
        showToast('Please select a valid image file', 'error');
    }
}

// Remove Photo
function removePhoto() {
    document.getElementById('photoInput').value = '';
    document.getElementById('uploadZone').style.display = 'flex';
    document.getElementById('photoPreview').style.display = 'none';
    document.getElementById('photoScanForm').style.display = 'none';
}

// Process Photo Scan with AI Simulation
function processPhotoScan() {
    const studentName = document.getElementById('photoStudentName').value;
    const gender = document.getElementById('photoGender').value;
    
    // Show AI processing animation
    document.getElementById('aiProcessing').style.display = 'block';
    
    // Simulate AI processing (2 seconds)
    setTimeout(() => {
        document.getElementById('aiProcessing').style.display = 'none';
        
        // Simulate AI-extracted measurements
        const simulatedMeasurements = {
            studentName: studentName,
            studentId: '',
            gender: gender,
            height: gender === 'Male' ? 170 + Math.random() * 10 : 160 + Math.random() * 10,
            weight: gender === 'Male' ? 60 + Math.random() * 15 : 50 + Math.random() * 15,
            chest: gender === 'Male' ? 85 + Math.random() * 10 : 80 + Math.random() * 10,
            waist: gender === 'Male' ? 75 + Math.random() * 10 : 65 + Math.random() * 10,
            method: 'photo_scan'
        };
        
        currentMeasurements = simulatedMeasurements;
        showToast('AI analysis complete! Measurements extracted successfully.', 'success');
        processMeasurements(simulatedMeasurements);
    }, 2000);
}

// AI Sizing Algorithm
function processMeasurements(measurements) {
    const recommendations = [];
    
    // Filter uniforms by gender
    const relevantUniforms = uniformsData.filter(uniform => 
        uniform.gender === measurements.gender || uniform.gender === 'Unisex'
    );
    
    relevantUniforms.forEach(uniform => {
        let bestSize = null;
        let bestScore = 0;
        
        uniform.sizes.forEach(size => {
            let score = 0;
            let matchCount = 0;
            
            // Height matching (most important)
            if (measurements.height >= size.height_min && measurements.height <= size.height_max) {
                score += 40;
                matchCount++;
            } else {
                const heightDiff = Math.min(
                    Math.abs(measurements.height - size.height_min),
                    Math.abs(measurements.height - size.height_max)
                );
                score += Math.max(0, 40 - heightDiff * 2);
            }
            
            // Weight matching
            if (measurements.weight >= size.weight_min && measurements.weight <= size.weight_max) {
                score += 30;
                matchCount++;
            } else {
                const weightDiff = Math.min(
                    Math.abs(measurements.weight - size.weight_min),
                    Math.abs(measurements.weight - size.weight_max)
                );
                score += Math.max(0, 30 - weightDiff);
            }
            
            // Chest matching (if provided)
            if (measurements.chest) {
                if (measurements.chest >= size.chest_min && measurements.chest <= size.chest_max) {
                    score += 15;
                    matchCount++;
                } else {
                    const chestDiff = Math.min(
                        Math.abs(measurements.chest - size.chest_min),
                        Math.abs(measurements.chest - size.chest_max)
                    );
                    score += Math.max(0, 15 - chestDiff);
                }
            } else {
                score += 10; // Partial score if not provided
            }
            
            // Waist matching (if provided)
            if (measurements.waist) {
                if (measurements.waist >= size.waist_min && measurements.waist <= size.waist_max) {
                    score += 15;
                    matchCount++;
                } else {
                    const waistDiff = Math.min(
                        Math.abs(measurements.waist - size.waist_min),
                        Math.abs(measurements.waist - size.waist_max)
                    );
                    score += Math.max(0, 15 - waistDiff);
                }
            } else {
                score += 10; // Partial score if not provided
            }
            
            if (score > bestScore) {
                bestScore = score;
                bestSize = size;
            }
        });
        
        if (bestSize) {
            recommendations.push({
                uniform: uniform,
                size: bestSize,
                confidence: Math.min(100, bestScore)
            });
        }
    });
    
    displayRecommendations(recommendations, measurements);
}

// Display Size Recommendations
function displayRecommendations(recommendations, measurements) {
    const resultsDiv = document.getElementById('sizing-results');
    const gridDiv = document.getElementById('recommendationsGrid');
    
    gridDiv.innerHTML = '';
    
    // Sort by confidence
    recommendations.sort((a, b) => b.confidence - a.confidence);
    
    recommendations.forEach(rec => {
        const card = document.createElement('div');
        card.className = 'recommendation-card';
        
        const stockStatus = rec.size.stock > 20 ? 'In Stock' : 
                           rec.size.stock > 0 ? `Low Stock (${rec.size.stock})` : 
                           'Out of Stock';
        const stockClass = rec.size.stock > 20 ? 'in-stock' : 
                          rec.size.stock > 0 ? 'low-stock' : 
                          'out-of-stock';
        
        card.innerHTML = `
            <div class="recommendation-icon">
                <i class="fas ${rec.uniform.icon}"></i>
            </div>
            <div class="recommendation-info">
                <h4>${rec.uniform.name}</h4>
                <p><i class="fas fa-tag"></i> ${rec.uniform.category}</p>
                <p><i class="fas fa-dollar-sign"></i> ₱${rec.size.price.toFixed(2)}</p>
                <p><i class="fas fa-box"></i> <span class="stock-badge ${stockClass}">${stockStatus}</span></p>
                <div class="confidence-bar">
                    <small>Confidence: ${rec.confidence.toFixed(0)}%</small>
                    <div style="background: #e2e8f0; border-radius: 4px; overflow: hidden;">
                        <div class="confidence-fill" style="width: ${rec.confidence}%"></div>
                    </div>
                </div>
            </div>
            <div>
                <div class="size-badge">${rec.size.size}</div>
            </div>
        `;
        
        gridDiv.appendChild(card);
    });
    
    resultsDiv.style.display = 'block';
    resultsDiv.scrollIntoView({ behavior: 'smooth' });
}

// Reset Sizing Form
function resetSizing() {
    document.getElementById('sizing-results').style.display = 'none';
    document.getElementById('measurementForm').reset();
    document.getElementById('photoScanForm').reset();
    removePhoto();
    currentMeasurements = null;
}

// Catalog Functions
function renderCatalog() {
    const catalogGrid = document.getElementById('catalogGrid');
    catalogGrid.innerHTML = '';
    
    const filteredUniforms = getFilteredUniforms();
    
    if (filteredUniforms.length === 0) {
        catalogGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-search" style="font-size: 3rem; color: var(--text-secondary); margin-bottom: 1rem;"></i>
                <h3>No uniforms found</h3>
                <p style="color: var(--text-secondary);">Try adjusting your filters</p>
            </div>
        `;
        return;
    }
    
    filteredUniforms.forEach(uniform => {
        const totalStock = uniform.sizes.reduce((sum, size) => sum + size.stock, 0);
        const minPrice = Math.min(...uniform.sizes.map(s => s.price));
        
        const stockStatus = totalStock > 50 ? 'In Stock' : 
                           totalStock > 0 ? 'Low Stock' : 
                           'Out of Stock';
        const stockClass = totalStock > 50 ? 'in-stock' : 
                          totalStock > 0 ? 'low-stock' : 
                          'out-of-stock';
        
        const card = document.createElement('div');
        card.className = 'catalog-item';
        card.onclick = () => showItemDetails(uniform);
        
        card.innerHTML = `
            <div class="item-image">
                <i class="fas ${uniform.icon}"></i>
                <span class="stock-badge ${stockClass}">${stockStatus}</span>
            </div>
            <div class="item-details">
                <div class="item-header">
                    <h3>${uniform.name}</h3>
                    <span class="item-price">₱${minPrice.toFixed(2)}</span>
                </div>
                <div class="item-meta">
                    <span><i class="fas fa-tag"></i> ${uniform.category}</span>
                    <span><i class="fas fa-venus-mars"></i> ${uniform.gender}</span>
                </div>
                <p class="item-description">${uniform.description}</p>
                <div class="item-actions">
                    <button class="btn btn-primary" onclick="event.stopPropagation(); showItemDetails(${uniform.id})">
                        <i class="fas fa-eye"></i> View Details
                    </button>
                </div>
            </div>
        `;
        
        catalogGrid.appendChild(card);
    });
}

function getFilteredUniforms() {
    const genderFilter = document.getElementById('genderFilter').value;
    const categoryFilter = document.getElementById('categoryFilter').value;
    const searchQuery = document.getElementById('searchInput').value.toLowerCase();
    
    return uniformsData.filter(uniform => {
        const matchesGender = !genderFilter || uniform.gender === genderFilter;
        const matchesCategory = !categoryFilter || uniform.category === categoryFilter;
        const matchesSearch = !searchQuery || 
                             uniform.name.toLowerCase().includes(searchQuery) ||
                             uniform.description.toLowerCase().includes(searchQuery);
        
        return matchesGender && matchesCategory && matchesSearch;
    });
}

function filterCatalog() {
    renderCatalog();
}

// Item Details Modal
function showItemDetails(uniformId) {
    const uniform = typeof uniformId === 'object' ? uniformId : uniformsData.find(u => u.id === uniformId);
    if (!uniform) return;
    
    const modal = document.getElementById('itemModal');
    const modalBody = document.getElementById('modalBody');
    
    modalBody.innerHTML = `
        <div class="item-image" style="height: 200px; margin-bottom: 2rem;">
            <i class="fas ${uniform.icon}"></i>
        </div>
        <h2>${uniform.name}</h2>
        <div class="item-meta" style="margin: 1rem 0;">
            <span><i class="fas fa-tag"></i> ${uniform.category}</span>
            <span><i class="fas fa-venus-mars"></i> ${uniform.gender}</span>
        </div>
        <p style="color: var(--text-secondary); margin-bottom: 2rem;">${uniform.description}</p>
        
        <div class="size-selector">
            <h4>Available Sizes & Pricing:</h4>
            <div class="size-options" id="sizeOptions">
                ${uniform.sizes.map(size => `
                    <div class="size-option ${size.stock === 0 ? 'out-of-stock' : ''}">
                        <div class="size-name">${size.size}</div>
                        <div class="size-stock">${size.stock > 0 ? `${size.stock} left` : 'Out of Stock'}</div>
                        <div style="font-weight: bold; color: var(--primary-color);">₱${size.price.toFixed(2)}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    
    modal.style.display = 'block';
}

function selectSize(element, stock) {
    if (stock === 0) return;
    
    document.querySelectorAll('.size-option').forEach(opt => {
        opt.classList.remove('selected');
    });
    
    element.classList.add('selected');
}

function closeModal() {
    document.getElementById('itemModal').style.display = 'none';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('itemModal');
    if (event.target === modal) {
        modal.style.display = 'none';
    }
}


// Toast Notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = `toast ${type} show`;
    
    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}

// Mobile Menu Functions
function toggleMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    navMenu.classList.toggle('active');
    overlay.classList.toggle('active');
    toggle.classList.toggle('active');
    
    // Prevent body scroll when menu is open
    if (navMenu.classList.contains('active')) {
        document.body.style.overflow = 'hidden';
    } else {
        document.body.style.overflow = '';
    }
}

function closeMobileMenu() {
    const navMenu = document.getElementById('navMenu');
    const overlay = document.getElementById('mobileMenuOverlay');
    const toggle = document.querySelector('.mobile-menu-toggle');
    
    navMenu.classList.remove('active');
    overlay.classList.remove('active');
    toggle.classList.remove('active');
    document.body.style.overflow = '';
}

// Camera functionality
let cameraStream = null;
let currentFacingMode = 'environment'; // 'user' for front camera, 'environment' for back camera

async function openCamera() {
    try {
        const constraints = {
            video: {
                facingMode: currentFacingMode,
                width: { ideal: 1280 },
                height: { ideal: 720 }
            }
        };
        
        cameraStream = await navigator.mediaDevices.getUserMedia(constraints);
        const video = document.getElementById('cameraStream');
        video.srcObject = cameraStream;
        
        // Show camera view, hide upload zone
        document.getElementById('uploadZone').style.display = 'none';
        document.getElementById('cameraView').style.display = 'block';
        
    } catch (error) {
        console.error('Error accessing camera:', error);
        showToast('Unable to access camera. Please check permissions.', 'error');
    }
}

function closeCamera() {
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }
    
    // Hide camera view, show upload zone
    document.getElementById('cameraView').style.display = 'none';
    document.getElementById('uploadZone').style.display = 'block';
}

async function switchCamera() {
    // Toggle between front and back camera
    currentFacingMode = currentFacingMode === 'user' ? 'environment' : 'user';
    
    // Close current stream and open with new facing mode
    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
    }
    
    await openCamera();
}

function capturePhoto() {
    const video = document.getElementById('cameraStream');
    const canvas = document.getElementById('cameraCanvas');
    const context = canvas.getContext('2d');
    
    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Convert canvas to blob and display
    canvas.toBlob(function(blob) {
        const url = URL.createObjectURL(blob);
        displayPhoto(url);
        
        // Close camera
        closeCamera();
    }, 'image/jpeg', 0.95);
}

function displayPhoto(url) {
    const preview = document.getElementById('photoPreview');
    const previewImage = document.getElementById('previewImage');
    const photoForm = document.getElementById('photoScanForm');
    
    previewImage.src = url;
    preview.style.display = 'block';
    photoForm.style.display = 'block';
    
    document.getElementById('uploadZone').style.display = 'none';
    document.getElementById('cameraView').style.display = 'none';
}

function removePhoto() {
    const preview = document.getElementById('photoPreview');
    const previewImage = document.getElementById('previewImage');
    const photoForm = document.getElementById('photoScanForm');
    
    previewImage.src = '';
    preview.style.display = 'none';
    photoForm.style.display = 'none';
    
    document.getElementById('uploadZone').style.display = 'block';
}

// Real-time stock sync from admin
function syncStockFromAdmin() {
    const savedData = localStorage.getItem('uniformsData');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            // Update uniformsData if it exists
            if (window.uniformsData && parsedData) {
                window.uniformsData = parsedData;
                // Reload catalog if on catalog page
                const catalogSection = document.getElementById('catalog');
                if (catalogSection && catalogSection.classList.contains('active')) {
                    loadCatalog();
                }
            }
        } catch (e) {
            console.error('Error syncing stock data:', e);
        }
    }
}

// Listen for stock updates from admin
window.addEventListener('stockUpdated', function(e) {
    if (e.detail && e.detail.uniformsData) {
        window.uniformsData = e.detail.uniformsData;
        loadCatalog();
        showToast('Stock updated! Catalog refreshed.', 'success');
    }
});

// Listen for localStorage changes (cross-tab sync)
window.addEventListener('storage', function(e) {
    if (e.key === 'uniformsData' || e.key === null) {
        syncStockFromAdmin();
    }
    if (e.key === 'allowProfileEdit' || e.key === 'allowMeasurementEdit') {
        // Refresh profile modal if open
        const profileModal = document.getElementById('profileModal');
        if (profileModal && profileModal.style.display === 'block') {
            showProfileModal();
        }
    }
});

// Listen for permission updates from admin
window.addEventListener('permissionUpdated', function(e) {
    if (e.detail) {
        const profileModal = document.getElementById('profileModal');
        if (profileModal && profileModal.style.display === 'block') {
            showProfileModal();
        }
        
        const message = !e.detail.allowProfileEdit 
            ? 'Profile editing has been disabled by administrator' 
            : 'Profile editing has been enabled';
        const type = e.detail.allowProfileEdit ? 'success' : 'warning';
        showToast(message, type);
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    // Initialize uniformsData from localStorage or use default
    const savedUniformsData = localStorage.getItem('uniformsData');
    if (savedUniformsData) {
        try {
            window.uniformsData = JSON.parse(savedUniformsData);
        } catch (e) {
            console.error('Error loading saved data:', e);
            window.uniformsData = uniformsData;
        }
    } else {
        // Save initial data to localStorage for first time
        localStorage.setItem('uniformsData', JSON.stringify(uniformsData));
    }
    
    // Sync stock data on load
    syncStockFromAdmin();
    
    // Close mobile menu on window resize to desktop
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            closeMobileMenu();
        }
    });
    
    // Handle file upload
    document.getElementById('photoInput').addEventListener('change', function(e) {
        const file = e.target.files[0];
        if (file) {
            const url = URL.createObjectURL(file);
            displayPhoto(url);
        }
    });
});
