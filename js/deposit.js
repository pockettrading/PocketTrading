// Deposit Page Controller - PocketTrading
// File: js/deposit.js
// Pure Supabase - No localStorage

class DepositManager {
    constructor() {
        this.currentUser = null;
        this.selectedCurrency = 'USDT';
        this.minDeposit = 10;
        this.cryptoAddresses = {
            USDT: 'TX8xKJk3g5xVHhRq2LpN7mY9wQeRtYuIoP',
            BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5'
        };
        this.networkFees = {
            USDT: 1.00,
            BTC: 0.0002,
            ETH: 0.005
        };
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
        await this.loadCryptoAddresses();
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
                this.minDeposit = settings.trading_settings.minTradeAmount || 10;
            }
        } catch (error) {
            console.error('Error loading settings:', error);
        }
    }

    async loadCryptoAddresses() {
        try {
            const settings = await supabaseDB.getPlatformSettings();
            if (settings && settings.crypto_deposit_addresses) {
                this.cryptoAddresses = settings.crypto_deposit_addresses;
            }
        } catch (error) {
            console.error('Error loading crypto addresses:', error);
        }
        this.updateCryptoAddress();
    }

    updateCryptoAddress() {
        const address = this.cryptoAddresses[this.selectedCurrency] || this.cryptoAddresses['USDT'];
        const addressEl = document.getElementById('cryptoAddress');
        const addressLabel = document.getElementById('addressLabel');
        
        if (addressEl) addressEl.textContent = address;
        if (addressLabel) {
            let network = 'TRC20';
            if (this.selectedCurrency === 'BTC') network = 'BTC';
            if (this.selectedCurrency === 'ETH') network = 'ERC20';
            addressLabel.textContent = `Send ${this.selectedCurrency} (${network}) to this address:`;
        }
    }

    updateBalanceDisplay() {
        const balance = this.currentUser.balance || 0;
        const balanceEl = document.getElementById('currentBalance');
        if (balanceEl) {
            balanceEl.textContent = `$${balance.toLocaleString()}`;
        }
    }

    updateSummary() {
        const amount = parseFloat(document.getElementById('depositAmount').value) || 0;
        const fee = this.networkFees[this.selectedCurrency] || 1;
        const total = amount + fee;
        
        const summaryAmount = document.getElementById('summaryAmount');
        const networkFee = document.getElementById('networkFee');
        const totalAmount = document.getElementById('totalAmount');
        const submitBtn = document.getElementById('submitDeposit');
        
        if (summaryAmount) summaryAmount.textContent = `$${amount.toFixed(2)}`;
        if (networkFee) networkFee.textContent = `$${fee.toFixed(4)}`;
        if (totalAmount) totalAmount.textContent = `$${total.toFixed(4)}`;
        
        if (submitBtn) {
            if (amount < this.minDeposit && amount > 0) {
                submitBtn.disabled = true;
                submitBtn.textContent = `Minimum $${this.minDeposit}`;
            } else if (!amount || amount <= 0) {
                submitBtn.disabled = true;
                submitBtn.textContent = 'Enter Amount';
            } else {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Deposit Request';
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
                this.updateCryptoAddress();
                this.updateSummary();
            });
        });
        
        // Preset amounts
        document.querySelectorAll('.preset-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const amount = btn.dataset.amount;
                document.getElementById('depositAmount').value = amount;
                this.updateSummary();
            });
        });
        
        // Amount input
        document.getElementById('depositAmount').addEventListener('input', () => this.updateSummary());
        
        // Submit button
        document.getElementById('submitDeposit').addEventListener('click', () => this.submitDeposit());
        
        // Mobile menu
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    async submitDeposit() {
        const amount = parseFloat(document.getElementById('depositAmount').value);
        
        if (!amount || amount < this.minDeposit) {
            this.showNotification(`Minimum deposit amount is $${this.minDeposit}`, 'error');
            return;
        }
        
        const fee = this.networkFees[this.selectedCurrency] || 1;
        const total = amount + fee;
        
        const depositRequest = {
            id: Date.now(),
            user_id: this.currentUser.id,
            user_email: this.currentUser.email,
            user_name: this.currentUser.name,
            amount: amount,
            currency: this.selectedCurrency,
            fee: fee,
            total: total,
            status: 'pending',
            date: new Date().toISOString()
        };
        
        try {
            await supabaseDB.createDepositRequest(depositRequest);
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: this.currentUser.id,
                type: 'deposit',
                title: 'Deposit Request Submitted',
                description: `$${amount} ${this.selectedCurrency} deposit requested`,
                created_at: new Date().toISOString()
            });
            
            this.showNotification(`Deposit request submitted!\nAmount: $${amount.toFixed(2)} ${this.selectedCurrency}\n\nYour deposit will be processed within 5-30 minutes.`, 'success');
            
            // Reset form
            document.getElementById('depositAmount').value = '';
            this.updateSummary();
            
            // Auto-approve for admin user (testing)
            if (this.currentUser.email === 'ephremgojo@gmail.com') {
                await this.autoApproveDeposit(depositRequest);
            }
        } catch (error) {
            console.error('Error submitting deposit:', error);
            this.showNotification('Failed to submit deposit request', 'error');
        }
    }

    async autoApproveDeposit(depositRequest) {
        try {
            await supabaseDB.updateDepositRequest(depositRequest.id, { status: 'approved' });
            
            const newBalance = (this.currentUser.balance || 0) + depositRequest.amount;
            await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
            this.currentUser.balance = newBalance;
            sessionStorage.setItem('pocket_user_id', this.currentUser.id);
            
            await supabaseDB.createTransaction({
                id: Date.now(),
                user_id: this.currentUser.id,
                amount: depositRequest.amount,
                type: 'deposit',
                description: `Deposit of $${depositRequest.amount} ${depositRequest.currency}`,
                date: new Date().toISOString()
            });
            
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: this.currentUser.id,
                type: 'deposit_approved',
                title: 'Deposit Approved',
                description: `$${depositRequest.amount} deposit has been approved`,
                created_at: new Date().toISOString()
            });
            
            this.updateBalanceDisplay();
            this.showNotification(`✅ Deposit auto-approved! New balance: $${newBalance.toFixed(2)}`, 'success');
        } catch (error) {
            console.error('Error auto-approving deposit:', error);
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
let depositManager = null;

document.addEventListener('DOMContentLoaded', () => {
    depositManager = new DepositManager();
});

window.copyAddress = function() {
    const address = document.getElementById('cryptoAddress').textContent;
    if (address) {
        navigator.clipboard.writeText(address);
        alert('Address copied to clipboard!');
    }
};

window.logout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        sessionStorage.removeItem('pocket_user_id');
        localStorage.removeItem('pocket_user_id');
        window.location.href = 'index.html';
    }
};
