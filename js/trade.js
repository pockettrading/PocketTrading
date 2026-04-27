// Trade page functionality - All cryptos, minimum amounts, cooldown timer

let currentUser = null;
let currentTradeType = 'buy';
let currentCrypto = null;
let currentDuration = 60;
let priceUpdateInterval = null;
let currentPrice = 0;
let allCryptos = [];
let cooldownActive = false;
let cooldownTimer = null;

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
    60: 500,
    90: 1000,
    180: 2000,
    300: 5000
};

// CoinGecko API
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Trade page loaded');
    loadUser();
    renderNavLinks();
    renderUserSection();
    
    if (!currentUser) {
        renderLoginPrompt();
    } else {
        loadCryptos();
    }
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User logged in:', currentUser.email);
    } else {
        currentUser = null;
    }
}

function renderNavLinks() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    if (currentUser) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'nav-link';
        profileLink.textContent = 'My Profile';
        navLinks.appendChild(profileLink);
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
        userSection.innerHTML = '';
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

async function loadCryptos() {
    try {
        const response = await fetch(`${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false`);
        const data = await response.json();
        
        allCryptos = data.map(coin => ({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            icon: getIconForSymbol(coin.symbol.toUpperCase()),
            current_price: coin.current_price
        }));
        
        // Set default crypto to BTC if available
        const defaultCrypto = allCryptos.find(c => c.symbol === 'BTC') || allCryptos[0];
        currentCrypto = defaultCrypto;
        
        await initTradePage();
    } catch (error) {
        console.error('Error loading cryptos:', error);
        // Fallback cryptos
        allCryptos = [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', icon: '₿', current_price: 65000 },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', current_price: 3200 },
            { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin', icon: 'B', current_price: 580 },
            { id: 'ripple', symbol: 'XRP', name: 'Ripple', icon: 'X', current_price: 0.6 },
            { id: 'solana', symbol: 'SOL', name: 'Solana', icon: 'S', current_price: 140 },
            { id: 'cardano', symbol: 'ADA', name: 'Cardano', icon: 'A', current_price: 0.48 },
            { id: 'dogecoin', symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', current_price: 0.12 },
            { id: 'polkadot', symbol: 'DOT', name: 'Polkadot', icon: '●', current_price: 6.8 },
            { id: 'chainlink', symbol: 'LINK', name: 'Chainlink', icon: 'L', current_price: 14 },
            { id: 'uniswap', symbol: 'UNI', name: 'Uniswap', icon: 'U', current_price: 7.8 }
        ];
        currentCrypto = allCryptos[0];
        await initTradePage();
    }
}

function getIconForSymbol(symbol) {
    const icons = {
        'BTC': '₿',
        'ETH': 'Ξ',
        'BNB': 'B',
        'SOL': 'S',
        'XRP': 'X',
        'ADA': 'A',
        'DOGE': 'Ð',
        'DOT': '●',
        'LINK': 'L',
        'UNI': 'U',
        'AAVE': 'A',
        'SHIB': '🐕',
        'AVAX': 'A',
        'MATIC': 'M',
        'PEPE': '🐸'
    };
    return icons[symbol] || '📈';
}

async function initTradePage() {
    const container = document.getElementById('tradeContent');
    if (!container) return;
    
    // Render trade interface
    container.innerHTML = `
        <div class="trade-container">
            <div class="trade-header">
                <h1>Confirm Your Trade</h1>
                <p>Review your trade details before confirming</p>
            </div>
            
            <div class="trade-card">
                <div class="order-tabs">
                    <button class="order-tab buy active" data-trade="buy">BUY</button>
                    <button class="order-tab sell" data-trade="sell">SELL</button>
                </div>
                
                <div class="crypto-selector" id="cryptoSelector">
                    <div class="selected-crypto" id="selectedCrypto">
                        <span class="crypto-icon">${currentCrypto.icon}</span>
                        <div>
                            <div class="crypto-symbol">${currentCrypto.symbol}</div>
                            <div class="crypto-name">${currentCrypto.name}</div>
                        </div>
                    </div>
                    <div class="current-price-display">
                        <div class="price-value" id="currentPrice">$${currentCrypto.current_price?.toLocaleString() || '0.00'}</div>
                        <div class="price-change positive" id="priceChange">0.00%</div>
                    </div>
                </div>
                
                <div class="amount-section">
                    <div class="amount-label">
                        <span>Amount (USDT)</span>
                        <span id="minAmountLabel">Min $${minAmounts[currentDuration]}</span>
                    </div>
                    <input type="number" id="amount" class="amount-input" placeholder="Amount to trade" value="${minAmounts[currentDuration]}">
                </div>
                
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
                
                <div class="info-row">
                    <span class="info-label">Available Amount:</span>
                    <span class="info-value" id="availableAmount">${currentUser?.balance?.toFixed(2) || 0} USDT</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Expected Return:</span>
                    <span class="info-value positive" id="expectedReturn">0.00 USDT</span>
                </div>
                
                <button class="trade-btn buy" id="tradeBtn">BUY ${currentCrypto.symbol}</button>
                <div id="cooldownMessage" class="cooldown-timer"></div>
            </div>
        </div>
    `;
    
    await fetchCurrentPrice();
    setupTradeEventListeners();
    startPriceUpdates();
    calculateExpectedReturn();
}

async function fetchCurrentPrice() {
    if (!currentCrypto) return;
    
    try {
        const response = await fetch(`${COINGECKO_BASE_URL}/simple/price?ids=${currentCrypto.id}&vs_currencies=usd&include_24hr_change=true`);
        const data = await response.json();
        
        if (data[currentCrypto.id]) {
            currentPrice = data[currentCrypto.id].usd;
            const change = data[currentCrypto.id].usd_24h_change || 0;
            
            const priceElem = document.getElementById('currentPrice');
            const changeElem = document.getElementById('priceChange');
            
            if (priceElem) priceElem.textContent = `$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            if (changeElem) {
                changeElem.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
                changeElem.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
            }
        }
    } catch (error) {
        console.error('Error fetching price:', error);
        currentPrice = currentCrypto.current_price || 0;
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
                tradeBtn.textContent = `BUY ${currentCrypto.symbol}`;
                tradeBtn.className = 'trade-btn buy';
            } else {
                tradeBtn.textContent = `SELL ${currentCrypto.symbol}`;
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
    const existing = document.querySelector('.crypto-dropdown');
    if (existing) existing.remove();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'crypto-dropdown';
    
    allCryptos.forEach(crypto => {
        const option = document.createElement('div');
        option.className = 'crypto-option';
        option.innerHTML = `
            <div class="crypto-option-info">
                <span class="crypto-icon">${crypto.icon}</span>
                <div>
                    <div class="crypto-symbol">${crypto.symbol}</div>
                    <div class="crypto-name">${crypto.name}</div>
                </div>
            </div>
            <div class="crypto-option-price">
                $${crypto.current_price?.toLocaleString() || '0'}
            </div>
        `;
        option.onclick = async () => {
            currentCrypto = crypto;
            updateSelectedCrypto();
            dropdown.remove();
            await fetchCurrentPrice();
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
    
    selectedDiv.innerHTML = `
        <span class="crypto-icon">${currentCrypto.icon}</span>
        <div>
            <div class="crypto-symbol">${currentCrypto.symbol}</div>
            <div class="crypto-name">${currentCrypto.name}</div>
        </div>
    `;
    
    const tradeBtn = document.getElementById('tradeBtn');
    if (tradeBtn) {
        if (currentTradeType === 'buy') {
            tradeBtn.textContent = `BUY ${currentCrypto.symbol}`;
        } else {
            tradeBtn.textContent = `SELL ${currentCrypto.symbol}`;
        }
    }
}

function updateMinAmountLabel() {
    const minAmount = minAmounts[currentDuration];
    const labelSpan = document.getElementById('minAmountLabel');
    const amountInput = document.getElementById('amount');
    
    if (labelSpan) {
        labelSpan.textContent = `Min $${minAmount.toLocaleString()}`;
    }
    
    if (amountInput && (!amountInput.value || parseFloat(amountInput.value) < minAmount)) {
        amountInput.value = minAmount;
        calculateExpectedReturn();
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

function startCooldown() {
    cooldownActive = true;
    let secondsLeft = 15;
    const tradeBtn = document.getElementById('tradeBtn');
    const cooldownMsg = document.getElementById('cooldownMessage');
    
    if (tradeBtn) tradeBtn.disabled = true;
    
    if (cooldownTimer) clearInterval(cooldownTimer);
    
    cooldownTimer = setInterval(() => {
        secondsLeft--;
        if (cooldownMsg) {
            cooldownMsg.textContent = `⏱️ Please wait ${secondsLeft}s before next trade`;
        }
        
        if (secondsLeft <= 0) {
            clearInterval(cooldownTimer);
            cooldownActive = false;
            if (tradeBtn) tradeBtn.disabled = false;
            if (cooldownMsg) cooldownMsg.textContent = '';
        }
    }, 1000);
}

function executeTrade() {
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    if (cooldownActive) {
        alert('Please wait 15 seconds before placing another trade');
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
        
        if (!currentUser.transactions) currentUser.transactions = [];
        currentUser.transactions.unshift({
            id: Date.now(),
            type: 'trade',
            tradeType: 'buy',
            amount: amount,
            crypto: currentCrypto.symbol,
            cryptoName: currentCrypto.name,
            price: currentPrice,
            duration: currentDuration,
            expectedReturn: amount * (1 + profitRates[currentDuration] / 100),
            profitRate: profitRates[currentDuration],
            status: 'completed',
            date: new Date().toISOString()
        });
        
        saveUserData();
        alert(`✅ Trade placed! Bought ${currentCrypto.symbol} with $${amount.toLocaleString()}. Duration: ${currentDuration}s. Expected return: +${profitRates[currentDuration]}%`);
        
        // Start cooldown timer
        startCooldown();
        
        updateAvailableBalance();
        document.getElementById('amount').value = minAmounts[currentDuration];
        calculateExpectedReturn();
    }
}

function updateAvailableBalance() {
    const availableSpan = document.getElementById('availableAmount');
    if (availableSpan && currentUser) {
        availableSpan.textContent = `${currentUser.balance?.toFixed(2) || 0} USDT`;
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

window.handleLogout = handleLogout;
