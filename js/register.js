// Register page functionality - Supabase Cloud Database
// File: js/register.js

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

    async handleRegister() {
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

        try {
            // Check if supabaseDB is available
            if (typeof supabaseDB === 'undefined') {
                this.showNotification('Database connection error. Please refresh and try again.', 'error');
                return;
            }

            // Check if user already exists in Supabase
            const existingUsers = await supabaseDB.get('users', { email: email });
            
            if (existingUsers && existingUsers.length > 0) {
                this.showNotification('Email already exists', 'error');
                return;
            }

            const formattedName = fullName.trim().split(' ').map(word => 
                word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
            ).join(' ');

            // Check if this is the admin email
            const isAdmin = (email === 'ephremgojo@gmail.com');

            const newUser = {
                id: Date.now(),
                name: formattedName,
                email: email,
                password: password,
                balance: 0,
                kyc_status: 'pending',
                phone: '',
                country: '',
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString(),
                is_admin: isAdmin
            };

            // Insert into Supabase
            const result = await supabaseDB.insert('users', newUser);
            
            console.log('User registered successfully:', newUser);

            this.showNotification(`Welcome ${formattedName}! Your account has been created successfully.`, 'success');

            // Auto login after registration
            sessionStorage.setItem('pocket_user', JSON.stringify(newUser));
            localStorage.removeItem('pocket_user');

            setTimeout(() => {
                window.location.href = 'home.html';
            }, 2000);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registration failed. Please try again.', 'error');
        }
    }

    showNotification(message, type) {
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
        }, 3000);
    }
}

// Wait for supabaseDB to be ready
function waitForSupabase() {
    if (typeof supabaseDB !== 'undefined' && supabaseDB) {
        console.log('Supabase ready, initializing register manager...');
        new RegisterManager();
    } else {
        console.log('Waiting for Supabase...');
        setTimeout(waitForSupabase, 100);
    }
}

// Start the registration manager
waitForSupabase();
