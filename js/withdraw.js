// Withdrawal Page Controller - PocketTrading
// File: js/withdraw.js
// Pure Supabase - No localStorage

class WithdrawManager {
    constructor() {
        this.currentUser = null;
        this.selectedCurrency = 'USDT';
        this.withdrawalFee = 1.5;
        this.minWithdrawal = 10;
        this.init();
    }

    async init() {
        await this.waitForDependencies();
        await this.waitForSession();
        
        this.currentUser = auth.getUser();
        
        // Fallback to sessionStorage
        if (!this.currentUser) {
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) {
                try {
                    const user = await supabaseDB.getUserById(parseInt(userId));
                    if (user) {
                        this.currentUser = user;
                        this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                        if (typeof auth !== 'undefined') auth.currentUser = user;
                    }
                } catch (e) {}
            }
        }
        
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
        this.updateNavbar();
        await this.loadSettings();
        this.updateBalanceDisplay();
        this.setupEventListeners();
        this.updateSummary();
        
        window.addEventListener('authStateChanged', (e) => {
            this.currentUser = e.detail.user;
            this.updateNavbar();
            if (this.currentUser) this.updateBalanceDisplay();
        });
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && typeof supabaseDB !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 5000);
        });
    }

    async waitForSession() {
        return new Promise((resolve) => {
            if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                resolve();
                return;
            }
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) {
                resolve();
                return;
            }
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 3000);
        });
    }

    updateNavbar() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (!navLinks) return;
        
        if (this.currentUser) {
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
                    <button class="logout-btn" onclick="window.logout()">Logout</button>
                </div>
            `;
            
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">🏠 Home</a>
                <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
                <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
                <a href="profile.html" class="mobile-nav-link">👤 My Profile</a>
                ${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}
                <button class="logout-btn" style="margin-top:12px;" onclick="window.logout()">Logout</button>
            `;
        } else {
            window.location.href = 'login.html';
        }
    }

    async loadSettings() {
        try {
            const settings = await supabaseDB.getPlatformSettings();
            if (settings && settings.trading_settings) {
                this.withdrawalFee = settings.trading_settings.withdrawalFee || 1.5;
                this.minWithdrawal = settings.trading_settings.minTradeAmount || 10;
            }
            const feePercentEl = document.getElementById('feePercent');
            if (feePercentEl) feePercentEl.textContent = this.withdrawalFee;
        } catch (error) {
            console.error('Error loading settings:', error);
        }
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
        const walletInput = document.getElementById('walletAddress');
        const balance = this.currentUser.balance || 0;
        
        if (summaryAmount) summaryAmount.textContent = `$${amount.toFixed(2)}`;
        if (feeAmount) feeAmount.textContent = `$${fee.toFixed(4)}`;
        if (receiveAmountEl) receiveAmountEl.textContent = `$${receiveAmount.toFixed(4)}`;
        
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
            } else if (!walletInput?.value.trim()) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enter Wallet Address';
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
                document.getElementById('withdrawAmount').value = amount;
                this.updateSummary();
            });
        });
        
        // Amount input
        document.getElementById('withdrawAmount').addEventListener('input', () => this.updateSummary());
        
        // Wallet address input
        const walletInput = document.getElementById('walletAddress');
        if (walletInput) {
            walletInput.addEventListener('input', () => this.updateSummary());
        }
        
        // Submit button
        document.getElementById('submitWithdraw').addEventListener('click', () => this.submitWithdrawal());
        
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
            fee_percent: this.withdrawalFee,
            fee_amount: fee,
            receive_amount: receiveAmount,
            status: 'pending',
            date: new Date().toISOString()
        };
        
        try {
            await supabaseDB.createWithdrawalRequest(withdrawalRequest);
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: this.currentUser.id,
                type: 'withdrawal',
                title: 'Withdrawal Request Submitted',
                description: `$${amount} ${this.selectedCurrency} withdrawal requested`,
                created_at: new Date().toISOString()
            });
            
            this.showNotification(
                `Withdrawal request submitted!\nAmount: $${amount.toFixed(2)} ${this.selectedCurrency}\nFee: $${fee.toFixed(4)}\nYou will receive: $${receiveAmount.toFixed(4)}\n\nYour withdrawal will be processed within 24-48 hours.`, 
                'success'
            );
            
            // Reset form
            document.getElementById('withdrawAmount').value = '';
            document.getElementById('walletAddress').value = '';
            this.updateSummary();
            
            // Auto-approve for admin user (testing)
            if (this.currentUser.email === 'ephremgojo@gmail.com') {
                await this.autoApproveWithdrawal(withdrawalRequest);
            }
        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            this.showNotification('Failed to submit withdrawal request', 'error');
        }
    }

    async autoApproveWithdrawal(withdrawalRequest) {
        try {
            if ((this.currentUser.balance || 0) < withdrawalRequest.amount) {
                this.showNotification('Insufficient balance for withdrawal', 'error');
                return;
            }
            
            await supabaseDB.updateWithdrawalRequest(withdrawalRequest.id, { status: 'approved' });
            
            const newBalance = (this.currentUser.balance || 0) - withdrawalRequest.amount;
            await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
            this.currentUser.balance = newBalance;
            sessionStorage.setItem('pocket_user_id', this.currentUser.id);
            
            await supabaseDB.createTransaction({
                id: Date.now(),
                user_id: this.currentUser.id,
                amount: -withdrawalRequest.amount,
                type: 'withdrawal',
                description: `Withdrawal of $${withdrawalRequest.amount} ${withdrawalRequest.crypto}`,
                date: new Date().toISOString()
            });
            
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: this.currentUser.id,
                type: 'withdrawal_approved',
                title: 'Withdrawal Approved',
                description: `$${withdrawalRequest.amount} withdrawal has been processed`,
                created_at: new Date().toISOString()
            });
            
            this.updateBalanceDisplay();
            this.showNotification(`✅ Withdrawal auto-approved! New balance: $${newBalance.toFixed(2)}`, 'success');
        } catch (error) {
            console.error('Error auto-approving withdrawal:', error);
            this.showNotification('Failed to auto-approve withdrawal', 'error');
        }
    }

    showNotification(message, type) {
        const existing = document.querySelector('.notification');
        if (existing) existing.remove();
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.textContent = message;
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize
let withdrawManager = null;

document.addEventListener('DOMContentLoaded', () => {
    withdrawManager = new WithdrawManager();
});

window.logout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        sessionStorage.removeItem('pocket_user_id');
        localStorage.removeItem('pocket_user_id');
        window.location.href = 'index.html';
    }
};
