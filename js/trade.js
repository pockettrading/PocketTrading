// Trade page functionality - Luno Style (Registered users only, redirects guests to login)

let currentUser = null;
let currentTradeType = 'buy';
let currentCrypto = 'BTC';
let currentDuration = 60;
let priceUpdateInterval = null;
let currentPrice = 0;

// Profit percentages based on duration
const profitRates = {
    30: 12,
    60: 18,
    90: 25,
    180: 32,
    300: 45
};

// Minimum amounts based on duration
const minAmounts = {
    30: 100,
    60: 15000,
    90: 50000,
    180: 200000,
    300: 500000
};

// Cryptocurrency data
const cryptoData = {
    BTC: { name: 'Bitcoin', icon: '₿', binanceSymbol: 'BTCUSDT' },
    ETH: { name: 'Ethereum', icon: 'Ξ', binanceSymbol: 'ETHUSDT' },
    BNB: { name: 'Binance Coin', icon: 'B', binanceSymbol: 'BNBUSDT' },
    SOL: { name: 'Solana', icon: 'S', binanceSymbol: 'SOLUSDT' },
    XRP: { name: 'Ripple', icon: 'X', binanceSymbol: 'XRPUSDT' }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Trade page loaded');
    loadUser();
    renderUserSection();
    
    if (!currentUser) {
        // Guest user - show login prompt
        renderLoginPrompt();
    } else {
        // Registered user - show trade interface
        initTradePage();
    }
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User logged in:', currentUser.email);
    } else {
        currentUser = null;
        console.log('Guest mode - redirecting to login');
    }
}

function renderUserSection() {
    const userSection = document.getElementById('userSection');
    if (!userSection) return;
    
    if (currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        userSection.innerHTML = `
            <div class="user-dropdown">
                <div class="user-name-display">
                    <span>👤</span>
                    <span>${displayName}</span>
                    <span>▼</span>
                </div>
                <div class="dropdown-menu">
                    <a href="profile.html" class="dropdown-item">📋 My Profile</a>
                    <a href="dashboard.html" class="dropdown-item">📊 Dashboard</a>
                    <a href="deposit.html" class="dropdown-item">💰 Deposit</a>
                    <a href="withdraw.html" class="dropdown-item">💸 Withdraw</a>
                    <div class="dropdown-divider"></div>
                    <span class="dropdown-item" onclick="handleLogout()" style="cursor: pointer; color: var(--danger);">🚪 Logout</span>
                </div>
            </div>
        `;
    } else {
        userSection.innerHTML = `
            <div class="auth-buttons">
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="signup-btn">Sign Up</a>
            </div>
        `;
    }
}

function renderLoginPrompt() {
    const container = document.getElementById('tradeContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="login-prompt">
            <h3>🔒 Login Required</h3>
            <p>Please login or create an account to start trading</p>
            <div class="login-buttons">
                <a href="login.html" class="btn-login">Login</a>
                <a href="register.html" class="btn-signup">Sign Up</a>
            </div>
        </div>
    `;
}

async function initTradePage() {
    const container = document.getElementById('tradeContent');
    if (!container) return;
    
    // Render trade interface HTML
    container.innerHTML = `
        <div class="trade-container">
            <div class="trade-header">
                <h1>Confirm Your Trade</h1>
                <p>Review your trade details before confirming</p>
            </div>
            
            <div class="trade-card">
                <!-- Order Type Tabs -->
                <div class="order-tabs">
                    <button class="order-tab buy active" data-trade="buy">BUY</button>
                    <button class="order-tab sell" data-trade="sell">SELL</button>
                </div>
                
                <!-- Cryptocurrency Selector -->
                <div class="crypto-selector" id="cryptoSelector">
                    <div class="selected-crypto" id="selectedCrypto">
                        <span class="crypto-icon">₿</span>
                        <div>
                            <div class="crypto-symbol">BTC</div>
                            <div class="crypto-name">Bitcoin</div>
                        </div>
                    </div>
                    <div class="current-price-display">
                        <div class="price-value" id="currentPrice">$0.00</div>
                        <div class="price-change positive" id="priceChange">0.00%</div>
                    </div>
                </div>
                
                <!-- Amount Input -->
                <div class="amount-section">
                    <div class="amount-label">
                        <span>Amount (USDT)</span>
                        <span id="minAmountLabel">Min $100</span>
                    </div>
                    <input type="number" id="amount" class="amount-input" placeholder="Enter amount to trade" value="100">
                </div>
                
                <!-- Duration Selector -->
                <div class="duration-section">
                    <div class="duration-label">Select Duration</div>
                    <div class="duration-buttons" id="durationButtons">
                        <button class="duration-btn" data-duration="30">
                            30s
                            <div class="duration-profit positive">+12%</div>
                        </button>
                        <button class="duration-btn active" data-duration="60">
                            60s
                            <div class="duration-profit positive">+18%</div>
                        </button>
                        <button class="duration-btn" data-duration="90">
                            90s
                            <div class="duration-profit positive">+25%</div>
                        </button>
                        <button class="duration-btn" data-duration="180">
                            180s
                            <div class="duration-profit positive">+32%</div>
                        </button>
                        <button class="duration-btn" data-duration="300">
                            300s
                            <div class="duration-profit positive">+45%</div>
                        </button>
                    </div>
                </div>
                
                <!-- Info Rows -->
                <div class="info-row">
                    <span class="info-label">Available Amount:</span>
                    <span class="info-value" id="availableAmount">0 USDT</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Expected Return:</span>
                    <span class="info-value positive" id="expectedReturn">0.00 USDT</span>
                </div>
                
                <!-- Trade Button -->
                <button class="trade-btn buy" id="tradeBtn">BUY BTC</button>
            </div>
        </div>
    `;
    
    // Initialize trade functionality
    await fetchCurrentPrice();
    setupTradeEventListeners();
    startPriceUpdates();
    updateAvailableBalance();
    calculateExpectedReturn();
}

async function fetchCurrentPrice() {
    const symbol = cryptoData[currentCrypto].binanceSymbol;
    
    try {
        const response = await fetch(`https://api.binance.com/api/v3/ticker/24hr?symbol=${symbol}`);
        const data = await response.json();
        
        currentPrice = parseFloat(data.lastPrice);
        const change = parseFloat(data.priceChangePercent);
        
        const priceElem = document.getElementById('currentPrice');
        const changeElem = document.getElementById('priceChange');
        
        if (priceElem) priceElem.textContent = `$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        if (changeElem) {
            changeElem.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeElem.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        }
    } catch (error) {
        console.error('Error fetching price:', error);
        // Fallback demo price
        currentPrice = currentCrypto === 'BTC' ? 65000 : (currentCrypto === 'ETH' ? 3200 : 500);
        document.getElementById('currentPrice').textContent = `$${currentPrice.toLocaleString()}`;
    }
}

function setupTradeEventListeners() {
    // Order type tabs
    document.querySelectorAll('.order-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.order-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTradeType = tab.dataset.trade;
            
            const tradeBtn = document.getElementById('tradeBtn');
            if (currentTradeType === 'buy') {
                tradeBtn.textContent = `BUY ${currentCrypto}`;
                tradeBtn.className = 'trade-btn buy';
            } else {
                tradeBtn.textContent = `SELL ${currentCrypto}`;
                tradeBtn.className = 'trade-btn sell';
            }
        });
    });
    
    // Duration buttons
    document.querySelectorAll('.duration-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentDuration = parseInt(btn.dataset.duration);
            updateMinAmountLabel();
            calculateExpectedReturn();
        });
    });
    
    // Amount input
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', () => {
            validateAmount();
            calculateExpectedReturn();
        });
    }
    
    // Crypto selector
    const cryptoSelector = document.getElementById('cryptoSelector');
    if (cryptoSelector) {
        cryptoSelector.addEventListener('click', showCryptoDropdown);
    }
    
    // Trade button
    const tradeBtn = document.getElementById('tradeBtn');
    if (tradeBtn) {
        tradeBtn.addEventListener('click', executeTrade);
    }
}

function showCryptoDropdown() {
    // Remove existing dropdown
    const existing = document.querySelector('.crypto-dropdown');
    if (existing) existing.remove();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'crypto-dropdown';
    
    Object.entries(cryptoData).forEach(([symbol, data]) => {
        const option = document.createElement('div');
        option.className = 'crypto-option';
        option.innerHTML = `
            <div class="crypto-option-info">
                <span class="crypto-icon">${data.icon}</span>
                <div>
                    <div class="crypto-symbol">${symbol}</div>
                    <div class="crypto-name">${data.name}</div>
                </div>
            </div>
            <div class="crypto-option-price">
                <div class="price-value" id="price_${symbol}">$${currentCrypto === symbol ? currentPrice.toLocaleString() : '...'}</div>
            </div>
        `;
        option.onclick = () => {
            currentCrypto = symbol;
            updateSelectedCrypto();
            dropdown.remove();
            fetchCurrentPrice();
            updateMinAmountLabel();
            calculateExpectedReturn();
        };
        dropdown.appendChild(option);
    });
    
    const rect = document.getElementById('cryptoSelector').getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(dropdown);
    
    setTimeout(() => {
        document.addEventListener('click', function removeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== document.getElementById('cryptoSelector')) {
                dropdown.remove();
                document.removeEventListener('click', removeDropdown);
            }
        });
    }, 0);
}

function updateSelectedCrypto() {
    const selectedDiv = document.getElementById('selectedCrypto');
    const crypto = cryptoData[currentCrypto];
    
    selectedDiv.innerHTML = `
        <span class="crypto-icon">${crypto.icon}</span>
        <div>
            <div class="crypto-symbol">${currentCrypto}</div>
            <div class="crypto-name">${crypto.name}</div>
        </div>
    `;
    
    const tradeBtn = document.getElementById('tradeBtn');
    if (tradeBtn) {
        if (currentTradeType === 'buy') {
            tradeBtn.textContent = `BUY ${currentCrypto}`;
        } else {
            tradeBtn.textContent = `SELL ${currentCrypto}`;
        }
    }
}

function updateAvailableBalance() {
    const availableSpan = document.getElementById('availableAmount');
    if (availableSpan && currentUser) {
        availableSpan.textContent = `${currentUser.balance?.toFixed(2) || 0} USDT`;
    }
}

function updateMinAmountLabel() {
    const minAmount = minAmounts[currentDuration];
    const labelSpan = document.getElementById('minAmountLabel');
    if (labelSpan) {
        labelSpan.textContent = `Min $${minAmount.toLocaleString()}`;
    }
}

function validateAmount() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const minAmount = minAmounts[currentDuration];
    const balance = currentUser?.balance || 0;
    const amountInput = document.getElementById('amount');
    
    if (amount < minAmount && amount > 0) {
        if (amountInput) amountInput.style.borderColor = 'var(--danger)';
        return false;
    } else if (currentTradeType === 'buy' && amount > balance) {
        if (amountInput) amountInput.style.borderColor = 'var(--danger)';
        return false;
    } else {
        if (amountInput) amountInput.style.borderColor = '';
        return true;
    }
}

function calculateExpectedReturn() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const profitRate = profitRates[currentDuration];
    const expectedReturn = amount * (1 + profitRate / 100);
    
    const returnSpan = document.getElementById('expectedReturn');
    if (returnSpan) {
        returnSpan.textContent = `${expectedReturn.toFixed(2)} USDT`;
    }
}

function executeTrade() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const minAmount = minAmounts[currentDuration];
    
    if (amount < minAmount) {
        alert(`Minimum amount for ${currentDuration}s duration is $${minAmount.toLocaleString()}`);
        return;
    }
    
    const balance = currentUser.balance || 0;
    
    if (currentTradeType === 'buy') {
        if (amount > balance) {
            alert('Insufficient balance');
            return;
        }
        
        currentUser.balance -= amount;
        
        // Add transaction
        if (!currentUser.transactions) currentUser.transactions = [];
        currentUser.transactions.unshift({
            id: Date.now(),
            type: 'trade',
            tradeType: 'buy',
            amount: amount,
            crypto: currentCrypto,
            price: currentPrice,
            duration: currentDuration,
            expectedReturn: amount * (1 + profitRates[currentDuration] / 100),
            status: 'pending',
            date: new Date().toISOString()
        });
        
        saveUserData();
        alert(`Trade placed! Bought ${currentCrypto} with $${amount.toLocaleString()}. Duration: ${currentDuration}s. Expected return: ${profitRates[currentDuration]}%`);
        
        updateAvailableBalance();
        document.getElementById('amount').value = minAmounts[currentDuration];
        calculateExpectedReturn();
    }
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

function startPriceUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    
    priceUpdateInterval = setInterval(async () => {
        await fetchCurrentPrice();
    }, 10000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.handleLogout = handleLogout;
