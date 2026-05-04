// Authentication and user management - PocketTrading
// File: js/auth.js
// Pure Supabase - No localStorage
// Admin email: ephremgojo@gmail.com (ONLY)

class AuthManager {
    constructor() {
        this.currentUser = null;
        this.sessionUser = null;
        this.init();
    }

    async init() {
        await this.waitForSupabase();
        await this.checkExistingSession();
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
            }
        });
    }

    async checkExistingSession() {
        const userId = sessionStorage.getItem('pocket_user_id');
        
        if (userId) {
            try {
                const user = await supabaseDB.getUserById(parseInt(userId));
                if (user) {
                    this.currentUser = user;
                    this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                    console.log('✅ Session restored for:', this.currentUser.email);
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Error restoring session:', error);
                this.logout();
            }
        }
    }

    async login(email, password, rememberMe = false) {
        try {
            const user = await supabaseDB.getUserByEmail(email);
            
            if (user && user.password === password) {
                await supabaseDB.updateUser(user.id, { 
                    last_login: new Date().toISOString() 
                });
                
                user.isAdmin = (user.email === 'ephremgojo@gmail.com');
                
                sessionStorage.setItem('pocket_user_id', user.id);
                
                if (rememberMe) {
                    localStorage.setItem('pocket_user_id', user.id);
                } else {
                    localStorage.removeItem('pocket_user_id');
                }
                
                this.currentUser = user;
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
            
            const formattedName = fullName.trim().split(/\s+/)
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            
            const isAdmin = (email === 'ephremgojo@gmail.com');
            
            // Remove timezone field - only include columns that exist in your table
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
            
            newUser.isAdmin = isAdmin;
            sessionStorage.setItem('pocket_user_id', newUser.id);
            this.currentUser = newUser;
            
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
        sessionStorage.removeItem('pocket_user_id');
        localStorage.removeItem('pocket_user_id');
        this.currentUser = null;
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

const auth = new AuthManager();

window.logout = () => auth.logout();
window.isLoggedIn = () => auth.isLoggedIn();
window.isAdmin = () => auth.isAdmin();
window.getCurrentUser = () => auth.getUser();
window.auth = auth;
