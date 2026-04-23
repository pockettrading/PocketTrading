// Withdraw functionality - Complete working version

let currentUser = null;
let withdrawAmount = 0;

// Withdrawal limits
const MIN_WITHDRAW = 100;
const MAX_WITHDRAW_PER_DAY = 10000;
const WITHDRAW_FEE_PERCENT = 0.5;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Withdraw page loaded');
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    initWithdrawPage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
    }
}

function initWithdrawPage() {
    loadUserInfo();
    loadBalance();
    loadTradingStats();
    setupEventListeners();
    checkWithdrawalEligibility();
    loadTodayWithdrawals();
}

function loadUserInfo() {
    const fullNameElem = document.getElementById('fullName');
    const emailElem = document.getElementById('email');
    const kycStatusElem = document.getElementById('kycStatus');
    const memberSinceElem = document.getElementById('memberSince');
    
    if (fullNameElem) {
        fullNameElem.textContent = currentUser.name || currentUser.email.split('@')[0];
    }
    
    if (emailElem) {
        emailElem.textContent = currentUser.email;
    }
    
    if (kycStatusElem) {
        const kycStatus = currentUser.kycStatus || 'pending';
        kycStatusElem.textContent = kycStatus;
        kycStatusElem.className = `status-badge-large ${kycStatus === 'verified' ? 'status-verified' : 'status-pending'}`;
    }
    
    if (memberSinceElem) {
        const date = currentUser.created ? new Date(currentUser.created) : new Date();
        memberSinceElem.textContent = date.toLocaleDateString();
    }
}

function loadBalance() {
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const balanceElem = document.getElementById('accountBalance');
    if (balanceElem) {
        balanceElem.textContent = `$${currentBalance.toFixed(2)}`;
    }
}

function loadTradingStats() {
    const transactions = currentUser.transactions || [];
    const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    
    // Calculate daily profit/loss
    const today = new Date().toDateString();
    const todayTrades = trades.filter(t => new Date(t.date).toDateString() === today);
    let dailyProfit = 0;
    todayTrades.forEach(trade => {
        if (trade.pnl) {
            dailyProfit += trade.pnl;
        }
    });
    
    const dailyProfitElem = document.getElementById('dailyProfitLoss');
    if (dailyProfitElem) {
        const sign = dailyProfit >= 0 ? '+' : '';
        dailyProfitElem.textContent = `${sign}$${dailyProfit.toFixed(2)}`;
        dailyProfitElem.style.color = dailyProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    
    // Calculate totals
    const totalTrades = trades.length;
    let winningTrades = 0;
    let totalVolume = 0;
    
    trades.forEach(trade => {
        totalVolume += trade.total || 0;
        if (trade.pnl && trade.pnl > 0) winningTrades++;
    });
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
    
    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('totalVolume').textContent = `$${totalVolume.toFixed(2)}`;
}

function setupEventListeners() {
    // Amount input
    const amountInput = document.getElementById('withdrawAmount');
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            validateWithdrawAmount();
        });
    }
    
    // Quick amount buttons
    const quickBtns = document.querySelectorAll('.quick-withdraw-btn');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            if (amountInput) {
                amountInput.value = amount;
                validateWithdrawAmount();
            }
        });
    });
    
    // Form submission
    const withdrawForm = document.getElementById('withdrawForm');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processWithdrawal();
        });
    }
    
    // Wallet address input
    const walletAddress = document.getElementById('walletAddress');
    if (walletAddress) {
        walletAddress.addEventListener('input', function() {
            validateWithdrawAmount();
        });
    }
}

function checkWithdrawalEligibility() {
    const kycAlert = document.getElementById('kycAlert');
    const demoAlert = document.getElementById('demoAlert');
    const withdrawForm = document.getElementById('withdrawForm');
    const withdrawBtn = document.getElementById('withdrawBtn');
    
    // Check if user has real account
    if (!currentUser.hasRealAccount || currentUser.accountMode === 'demo') {
        if (demoAlert) demoAlert.style.display = 'block';
        if (withdrawBtn) withdrawBtn.disabled = true;
        if (withdrawForm) withdrawForm.style.opacity = '0.5';
        return false;
    }
    
    // Check KYC status
    const kycStatus = currentUser.kycStatus || 'pending';
    if (kycStatus !== 'verified') {
        if (kycAlert) kycAlert.style.display = 'block';
        if (withdrawBtn) withdrawBtn.disabled = true;
        if (withdrawForm) withdrawForm.style.opacity = '0.5';
        return false;
    }
    
    if (kycAlert) kycAlert.style.display = 'none';
    if (demoAlert) demoAlert.style.display = 'none';
    if (withdrawBtn) withdrawBtn.disabled = false;
    if (withdrawForm) withdrawForm.style.opacity = '1';
    return true;
}

function loadTodayWithdrawals() {
    const today = new Date().toDateString();
    const withdrawals = (currentUser.withdrawals || []).filter(w => 
        new Date(w.date).toDateString() === today
    );
    
    const todayTotal = withdrawals.reduce((sum, w) => sum + w.amount, 0);
    return todayTotal;
}

function validateWithdrawAmount() {
    const amountInput = document.getElementById('withdrawAmount');
    const warningMsg = document.getElementById('warningMessage');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const receiveAmountSpan = document.getElementById('receiveAmount');
    
    let amount = parseFloat(amountInput?.value || 0);
    
    if (isNaN(amount)) amount = 0;
    withdrawAmount = amount;
    
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const todayWithdrawn = loadTodayWithdrawals();
    const remainingDailyLimit = MAX_WITHDRAW_PER_DAY - todayWithdrawn;
    
    // Calculate fee and receive amount
    const fee = Math.min(Math.max(amount * (WITHDRAW_FEE_PERCENT / 100), 1), 50);
    const receiveAmount = amount - fee;
    
    if (receiveAmountSpan) {
        receiveAmountSpan.textContent = `$${receiveAmount.toFixed(2)} ($${fee.toFixed(2)} fee)`;
    }
    
    // Validate
    if (amount <= 0) {
        if (warningMsg) warningMsg.style.display = 'none';
        if (withdrawBtn) withdrawBtn.disabled = true;
        return false;
    }
    
    if (amount < MIN_WITHDRAW) {
        if (warningMsg) {
            warningMsg.style.display = 'block';
            warningMsg.innerHTML = `<p>⚠️ Minimum withdrawal amount is $${MIN_WITHDRAW}</p>`;
        }
        if (withdrawBtn) withdrawBtn.disabled = true;
        return false;
    }
    
    if (amount > remainingDailyLimit) {
        if (warningMsg) {
            warningMsg.style.display = 'block';
            warningMsg.innerHTML = `<p>⚠️ Daily withdrawal limit remaining: $${remainingDailyLimit}</p>`;
        }
        if (withdrawBtn) withdrawBtn.disabled = true;
        return false;
    }
    
    if (amount > currentBalance) {
        if (warningMsg) {
            warningMsg.style.display = 'block';
            warningMsg.innerHTML = `<p>⚠️ Insufficient balance. Available: $${currentBalance.toFixed(2)}</p>`;
        }
        if (withdrawBtn) withdrawBtn.disabled = true;
        return false;
    }
    
    if (warningMsg) warningMsg.style.display = 'none';
    if (withdrawBtn) withdrawBtn.disabled = false;
    return true;
}

function processWithdrawal() {
    if (!validateWithdrawAmount()) return;
    
    const walletAddress = document.getElementById('walletAddress').value;
    const crypto = document.getElementById('withdrawCrypto').value;
    const cryptoName = getCryptoName(crypto);
    
    if (!walletAddress || walletAddress.trim() === '') {
        showNotification('Please enter your wallet address', 'error');
        return;
    }
    
    const amount = withdrawAmount;
    const currentBalance = currentUser.realBalance;
    
    if (amount > currentBalance) {
        showNotification('Insufficient balance', 'error');
        return;
    }
    
    // Calculate fee
    const fee = Math.min(Math.max(amount * (WITHDRAW_FEE_PERCENT / 100), 1), 50);
    const receiveAmount = amount - fee;
    
    // Process withdrawal
    currentUser.realBalance -= amount;
    
    // Add to withdrawal history
    if (!currentUser.withdrawals) currentUser.withdrawals = [];
    currentUser.withdrawals.push({
        id: Date.now(),
        amount: amount,
        fee: fee,
        receiveAmount: receiveAmount,
        crypto: crypto,
        cryptoName: cryptoName,
        walletAddress: walletAddress,
        status: 'pending',
        date: new Date().toISOString()
    });
    
    // Add transaction record
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift({
        id: Date.now(),
        type: 'withdraw',
        amount: amount,
        fee: fee,
        receiveAmount: receiveAmount,
        crypto: crypto,
        status: 'pending',
        date: new Date().toISOString(),
        description: `Withdrawal request to ${cryptoName} wallet`
    });
    
    // Save user data
    saveUserData();
    
    showNotification(`Withdrawal request submitted! Amount: $${amount.toFixed(2)} (Fee: $${fee.toFixed(2)}). Admin will process within 24-48 hours.`, 'success');
    
    // Reset form
    resetForm();
    
    // Update balance display
    loadBalance();
    
    // Redirect to profile after 3 seconds
    setTimeout(() => {
        window.location.href = 'profile.html';
    }, 3000);
}

function getCryptoName(symbol) {
    const names = {
        BTC: 'Bitcoin',
        ETH: 'Ethereum',
        USDT: 'Tether',
        BNB: 'Binance Coin',
        SOL: 'Solana'
    };
    return names[symbol] || symbol;
}

function resetForm() {
    const amountInput = document.getElementById('withdrawAmount');
    const walletAddress = document.getElementById('walletAddress');
    const cryptoSelect = document.getElementById('withdrawCrypto');
    
    if (amountInput) amountInput.value = '';
    if (walletAddress) walletAddress.value = '';
    if (cryptoSelect) cryptoSelect.value = 'BTC';
    
    withdrawAmount = 0;
    validateWithdrawAmount();
}

function saveUserData() {
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pocket_users', JSON.stringify(users));
    }
    
    if (localStorage.getItem('pocket_user')) {
        localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
    if (sessionStorage.getItem('pocket_user')) {
        sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
}

function showNotification(message, type) {
    const existing = document.querySelector('.withdraw-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
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
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'login.html';
}

// Make functions global
window.resetForm = resetForm;
window.handleLogout = handleLogout;
