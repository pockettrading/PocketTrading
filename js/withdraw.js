// Withdrawal Page Controller - PocketTrading
// Fixed: session restore, BIGINT IDs, error messages

class WithdrawManager {
    constructor() {
        this.currentUser = null;
        this.selectedCurrency = 'USDT';
        this.withdrawalFee = 1.5;
        this.minWithdrawal = 100;
        this.init();
    }

    async init() {
        await this.waitForDependencies();
        await this.waitForSession();
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
            setTimeout(() => { clearInterval(check); resolve(); }, 5000);
        });
    }

    async waitForSession() {
        if (typeof auth.waitForReady === 'function') {
            await auth.waitForReady();
        } else {
            await new Promise((resolve) => {
                const check = setInterval(() => {
                    if (auth.initialized) {
                        clearInterval(check);
                        resolve();
                    }
                }, 50);
                setTimeout(() => resolve(), 3000);
            });
        }
        let user = auth.getUser();
        if (user) {
            this.currentUser = user;
            return;
        }
        const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
        if (userId) {
            try {
                const fetchedUser = await supabaseDB.getUserById(parseInt(userId));
                if (fetchedUser) {
                    auth.currentUser = fetchedUser;
                    fetchedUser.isAdmin = (fetchedUser.email === 'ephremgojo@gmail.com');
                    this.currentUser = fetchedUser;
                    auth.dispatchAuthEvent();
                    return;
                }
            } catch (e) {
                console.error('Manual user restore failed:', e);
            }
        }
        this.currentUser = null;
    }

    updateNavbar() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        if (!navLinks) return;
        if (this.currentUser) {
            const isAdmin = this.currentUser.email === 'ephremgojo@gmail.com';
            const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
            navLinks.innerHTML = `<a href="index.html" class="nav-link">Home</a><a href="markets.html" class="nav-link">Markets</a><a href="trades.html" class="nav-link">Trades</a><a href="profile.html" class="nav-link">My Profile</a>`;
            rightNav.innerHTML = `<div class="user-section"><div class="user-info"><div class="user-avatar">${userName.charAt(0).toUpperCase()}</div><div class="user-name">${userName}${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</div></div>${isAdmin ? '<a href="admin.html" class="admin-link">⚙️ Admin Panel</a>' : ''}<button class="logout-btn" onclick="window.logout()">Logout</button></div>`;
            mobileMenu.innerHTML = `<a href="index.html" class="mobile-nav-link">🏠 Home</a><a href="markets.html" class="mobile-nav-link">📊 Markets</a><a href="trades.html" class="mobile-nav-link">🔄 Trades</a><a href="profile.html" class="mobile-nav-link">👤 My Profile</a>${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}<button class="logout-btn" onclick="window.logout()">Logout</button>`;
        } else {
            window.location.href = 'login.html';
        }
    }

    async loadSettings() {
        try {
            const settings = await supabaseDB.getPlatformSettings();
            if (settings && settings.trading_settings) {
                this.withdrawalFee = settings.trading_settings.withdrawalFee || 1.5;
                this.minWithdrawal = settings.trading_settings.minTradeAmount || 100;
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
            balanceEl.style.color = balance < this.minWithdrawal ? '#FF4757' : '#00D897';
        }
    }

    updateSummary() {
        const amount = parseFloat(document.getElementById('withdrawAmount').value) || 0;
        const fee = (amount * this.withdrawalFee) / 100;
        const receiveAmount = amount - fee;
        document.getElementById('summaryAmount').textContent = `$${amount.toFixed(2)}`;
        document.getElementById('feeAmount').textContent = `$${fee.toFixed(4)}`;
        document.getElementById('receiveAmount').textContent = `$${receiveAmount.toFixed(4)}`;
        const submitBtn = document.getElementById('submitWithdraw');
        const walletInput = document.getElementById('walletAddress');
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
        document.querySelectorAll('.currency-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.currency-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedCurrency = btn.dataset.currency;
                this.updateSummary();
            });
        });
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.getElementById('withdrawAmount').value = btn.dataset.amount;
                this.updateSummary();
            });
        });
        document.getElementById('withdrawAmount').addEventListener('input', () => this.updateSummary());
        const walletInput = document.getElementById('walletAddress');
        if (walletInput) walletInput.addEventListener('input', () => this.updateSummary());
        document.getElementById('submitWithdraw').addEventListener('click', () => this.submitWithdrawal());
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
            document.getElementById('withdrawAmount').value = '';
            document.getElementById('walletAddress').value = '';
            this.updateSummary();
            if (this.currentUser.email === 'ephremgojo@gmail.com') {
                await this.autoApproveWithdrawal(withdrawalRequest);
            }
        } catch (error) {
            console.error('Error submitting withdrawal:', error);
            this.showNotification('Failed to submit withdrawal: ' + (error.message || 'Unknown error'), 'error');
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

let withdrawManager = null;
document.addEventListener('DOMContentLoaded', () => {
    withdrawManager = new WithdrawManager();
});

window.logout = function() {
    if (typeof auth !== 'undefined' && auth.logout) auth.logout();
    else window.location.href = 'index.html';
};
