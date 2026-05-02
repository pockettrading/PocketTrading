// Authentication and user management - PocketTrading
// File: js/auth.js
// Admin email: ephremgojo@gmail.com (ONLY)

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.init();
    }

    async init() {
        await this.loadUsers();
        this.setupEventDelegation();
        await this.checkExistingSession();
    }

    async loadUsers() {
        try {
            // Try to load from Supabase first
            if (typeof supabaseDB !== 'undefined') {
                const cloudUsers = await supabaseDB.getAllUsers();
                if (cloudUsers && cloudUsers.length > 0) {
                    this.users = cloudUsers;
                    // Sync to localStorage as backup
                    localStorage.setItem('pockettrading_users', JSON.stringify(this.users));
                } else {
                    this.users = this.getLocalUsers();
                }
            } else {
                this.users = this.getLocalUsers();
            }
            
            // Ensure admin user exists
            this.ensureAdminUser();
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = this.getLocalUsers();
            this.ensureAdminUser();
        }
    }

    getLocalUsers() {
        const users = localStorage.getItem('pockettrading_users');
        return users ? JSON.parse(users) : [];
    }

    ensureAdminUser() {
        const adminExists = this.users.some(u => u.email === 'ephremgojo@gmail.com');
        if (!adminExists) {
            const adminUser = {
                id: Date.now(),
                name: 'Admin User',
                email: 'ephremgojo@gmail.com',
                password: 'Admin123',
                balance: 50000,
                kyc_status: 'verified',
                phone: '',
                country: 'US',
                timezone: 'UTC+0',
                is_admin: true,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            };
            this.users.push(adminUser);
            this.saveUsers();
        }
    }

    saveUsers() {
        localStorage.setItem('pockettrading_users', JSON.stringify(this.users));
        // Also try to sync with Supabase
        if (typeof supabaseDB !== 'undefined') {
            this.users.forEach(async user => {
                const existing = await supabaseDB.getUserByEmail(user.email);
                if (!existing) {
                    await supabaseDB.insert('custom_users', user);
                }
            });
        }
    }

    setupEventDelegation() {
        // Check if we're on login page
        if (window.location.pathname.includes('login.html') || 
            window.location.pathname === '/' || 
            window.location.pathname === '/index.html') {
            // Don't redirect, let the page handle forms
            return;
        }
    }

    async checkExistingSession() {
        const storedUser = sessionStorage.getItem('pocket_user') || localStorage.getItem('pocket_user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Verify user still exists
            const cloudUser = await this.getUserByEmail(parsedUser.email);
            if (cloudUser) {
                this.currentUser = cloudUser;
                this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                // Update storage with latest data
                this.updateUserSession(this.currentUser);
                console.log('Session restored for:', this.currentUser.email);
            } else {
                // User doesn't exist anymore, clear session
                this.logout();
            }
        }
    }

    async getUserByEmail(email) {
        // Check localStorage first
        const localUser = this.users.find(u => u.email === email);
        if (localUser) return localUser;
        
        // Try Supabase
        if (typeof supabaseDB !== 'undefined') {
            try {
                return await supabaseDB.getUserByEmail(email);
            } catch (e) {
                return null;
            }
        }
        return null;
    }

    async login(email, password, rememberMe) {
        try {
            const user = this.users.find(u => u.email === email && u.password === password);
            
            if (user) {
                // Update last login
                user.last_login = new Date().toISOString();
                this.saveUsers();
                
                // Set admin flag
                user.isAdmin = (user.email === 'ephremgojo@gmail.com');
                
                // Save session
                if (rememberMe) {
                    localStorage.setItem('pocket_user', JSON.stringify(user));
                    sessionStorage.removeItem('pocket_user');
                } else {
                    sessionStorage.setItem('pocket_user', JSON.stringify(user));
                    localStorage.removeItem('pocket_user');
                }
                
                this.currentUser = user;
                this.showNotification(`Welcome back, ${user.name || user.email.split('@')[0]}!`, 'success');
                return true;
            } else {
                // Check if email exists but password wrong
                const emailExists = this.users.some(u => u.email === email);
                if (emailExists) {
                    this.showNotification('Incorrect password', 'error');
                } else {
                    this.showNotification('Account not found. Please register first.', 'error');
                }
                return false;
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showNotification('Login failed. Please try again.', 'error');
            return false;
        }
    }

    async register(fullName, email, password) {
        try {
            // Check if user exists
            const existingUser = this.users.find(u => u.email === email);
            if (existingUser) {
                this.showNotification('Email already exists. Please login.', 'error');
                return false;
            }
            
            // Format name
            const formattedName = fullName.trim().split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            // Check if admin
            const isAdmin = (email === 'ephremgojo@gmail.com');
            
            // Create new user
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
            
            // Save to localStorage
            this.users.push(newUser);
            this.saveUsers();
            
            // Auto-login
            this.currentUser = newUser;
            newUser.isAdmin = isAdmin;
            localStorage.setItem('pocket_user', JSON.stringify(newUser));
            
            const roleMsg = isAdmin ? ' (Administrator)' : '';
            this.showNotification(`Welcome ${formattedName}!${roleMsg} Account created successfully.`, 'success');
            return true;
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showNotification('Registration failed. Please try again.', 'error');
            return false;
        }
    }

    async updateBalance(userId, amount, transactionDetails = {}) {
        try {
            const userIndex = this.users.findIndex(u => u.id === userId);
            if (userIndex !== -1) {
                const newBalance = (this.users[userIndex].balance || 0) + amount;
                this.users[userIndex].balance = newBalance;
                this.saveUsers();
                
                // Update current user if it's the same
                if (this.currentUser && this.currentUser.id === userId) {
                    this.currentUser.balance = newBalance;
                    this.updateUserSession(this.currentUser);
                }
                
                // Record transaction
                this.addTransaction(userId, transactionDetails);
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating balance:', error);
            return false;
        }
    }

    addTransaction(userId, transaction) {
        const transactions = JSON.parse(localStorage.getItem(`transactions_${userId}`) || '[]');
        transactions.push({
            id: Date.now(),
            user_id: userId,
            ...transaction,
            date: new Date().toISOString()
        });
        localStorage.setItem(`transactions_${userId}`, JSON.stringify(transactions));
    }

    updateUserSession(user) {
        if (localStorage.getItem('pocket_user')) {
            localStorage.setItem('pocket_user', JSON.stringify(user));
        }
        if (sessionStorage.getItem('pocket_user')) {
            sessionStorage.setItem('pocket_user', JSON.stringify(user));
        }
    }

    async getUserTrades(userId) {
        const trades = localStorage.getItem(`trades_${userId}`);
        return trades ? JSON.parse(trades) : [];
    }

    async getUserActivities(userId) {
        const activities = localStorage.getItem(`activities_${userId}`);
        return activities ? JSON.parse(activities) : [];
    }

    checkPageAccess() {
        const currentPage = window.location.pathname.split('/').pop() || 'home.html';
        const publicPages = ['index.html', 'home.html', 'markets.html', 'login.html', '', '#'];
        const protectedPages = ['profile.html', 'trades.html', 'deposit.html', 'withdraw.html'];
        const adminPages = ['admin.html'];
        
        const isPublicPage = publicPages.includes(currentPage);
        const isProtectedPage = protectedPages.includes(currentPage);
        const isAdminPage = adminPages.includes(currentPage);
        
        // Allow access to login page even if logged in (will redirect in login.js)
        if (currentPage === 'login.html') return;
        
        if (!this.currentUser && isProtectedPage) {
            window.location.href = 'login.html';
            return;
        }
        
        if (isAdminPage) {
            if (!this.currentUser) {
                window.location.href = 'login.html';
                return;
            }
            if (this.currentUser.email !== 'ephremgojo@gmail.com') {
                this.showNotification('Access denied. Admin only.', 'error');
                window.location.href = 'home.html';
                return;
            }
        }
    }

    showNotification(message, type) {
        // Check if we're on a page that has the notification system
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#FF4757' : (type === 'success' ? '#00D897' : '#FFA502')};
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

    isAdmin() {
        return this.currentUser !== null && this.currentUser.email === 'ephremgojo@gmail.com';
    }

    getUser() {
        return this.currentUser;
    }
}

// Add CSS for notifications if not already present
if (!document.querySelector('#auth-notification-styles')) {
    const style = document.createElement('style');
    style.id = 'auth-notification-styles';
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);
}

// Initialize auth
const auth = new AuthManager();

// Global functions
window.logout = () => auth.logout();
window.isLoggedIn = () => auth.isLoggedIn();
window.isAdmin = () => auth.isAdmin();
window.getCurrentUser = () => auth.getUser();
window.auth = auth;
