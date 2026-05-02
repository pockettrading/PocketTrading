// Registration Page Controller - PocketTrading
// File: js/register.js
// Admin email: ephremgojo@gmail.com (automatically gets admin role)

class RegisterManager {
    constructor() {
        this.passwordStrength = 0;
        this.init();
    }

    async init() {
        // Wait for auth to be ready
        if (typeof auth === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }
        
        this.setupPasswordStrength();
        this.setupFormValidation();
        this.setupEmailCheck();
        this.checkExistingSession();
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
        
        // Check password criteria
        if (password.length >= 8) strength++;
        if (password.match(/[a-z]+/)) strength++;
        if (password.match(/[A-Z]+/)) strength++;
        if (password.match(/[0-9]+/)) strength++;
        if (password.match(/[$@#&!]+/)) strength++;
        
        // Determine strength level
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
                    <div class="strength-bar" style="width: ${percentage}%; background: ${this.getStrengthColor(strength)}"></div>
                </div>
                <span class="${className}">${message} Password</span>
                <small style="display: block; color: #8B93A5; margin-top: 4px; font-size: 11px;">
                    ${this.getPasswordHint(strength)}
                </small>
            `;
        } else {
            strengthDiv.innerHTML = '';
        }
        
        this.passwordStrength = strength;
    }

    getStrengthColor(strength) {
        if (strength <= 1) return '#FF4757';
        if (strength <= 3) return '#FFA502';
        return '#00D897';
    }

    getPasswordHint(strength) {
        if (strength <= 1) {
            return '⚠️ Use at least 8 characters with letters, numbers, and symbols';
        }
        if (strength <= 3) {
            return '💪 Add uppercase letters and symbols to make it stronger';
        }
        return '✅ Strong password!';
    }

    setupFormValidation() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                await this.validateAndRegister();
            });
        }
        
        // Real-time validation
        const fullName = document.getElementById('fullName');
        const email = document.getElementById('email');
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (fullName) fullName.addEventListener('input', () => this.validateFullName());
        if (email) email.addEventListener('input', () => this.validateEmail());
        if (password) password.addEventListener('input', () => this.validatePassword());
        if (confirmPassword) confirmPassword.addEventListener('input', () => this.validateConfirmPassword());
    }

    setupEmailCheck() {
        const emailInput = document.getElementById('email');
        if (emailInput) {
            emailInput.addEventListener('blur', async () => {
                const email = emailInput.value;
                if (this.isValidEmail(email)) {
                    await this.checkEmailExists(email);
                }
            });
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async checkEmailExists(email) {
        const emailHint = document.getElementById('emailHint');
        if (!emailHint) return;
        
        try {
            if (typeof supabaseDB !== 'undefined') {
                const existingUser = await supabaseDB.getUserByEmail(email);
                if (existingUser) {
                    emailHint.textContent = '⚠️ This email is already registered. Please login instead.';
                    emailHint.style.color = '#FF4757';
                    emailHint.style.display = 'block';
                    return true;
                }
            } else {
                // Check localStorage
                const users = JSON.parse(localStorage.getItem('pockettrading_users') || '[]');
                const existingUser = users.find(u => u.email === email);
                if (existingUser) {
                    emailHint.textContent = '⚠️ This email is already registered. Please login instead.';
                    emailHint.style.color = '#FF4757';
                    emailHint.style.display = 'block';
                    return true;
                }
            }
            emailHint.style.display = 'none';
            return false;
        } catch (error) {
            console.error('Error checking email:', error);
            return false;
        }
    }

    validateFullName() {
        const fullName = document.getElementById('fullName');
        if (!fullName) return true;
        
        const nameParts = fullName.value.trim().split(' ');
        if (nameParts.length < 2) {
            fullName.style.borderColor = '#FF4757';
            return false;
        }
        fullName.style.borderColor = '#00D897';
        return true;
    }

    validateEmail() {
        const email = document.getElementById('email');
        if (!email) return true;
        
        if (!this.isValidEmail(email.value)) {
            email.style.borderColor = '#FF4757';
            return false;
        }
        email.style.borderColor = '#00D897';
        return true;
    }

    validatePassword() {
        const password = document.getElementById('password');
        if (!password) return true;
        
        if (password.value.length < 8) {
            password.style.borderColor = '#FF4757';
            return false;
        }
        password.style.borderColor = '#00D897';
        return true;
    }

    validateConfirmPassword() {
        const password = document.getElementById('password');
        const confirmPassword = document.getElementById('confirmPassword');
        
        if (!password || !confirmPassword) return true;
        
        if (password.value !== confirmPassword.value) {
            confirmPassword.style.borderColor = '#FF4757';
            return false;
        }
        confirmPassword.style.borderColor = '#00D897';
        return true;
    }

    async validateAndRegister() {
        // Get form values
        const fullName = document.getElementById('fullName').value.trim();
        const email = document.getElementById('email').value.trim();
        const password = document.getElementById('password').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const termsAgree = document.getElementById('termsAgree').checked;
        
        // Validate full name
        const nameParts = fullName.split(' ');
        if (nameParts.length < 2) {
            this.showError('Please enter your full name (first and last name)');
            return;
        }
        
        // Validate email
        if (!this.isValidEmail(email)) {
            this.showError('Please enter a valid email address');
            return;
        }
        
        // Check if email already exists
        const emailExists = await this.checkEmailExists(email);
        if (emailExists) {
            this.showError('Email already registered. Please login instead.');
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 2000);
            return;
        }
        
        // Validate password
        if (password.length < 8) {
            this.showError('Password must be at least 8 characters');
            return;
        }
        
        if (password !== confirmPassword) {
            this.showError('Passwords do not match');
            return;
        }
        
        // Check password strength
        if (this.passwordStrength < 3) {
            if (!confirm('Your password is weak. Consider using a stronger password. Continue anyway?')) {
                return;
            }
        }
        
        // Check terms agreement
        if (!termsAgree) {
            this.showError('Please agree to the Terms of Service');
            return;
        }
        
        // Register the user
        await this.registerUser(fullName, email, password);
    }

    async registerUser(fullName, email, password) {
        const submitBtn = document.getElementById('registerBtn');
        const originalText = submitBtn.textContent;
        
        try {
            // Disable button and show loading
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';
            
            // Format name (capitalize first letter of each word)
            const formattedName = fullName.split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            // Check if this is the admin email
            const isAdmin = (email === 'ephremgojo@gmail.com');
            
            // Create user object
            const newUser = {
                id: Date.now(),
                name: formattedName,
                email: email,
                password: password,
                balance: 0,
                kyc_status: 'pending',
                phone: '',
                country: '',
                timezone: 'UTC+0',
                is_admin: isAdmin,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            };
            
            // Save to database
            let saveSuccess = false;
            
            if (typeof supabaseDB !== 'undefined') {
                await supabaseDB.insert('custom_users', newUser);
                saveSuccess = true;
            }
            
            // Always save to localStorage as backup
            const existingUsers = JSON.parse(localStorage.getItem('pockettrading_users') || '[]');
            existingUsers.push(newUser);
            localStorage.setItem('pockettrading_users', JSON.stringify(existingUsers));
            
            // Auto-login the user
            if (typeof auth !== 'undefined' && auth.login) {
                await auth.login(email, password, true);
            } else {
                // Manual login
                localStorage.setItem('pocket_user', JSON.stringify(newUser));
                sessionStorage.removeItem('pocket_user');
            }
            
            // Show success message
            const roleMessage = isAdmin ? ' (Administrator)' : '';
            this.showSuccess(`Welcome ${formattedName}!${roleMessage} Your account has been created successfully.`);
            
            // Redirect to home page
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 1500);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Registration failed. Please try again.');
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        }
    }

    checkExistingSession() {
        const storedUser = sessionStorage.getItem('pocket_user') || localStorage.getItem('pocket_user');
        if (storedUser) {
            window.location.href = 'home.html';
        }
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        // Remove existing notification
        const existing = document.querySelector('.auth-notification');
        if (existing) existing.remove();
        
        // Create notification
        const notification = document.createElement('div');
        notification.className = `auth-notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? 'rgba(255,71,87,0.95)' : 'rgba(0,216,151,0.95)'};
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            font-weight: 500;
            max-width: 350px;
        `;
        
        document.body.appendChild(notification);
        
        // Auto-remove after 3 seconds
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Add CSS for slideOut animation
const style = document.createElement('style');
style.textContent = `
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);

// Initialize when DOM is ready
let registerManager = null;

document.addEventListener('DOMContentLoaded', () => {
    registerManager = new RegisterManager();
});

// Export for global use
window.togglePassword = function(fieldId) {
    const field = document.getElementById(fieldId);
    if (field) {
        field.type = field.type === 'password' ? 'text' : 'password';
    }
};
