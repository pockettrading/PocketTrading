// Trade page functionality - Optimized for Guest, Registered, and Admin Users
// File: js/trade.js

let currentUser = null;
let currentTradeType = 'buy';
let currentCrypto = null;
let currentDuration = null;
let priceUpdateInterval = null;
let currentPrice = 0;
let allCryptos = [];
let cooldownActive = false;
let cooldownTimer = null;

// Admin email
const ADMIN_EMAIL = 'ephregojo@gmail.com';

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

// Real cryptocurrency icons
const cryptoIcons = {
    'BTC': '₿',
    'ETH': 'Ξ',
    'BNB': 'B',
    'SOL': '◎',
    'XRP': 'X',
    'ADA': 'A',
    'DOGE': 'Ð',
    'DOT': '●',
    'LINK': 'L',
    'UNI': 'U',
    'AAVE': 'A',
    'SHIB': '🐕',
    'AVAX': 'A',
    'MATIC': 'M'
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Trade page loaded');
    
    if (typeof supabaseDB === 'undefined') {
        setTimeout(() => initTradePage(), 500);
        return;
    }
    
    await initTradePage();
});

async function initTradePage() {
    await loadUser();
    renderNavLinks();
    renderUserInfo();
    
    if (!currentUser) {
        renderLoginPrompt();
    } else {
        await loadCryptos();
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
        // Guest User - Show Login and Sign Up buttons
        userInfo.innerHTML = `
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
                <a href="login.html" class="btn-login" style="background: transparent; color: var(--primary); padding: 10px 28px; border: 1px solid var(--primary); border-radius: 10px; text-decoration: none; font-weight: 500;">Login</a>
                <a href="register.html" class="btn-signup" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; padding: 10px 28px; border: none; border-radius: 10px; text-decoration: none; font-weight: 500;">Sign Up</a>
            </div>
        </div>
    `;
}

async function loadCryptos() {
    try {
        const response = await fetch(`${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false`);
        const data = await response.json();
        
        allCryptos = data.map(coin => ({
            id: coin.id,
            symbol: coin.symbol.toUpperCase(),
            name: coin.name,
            icon: cryptoIcons[coin.symbol.toUpperCase()] || '📈',
            current_price: coin.current_price
        }));
        
        const defaultCrypto = allCryptos.find(c => c.symbol === 'BTC') || allCryptos[0];
        currentCrypto = defaultCrypto;
        
        await initTradeInterface();
    } catch (error) {
        console.error('Error loading cryptos:', error);
        // Fallback cryptos
        allCryptos = [
            { id: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', icon: '₿', current_price: 76426.00 },
            { id: 'ethereum', symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', current_price: 2450.73 },
            { id: 'binancecoin', symbol: 'BNB', name: 'Binance Coin', icon: 'B', current_price: 310.29 },
            { id: 'solana', symbol: 'SOL', name: 'Solana', icon: '◎', current_price: 101.72 },
            { id: 'ripple', symbol: 'XRP', name: 'Ripple', icon: 'X', current_price: 0.6253 }
        ];
        currentCrypto = allCryptos[0];
        await initTradeInterface();
    }
}

async function initTradeInterface() {
    const container = document.getElementById('tradeContent');
    if (!container) return;
    
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
                        <span id="minAmountLabel">Select duration first</span>
                    </div>
                    <input type="number" id="amount" class="amount-input" placeholder="Enter amount to trade" value="">
                </div>
                
                <div class="duration-section">
                    <div class="duration-label">Select Duration</div>
                    <div class="duration-buttons" id="durationButtons">
                        <button class="duration-btn" data-duration="30">
                            30s
                            <div class="duration-profit positive">+12%</div>
                        </button>
                        <button class="duration-btn" data-duration="60">
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
                
                <div id="errorMessage" class="error-message" style="color: var(--danger); font-size: 0.7rem; margin-top: 0.5rem;"></div>
                
                <button class="trade-btn buy" id="tradeBtn">BUY ${currentCrypto.symbol}</button>
                <div id="cooldownMessage" class="cooldown-timer"></div>
            </div>
        </div>
    `;
    
    await fetchCurrentPrice();
    setupEventListeners();
    startPriceUpdates();
    updateAvailableBalance();
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

function setupEventListeners() {
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
            validateAmount();
            calculateExpectedReturn();
            clearErrorMessage();
        });
    });
    
    // Amount input
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', () => {
            validateAmount();
            calculateExpectedReturn();
            clearErrorMessage();
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
    dropdown.style.cssText = `
        position: absolute;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        width: 280px;
        z-index: 100;
        margin-top: 4px;
        overflow-y: auto;
        max-height: 300px;
    `;
    
    allCryptos.forEach(crypto => {
        const option = document.createElement('div');
        option.className = 'crypto-option';
        option.style.cssText = `
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding: 8px 12px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        option.innerHTML = `
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-size: 1.2rem;">${crypto.icon}</span>
                <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">${crypto.symbol}</div>
                    <div style="font-size: 0.65rem; color: var(--text-tertiary);">${crypto.name}</div>
                </div>
            </div>
            <div style="font-size: 0.75rem;">
                $${crypto.current_price?.toLocaleString() || '0'}
            </div>
        `;
        option.onclick = async () => {
            currentCrypto = crypto;
            updateSelectedCrypto();
            dropdown.remove();
            await fetchCurrentPrice();
            updateMinAmountLabel();
            validateAmount();
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
    
    if (labelSpan && currentDuration) {
        labelSpan.textContent = `Min $${minAmount.toLocaleString()}`;
    } else if (labelSpan && !currentDuration) {
        labelSpan.textContent = 'Select duration first';
    }
}

function validateAmount() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const errorMsg = document.getElementById('errorMessage');
    
    if (!currentDuration) {
        if (errorMsg) errorMsg.textContent = '⚠️ Please select duration first';
        return false;
    }
    
    const minAmount = minAmounts[currentDuration];
    const balance = currentUser?.balance || 0;
    
    if (amount <= 0) {
        if (errorMsg) errorMsg.textContent = '⚠️ Please enter amount';
        return false;
    }
    
    if (amount < minAmount) {
        if (errorMsg) errorMsg.textContent = `⚠️ Minimum amount for ${currentDuration}s duration is $${minAmount.toLocaleString()}`;
        return false;
    }
    
    if (currentTradeType === 'buy' && amount > balance) {
        if (errorMsg) errorMsg.textContent = `⚠️ Insufficient balance. Available: $${balance.toLocaleString()} USDT`;
        return false;
    }
    
    if (errorMsg) errorMsg.textContent = '';
    return true;
}

function clearErrorMessage() {
    const errorMsg = document.getElementById('errorMessage');
    if (errorMsg && errorMsg.textContent.includes('⚠️')) {
        if (errorMsg.textContent.includes('duration') || errorMsg.textContent.includes('amount') || errorMsg.textContent.includes('Minimum') || errorMsg.textContent.includes('Insufficient')) {
            errorMsg.textContent = '';
        }
    }
}

function calculateExpectedReturn() {
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    
    if (!currentDuration || amount <= 0) {
        const returnSpan = document.getElementById('expectedReturn');
        if (returnSpan) returnSpan.textContent = '0.00 USDT';
        return;
    }
    
    const profitRate = profitRates[currentDuration];
    const expectedReturn = amount * (1 + profitRate / 100);
    
    const returnSpan = document.getElementById('expectedReturn');
    if (returnSpan) {
        returnSpan.textContent = `${expectedReturn.toFixed(2)} USDT`;
    }
}

function updateAvailableBalance() {
    const availableSpan = document.getElementById('availableAmount');
    if (availableSpan && currentUser) {
        availableSpan.textContent = `${currentUser.balance?.toFixed(2) || 0} USDT`;
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
        alert('Please login to trade');
        window.location.href = 'login.html';
        return;
    }
    
    if (cooldownActive) {
        alert('Please wait 15 seconds before placing another trade');
        return;
    }
    
    if (!currentDuration) {
        alert('Please select duration first');
        return;
    }
    
    const amount = parseFloat(document.getElementById('amount').value) || 0;
    const minAmount = minAmounts[currentDuration];
    
    if (amount <= 0) {
        alert('Please enter amount');
        return;
    }
    
    if (amount < minAmount) {
        alert(`Minimum amount for ${currentDuration}s duration is $${minAmount.toLocaleString()}`);
        return;
    }
    
    const balance = currentUser.balance || 0;
    
    if (currentTradeType === 'buy') {
        if (amount > balance) {
            alert(`Insufficient balance. Available: $${balance.toLocaleString()} USDT`);
            return;
        }
        
        currentUser.balance -= amount;
        
        // Add transaction record
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
        
        startCooldown();
        updateAvailableBalance();
        document.getElementById('amount').value = '';
        document.getElementById('expectedReturn').textContent = '0.00 USDT';
        
        // Reset duration selection
        document.querySelectorAll('.duration-btn').forEach(btn => btn.classList.remove('active'));
        currentDuration = null;
        const minLabel = document.getElementById('minAmountLabel');
        if (minLabel) minLabel.textContent = 'Select duration first';
    }
}

async function saveUserData() {
    try {
        // Update in Supabase
        await supabaseDB.updateUserBalance(currentUser.id, currentUser.balance);
        
        // Update current session
        if (localStorage.getItem('pocket_user')) {
            localStorage.setItem('pocket_user', JSON.stringify(currentUser));
        }
        if (sessionStorage.getItem('pocket_user')) {
            sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
        }
        
        console.log('User data saved, new balance:', currentUser.balance);
    } catch (error) {
        console.error('Error saving user data:', error);
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
