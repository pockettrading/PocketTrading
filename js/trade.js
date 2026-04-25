// Trading functionality - Complete working version

let currentUser = null;
let currentOrderType = 'buy';
let selectedCrypto = 'BTC';
let priceUpdateInterval = null;
let openOrders = [];

// Cryptocurrency data
let cryptoPrices = {
    BTC: { price: 43238.25, change: 0.08, icon: '₿', name: 'Bitcoin' },
    ETH: { price: 2234.98, change: -0.93, icon: 'Ξ', name: 'Ethereum' },
    BNB: { price: 261.41, change: 0.69, icon: 'B', name: 'Binance Coin' },
    SOL: { price: 141.57, change: 0.12, icon: 'S', name: 'Solana' }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Trade page loaded');
    loadUser();
    renderUserSection();
    if (!currentUser) {
        // Show guest mode, but don't redirect
        console.log('Guest mode - limited functionality');
    }
    initTradePage();
    loadOpenOrders();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
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
        userSection.innerHTML = `<a href="register.html" class="signup-btn">Sign Up</a>`;
    }
}

function initTradePage() {
    loadMarketPrices();
    updateCurrentPrice();
    setupEventListeners();
    startPriceUpdates();
    
    // Check URL for crypto parameter
    const urlParams = new URLSearchParams(window.location.search);
    const cryptoParam = urlParams.get('crypto');
    if (cryptoParam && cryptoPrices[cryptoParam]) {
        changeCrypto(cryptoParam);
    }
}

function setupEventListeners() {
    // Buy/Sell tabs
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    
    if (buyTab) {
        buyTab.addEventListener('click', () => setOrderType('buy'));
    }
    if (sellTab) {
        sellTab.addEventListener('click', () => setOrderType('sell'));
    }
    
    // Order type radio buttons
    const marketRadio = document.querySelector('input[value="market"]');
    const limitRadio = document.querySelector('input[value="limit"]');
    
    if (marketRadio) {
        marketRadio.addEventListener('change', () => {
            document.getElementById('limitPriceGroup').style.display = 'none';
            calculateTotal();
        });
    }
    if (limitRadio) {
        limitRadio.addEventListener('change', () => {
            document.getElementById('limitPriceGroup').style.display = 'block';
            calculateTotal();
        });
    }
    
    // Amount input
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', calculateTotal);
    }
    
    // Limit price input
    const limitPrice = document.getElementById('limitPrice');
    if (limitPrice) {
        limitPrice.addEventListener('input', calculateTotal);
    }
    
    // Quick amount buttons
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            const percent = parseInt(btn.dataset.percent);
            setQuickAmount(percent);
        });
    });
    
    // Crypto selector
    const cryptoSelector = document.getElementById('cryptoSelector');
    if (cryptoSelector) {
        cryptoSelector.addEventListener('click', showCryptoDropdown);
    }
    
    // Trade button
    const tradeBtn = document.getElementById('tradeBtn');
    if (tradeBtn) {
        tradeBtn.addEventListener('click', placeOrder);
    }
    
    // Clear orders button
    const clearBtn = document.getElementById('clearOrdersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllOrders);
    }
}

function showCryptoDropdown() {
    // Remove existing dropdown if any
    const existingDropdown = document.querySelector('.crypto-dropdown');
    if (existingDropdown) existingDropdown.remove();
    
    const dropdown = document.createElement('div');
    dropdown.className = 'crypto-dropdown';
    dropdown.style.cssText = `
        position: absolute;
        background: var(--card-bg);
        border: 1px solid var(--border);
        border-radius: 12px;
        width: 200px;
        z-index: 100;
        margin-top: 4px;
    `;
    
    Object.entries(cryptoPrices).forEach(([symbol, data]) => {
        const option = document.createElement('div');
        option.style.cssText = `
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 12px;
            cursor: pointer;
            transition: all 0.3s;
        `;
        option.innerHTML = `
            <span class="crypto-icon">${data.icon}</span>
            <div>
                <div class="crypto-symbol">${symbol}</div>
                <div class="crypto-name">${data.name}</div>
            </div>
        `;
        option.onmouseover = () => option.style.background = 'var(--card-hover)';
        option.onmouseout = () => option.style.background = '';
        option.onclick = () => {
            changeCrypto(symbol);
            dropdown.remove();
        };
        dropdown.appendChild(option);
    });
    
    const rect = document.getElementById('cryptoSelector').getBoundingClientRect();
    dropdown.style.position = 'absolute';
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX}px`;
    
    document.body.appendChild(dropdown);
    
    // Remove dropdown when clicking outside
    setTimeout(() => {
        document.addEventListener('click', function removeDropdown(e) {
            if (!dropdown.contains(e.target) && e.target !== document.getElementById('cryptoSelector')) {
                dropdown.remove();
                document.removeEventListener('click', removeDropdown);
            }
        });
    }, 0);
}

function setOrderType(type) {
    currentOrderType = type;
    
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    const tradeBtn = document.getElementById('tradeBtn');
    
    if (type === 'buy') {
        buyTab.classList.add('active');
        sellTab.classList.remove('active');
        tradeBtn.textContent = `Buy ${selectedCrypto} (${cryptoPrices[selectedCrypto].name})`;
        tradeBtn.className = 'btn-trade buy';
    } else {
        sellTab.classList.add('active');
        buyTab.classList.remove('active');
        tradeBtn.textContent = `Sell ${selectedCrypto} (${cryptoPrices[selectedCrypto].name})`;
        tradeBtn.className = 'btn-trade sell';
    }
    
    calculateTotal();
}

function setQuickAmount(percent) {
    if (!currentUser) {
        showNotification('Please login to trade', 'error');
        return;
    }
    
    const currentBalance = currentUser.balance || 0;
    const currentPrice = cryptoPrices[selectedCrypto]?.price || 0;
    const maxAmount = currentBalance / currentPrice;
    const amount = maxAmount * (percent / 100);
    
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.value = amount.toFixed(6);
        calculateTotal();
    }
}

function calculateTotal() {
    const amount = parseFloat(document.getElementById('amount')?.value || 0);
    const currentPrice = cryptoPrices[selectedCrypto]?.price || 0;
    const isLimit = document.querySelector('input[name="orderType"]:checked')?.value === 'limit';
    
    let price = currentPrice;
    if (isLimit) {
        const limitPrice = parseFloat(document.getElementById('limitPrice')?.value || 0);
        if (limitPrice && limitPrice > 0) {
            price = limitPrice;
        }
    }
    
    const total = amount * price;
    const fee = total * 0.001;
    const totalCost = currentOrderType === 'buy' ? total + fee : total - fee;
    
    document.getElementById('totalValue').textContent = `$${total.toFixed(2)}`;
    document.getElementById('feeAmount').textContent = `$${fee.toFixed(2)}`;
    document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;
}

function changeCrypto(symbol) {
    selectedCrypto = symbol;
    const crypto = cryptoPrices[symbol];
    
    const selectedDiv = document.getElementById('selectedCrypto');
    selectedDiv.innerHTML = `
        <span class="crypto-icon">${crypto.icon}</span>
        <div>
            <div class="crypto-symbol">${symbol}</div>
            <div class="crypto-name">${crypto.name}</div>
        </div>
    `;
    
    updateCurrentPrice();
    calculateTotal();
    
    const tradeBtn = document.getElementById('tradeBtn');
    if (currentOrderType === 'buy') {
        tradeBtn.textContent = `Buy ${symbol} (${crypto.name})`;
    } else {
        tradeBtn.textContent = `Sell ${symbol} (${crypto.name})`;
    }
}

function updateCurrentPrice() {
    const crypto = cryptoPrices[selectedCrypto];
    const priceElem = document.getElementById('currentPrice');
    const changeElem = document.getElementById('priceChange');
    
    priceElem.textContent = `$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    
    const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
    changeElem.textContent = `${crypto.change >= 0 ? '+' : ''}${crypto.change.toFixed(2)}%`;
    changeElem.className = `price-change ${changeClass}`;
}

function loadMarketPrices() {
    const container = document.getElementById('marketPrices');
    if (!container) return;
    
    container.innerHTML = Object.entries(cryptoPrices).map(([symbol, data]) => `
        <div class="market-item" onclick="window.changeCrypto('${symbol}')">
            <div class="market-item-info">
                <span class="crypto-icon">${data.icon}</span>
                <div>
                    <div class="market-symbol">${symbol}</div>
                    <div class="crypto-name">${data.name}</div>
                </div>
            </div>
            <div>
                <div class="market-price">$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                <div class="market-change ${data.change >= 0 ? 'positive' : 'negative'}">
                    ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%
                </div>
            </div>
        </div>
    `).join('');
}

function placeOrder() {
    if (!currentUser) {
        showNotification('Please login to trade', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const amount = parseFloat(document.getElementById('amount')?.value || 0);
    const isLimit = document.querySelector('input[name="orderType"]:checked')?.value === 'limit';
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    const currentPrice = cryptoPrices[selectedCrypto]?.price || 0;
    let price = currentPrice;
    
    if (isLimit) {
        const limitPrice = parseFloat(document.getElementById('limitPrice')?.value || 0);
        if (!limitPrice || limitPrice <= 0) {
            showNotification('Please enter a valid limit price', 'error');
            return;
        }
        price = limitPrice;
    }
    
    const total = amount * price;
    const fee = total * 0.001;
    const totalCost = currentOrderType === 'buy' ? total + fee : total - fee;
    
    const currentBalance = currentUser.balance || 0;
    
    if (currentOrderType === 'buy') {
        if (totalCost > currentBalance) {
            showNotification('Insufficient balance', 'error');
            return;
        }
        
        currentUser.balance -= totalCost;
        addTransaction('buy', amount, price, total, fee);
        saveUserData();
        showNotification(`Successfully bought ${amount.toFixed(6)} ${selectedCrypto} at $${price.toFixed(2)}`, 'success');
    } else {
        currentUser.balance += totalCost;
        addTransaction('sell', amount, price, total, fee);
        saveUserData();
        showNotification(`Successfully sold ${amount.toFixed(6)} ${selectedCrypto} at $${price.toFixed(2)}`, 'success');
    }
    
    // Reset form
    document.getElementById('amount').value = '';
    document.getElementById('limitPrice').value = '';
    calculateTotal();
}

function addTransaction(type, amount, price, total, fee) {
    const transaction = {
        id: Date.now(),
        type: type,
        crypto: selectedCrypto,
        amount: amount,
        price: price,
        total: total,
        fee: fee,
        status: 'completed',
        date: new Date().toISOString()
    };
    
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift(transaction);
    
    // Update stats
    if (!currentUser.stats) currentUser.stats = {};
    currentUser.stats.totalTrades = (currentUser.stats.totalTrades || 0) + 1;
    currentUser.stats.totalVolume = (currentUser.stats.totalVolume || 0) + total;
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

function loadOpenOrders() {
    const container = document.getElementById('openOrdersList');
    if (!container) return;
    
    if (openOrders.length === 0) {
        container.innerHTML = '<div class="empty-state">No open orders</div>';
        return;
    }
    
    container.innerHTML = openOrders.map(order => `
        <div class="order-item">
            <div>
                <span class="order-type ${order.type}">${order.type}</span>
                <span> ${order.crypto}</span>
                <div class="crypto-name">${order.amount} @ $${order.price}</div>
            </div>
            <button class="order-cancel" onclick="cancelOrder(${order.id})">Cancel</button>
        </div>
    `).join('');
}

function clearAllOrders() {
    openOrders = [];
    localStorage.setItem('pocket_orders', JSON.stringify(openOrders));
    loadOpenOrders();
    showNotification('All orders cleared', 'success');
}

function cancelOrder(orderId) {
    openOrders = openOrders.filter(o => o.id !== orderId);
    localStorage.setItem('pocket_orders', JSON.stringify(openOrders));
    loadOpenOrders();
    showNotification('Order cancelled', 'success');
}

function startPriceUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    
    priceUpdateInterval = setInterval(() => {
        Object.keys(cryptoPrices).forEach(symbol => {
            const change = (Math.random() - 0.5) * 2;
            const newPrice = Math.max(0.01, cryptoPrices[symbol].price * (1 + change / 100));
            const percentChange = ((newPrice - cryptoPrices[symbol].price) / cryptoPrices[symbol].price) * 100;
            
            cryptoPrices[symbol] = {
                ...cryptoPrices[symbol],
                price: newPrice,
                change: percentChange
            };
        });
        
        loadMarketPrices();
        updateCurrentPrice();
        calculateTotal();
        
        document.getElementById('lastUpdated').textContent = new Date().toLocaleTimeString();
    }, 5000);
}

function showNotification(message, type) {
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.changeCrypto = changeCrypto;
window.cancelOrder = cancelOrder;
window.handleLogout = handleLogout;
