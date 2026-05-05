// Authentication and user management - PocketTrading
// File: js/auth.js
// Pure Supabase - No localStorage for user data
// Admin email: ephremgojo@gmail.com (ONLY)

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.initialized = false;
        this.init();
    }

    async init() {
        await this.waitForSupabase();
        await this.restoreSession();
        this.initialized = true;
        this.dispatchAuthEvent();
        console.log('✅ AuthManager initialized, user:', this.currentUser?.email || 'none');
    }

    async waitForSupabase() {
        return new Promise((resolve) => {
            if (typeof supabaseDB !== 'undefined' && supabaseDB.supabase) {
                resolve();
            } else {
                const checkInterval = setInterval(() => {
                    if (typeof supabaseDB !== 'undefined' && supabaseDB.supabase) {
                        clearInterval(checkInterval);
                        resolve();
                    }
                }, 100);
                // Timeout after 5 seconds
                setTimeout(() => {
                    clearInterval(checkInterval);
                    console.warn('Supabase timeout, continuing anyway');
                    resolve();
                }, 5000);
            }
        });
    }

    async restoreSession() {
        // Try to get user ID from storage
        const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
        
        if (!userId) {
            console.log('No session found');
            return;
        }
        
        try {
            const user = await supabaseDB.getUserById(parseInt(userId));
            if (user) {
                this.currentUser = user;
                this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                console.log('✅ Session restored for:', this.currentUser.email);
            } else {
                // User not found in database, clear session
                this.clearSession();
            }
        } catch (error) {
            console.error('Error restoring session:', error);
            this.clearSession();
        }
    }

    clearSession() {
        sessionStorage.removeItem('pocket_user_id');
        localStorage.removeItem('pocket_user_id');
        this.currentUser = null;
    }

    dispatchAuthEvent() {
        const event = new CustomEvent('authStateChanged', { 
            detail: { user: this.currentUser, isLoggedIn: !!this.currentUser }
        });
        window.dispatchEvent(event);
    }

    async waitForReady() {
        return new Promise((resolve) => {
            if (this.initialized) {
                resolve();
            } else {
                const check = setInterval(() => {
                    if (this.initialized) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
                setTimeout(() => {
                    clearInterval(check);
                    resolve();
                }, 3000);
            }
        });
    }

    async login(email, password, rememberMe = false) {
        try {
            const user = await supabaseDB.getUserByEmail(email);
            
            if (user && user.password === password) {
                // Update last login
                await supabaseDB.updateUser(user.id, { 
                    last_login: new Date().toISOString() 
                });
                
                // Set admin flag
                user.isAdmin = (user.email === 'ephremgojo@gmail.com');
                
                // Store session - ONLY THE USER ID, not the whole user object
                if (rememberMe) {
                    localStorage.setItem('pocket_user_id', user.id);
                    sessionStorage.removeItem('pocket_user_id');
                } else {
                    sessionStorage.setItem('pocket_user_id', user.id);
                    localStorage.removeItem('pocket_user_id');
                }
                
                this.currentUser = user;
                this.dispatchAuthEvent();
                this.showNotification(`Welcome back, ${user.name || user.email.split('@')[0]}!`, 'success');
                return true;
            } else {
                const emailExists = await supabaseDB.getUserByEmail(email);
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
            const existingUser = await supabaseDB.getUserByEmail(email);
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
            
            // Create new user (no timezone field)
            const newUser = {
                id: Date.now(),
                name: formattedName,
                email: email,
                password: password,
                balance: 0,
                kyc_status: 'pending',
                phone: '',
                country: '',
                is_admin: isAdmin,
                created_at: new Date().toISOString(),
                last_login: new Date().toISOString()
            };
            
            await supabaseDB.createUser(newUser);
            
            // Auto-login after registration
            newUser.isAdmin = isAdmin;
            sessionStorage.setItem('pocket_user_id', newUser.id);
            localStorage.removeItem('pocket_user_id');
            this.currentUser = newUser;
            this.dispatchAuthEvent();
            
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
            const user = await supabaseDB.getUserById(userId);
            if (user) {
                const newBalance = (user.balance || 0) + amount;
                await supabaseDB.updateUserBalance(userId, newBalance);
                
                if (this.currentUser && this.currentUser.id === userId) {
                    this.currentUser.balance = newBalance;
                }
                
                await supabaseDB.createTransaction({
                    id: Date.now(),
                    user_id: userId,
                    amount: amount,
                    type: transactionDetails.type || 'balance_update',
                    description: JSON.stringify(transactionDetails),
                    date: new Date().toISOString()
                });
                
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error updating balance:', error);
            return false;
        }
    }

    async getUserTrades(userId) {
        return await supabaseDB.getUserTrades(userId);
    }

    async getUserActivities(userId) {
        return await supabaseDB.getUserActivities(userId);
    }

    logout() {
        this.clearSession();
        this.dispatchAuthEvent();
        this.showNotification('Logged out successfully', 'info');
        window.location.href = 'index.html';
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

    getUsername() {
        if (!this.currentUser) return '';
        return this.currentUser.name || this.currentUser.email.split('@')[0];
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
}

// Add CSS for notifications
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

// Global helper functions
window.isLoggedIn = () => auth.isLoggedIn();
window.isAdmin = () => auth.isAdmin();
window.getCurrentUser = () => auth.getUser();
window.getUsername = () => auth.getUsername();
window.logout = () => auth.logout();
window.auth = auth;
