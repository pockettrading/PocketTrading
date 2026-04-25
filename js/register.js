// Register page functionality - Auto-login after registration

class RegisterManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupPasswordStrength();
        this.checkAlreadyLoggedIn();
    }

    checkAlreadyLoggedIn() {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            window.location.href = 'home.html';
        }
    }

    setupEventListeners() {
        const registerForm = document.getElementById('registerForm');
        if (registerForm) {
            registerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleRegister();
            });
        }
    }

    setupPasswordStrength() {
        const passwordInput = document.getElementById('password');
        if (passwordInput) {
            passwordInput.addEventListener('input', (e) => {
                this.checkPasswordStrength(e.target.value);
            });
        }
    }

    checkPasswordStrength(password) {
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
            case 0:
            case 1:
                message = 'Weak';
                className = 'strength-weak';
                percentage = 20;
                break;
            case 2:
            case 3:
                message = 'Medium';
                className = 'strength-medium';
                percentage = 60;
                break;
            case 4:
            case 5:
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

    handleRegister() {
        const fullName = document.getElementById('fullName').value;
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAgree = document.getElementById('termsAgree').checked;

        // Validation
        if (!fullName || !email || !password || !confirmPassword) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        const nameParts = fullName.trim().split(' ');
        if (nameParts.length < 2) {
            this.showNotification('Please enter your full name (first and last name)', 'error');
            return;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            this.showNotification('Please enter a valid email address', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showNotification('Passwords do not match', 'error');
            return;
        }

        if (password.length < 8) {
            this.showNotification('Password must be at least 8 characters', 'error');
            return;
        }

        if (!termsAgree) {
            this.showNotification('Please agree to the Terms of Service', 'error');
            return;
        }

        // Get existing users
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        
        if (users.find(u => u.email === email)) {
            this.showNotification('Email already exists', 'error');
            return;
        }

        // Format full name properly
        const formattedName = fullName.trim().split(' ').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(' ');

        // Create new user with REAL account only (balance starts at $0)
        const newUser = {
            id: Date.now(),
            name: formattedName,
            email: email,
            password: password,
            balance: 0,
            kycStatus: 'pending',
            created: new Date().toISOString(),
            lastLogin: new Date().toISOString(),
            transactions: [],
            withdrawals: [],
            deposits: [],
            pendingDeposits: [],
            portfolio: {},
            stats: {
                totalTrades: 0,
                winningTrades: 0,
                losingTrades: 0,
                totalVolume: 0,
                totalProfit: 0
            }
        };

        users.push(newUser);
        localStorage.setItem('pocket_users', JSON.stringify(users));

        // Auto-login - store user session
        sessionStorage.setItem('pocket_user', JSON.stringify(newUser));
        localStorage.removeItem('pocket_user');

        this.showNotification(`Welcome ${formattedName}! Your account has been created successfully. Redirecting...`, 'success');

        // Redirect to home page after 1.5 seconds
        setTimeout(() => {
            window.location.href = 'home.html';
        }, 1500);
    }

    showNotification(message, type) {
        // Remove existing notification
        const existing = document.querySelector('.auth-notification');
        if (existing) existing.remove();

        const notification = document.createElement('div');
        notification.className = 'auth-notification';
        notification.textContent = message;
        notification.style.background = type === 'error' ? 'rgba(255, 71, 87, 0.95)' : 'rgba(0, 216, 151, 0.95)';
        notification.style.color = 'white';
        
        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 2000);
    }
}

// Initialize register page
const registerManager = new RegisterManager();
