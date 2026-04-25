// Login page functionality - Complete working version

class LoginManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAlreadyLoggedIn();
    }

    checkAlreadyLoggedIn() {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            window.location.href = 'home.html';
        }
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleLogin();
            });
        }

        const forgotPasswordLink = document.getElementById('forgotPassword');
        if (forgotPasswordLink) {
            forgotPasswordLink.addEventListener('click', (e) => {
                e.preventDefault();
                this.handleForgotPassword();
            });
        }

        const googleLogin = document.getElementById('googleLogin');
        if (googleLogin) {
            googleLogin.addEventListener('click', () => {
                this.handleSocialLogin('Google');
            });
        }

        const appleLogin = document.getElementById('appleLogin');
        if (appleLogin) {
            appleLogin.addEventListener('click', () => {
                this.handleSocialLogin('Apple');
            });
        }
    }

    handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        if (!email || !password) {
            this.showNotification('Please enter email and password', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const user = users.find(u => u.email === email && u.password === password);

        if (user) {
            user.lastLogin = new Date().toISOString();
            
            const userIndex = users.findIndex(u => u.id === user.id);
            if (userIndex !== -1) {
                users[userIndex] = user;
                localStorage.setItem('pocket_users', JSON.stringify(users));
            }

            if (rememberMe) {
                localStorage.setItem('pocket_user', JSON.stringify(user));
                sessionStorage.removeItem('pocket_user');
            } else {
                sessionStorage.setItem('pocket_user', JSON.stringify(user));
                localStorage.removeItem('pocket_user');
            }

            const displayName = user.name || user.email.split('@')[0];
            this.showNotification(`Welcome back, ${displayName}!`, 'success');

            setTimeout(() => {
                window.location.href = 'home.html';
            }, 500);
        } else {
            this.showNotification('Invalid email or password', 'error');
        }
    }

    handleForgotPassword() {
        const email = document.getElementById('email').value;
        
        if (!email) {
            this.showNotification('Please enter your email address', 'error');
            return;
        }

        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const user = users.find(u => u.email === email);
        
        if (user) {
            this.showNotification(`Password reset link sent to ${email}`, 'success');
        } else {
            this.showNotification('Email address not found', 'error');
        }
    }

    handleSocialLogin(provider) {
        this.showNotification(`Login with ${provider} coming soon!`, 'success');
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

const loginManager = new LoginManager();
