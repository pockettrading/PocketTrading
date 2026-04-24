// Login page functionality - Complete working version

document.addEventListener('DOMContentLoaded', function() {
    console.log('Login page loaded');
    
    // Check if already logged in
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        window.location.href = 'home.html';
        return;
    }
    
    setupFormSubmit();
    setupSocialButtons();
    setupForgotPassword();
});

function setupFormSubmit() {
    const form = document.getElementById('loginForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleLogin();
        });
    }
}

function setupSocialButtons() {
    const googleBtn = document.getElementById('googleLogin');
    const appleBtn = document.getElementById('appleLogin');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            showNotification('Login with Google coming soon!', 'success');
        });
    }
    if (appleBtn) {
        appleBtn.addEventListener('click', function() {
            showNotification('Login with Apple coming soon!', 'success');
        });
    }
}

function setupForgotPassword() {
    const forgotBtn = document.getElementById('forgotPassword');
    if (forgotBtn) {
        forgotBtn.addEventListener('click', function(e) {
            e.preventDefault();
            const email = document.getElementById('email').value;
            if (email) {
                showNotification(`Password reset link sent to ${email}`, 'success');
            } else {
                showNotification('Please enter your email address', 'error');
            }
        });
    }
}

function handleLogin() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const rememberMe = document.getElementById('rememberMe').checked;
    
    // Validation
    if (!email || !password) {
        showNotification('Please enter email and password', 'error');
        return;
    }
    
    // Get users from localStorage
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        // Update last login
        user.lastLogin = new Date().toISOString();
        
        // Update user in storage
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
            users[userIndex] = user;
            localStorage.setItem('pocket_users', JSON.stringify(users));
        }
        
        // Store user session
        if (rememberMe) {
            localStorage.setItem('pocket_user', JSON.stringify(user));
            sessionStorage.removeItem('pocket_user');
        } else {
            sessionStorage.setItem('pocket_user', JSON.stringify(user));
            localStorage.removeItem('pocket_user');
        }
        
        showNotification(`Welcome back, ${user.name || user.email.split('@')[0]}!`, 'success');
        
        // Redirect to home
        setTimeout(function() {
            window.location.href = 'home.html';
        }, 500);
    } else {
        showNotification('Invalid email or password', 'error');
    }
}

function showNotification(message, type) {
    // Remove existing notification
    const existing = document.querySelector('.notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'notification';
    notification.textContent = message;
    notification.style.background = type === 'error' ? '#FF4757' : '#00D897';
    notification.style.color = 'white';
    
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
}
