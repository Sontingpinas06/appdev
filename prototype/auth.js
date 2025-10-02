// Authentication and User Profile Management

// Simulated user database
let users = JSON.parse(localStorage.getItem('bcpUsers')) || [];

// Initialize demo accounts if no users exist
if (users.length === 0) {
    users = [
        {
            id: 1001,
            name: 'Juan Dela Cruz',
            email: 'juan.delacruz@bcp.edu.ph',
            studentId: '2024-10001',
            gender: 'Male',
            password: 'student123',
            createdAt: new Date().toISOString()
        },
        {
            id: 1002,
            name: 'Maria Santos',
            email: 'maria.santos@bcp.edu.ph',
            studentId: '2024-10002',
            gender: 'Female',
            password: 'student123',
            createdAt: new Date().toISOString()
        },
        {
            id: 1003,
            name: 'Pedro Reyes',
            email: 'pedro.reyes@bcp.edu.ph',
            studentId: '2024-10003',
            gender: 'Male',
            password: 'student123',
            createdAt: new Date().toISOString()
        }
    ];
    localStorage.setItem('bcpUsers', JSON.stringify(users));
}

// Current logged in user
let currentUser = JSON.parse(localStorage.getItem('bcpCurrentUser')) || null;

// Check if user is logged in on page load
document.addEventListener('DOMContentLoaded', function() {
    if (currentUser) {
        showLoggedInState();
        enableSiteAccess();
    } else {
        showLoggedOutState();
        restrictSiteAccess();
    }
});

// Show Login Modal
function showLoginModal() {
    document.getElementById('loginModal').style.display = 'block';
}

// Close Login Modal
function closeLoginModal() {
    document.getElementById('loginModal').style.display = 'none';
    document.getElementById('loginForm').reset();
}

// Handle Login
document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            
            const identifier = document.getElementById('loginEmail').value.trim(); // Can be email or student ID
            const password = document.getElementById('loginPassword').value;
            
            // Check if user exists with either email or student ID
            const user = users.find(u => 
                (u.email === identifier || u.studentId === identifier) && u.password === password
            );
            
            if (user) {
                currentUser = {
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    studentId: user.studentId,
                    gender: user.gender
                };
                
                localStorage.setItem('bcpCurrentUser', JSON.stringify(currentUser));
                showLoggedInState();
                enableSiteAccess();
                closeLoginModal();
                showToast(`Welcome back, ${currentUser.name}!`, 'success');
            } else {
                showToast('Invalid email/student ID or password', 'error');
            }
        });
    }
});

// Restrict Site Access (when not logged in)
function restrictSiteAccess() {
    // Disable scrolling
    document.body.style.overflow = 'hidden';
    
    // Show login overlay
    const overlay = document.createElement('div');
    overlay.id = 'loginRequiredOverlay';
    overlay.className = 'login-required-overlay';
    overlay.innerHTML = `
        <div class="login-required-content">
            <div class="login-required-icon">
                <i class="fas fa-lock"></i>
            </div>
            <h2>Login Required</h2>
            <p>Please login to access the BCP Uniform Guide</p>
            <button class="btn btn-primary btn-large" onclick="goToLoginPage()">
                <i class="fas fa-sign-in-alt"></i> Go to Login
            </button>
        </div>
    `;
    document.body.appendChild(overlay);
    
    // Disable navigation links (except theme)
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.style.pointerEvents = 'none';
        link.style.opacity = '0.5';
    });
    
    // Disable all buttons except login and theme
    const buttons = document.querySelectorAll('button:not([onclick*="Theme"]):not([onclick*="Login"])');
    buttons.forEach(btn => {
        if (!btn.closest('#loginModal') && !btn.closest('#themeSelectorModal')) {
            btn.style.pointerEvents = 'none';
            btn.style.opacity = '0.5';
        }
    });
    
    // Disable all sections except home
    const sections = document.querySelectorAll('.section:not(#home)');
    sections.forEach(section => {
        section.style.pointerEvents = 'none';
        section.style.filter = 'blur(5px)';
    });
}

// Redirect to login page
function goToLoginPage() {
    window.location.href = 'login.html';
}

// Enable Site Access (when logged in)
function enableSiteAccess() {
    // Enable scrolling
    document.body.style.overflow = '';
    
    // Remove login overlay
    const overlay = document.getElementById('loginRequiredOverlay');
    if (overlay) {
        overlay.remove();
    }
    
    // Enable navigation links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.style.pointerEvents = '';
        link.style.opacity = '';
    });
    
    // Enable all buttons
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
        btn.style.pointerEvents = '';
        btn.style.opacity = '';
    });
    
    // Enable all sections
    const sections = document.querySelectorAll('.section');
    sections.forEach(section => {
        section.style.pointerEvents = '';
        section.style.filter = '';
    });
}


// Show Logged In State
function showLoggedInState() {
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    
    if (authButtons) authButtons.style.display = 'none';
    if (userProfile) {
        userProfile.style.display = 'flex';
        const initials = getInitials(currentUser.name);
        document.getElementById('userName').textContent = currentUser.name;
        document.getElementById('userInitials').textContent = initials;
        document.getElementById('userInitials2').textContent = initials;
        document.getElementById('userName2').textContent = currentUser.name;
        document.getElementById('userEmail').textContent = currentUser.email;
    }
}

// Show Logged Out State
function showLoggedOutState() {
    const authButtons = document.getElementById('authButtons');
    const userProfile = document.getElementById('userProfile');
    
    if (authButtons) authButtons.style.display = 'flex';
    if (userProfile) userProfile.style.display = 'none';
}

// Get User Initials
function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Toggle Profile Dropdown
function toggleProfileDropdown() {
    const dropdown = document.getElementById('profileDropdown');
    dropdown.classList.toggle('active');
}

// Close dropdown when clicking outside
document.addEventListener('click', function(event) {
    const userProfile = document.getElementById('userProfile');
    const dropdown = document.getElementById('profileDropdown');
    
    if (userProfile && dropdown && !userProfile.contains(event.target)) {
        dropdown.classList.remove('active');
    }
});

// Show Profile Modal
function showProfileModal() {
    document.getElementById('profileModal').style.display = 'block';
    
    // Check permissions
    const allowProfileEdit = JSON.parse(localStorage.getItem('allowProfileEdit') || 'true');
    const allowMeasurementEdit = JSON.parse(localStorage.getItem('allowMeasurementEdit') || 'true');
    
    // Populate form with current user data
    document.getElementById('profileName').value = currentUser.name || '';
    document.getElementById('profileEmail').value = currentUser.email || '';
    document.getElementById('profileStudentId').value = currentUser.studentId || '';
    document.getElementById('profileGender').value = currentUser.gender || '';
    
    // Disable/enable fields based on permissions
    document.getElementById('profileName').disabled = !allowProfileEdit;
    document.getElementById('profileEmail').disabled = !allowProfileEdit;
    document.getElementById('profileStudentId').disabled = !allowProfileEdit;
    document.getElementById('profileGender').disabled = !allowProfileEdit;
    
    // Show permission message if editing is disabled
    const permissionMessage = document.getElementById('profilePermissionMessage');
    if (permissionMessage) {
        if (!allowProfileEdit) {
            permissionMessage.style.display = 'block';
            permissionMessage.innerHTML = '<i class="fas fa-lock"></i> Profile editing has been disabled by administrator';
        } else {
            permissionMessage.style.display = 'none';
        }
    }
    
    // Display info
    document.getElementById('displayName').textContent = currentUser.name;
    document.getElementById('displayEmail').textContent = currentUser.email;
    document.getElementById('displayStudentId').textContent = currentUser.studentId || 'Not provided';
    document.getElementById('displayGender').textContent = currentUser.gender;
}

// Close Profile Modal
function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Update Profile
function updateProfile() {
    // Check if profile editing is allowed
    const allowProfileEdit = JSON.parse(localStorage.getItem('allowProfileEdit') || 'true');
    
    if (!allowProfileEdit) {
        showToast('Profile editing is currently disabled by administrator', 'error');
        return;
    }
    
    const name = document.getElementById('profileName').value;
    const email = document.getElementById('profileEmail').value;
    const studentId = document.getElementById('profileStudentId').value;
    const gender = document.getElementById('profileGender').value;
    
    // Validation
    if (!name || !email || !gender) {
        showToast('Please fill in all required fields', 'error');
        return;
    }
    
    // Update current user
    currentUser.name = name;
    currentUser.email = email;
    currentUser.studentId = studentId;
    currentUser.gender = gender;
    
    // Update in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = { ...users[userIndex], ...currentUser };
        localStorage.setItem('bcpUsers', JSON.stringify(users));
    }
    
    // Update current user in localStorage
    localStorage.setItem('bcpCurrentUser', JSON.stringify(currentUser));
    
    // Update UI
    showLoggedInState();
    closeProfileModal();
    showToast('Profile updated successfully!', 'success');
}

function logout() {
    document.getElementById('logoutConfirmModal').style.display = 'block';
    document.getElementById('profileDropdown').classList.remove('active');
}

function closeLogoutConfirmModal() {
    document.getElementById('logoutConfirmModal').style.display = 'none';
}

function confirmUserLogout() {
    currentUser = null;
    localStorage.removeItem('bcpCurrentUser');
    showLoggedOutState();
    restrictSiteAccess();
    closeLogoutConfirmModal();
    showToast('Logged out successfully', 'success');
    
    // Redirect to home
    showSection('home');
}

// Close modals when clicking outside
window.addEventListener('click', function(event) {
    const loginModal = document.getElementById('loginModal');
    const profileModal = document.getElementById('profileModal');
    const logoutModal = document.getElementById('logoutConfirmModal');
    
    if (event.target === loginModal) {
        closeLoginModal();
    }
    if (event.target === profileModal) {
        closeProfileModal();
    }
    if (event.target === logoutModal) {
        closeLogoutConfirmModal();
    }
});
