// js/auth.js
// Authentication and user management

class AuthManager {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        this.currentUser = JSON.parse(sessionStorage.getItem('pocket_user') || localStorage.getItem('pocket_user') || 'null');
        this.init();
    }

    init() {
        // Check if we're on login page
        if (document.getElementById('loginForm')) {
            this.setupLogin();
        }
        
        // Check if we're on register page
        if (document.getElementById('registerForm')) {
            this.setupRegister();
        }
        
        // Auto-redirect if logged in
        if (this.currentUser && !window.location.pathname.includes('dashboard')) {
            window.location.href = 'dashboard.html';
        }
        
        if (!this.currentUser && window.location.pathname.includes('dashboard')) {
            window.location.href = 'login.html';
        }
    }

    setupLogin() {
        const form = document.getElementById('loginForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberMe = document.getElementById('rememberMe')?.checked || false;
            
            this.login(email, password, rememberMe);
        });
    }

    setupRegister() {
        const form = document.getElementById('registerForm');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (password !== confirmPassword) {
                this.showError('Passwords do not match');
                return;
            }
            
            this.register(name, email, password);
        });
    }

    login(email, password, rememberMe) {
        const user = this.users.find(u => u.email === email && u.password === password);
        
        if (user) {
            if (rememberMe) {
                localStorage.setItem('pocket_user', JSON.stringify(user));
            } else {
                sessionStorage.setItem('pocket_user', JSON.stringify(user));
            }
            this.currentUser = user;
            window.location.href = 'dashboard.html';
        } else {
            this.showError('Invalid email or password');
        }
    }

    register(name, email, password) {
        if (this.users.find(u => u.email === email)) {
            this.showError('Email already exists');
            return;
        }
        
        const newUser = {
            id: Date.now(),
            name,
            email,
            password,
            balance: 1000,
            created: new Date().toISOString()
        };
        
        this.users.push(newUser);
        localStorage.setItem('pocket_users', JSON.stringify(this.users));
        
        // Auto login after registration
        this.login(email, password, true);
    }

    logout() {
        localStorage.removeItem('pocket_user');
        sessionStorage.removeItem('pocket_user');
        this.currentUser = null;
        window.location.href = 'login.html';
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            background: rgba(255, 71, 87, 0.1);
            color: #FF4757;
            padding: 12px;
            border-radius: 12px;
            margin-bottom: 1rem;
            text-align: center;
        `;
        
        const form = document.querySelector('form');
        form.insertBefore(errorDiv, form.firstChild);
        
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

// Initialize auth
const auth = new AuthManager();

// Global logout function
function logout() {
    auth.logout();
}
