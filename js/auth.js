// Authentication and user management - Real Account Only with Full Name (No Social Login)

class AuthManager {
    constructor() {
        this.users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        this.currentUser = JSON.parse(sessionStorage.getItem('pocket_user') || localStorage.getItem('pocket_user') || 'null');
        this.init();
    }

    init() {
        this.setupPasswordStrength();
        
        if (document.getElementById('loginForm')) {
            this.setupLogin();
        }
        
        if (document.getElementById('registerForm')) {
            this.setupRegister();
        }
        
        // Get current page name
        const currentPage = window.location.pathname.split('/').pop() || 'home.html';
        
        // PUBLIC PAGES - No login required (anyone can access)
        const publicPages = ['home.html', 'markets.html', 'trading-view.html', 'index.html', '', '#', null];
        
        // PROTECTED PAGES - Login required
        const protectedPages = ['dashboard.html', 'trade.html', 'profile.html', 'deposit.html', 'withdraw.html', 'admin.html'];
        
        const isPublicPage = publicPages.includes(currentPage);
        const isProtectedPage = protectedPages.includes(currentPage);
        
        // If user is NOT logged in and trying to access protected page -> redirect to login
        if (!this.currentUser && isProtectedPage) {
            console.log('Redirecting to login: Protected page accessed without login');
            window.location.href = 'login.html';
            return;
        }
        
        // If user IS logged in and trying to access login/register page -> redirect to home
        if (this.currentUser && (currentPage === 'login.html' || currentPage === 'register.html')) {
            console.log('Redirecting to home: Already logged in');
            window.location.href = 'home.html';
            return;
        }
        
        // For public pages, do nothing - allow access
        if (isPublicPage) {
            console.log('Public page accessed:', currentPage);
            return;
        }
        
        console.log('Current page:', currentPage, 'Logged in:', !!this.currentUser);
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

    setupLogin() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('rememberMe')?.checked || false;
                this.login(email, password, rememberMe);
            });
        }
    }

    setupRegister() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                const fullName = document.getElementById('fullName')?.value;
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const termsAgree = document.getElementById('termsAgree')?.checked || false;
                
                if (!fullName || !email || !password || !confirmPassword) {
                    this.showError('Please fill in all fields');
                    return;
                }
                
                const nameParts = fullName.trim().split(' ');
                if (nameParts.length < 2) {
                    this.showError('Please enter your full name (first and last name)');
                    return;
                }
                
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                if (!emailRegex.test(email)) {
                    this.showError('Please enter a valid email address');
                    return;
                }
                
                if (password !== confirmPassword) {
                    this.showError('Passwords do not match');
                    return;
                }
                
                if (password.length < 8) {
                    this.showError('Password must be at least 8 characters');
                    return;
                }
                
                if (!termsAgree) {
                    this.showError('Please agree to the Terms of Service');
                    return;
                }
                
                this.register(fullName, email, password);
            });
        }
    }

    login(email, password, rememberMe) {
        const user = this.users.find(u => u.email === email && u.password === password);
        
        if (user) {
            user.lastLogin = new Date().toISOString();
            this.updateUser(user);
            
            if (rememberMe) {
                localStorage.setItem('pocket_user', JSON.stringify(user));
                sessionStorage.removeItem('pocket_user');
            } else {
                sessionStorage.setItem('pocket_user', JSON.stringify(user));
                localStorage.removeItem('pocket_user');
            }
            this.currentUser = user;
            
            this.showSuccess(`Welcome back, ${user.name || user.email.split('@')[0]}!`);
            
            setTimeout(() => {
                window.location.href = 'home.html';
            }, 500);
        } else {
            this.showError('Invalid email or password');
        }
    }

    register(fullName, email, password) {
        if (this.users.find(u => u.email === email)) {
            this.showError('Email already exists');
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
        
        this.users.push(newUser);
        localStorage.setItem('pocket_users', JSON.stringify(this.users));
        
        this.showSuccess(`Welcome ${formattedName}! Your account has been created successfully. Make a deposit to start trading.`);
        
        // Auto-login after registration
        setTimeout(() => {
            this.login(email, password, true);
        }, 1500);
    }

    addTransaction(userId, transaction) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            if (!user.transactions) user.transactions = [];
            user.transactions.unshift(transaction);
            
            if (!user.stats) user.stats = {};
            if (transaction.type === 'trade' || transaction.type === 'buy' || transaction.type === 'sell') {
                user.stats.totalTrades = (user.stats.totalTrades || 0) + 1;
                user.stats.totalVolume = (user.stats.totalVolume || 0) + (transaction.amount || 0);
                if (transaction.pnl) {
                    user.stats.totalProfit = (user.stats.totalProfit || 0) + transaction.pnl;
                    if (transaction.pnl > 0) {
                        user.stats.winningTrades = (user.stats.winningTrades || 0) + 1;
                    } else if (transaction.pnl < 0) {
                        user.stats.losingTrades = (user.stats.losingTrades || 0) + 1;
                    }
                }
            }
            
            this.updateUser(user);
        }
    }

    updateUser(updatedUser) {
        const index = this.users.findIndex(u => u.id === updatedUser.id);
        if (index !== -1) {
            this.users[index] = updatedUser;
            localStorage.setItem('pocket_users', JSON.stringify(this.users));
            
            if (this.currentUser && this.currentUser.id === updatedUser.id) {
                this.currentUser = updatedUser;
                if (localStorage.getItem('pocket_user')) {
                    localStorage.setItem('pocket_user', JSON.stringify(updatedUser));
                }
                if (sessionStorage.getItem('pocket_user')) {
                    sessionStorage.setItem('pocket_user', JSON.stringify(updatedUser));
                }
            }
        }
    }

    updateBalance(userId, amount, transactionDetails = {}) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return false;
        
        user.balance += amount;
        
        this.addTransaction(userId, {
            id: Date.now(),
            type: transactionDetails.type || 'trade',
            amount: Math.abs(amount),
            ...transactionDetails,
            status: 'completed',
            date: new Date().toISOString()
        });
        
        this.updateUser(user);
        
        if (this.currentUser && this.currentUser.id === userId) {
            this.currentUser = user;
            if (localStorage.getItem('pocket_user')) {
                localStorage.setItem('pocket_user', JSON.stringify(user));
            }
            if (sessionStorage.getItem('pocket_user')) {
                sessionStorage.setItem('pocket_user', JSON.stringify(user));
            }
        }
        
        return true;
    }

    getCurrentBalance(user) {
        if (!user) return 0;
        return user.balance;
    }

    showError(message) {
        this.showNotification(message, 'error');
    }

    showSuccess(message) {
        this.showNotification(message, 'success');
    }

    showNotification(message, type) {
        const existing = document.querySelector('.auth-notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `auth-notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? 'rgba(255, 71, 87, 0.95)' : 'rgba(0, 216, 151, 0.95)'};
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
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }

    logout() {
        localStorage.removeItem('pocket_user');
        sessionStorage.removeItem('pocket_user');
        this.currentUser = null;
        window.location.href = 'home.html';
    }

    isLoggedIn() {
        return this.currentUser !== null;
    }

    getUser() {
        return this.currentUser;
    }
}

// Add CSS animations and password strength styles
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    
    @keyframes slideOut {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
    
    .strength-bar-container {
        margin-top: 8px;
        height: 4px;
        background: #2A3545;
        border-radius: 2px;
        overflow: hidden;
    }
    
    .strength-bar {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 2px;
    }
    
    .strength-weak { color: #FF4757; }
    .strength-weak ~ .strength-bar-container .strength-bar,
    .strength-weak + .strength-bar-container .strength-bar {
        background: #FF4757;
    }
    
    .strength-medium { color: #FFA502; }
    .strength-medium ~ .strength-bar-container .strength-bar,
    .strength-medium + .strength-bar-container .strength-bar {
        background: #FFA502;
    }
    
    .strength-strong { color: #00D897; }
    .strength-strong ~ .strength-bar-container .strength-bar,
    .strength-strong + .strength-bar-container .strength-bar {
        background: #00D897;
    }
`;
document.head.appendChild(style);

// Initialize auth
const auth = new AuthManager();

// Global functions
function logout() {
    auth.logout();
}

function isLoggedIn() {
    return auth.isLoggedIn();
}

function getCurrentUser() {
    return auth.getUser();
}

// Make auth available globally
window.auth = auth;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
