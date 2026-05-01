// Withdraw page functionality - Supabase Integration
// File: js/withdraw.js

let currentUser = null;
let withdrawAmount = 0;

// Admin email
const ADMIN_EMAIL = 'ephregojo@gmail.com';

// Withdrawal limits
const MIN_WITHDRAW = 100;
const MAX_WITHDRAW_PER_DAY = 10000;
const WITHDRAW_FEE_PERCENT = 0.5;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Withdraw page loaded');
    
    if (typeof supabaseDB === 'undefined') {
        setTimeout(() => initWithdrawPage(), 500);
        return;
    }
    
    await initWithdrawPage();
});

async function initWithdrawPage() {
    await loadUser();
    renderNavLinks();
    renderUserInfo();
    
    if (!currentUser) {
        renderLoginPrompt();
    } else {
        renderWithdrawInterface();
        setupEventListeners();
        await loadUserBalance();
    }
}

async function loadUser() {
    try {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            
            // Verify user still exists in cloud
            const cloudUser = await supabaseDB.getUserByEmail(currentUser.email);
            if (cloudUser) {
                currentUser = cloudUser;
                currentUser.isAdmin = (currentUser.email === ADMIN_EMAIL);
                
                // Update session
                if (localStorage.getItem('pocket_user')) {
                    localStorage.setItem('pocket_user', JSON.stringify(currentUser));
                }
                if (sessionStorage.getItem('pocket_user')) {
                    sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
                }
            } else {
                currentUser = null;
            }
            console.log('User loaded:', currentUser?.email, 'Is Admin:', currentUser?.isAdmin);
        } else {
            console.log('Guest mode - no user logged in');
            currentUser = null;
        }
    } catch(e) {
        console.log('Error loading user:', e);
        currentUser = null;
    }
}

function renderNavLinks() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    // Clear existing dynamic links (keep Home, Markets, Trades)
    const existingLinks = navLinks.querySelectorAll('.nav-link:not([href="home.html"]):not([href="markets.html"]):not([href="trade.html"])');
    existingLinks.forEach(link => link.remove());
    
    // Add My Profile link only for registered users
    if (currentUser) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'nav-link';
        profileLink.textContent = 'My Profile';
        navLinks.appendChild(profileLink);
    }
}

function renderUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    if (currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        const adminBadge = currentUser.isAdmin ? '<span class="admin-badge">Admin</span>' : '';
        
        let adminPanelButton = '';
        if (currentUser.isAdmin) {
            adminPanelButton = '<a href="admin.html" class="login-btn" style="margin-left: 0.5rem;">Admin Panel</a>';
        }
        
        userInfo.innerHTML = `
            <span class="username">${displayName}${adminBadge}</span>
            ${adminPanelButton}
            <span class="logout-link" onclick="handleLogout()">Logout</span>
        `;
    } else {
        userInfo.innerHTML = `
            <div class="auth-buttons">
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="signup-btn">Sign Up</a>
            </div>
        `;
    }
}

function renderLoginPrompt() {
    const container = document.getElementById('withdrawContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="login-prompt">
            <h3>🔒 Login Required</h3>
            <p>Please login or create an account to withdraw funds</p>
            <div class="login-buttons">
                <a href="login.html" class="btn-login" style="background: transparent; color: var(--primary); padding: 10px 28px; border: 1px solid var(--primary); border-radius: 10px; text-decoration: none; font-weight: 500;">Login</a>
                <a href="register.html" class="btn-signup" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; padding: 10px 28px; border: none; border-radius: 10px; text-decoration: none; font-weight: 500;">Sign Up</a>
            </div>
        </div>
    `;
}

function renderWithdrawInterface() {
    const container = document.getElementById('withdrawContent');
    if (!container) return;
    
    const currentBalance = currentUser.balance || 0;
    
    container.innerHTML = `
        <div class="withdraw-container">
            <div class="withdraw-header">
                <h1>Withdraw Funds</h1>
                <p>Withdraw your funds securely to your wallet</p>
            </div>

            <div class="withdraw-card">
                <div class="balance-info">
                    <span class="balance-label">Available Balance</span>
                    <span class="balance-amount" id="availableBalance">$${currentBalance.toFixed(2)}</span>
                </div>

                <form id="withdrawForm">
                    <div class="form-group">
                        <label>Amount (USDT)</label>
                        <input type="number" id="withdrawAmount" placeholder="Enter amount" min="100" step="10">
                        <div class="quick-amounts">
                            <button type="button" class="quick-amount" data-amount="100">$100</button>
                            <button type="button" class="quick-amount" data-amount="500">$500</button>
                            <button type="button" class="quick-amount" data-amount="1000">$1,000</button>
                            <button type="button" class="quick-amount" data-amount="5000">$5,000</button>
                            <button type="button" class="quick-amount" data-amount="10000">$10,000</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label>Select Cryptocurrency</label>
                        <select id="withdrawCrypto">
                            <option value="BTC">Bitcoin (BTC)</option>
                            <option value="ETH">Ethereum (ETH)</option>
                            <option value="USDT">Tether (USDT) - ERC-20</option>
                            <option value="BNB">Binance Coin (BNB)</option>
                            <option value="SOL">Solana (SOL)</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Wallet Address</label>
                        <input type="text" id="walletAddress" placeholder="Enter your cryptocurrency wallet address">
                        <div style="font-size: 0.7rem; color: var(--text-tertiary); margin-top: 0.25rem;">
                            Make sure to enter the correct address for the selected cryptocurrency
                        </div>
                    </div>

                    <div class="limit-info">
                        <div class="limit-row">
                            <span class="limit-label">Minimum Withdrawal:</span>
                            <span class="limit-value">$100</span>
                        </div>
                        <div class="limit-row">
                            <span class="limit-label">Maximum Withdrawal:</span>
                            <span class="limit-value">$10,000 per day</span>
                        </div>
                        <div class="limit-row">
                            <span class="limit-label">Withdrawal Fee:</span>
                            <span class="limit-value">0.5% (min $1, max $50)</span>
                        </div>
                        <div class="limit-row">
                            <span class="limit-label">You'll Receive:</span>
                            <span class="limit-value" id="receiveAmount">$0.00</span>
                        </div>
                        <div class="limit-row">
                            <span class="limit-label">Processing Time:</span>
                            <span class="limit-value">24-48 hours</span>
                        </div>
                    </div>

                    <div id="warningMessage" class="warning-message" style="display: none;">
                        <p>⚠️ Insufficient balance for withdrawal</p>
                    </div>

                    <button type="submit" class="btn-submit" id="withdrawBtn">Request Withdrawal</button>

                    <div class="info-note">
                        <p>⚠️ Withdrawal requests will be processed within 24-48 hours after admin approval.</p>
                    </div>
                </form>
            </div>
        </div>
    `;
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
    const quickBtns = document.querySelectorAll('.quick-amount');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            if (amountInput) {
                amountInput.value = amount;
                validateWithdrawAmount();
            }
        });
    });
    
    // Wallet address input
    const walletAddress = document.getElementById('walletAddress');
    if (walletAddress) {
        walletAddress.addEventListener('input', function() {
            validateWithdrawAmount();
        });
    }
    
    // Form submission
    const withdrawForm = document.getElementById('withdrawForm');
    if (withdrawForm) {
        withdrawForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processWithdrawal();
        });
    }
}

async function loadUserBalance() {
    // Refresh user data from Supabase
    const cloudUser = await supabaseDB.getUserByEmail(currentUser.email);
    if (cloudUser) {
        currentUser.balance = cloudUser.balance;
        const balanceSpan = document.getElementById('availableBalance');
        if (balanceSpan) {
            balanceSpan.textContent = `$${currentUser.balance.toFixed(2)}`;
        }
    }
}

function getTodayWithdrawals() {
    const today = new Date().toDateString();
    const withdrawals = (currentUser.withdrawals || []).filter(w => 
        new Date(w.date).toDateString() === today && w.status !== 'rejected'
    );
    return withdrawals.reduce((sum, w) => sum + w.amount, 0);
}

function validateWithdrawAmount() {
    const amountInput = document.getElementById('withdrawAmount');
    const warningMsg = document.getElementById('warningMessage');
    const withdrawBtn = document.getElementById('withdrawBtn');
    const receiveAmountSpan = document.getElementById('receiveAmount');
    const walletAddress = document.getElementById('walletAddress').value;
    
    let amount = parseFloat(amountInput?.value || 0);
    
    if (isNaN(amount)) amount = 0;
    withdrawAmount = amount;
    
    const currentBalance = currentUser.balance || 0;
    const todayWithdrawn = getTodayWithdrawals();
    const remainingDailyLimit = MAX_WITHDRAW_PER_DAY - todayWithdrawn;
    
    // Calculate fee and receive amount
    let fee = amount * (WITHDRAW_FEE_PERCENT / 100);
    fee = Math.min(Math.max(fee, 1), 50);
    const receiveAmount = amount - fee;
    
    if (receiveAmountSpan) {
        receiveAmountSpan.textContent = `$${receiveAmount.toFixed(2)} (Fee: $${fee.toFixed(2)})`;
    }
    
    // Validate
    if (amount <= 0) {
        if (warningMsg) warningMsg.style.display = 'none';
        if (withdrawBtn) withdrawBtn.disabled = true;
        return false;
    }
    
    if (!walletAddress) {
        if (warningMsg) {
            warningMsg.style.display = 'block';
            warningMsg.innerHTML = '<p>⚠️ Please enter your wallet address</p>';
        }
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
            warningMsg.innerHTML = `<p>⚠️ Daily withdrawal limit remaining: $${remainingDailyLimit.toFixed(2)}</p>`;
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

async function processWithdrawal() {
    if (!validateWithdrawAmount()) return;
    
    const walletAddress = document.getElementById('walletAddress').value;
    const cryptoSelect = document.getElementById('withdrawCrypto');
    const crypto = cryptoSelect.value;
    const cryptoName = getCryptoName(crypto);
    const amount = withdrawAmount;
    const currentBalance = currentUser.balance || 0;
    
    if (amount > currentBalance) {
        alert('Insufficient balance');
        return;
    }
    
    // Calculate fee
    let fee = amount * (WITHDRAW_FEE_PERCENT / 100);
    fee = Math.min(Math.max(fee, 1), 50);
    const receiveAmount = amount - fee;
    
    // Process withdrawal - deduct balance immediately
    currentUser.balance -= amount;
    
    // Create withdrawal request in Supabase
    const withdrawalRequest = {
        id: Date.now(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.name,
        amount: amount,
        fee: fee,
        receive_amount: receiveAmount,
        crypto: crypto,
        crypto_name: cryptoName,
        wallet_address: walletAddress,
        status: 'pending',
        date: new Date().toISOString()
    };
    
    try {
        // Save withdrawal request to Supabase
        await supabaseDB.insert('withdrawal_requests', withdrawalRequest);
        
        // Update user balance in Supabase
        await supabaseDB.updateUserBalance(currentUser.id, currentUser.balance);
        
        // Add to withdrawal history
        if (!currentUser.withdrawals) currentUser.withdrawals = [];
        currentUser.withdrawals.push({
            id: withdrawalRequest.id,
            amount: amount,
            fee: fee,
            receiveAmount: receiveAmount,
            crypto: crypto,
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
            crypto: crypto,
            status: 'pending',
            date: new Date().toISOString(),
            description: `Withdrawal request of $${amount} to ${cryptoName} wallet - Pending Admin Approval`
        });
        
        // Save user data locally
        saveUserData();
        
        alert(`Withdrawal request submitted! Amount: $${amount.toFixed(2)} (Fee: $${fee.toFixed(2)}). Admin will process within 24-48 hours.`);
        
        // Reset form
        resetForm();
        
        // Update balance display
        await loadUserBalance();
        
        // Redirect to dashboard after 3 seconds
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 3000);
        
    } catch (error) {
        console.error('Error submitting withdrawal request:', error);
        alert('Failed to submit withdrawal request. Please try again.');
        
        // Refund the balance if database operation failed
        currentUser.balance += amount;
        saveUserData();
    }
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
    const warningMsg = document.getElementById('warningMessage');
    const receiveAmountSpan = document.getElementById('receiveAmount');
    
    if (amountInput) amountInput.value = '';
    if (walletAddress) walletAddress.value = '';
    if (cryptoSelect) cryptoSelect.value = 'BTC';
    if (warningMsg) warningMsg.style.display = 'none';
    if (receiveAmountSpan) receiveAmountSpan.textContent = '$0.00';
    
    withdrawAmount = 0;
    const withdrawBtn = document.getElementById('withdrawBtn');
    if (withdrawBtn) withdrawBtn.disabled = true;
}

function saveUserData() {
    // Update in localStorage for session consistency
    if (localStorage.getItem('pocket_user')) {
        localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
    if (sessionStorage.getItem('pocket_user')) {
        sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.handleLogout = handleLogout;
