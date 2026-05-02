// Deposit Page Controller - PocketTrading
// File: js/deposit.js

class DepositManager {
    constructor() {
        this.currentUser = null;
        this.selectedCurrency = 'USDT';
        this.selectedMethod = 'crypto';
        this.cryptoAddresses = {
            USDT: 'TX8xKJk3g5xVHhRq2LpN7mY9wQeRtYuIoP',
            BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb5',
            SOL: '5vEt4uR6LrY7ZxVkQpWnM8jHsK9cFdGtYhJkLzXcVb'
        };
        this.networkFees = {
            USDT: 1.00,
            BTC: 0.0002,
            ETH: 0.005,
            SOL: 0.01
        };
        this.init();
    }

    async init() {
        if (typeof auth === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.currentUser = auth.getUser();
        
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        this.setupUI();
        this.setupEventListeners();
    }

    setupUI() {
        this.updateBalanceDisplay();
        this.updateSummary();
    }

    updateBalanceDisplay() {
        const balance = this.currentUser.balance || 0;
        const balanceEl = document.getElementById('currentBalance');
        if (balanceEl) balanceEl.textContent = `$${balance.toLocaleString()}`;
    }

    updateSummary() {
        const amount = parseFloat(document.getElementById('depositAmount')?.value) || 0;
        const fee = this.selectedMethod === 'crypto' ? (this.networkFees[this.selectedCurrency] || 1) : 0;
        const total = amount + fee;
        
        const summaryAmount = document.getElementById('summaryAmount');
        const networkFee = document.getElementById('networkFee');
        const totalAmount = document.getElementById('totalAmount');
        
        if (summaryAmount) summaryAmount.textContent = `$${amount.toFixed(2)}`;
        if (networkFee) networkFee.textContent = `$${fee.toFixed(2)}`;
        if (totalAmount) totalAmount.textContent = `$${total.toFixed(2)}`;
    }

    updateCryptoAddress() {
        const address = this.cryptoAddresses[this.selectedCurrency] || this.cryptoAddresses['USDT'];
        const addressEl = document.getElementById('cryptoAddress');
        const addressLabel = document.querySelector('#cryptoAddressSection .address-label');
        
        if (addressEl) addressEl.textContent = address;
        if (addressLabel) addressLabel.textContent = `Send ${this.selectedCurrency} (TRC20) to this address:`;
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
                const amountInput = document.getElementById('depositAmount');
                if (amountInput) amountInput.value = amount;
                this.updateSummary();
            });
        });
        
        // Amount input
        const amountInput = document.getElementById('depositAmount');
        if (amountInput) amountInput.addEventListener('input', () => this.updateSummary());
        
        // Payment method
        document.querySelectorAll('.method-option').forEach(opt => {
            opt.addEventListener('click', () => {
                document.querySelectorAll('.method-option').forEach(o => o.classList.remove('active'));
                opt.classList.add('active');
                this.selectedMethod = opt.dataset.method;
                
                const cryptoSection = document.getElementById('cryptoAddressSection');
                const cardForm = document.getElementById('cardForm');
                const bankInfo = document.getElementById('bankInfo');
                
                if (cryptoSection) cryptoSection.style.display = this.selectedMethod === 'crypto' ? 'block' : 'none';
                if (cardForm) cardForm.style.display = this.selectedMethod === 'card' ? 'block' : 'none';
                if (bankInfo) bankInfo.style.display = this.selectedMethod === 'bank' ? 'block' : 'none';
                
                this.updateSummary();
            });
        });
        
        // Submit button
        const submitBtn = document.getElementById('submitDeposit');
        if (submitBtn) submitBtn.addEventListener('click', () => this.submitDeposit());
        
        // Mobile menu
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    async submitDeposit() {
        const amount = parseFloat(document.getElementById('depositAmount')?.value);
        
        if (!amount || amount < 10) {
            alert('Please enter a valid amount (minimum $10)');
            return;
        }
        
        if (this.selectedMethod === 'card') {
            const cardNumber = document.getElementById('cardNumber')?.value;
            const expiryDate = document.getElementById('expiryDate')?.value;
            const cvv = document.getElementById('cvv')?.value;
            const cardholderName = document.getElementById('cardholderName')?.value;
            
            if (!cardNumber || !expiryDate || !cvv || !cardholderName) {
                alert('Please fill in all card details');
                return;
            }
        }
        
        const fee = this.selectedMethod === 'crypto' ? (this.networkFees[this.selectedCurrency] || 1) : 0;
        const total = amount + fee;
        
        const depositRequest = {
            id: Date.now(),
            user_id: this.currentUser.id,
            user_email: this.currentUser.email,
            user_name: this.currentUser.name,
            amount: amount,
            currency: this.selectedCurrency,
            method: this.selectedMethod,
            fee: fee,
            total: total,
            status: 'pending',
            date: new Date().toISOString()
        };
        
        // Save to localStorage
        const existingRequests = JSON.parse(localStorage.getItem('deposit_requests') || '[]');
        existingRequests.push(depositRequest);
        localStorage.setItem('deposit_requests', JSON.stringify(existingRequests));
        
        // Save to user's deposit history
        const userDeposits = JSON.parse(localStorage.getItem(`deposits_${this.currentUser.id}`) || '[]');
        userDeposits.push(depositRequest);
        localStorage.setItem(`deposits_${this.currentUser.id}`, JSON.stringify(userDeposits));
        
        alert(`Deposit request submitted!\nAmount: $${amount.toFixed(2)} ${this.selectedCurrency}\nMethod: ${this.selectedMethod.toUpperCase()}\n\nYour deposit will be processed within 5-30 minutes.`);
        
        // Reset form
        const amountInput = document.getElementById('depositAmount');
        if (amountInput) amountInput.value = '';
        this.updateSummary();
        
        // Auto-approve for admin and demo users
        if (this.currentUser.email === 'ephremgojo@gmail.com' || this.currentUser.email === 'demo@example.com') {
            const newBalance = (this.currentUser.balance || 0) + amount;
            this.currentUser.balance = newBalance;
            
            if (typeof auth !== 'undefined' && auth.updateBalance) {
                await auth.updateBalance(this.currentUser.id, amount, {
                    type: 'deposit',
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
            alert(`✅ Deposit auto-approved! New balance: $${newBalance.toFixed(2)}`);
        }
    }

    copyAddress() {
        const address = document.getElementById('cryptoAddress')?.textContent;
        if (address) {
            navigator.clipboard.writeText(address);
            alert('Address copied to clipboard!');
        }
    }
}

// Initialize
let depositManager = null;
document.addEventListener('DOMContentLoaded', () => {
    depositManager = new DepositManager();
});

window.copyAddress = () => depositManager?.copyAddress();
window.handleLogout = () => {
    if (typeof auth !== 'undefined' && auth.logout) auth.logout();
    else { localStorage.clear(); sessionStorage.clear(); window.location.href = 'home.html'; }
};
