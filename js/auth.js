// Authentication and user management - Supabase Cloud Database
// File: js/auth.js
// Admin email: ephremgojo@gmail.com (ONLY)

class AuthManager {
    constructor() {
        this.users = [];
        this.currentUser = null;
        this.init();
    }

    async init() {
        // Wait for supabaseDB to be ready
        if (typeof supabaseDB === 'undefined') {
            console.log('Waiting for Supabase...');
            setTimeout(() => this.init(), 500);
            return;
        }
        
        await this.loadUsersFromCloud();
        this.setupPasswordStrength();
        
        if (document.getElementById('loginForm')) {
            this.setupLogin();
        }
        
        if (document.getElementById('registerForm')) {
            this.setupRegister();
        }
        
        // Check if user is already logged in
        await this.checkExistingSession();
        
        this.checkPageAccess();
    }

    async loadUsersFromCloud() {
        try {
            this.users = await supabaseDB.getAllUsers();
            console.log('Users loaded from cloud:', this.users.length);
        } catch (error) {
            console.error('Error loading users from cloud:', error);
            this.users = [];
        }
    }

    async checkExistingSession() {
        const storedUser = sessionStorage.getItem('pocket_user') || localStorage.getItem('pocket_user');
        if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            // Verify user still exists in cloud
            const cloudUser = await supabaseDB.getUserByEmail(parsedUser.email);
            if (cloudUser) {
                this.currentUser = cloudUser;
                this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                
                // Update session with latest data
                if (localStorage.getItem('pocket_user')) {
                    localStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
                }
                if (sessionStorage.getItem('pocket_user')) {
                    sessionStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
                }
                console.log('Session restored for:', this.currentUser.email, 'Is Admin:', this.currentUser.isAdmin);
            } else {
                // Clear invalid session
                this.logout();
            }
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

    setupLogin() {
        const form = document.getElementById('loginForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const email = document.getElementById('email').value;
                const password = document.getElementById('password').value;
                const rememberMe = document.getElementById('rememberMe')?.checked || false;
                await this.login(email, password, rememberMe);
            });
        }
    }

    setupRegister() {
        const form = document.getElementById('registerForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
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
                
                await this.register(fullName, email, password);
            });
        }
    }

    async login(email, password, rememberMe) {
        try {
            const user = await supabaseDB.getUserByEmail(email);
            
            if (user && user.password === password) {
                // Update last login
                await supabaseDB.update('users', user.id, {
                    last_login: new Date().toISOString()
                });
                
                // Set admin flag
                user.isAdmin = (user.email === 'ephremgojo@gmail.com');
                
                if (rememberMe) {
                    localStorage.setItem('pocket_user', JSON.stringify(user));
                    sessionStorage.removeItem('pocket_user');
                } else {
                    sessionStorage.setItem('pocket_user', JSON.stringify(user));
                    localStorage.removeItem('pocket_user');
                }
                this.currentUser = user;
                
                const welcomeMessage = user.isAdmin 
                    ? `Welcome back, Admin ${user.name || user.email.split('@')[0]}!` 
                    : `Welcome back, ${user.name || user.email.split('@')[0]}!`;
                
                this.showSuccess(welcomeMessage);
                
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 500);
            } else {
                this.showError('Invalid email or password');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showError('Login failed. Please try again.');
        }
    }

    async register(fullName, email, password) {
        try {
            const existingUser = await supabaseDB.getUserByEmail(email);
            
            if (existingUser) {
                this.showError('Email already exists');
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
            
            await supabaseDB.insert('users', newUser);
            
            const welcomeMessage = isAdmin 
                ? `Welcome Admin ${formattedName}! Your admin account has been created successfully.` 
                : `Welcome ${formattedName}! Your account has been created successfully.`;
            
            this.showSuccess(welcomeMessage);
            
            // Auto-login after registration
            await this.login(email, password, true);
            
        } catch (error) {
            console.error('Registration error:', error);
            this.showError('Registration failed. Please try again.');
        }
    }

    async addTransaction(userId, transaction) {
        try {
            const newTransaction = {
                id: Date.now(),
                user_id: userId,
                ...transaction,
                date: new Date().toISOString()
            };
            await supabaseDB.insert('transactions', newTransaction);
            console.log('Transaction added:', newTransaction);
        } catch (error) {
            console.error('Error adding transaction:', error);
        }
    }

    async updateBalance(userId, amount, transactionDetails = {}) {
        try {
            const user = await supabaseDB.getUserByEmail(this.currentUser.email);
            if (user) {
                const newBalance = (user.balance || 0) + amount;
                await supabaseDB.updateUserBalance(userId, newBalance);
                
                await this.addTransaction(userId, {
                    type: transactionDetails.type || 'trade',
                    amount: Math.abs(amount),
                    ...transactionDetails,
                    status: 'completed'
                });
                
                if (this.currentUser && this.currentUser.id === userId) {
                    this.currentUser.balance = newBalance;
                    if (localStorage.getItem('pocket_user')) {
                        localStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
                    }
                    if (sessionStorage.getItem('pocket_user')) {
                        sessionStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
                    }
                }
            }
            return true;
        } catch (error) {
            console.error('Error updating balance:', error);
            return false;
        }
    }

    async updateUserKYC(userId, kycData) {
        try {
            await supabaseDB.updateUserKYCStatus(userId, 'pending');
            
            const kycRequest = {
                id: Date.now(),
                user_id: userId,
                user_email: this.currentUser.email,
                full_name: kycData.fullName,
                dob: kycData.dob,
                id_type: kycData.idType,
                status: 'pending',
                date: new Date().toISOString()
            };
            await supabaseDB.insert('kyc_requests', kycRequest);
            
            this.showSuccess('KYC documents submitted successfully!');
            return true;
        } catch (error) {
            console.error('Error submitting KYC:', error);
            this.showError('Failed to submit KYC');
            return false;
        }
    }

    async createDepositRequest(depositData) {
        try {
            const depositRequest = {
                id: Date.now(),
                user_id: this.currentUser.id,
                user_email: this.currentUser.email,
                user_name: this.currentUser.name,
                amount: depositData.amount,
                currency: depositData.currency,
                wallet_address: depositData.walletAddress,
                screenshot: depositData.screenshot,
                status: 'pending',
                date: new Date().toISOString()
            };
            await supabaseDB.insert('deposit_requests', depositRequest);
            this.showSuccess('Deposit request submitted! Admin will review within 24 hours.');
            return true;
        } catch (error) {
            console.error('Error creating deposit request:', error);
            this.showError('Failed to submit deposit request');
            return false;
        }
    }

    async createWithdrawalRequest(withdrawalData) {
        try {
            const withdrawalRequest = {
                id: Date.now(),
                user_id: this.currentUser.id,
                user_email: this.currentUser.email,
                user_name: this.currentUser.name,
                amount: withdrawalData.amount,
                crypto: withdrawalData.crypto,
                wallet_address: withdrawalData.walletAddress,
                fee: withdrawalData.fee,
                status: 'pending',
                date: new Date().toISOString()
            };
            await supabaseDB.insert('withdrawal_requests', withdrawalRequest);
            this.showSuccess('Withdrawal request submitted! Admin will review within 24-48 hours.');
            return true;
        } catch (error) {
            console.error('Error creating withdrawal request:', error);
            this.showError('Failed to submit withdrawal request');
            return false;
        }
    }

    checkPageAccess() {
        const currentPage = window.location.pathname.split('/').pop() || 'home.html';
        
        // PUBLIC PAGES - Anyone can access
        const publicPages = ['home.html', 'markets.html', 'trading-view.html', 'index.html', '', '#', null];
        
        // PROTECTED PAGES - Login required
        const protectedPages = ['dashboard.html', 'trade.html', 'profile.html', 'deposit.html', 'withdraw.html'];
        
        // ADMIN PAGES - Admin only
        const adminPages = ['admin.html'];
        
        const isPublicPage = publicPages.includes(currentPage);
        const isProtectedPage = protectedPages.includes(currentPage);
        const isAdminPage = adminPages.includes(currentPage);
        
        // Redirect logic for different user types
        if (!this.currentUser && isProtectedPage) {
            console.log('Redirecting to login: Protected page accessed without login');
            window.location.href = 'login.html';
            return;
        }
        
        if (this.currentUser && (currentPage === 'login.html' || currentPage === 'register.html')) {
            console.log('Redirecting to home: Already logged in');
            window.location.href = 'home.html';
            return;
        }
        
        // Admin page access - only ephremgojo@gmail.com
        if (isAdminPage) {
            if (!this.currentUser) {
                window.location.href = 'login.html';
                return;
            }
            if (this.currentUser.email !== 'ephremgojo@gmail.com') {
                alert('Access denied. Admin only.');
                window.location.href = 'home.html';
                return;
            }
        }
        
        if (isPublicPage) {
            console.log('Public page accessed:', currentPage);
            return;
        }
        
        console.log('Current page:', currentPage, 'Logged in:', !!this.currentUser, 'Is Admin:', this.currentUser?.isAdmin);
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

    isAdmin() {
        return this.currentUser !== null && this.currentUser.email === 'ephremgojo@gmail.com';
    }

    getUser() {
        return this.currentUser;
    }
}

// Add CSS animations
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
    .strength-weak ~ .strength-bar-container .strength-bar { background: #FF4757; }
    
    .strength-medium { color: #FFA502; }
    .strength-medium ~ .strength-bar-container .strength-bar { background: #FFA502; }
    
    .strength-strong { color: #00D897; }
    .strength-strong ~ .strength-bar-container .strength-bar { background: #00D897; }
`;
document.head.appendChild(style);

// Initialize auth
const auth = new AuthManager();

// Global functions
function logout() { auth.logout(); }
function isLoggedIn() { return auth.isLoggedIn(); }
function isAdmin() { return auth.isAdmin(); }
function getCurrentUser() { return auth.getUser(); }

// Make auth available globally
window.auth = auth;
window.logout = logout;
window.isLoggedIn = isLoggedIn;
window.isAdmin = isAdmin;
window.getCurrentUser = getCurrentUser;
