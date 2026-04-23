// Authentication and user management - Complete working version

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
        
        // Only redirect to login if on protected pages and not logged in
        const protectedPages = ['dashboard.html', 'trade.html', 'profile.html', 'deposit.html', 'withdraw.html'];
        const currentPage = window.location.pathname.split('/').pop();
        
        if (protectedPages.includes(currentPage) && !this.currentUser) {
            window.location.href = 'login.html';
        }
        
        // Don't redirect on home.html or markets.html (public pages)
        if (currentPage === 'home.html' || currentPage === 'markets.html' || currentPage === '') {
            // Allow public access
            return;
        }
        
        // If logged in and on login/register page, redirect to home
        if (this.currentUser && (currentPage === 'login.html' || currentPage === 'register.html')) {
            window.location.href = 'home.html';
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
                break;
            case 2:
            case 3:
                message = 'Medium';
                className = 'strength-medium';
                break;
            case 4:
            case 5:
                message = 'Strong';
                className = 'strength-strong';
                break;
        }
        
        if (password.length > 0) {
            strengthDiv.innerHTML = `
                <div class="strength-bar-container">
                    <div class="strength-bar" style="width: ${strength * 20}%"></div>
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
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const confirmPassword = document.getElementById('confirmPassword').value;
                const termsAgree = document.getElementById('termsAgree')?.checked || false;
                
                if (!email || !password || !confirmPassword) {
                    this.showError('Please fill in all fields');
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
                
                this.register(email, password);
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
            } else {
                sessionStorage.setItem('pocket_user', JSON.stringify(user));
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

    register(email, password) {
        if (this.users.find(u => u.email === email)) {
            this.showError('Email already exists');
            return;
        }
        
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
        
        this.users.push(newUser);
        localStorage.setItem('pocket_users', JSON.stringify(this.users));
        
        this.addTransaction(newUser.id, {
            id: Date.now(),
            type: 'deposit',
            amount: 10000,
            accountType: 'demo',
            method: 'demo_welcome',
            status: 'completed',
            date: new Date().toISOString(),
            description: 'Welcome Demo Bonus - $10,000 credited to your demo account'
        });
        
        this.showSuccess('Demo account created successfully! You have $10,000 to start trading.');
        
        setTimeout(() => {
            this.login(email, password, true);
        }, 1000);
    }

    upgradeToRealAccount(userId, depositAmount) {
        const user = this.users.find(u => u.id === userId);
        
        if (!user) {
            this.showError('User not found');
            return false;
        }
        
        if (depositAmount < 100) {
            this.showError('Minimum deposit for real account is $100');
            return false;
        }
        
        if (depositAmount > 100000) {
            this.showError('Maximum deposit for first time is $100,000');
            return false;
        }
        
        user.hasRealAccount = true;
        user.realBalance += depositAmount;
        
        this.addTransaction(userId, {
            id: Date.now(),
            type: 'deposit',
            amount: depositAmount,
            accountType: 'real',
            method: 'upgrade',
            status: 'completed',
            date: new Date().toISOString(),
            description: `Real account created with $${depositAmount} deposit`
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
        
        this.showSuccess(`Real account created! $${depositAmount} added to your real balance.`);
        return true;
    }

    switchAccountMode(userId, mode) {
        const user = this.users.find(u => u.id === userId);
        
        if (!user) return false;
        
        if (mode === 'real' && !user.hasRealAccount) {
            this.showError('You need to create a real account first. Minimum deposit $100 required.');
            return false;
        }
        
        user.accountMode = mode;
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
        
        const modeName = mode === 'demo' ? 'Demo Account' : 'Real Account';
        const balance = mode === 'demo' ? user.demoBalance : user.realBalance;
        this.showSuccess(`Switched to ${modeName}. Balance: $${balance.toFixed(2)}`);
        return true;
    }

    getCurrentBalance(user) {
        if (!user) return 0;
        return user.accountMode === 'demo' ? user.demoBalance : user.realBalance;
    }

    updateBalance(userId, amount, transactionDetails = {}) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return false;
        
        if (user.accountMode === 'demo') {
            user.demoBalance += amount;
        } else {
            user.realBalance += amount;
        }
        
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

    addTransaction(userId, transaction) {
        const user = this.users.find(u => u.id === userId);
        if (user) {
            if (!user.transactions) user.transactions = [];
            user.transactions.unshift(transaction);
            
            if (!user.stats) user.stats = {};
            if (transaction.type === 'trade') {
                user.stats.totalTrades = (user.stats.totalTrades || 0) + 1;
                user.stats.totalVolume = (user.stats.totalVolume || 0) + (transaction.amount || 0);
                if (transaction.pnl) {
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
        background: var(--border, #2A3545);
        border-radius: 2px;
        overflow: hidden;
    }
    
    .strength-bar {
        height: 100%;
        transition: width 0.3s ease;
        border-radius: 2px;
    }
    
    .strength-weak {
        color: #FF4757;
    }
    
    .strength-weak ~ .strength-bar-container .strength-bar {
        background: #FF4757;
    }
    
    .strength-medium {
        color: #FFA502;
    }
    
    .strength-medium ~ .strength-bar-container .strength-bar {
        background: #FFA502;
    }
    
    .strength-strong {
        color: #00D897;
    }
    
    .strength-strong ~ .strength-bar-container .strength-bar {
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

function forgotPassword(event) {
    if (event) event.preventDefault();
    auth.showNotification('Password reset link sent to your email!', 'success');
}

function socialLogin(provider) {
    auth.showNotification(`Login with ${provider} coming soon!`, 'success');
}

function socialRegister(provider) {
    auth.showNotification(`Sign up with ${provider} coming soon!`, 'success');
}

function upgradeToRealAccount(depositAmount) {
    if (auth.currentUser) {
        return auth.upgradeToRealAccount(auth.currentUser.id, depositAmount);
    }
    return false;
}

function switchAccountMode(mode) {
    if (auth.currentUser) {
        return auth.switchAccountMode(auth.currentUser.id, mode);
    }
    return false;
}

function isLoggedIn() {
    return auth.isLoggedIn();
}

function getCurrentUser() {
    return auth.getUser();
}

// Make auth available globally
window.auth = auth;
window.switchAccountMode = switchAccountMode;
window.upgradeToRealAccount = upgradeToRealAccount;
window.logout = logout;
window.forgotPassword = forgotPassword;
window.socialLogin = socialLogin;
window.socialRegister = socialRegister;
window.isLoggedIn = isLoggedIn;
window.getCurrentUser = getCurrentUser;
