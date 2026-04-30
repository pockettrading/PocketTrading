// Login page functionality - Optimized for Guest, Registered, and Admin Users
// File: js/login.js

class LoginManager {
    constructor() {
        this.init();
    }

    async init() {
        // Wait for supabaseDB
        if (typeof supabaseDB === 'undefined') {
            console.log('Waiting for Supabase...');
            setTimeout(() => this.init(), 500);
            return;
        }
        
        await this.checkAlreadyLoggedIn();
        this.setupEventListeners();
    }

    async checkAlreadyLoggedIn() {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            
            // Verify user still exists in cloud
            const cloudUser = await supabaseDB.getUserByEmail(user.email);
            if (cloudUser) {
                // User is already logged in, redirect to home
                console.log('User already logged in, redirecting to home...');
                window.location.href = 'home.html';
            } else {
                // Clear invalid session
                localStorage.removeItem('pocket_user');
                sessionStorage.removeItem('pocket_user');
            }
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
    }

    async handleLogin() {
        const email = document.getElementById('email').value;
        const password = document.getElementById('password').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        console.log('Attempting login for:', email);

        if (!email || !password) {
            this.showNotification('Please enter email and password', 'error');
            return;
        }

        try {
            // Get user from Supabase
            const user = await supabaseDB.getUserByEmail(email);
            console.log('User found:', user ? 'Yes' : 'No');

            if (user && user.password === password) {
                console.log('Password matched! Logging in...');
                
                // Update last login
                await supabaseDB.update('custom_users', user.id, {
                    last_login: new Date().toISOString()
                });

                // Set admin flag
                user.isAdmin = (user.email === 'ephregojo@gmail.com');

                // Store user session
                if (rememberMe) {
                    localStorage.setItem('pocket_user', JSON.stringify(user));
                    sessionStorage.removeItem('pocket_user');
                    console.log('Saved to localStorage (remember me)');
                } else {
                    sessionStorage.setItem('pocket_user', JSON.stringify(user));
                    localStorage.removeItem('pocket_user');
                    console.log('Saved to sessionStorage');
                }

                const displayName = user.name || user.email.split('@')[0];
                const isAdmin = user.isAdmin;
                
                if (isAdmin) {
                    this.showNotification(`Welcome back, Admin ${displayName}!`, 'success');
                } else {
                    this.showNotification(`Welcome back, ${displayName}!`, 'success');
                }

                // Redirect to home page
                console.log('Redirecting to home.html...');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 500);
            } else {
                this.showNotification('Invalid email or password', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
        }
    }

    handleForgotPassword() {
        const email = document.getElementById('email').value;
        
        if (!email) {
            this.showNotification('Please enter your email address', 'error');
            return;
        }
        
        // In a real app, send reset email
        this.showNotification(`Password reset link sent to ${email}`, 'success');
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

// Initialize login page
const loginManager = new LoginManager();
