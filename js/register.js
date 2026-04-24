// Register page functionality - No redirect issues

document.addEventListener('DOMContentLoaded', function() {
    console.log('Register page loaded');
    
    // Check if already logged in
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        window.location.href = 'home.html';
        return;
    }
    
    setupPasswordStrength();
    setupFormSubmit();
    setupSocialButtons();
});

function setupPasswordStrength() {
    const passwordInput = document.getElementById('password');
    if (passwordInput) {
        passwordInput.addEventListener('input', function(e) {
            checkPasswordStrength(e.target.value);
        });
    }
}

function checkPasswordStrength(password) {
    const strengthDiv = document.getElementById('passwordStrength');
    if (!strengthDiv) return;
    
    let strength = 0;
    let message = '';
    let className = '';
    let percentage = 0;
    
    if (password.length >= 8) strength++;
    if (password.match(/[a-z]+/)) strength++;
    if (password.match(/[A-Z]+/)) strength++;
    if (password.match(/[0-9]+/)) strength++;
    if (password.match(/[$@#&!]+/)) strength++;
    
    switch(strength) {
        case 0: case 1:
            message = 'Weak';
            className = 'strength-weak';
            percentage = 20;
            break;
        case 2: case 3:
            message = 'Medium';
            className = 'strength-medium';
            percentage = 60;
            break;
        case 4: case 5:
            message = 'Strong';
            className = 'strength-strong';
            percentage = 100;
            break;
    }
    
    if (password.length > 0) {
        strengthDiv.innerHTML = `
            <div class="strength-bar-container">
                <div class="strength-bar" style="width: ${percentage}%"></div>
            </div>
            <span class="${className}">${message} Password</span>
        `;
    } else {
        strengthDiv.innerHTML = '';
    }
}

function setupFormSubmit() {
    const form = document.getElementById('registerForm');
    if (form) {
        form.addEventListener('submit', function(e) {
            e.preventDefault();
            handleRegister();
        });
    }
}

function setupSocialButtons() {
    const googleBtn = document.getElementById('googleRegister');
    const appleBtn = document.getElementById('appleRegister');
    
    if (googleBtn) {
        googleBtn.addEventListener('click', function() {
            showNotification('Sign up with Google coming soon!', 'success');
        });
    }
    if (appleBtn) {
        appleBtn.addEventListener('click', function() {
            showNotification('Sign up with Apple coming soon!', 'success');
        });
    }
}

function handleRegister() {
    const email = document.getElementById('email').value.trim();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    const termsAgree = document.getElementById('termsAgree').checked;
    
    // Validation
    if (!email || !password || !confirmPassword) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showNotification('Please enter a valid email address', 'error');
        return;
    }
    
    if (password !== confirmPassword) {
        showNotification('Passwords do not match', 'error');
        return;
    }
    
    if (password.length < 8) {
        showNotification('Password must be at least 8 characters', 'error');
        return;
    }
    
    if (!termsAgree) {
        showNotification('Please agree to the Terms of Service', 'error');
        return;
    }
    
    // Get existing users
    let users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    
    // Check if email exists
    if (users.find(u => u.email === email)) {
        showNotification('Email already exists', 'error');
        return;
    }
    
    // Create new user
    const newUser = {
        id: Date.now(),
        name: email.split('@')[0],
        email: email,
        password: password,
        demoBalance: 10000,
        realBalance: 0,
        accountMode: 'demo',
        hasRealAccount: false,
        kycStatus: 'pending',
        created: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        transactions: [],
        withdrawals: [],
        deposits: [],
        portfolio: {},
        stats: {
            totalTrades: 0,
            winningTrades: 0,
            losingTrades: 0,
            totalVolume: 0
        }
    };
    
    // Add welcome transaction
    newUser.transactions.push({
        id: Date.now(),
        type: 'deposit',
        amount: 10000,
        accountType: 'demo',
        method: 'demo_welcome',
        status: 'completed',
        date: new Date().toISOString(),
        description: 'Welcome Demo Bonus - $10,000 credited to your demo account'
    });
    
    // Save user
    users.push(newUser);
    localStorage.setItem('pocket_users', JSON.stringify(users));
    
    // Auto login
    sessionStorage.setItem('pocket_user', JSON.stringify(newUser));
    localStorage.removeItem('pocket_user');
    
    showNotification('Demo account created successfully! You have $10,000 to start trading.', 'success');
    
    // Redirect to home
    setTimeout(function() {
        window.location.href = 'home.html';
    }, 1500);
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
