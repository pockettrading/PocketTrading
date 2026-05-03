// Withdrawal Page Controller - PocketTrading
// File: js/withdraw.js

class WithdrawManager {
    constructor() {
        this.currentUser = null;
        this.selectedCurrency = 'USDT';
        this.withdrawalFee = 1.5;
        this.minWithdrawal = 10;
        this.init();
    }

    async init() {
        await this.waitForAuth();
        if (typeof auth !== 'undefined') this.currentUser = auth.getUser();
        
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        await this.loadSettings();
        this.setupNavigation();
        this.updateBalanceDisplay();
        this.setupEventListeners();
        this.updateSummary();
    }

    waitForAuth() {
        return new Promise((resolve) => {
            if (typeof auth !== 'undefined') resolve();
            else setTimeout(() => resolve(), 100);
        });
    }

    async loadSettings() {
        try {
            const settings = JSON.parse(localStorage.getItem('platform_settings') || '{}');
            this.withdrawalFee = parseFloat(settings.withdrawalFee) || 1.5;
            this.minWithdrawal = parseInt(settings.minTradeAmount) || 10;
            
            const feePercentEl = document.getElementById('feePercent');
            if (feePercentEl) feePercentEl.textContent = this.withdrawalFee;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    setupNavigation() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        
        const isAdmin = this.currentUser.email === 'ephremgojo@gmail.com';
        const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
        
        navLinks.innerHTML = `
            <a href="index.html" class="nav-link">Home</a>
            <a href="markets.html" class="nav-link">Markets</a>
            <a href="trades.html" class="nav-link">Trades</a>
            <a href="profile.html" class="nav-link">My Profile</a>
        `;
        
        rightNav.innerHTML = `
            <div class="user-section">
                <div class="user-info">
                    <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                    <div class="user-name">${userName}${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</div>
                </div>
                ${isAdmin ? '<a href="admin.html" class="admin-link">⚙️ Admin Panel</a>' : ''}
                <button class="logout-btn" onclick="handleLogout()">Logout</button>
            </div>
        `;
        
        mobileMenu.innerHTML = `
            <a href="index.html" class="mobile-nav-link">🏠 Home</a>
            <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
            <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
            <a href="profile.html" class="mobile-nav-link">👤 My Profile</a>
            ${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}
            <button class="logout-btn" style="margin-top:12px;" onclick="handleLogout()">Logout</button>
        `;
    }

    updateBalanceDisplay() {
        const balance = this.currentUser.balance || 0;
        const balanceEl = document.getElementById('currentBalance');
        if (balanceEl) {
            balanceEl.textContent = `$${balance.toLocaleString()}`;
            if (balance < this.minWithdrawal) {
                balanceEl.style.color = '#FF4757';
            } else {
                balanceEl.style.color = '#00D897';
            }
        }
    }

    updateSummary() {
        const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
        const fee = (amount * this.withdrawalFee) / 100;
        const receiveAmount = amount - fee;
        
        const summaryAmount = document.getElementById('summaryAmount');
        const feeAmount = document.getElementById('feeAmount');
        const receiveAmountEl = document.getElementById('receiveAmount');
        const submitBtn = document.getElementById('submitWithdraw');
        
        if (summaryAmount) summaryAmount.textContent = `$${amount.toFixed(2)}`;
        if (feeAmount) feeAmount.textContent = `$${fee.toFixed(4)}`;
        if (receiveAmountEl) receiveAmountEl.textContent = `$${receiveAmount.toFixed(4)}`;
        
        // Validate
        const balance = this.currentUser.balance || 0;
        if (submitBtn) {
            if (amount < this.minWithdrawal && amount > 0) {
                submitBtn.disabled = true;
                submitBtn.textContent = `Minimum $${this.minWithdrawal}`;
            } else if (amount > balance) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Insufficient Balance';
            } else if (!amount || amount <= 0) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enter Amount';
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Request Withdrawal';
            }
        }
    }

    setupEventListeners() {
        // Currency selector
        document.querySelectorAll('.currency-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedCurrency = btn.dataset.currency;
                this.updateSummary();
            });
        });
        
        // Preset amounts
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                const amountInput = document.getElementById('withdrawAmount');
                if (amountInput) amountInput.value = amount;
                this.updateSummary();
            });
        });
        
        // Amount input
        const amountInput = document.getElementById('withdrawAmount');
        if (amountInput) amountInput.addEventListener('input', () => this.updateSummary());
        
        // Wallet address input validation
        const walletInput = document.getElementById('walletAddress');
        if (walletInput) {
            walletInput.addEventListener('input', () => {
                const submitBtn = document.getElementById('submitWithdraw');
                if (submitBtn && !submitBtn.disabled) {
                    if (!walletInput.value.trim()) {
                        submitBtn.disabled = true;
                        submitBtn.textContent = 'Enter Wallet Address';
                    } else if (parseFloat(document.getElementById('withdrawAmount').value) > 0) {
                        submitBtn.disabled = false;
                        submitBtn.textContent = 'Request Withdrawal';
                    }
                }
            });
        }
        
        // Submit button
        const submitBtn = document.getElementById('submitWithdraw');
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitWithdrawal());
        
        // Mobile menu
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    async submitWithdrawal() {
        const amount = parseFloat(document.getElementById('withdrawAmount').value);
        const walletAddress = document.getElementById('walletAddress').value.trim();
        
        if (!amount || amount < this.minWithdrawal) {
            this.showNotification(`Minimum withdrawal amount is $${this.minWithdrawal}`, 'error');
            return;
        }
        
        if (amount > (this.currentUser.balance || 0)) {
            this.showNotification('Insufficient balance', 'error');
            return;
        }
        
        if (!walletAddress) {
            this.showNotification('Please enter your wallet address', 'error');
            return;
        }
        
        const fee = (amount * this.withdrawalFee) / 100;
        const receiveAmount = amount - fee;
        
        const withdrawalRequest = {
            id: Date.now(),
            user_id: this.currentUser.id,
            user_email: this.currentUser.email,
            user_name: this.currentUser.name,
            amount: amount,
            crypto: this.selectedCurrency,
            wallet_address: walletAddress,
            fee: this.withdrawalFee,
            fee_amount: fee,
            receive_amount: receiveAmount,
            status: 'pending',
            date: new Date().toISOString()
        };
        
        // Save to localStorage
        const existingRequests = JSON.parse(localStorage.getItem('withdrawal_requests') || '[]');
        existingRequests.push(withdrawalRequest);
        localStorage.setItem('withdrawal_requests', JSON.stringify(existingRequests));
        
        // Save to user's withdrawal history
        const userWithdrawals = JSON.parse(localStorage.getItem(`withdrawals_${this.currentUser.id}`) || '[]');
        userWithdrawals.push(withdrawalRequest);
        localStorage.setItem(`withdrawals_${this.currentUser.id}`, JSON.stringify(userWithdrawals));
        
        // Try to save to Supabase
        if (typeof supabaseDB !== 'undefined') {
            try {
                await supabaseDB.insert('withdrawal_requests', withdrawalRequest);
            } catch (e) {
                console.log('Supabase save failed, using localStorage only');
            }
        }
        
        this.showNotification(`Withdrawal request submitted!\nAmount: $${amount.toFixed(2)} ${this.selectedCurrency}\nFee: $${fee.toFixed(4)}\nYou will receive: $${receiveAmount.toFixed(4)}\n\nYour withdrawal will be processed within 24-48 hours.`, 'success');
        
        // Reset form
        document.getElementById('withdrawAmount').value = '';
        document.getElementById('walletAddress').value = '';
        this.updateSummary();
        
        // Auto-approve for admin user (testing purposes only)
        if (this.currentUser.email === 'ephremgojo@gmail.com') {
            const newBalance = (this.currentUser.balance || 0) - amount;
            this.currentUser.balance = newBalance;
            
            if (typeof auth !== 'undefined' && auth.updateBalance) {
                await auth.updateBalance(this.currentUser.id, -amount, {
                    type: 'withdrawal',
                    amount: amount,
                    status: 'auto_approved'
                });
            }
            
            // Update storage
            if (localStorage.getItem('pocket_user')) {
                const user = JSON.parse(localStorage.getItem('pocket_user'));
                user.balance = newBalance;
                localStorage.setItem('pocket_user', JSON.stringify(user));
            }
            if (sessionStorage.getItem('pocket_user')) {
                const user = JSON.parse(sessionStorage.getItem('pocket_user'));
                user.balance = newBalance;
                sessionStorage.setItem('pocket_user', JSON.stringify(user));
            }
            
            this.updateBalanceDisplay();
            this.showNotification(`✅ Auto-approved! New balance: $${newBalance.toFixed(2)}`, 'success');
        }
    }

    showNotification(message, type) {
        // Remove existing notification
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#FF4757' : '#00D897'};
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
        }, 5000);
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
`;
document.head.appendChild(style);

// Initialize
let withdrawManager = null;
document.addEventListener('DOMContentLoaded', () => {
    withdrawManager = new WithdrawManager();
});

// Global logout function
window.handleLogout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        localStorage.removeItem('pocket_user');
        sessionStorage.removeItem('pocket_user');
        window.location.href = 'index.html';
    }
};
