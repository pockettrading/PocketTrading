// Trade page functionality - Fixed for fractional amounts

let currentUser = null;
let currentOrderType = 'buy';
let selectedCrypto = 'BTC';
let priceUpdateInterval = null;
let openOrders = [];
let tradeHistory = [];

let cryptoPrices = {
    BTC: { price: 43250.00, change: 2.5, icon: '₿', name: 'Bitcoin', minAmount: 0.0001 },
    ETH: { price: 2250.80, change: 1.8, icon: 'Ξ', name: 'Ethereum', minAmount: 0.001 },
    BNB: { price: 305.60, change: -0.5, icon: 'B', name: 'Binance Coin', minAmount: 0.01 },
    SOL: { price: 98.40, change: 5.2, icon: 'S', name: 'Solana', minAmount: 0.01 }
};

document.addEventListener('DOMContentLoaded', function() {
    console.log('Trade page loaded');
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    
    // Fix corrupted balance if needed
    fixCorruptedBalance();
    
    updateUserDisplay();
    initTradePage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
        console.log('Account mode:', currentUser.accountMode);
        console.log('Demo balance:', currentUser.demoBalance);
    }
}

function fixCorruptedBalance() {
    // Fix demo balance if it's corrupted
    if (currentUser.accountMode === 'demo') {
        if (currentUser.demoBalance > 100000 || currentUser.demoBalance < 0) {
            console.log('Fixing corrupted demo balance...');
            currentUser.demoBalance = 10000;
            showNotification('Balance was reset to $10,000', 'warning');
            saveUserData();
        }
    }
}

function updateUserDisplay() {
    const userNameSpan = document.getElementById('userNameDisplay');
    const authButtonSpan = document.getElementById('authButton');
    if (userNameSpan && currentUser) {
        userNameSpan.textContent = currentUser.name || currentUser.email.split('@')[0];
        if (authButtonSpan) {
            authButtonSpan.innerHTML = '<span class="logout-link" onclick="handleLogout()">Logout</span>';
        }
    }
    updateBalance();
}

function updateBalance() {
    if (!currentUser) return;
    const balance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const balanceElem = document.getElementById('availableBalance');
    const badgeElem = document.getElementById('accountBadge');
    
    if (balanceElem) {
        balanceElem.textContent = `$${balance.toFixed(2)}`;
    }
    
    if (badgeElem) {
        badgeElem.textContent = currentUser.accountMode === 'demo' ? 'Demo' : 'Real';
        badgeElem.className = `account-badge ${currentUser.accountMode === 'demo' ? 'demo' : 'real'}`;
    }
}

function initTradePage() {
    loadMarketPrices();
    updateCurrentPrice();
    setupEventListeners();
    startPriceUpdates();
    loadTradeHistory();
    
    const urlParams = new URLSearchParams(window.location.search);
    const cryptoParam = urlParams.get('crypto');
    if (cryptoParam && cryptoPrices[cryptoParam]) {
        changeCrypto(cryptoParam, cryptoPrices[cryptoParam].name, cryptoPrices[cryptoParam].icon);
    }
}

function setupEventListeners() {
    document.getElementById('buyTab')?.addEventListener('click', () => setOrderType('buy'));
    document.getElementById('sellTab')?.addEventListener('click', () => setOrderType('sell'));
    
    document.querySelectorAll('input[name="orderType"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            document.getElementById('limitPriceGroup').style.display = e.target.value === 'limit' ? 'block' : 'none';
            calculateTotal();
        });
    });
    
    document.getElementById('amount')?.addEventListener('input', () => calculateTotal());
    document.getElementById('limitPrice')?.addEventListener('input', () => calculateTotal());
    
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', function() { setQuickAmount(parseInt(this.dataset.percent)); });
    });
    
    const selectedDiv = document.getElementById('selectedCrypto');
    const dropdown = document.getElementById('cryptoDropdown');
    selectedDiv?.addEventListener('click', (e) => { e.stopPropagation(); dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none'; });
    
    document.querySelectorAll('.crypto-option').forEach(opt => {
        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            changeCrypto(opt.dataset.symbol, opt.dataset.name, opt.dataset.icon);
            dropdown.style.display = 'none';
        });
    });
    
    document.addEventListener('click', () => { if (dropdown) dropdown.style.display = 'none'; });
    document.getElementById('tradeForm')?.addEventListener('submit', (e) => { e.preventDefault(); placeOrder(); });
    document.getElementById('clearOrdersBtn')?.addEventListener('click', clearAllOrders);
}

function setOrderType(type) {
    currentOrderType = type;
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    if (type === 'buy') { 
        buyTab?.classList.add('active'); 
        sellTab?.classList.remove('active'); 
    } else { 
        sellTab?.classList.add('active'); 
        buyTab?.classList.remove('active'); 
    }
    
    const placeBtn = document.getElementById('placeOrderBtn');
    const cryptoName = cryptoPrices[selectedCrypto]?.name || selectedCrypto;
    if (placeBtn) {
        placeBtn.textContent = type === 'buy' ? `Buy ${cryptoName} (${selectedCrypto})` : `Sell ${cryptoName} (${selectedCrypto})`;
        placeBtn.className = type === 'buy' ? 'btn-buy' : 'btn-sell';
    }
    calculateTotal();
}

function setQuickAmount(percent) {
    if (!currentUser) return;
    const balance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const price = cryptoPrices[selectedCrypto]?.price || 0;
    const maxAmount = balance / price;
    const amount = maxAmount * (percent / 100);
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.value = amount.toFixed(6);
    }
    calculateTotal();
}

function calculateTotal() {
    const amount = parseFloat(document.getElementById('amount')?.value || 0);
    const price = cryptoPrices[selectedCrypto]?.price || 0;
    const isLimit = document.querySelector('input[name="orderType"]:checked')?.value === 'limit';
    let execPrice = price;
    if (isLimit) {
        const limitPrice = parseFloat(document.getElementById('limitPrice')?.value || 0);
        if (limitPrice > 0) execPrice = limitPrice;
    }
    const total = amount * execPrice;
    const fee = total * 0.001;
    const totalCost = currentOrderType === 'buy' ? total + fee : total - fee;
    
    document.getElementById('totalValue').textContent = `$${total.toFixed(2)}`;
    document.getElementById('feeAmount').textContent = `$${fee.toFixed(2)}`;
    document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;
}

function changeCrypto(symbol, name, icon) {
    selectedCrypto = symbol;
    const selectedDiv = document.getElementById('selectedCrypto');
    if (selectedDiv) {
        selectedDiv.innerHTML = `<span class="crypto-icon">${icon}</span><span class="crypto-symbol">${symbol}</span><span class="crypto-name">${name}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9l6 6 6-6"/></svg>`;
    }
    updateCurrentPrice();
    calculateTotal();
    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) {
        placeBtn.textContent = `${currentOrderType === 'buy' ? 'Buy' : 'Sell'} ${name} (${symbol})`;
    }
}

function updateCurrentPrice() {
    const crypto = cryptoPrices[selectedCrypto];
    if (!crypto) return;
    document.getElementById('currentPrice').textContent = `$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    const changeElem = document.getElementById('priceChange');
    changeElem.textContent = `${crypto.change >= 0 ? '+' : ''}${crypto.change.toFixed(2)}%`;
    changeElem.className = `price-change ${crypto.change >= 0 ? 'positive' : 'negative'}`;
}

function loadMarketPrices() {
    const container = document.getElementById('marketPrices');
    if (!container) return;
    container.innerHTML = Object.entries(cryptoPrices).map(([symbol, data]) => `
        <div class="market-item ${symbol === selectedCrypto ? 'active' : ''}" onclick="changeCrypto('${symbol}', '${data.name}', '${data.icon}')">
            <div class="market-item-info">
                <span class="market-icon">${data.icon}</span>
                <div>
                    <div class="market-symbol">${symbol}</div>
                    <div class="market-name">${data.name}</div>
                </div>
            </div>
            <div class="market-item-price">
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
    if (!amount || amount <= 0) { 
        showNotification('Please enter a valid amount', 'error'); 
        return; 
    }
    
    const price = cryptoPrices[selectedCrypto]?.price || 0;
    const total = amount * price;
    const fee = total * 0.001;
    const totalCost = currentOrderType === 'buy' ? total + fee : total - fee;
    
    let currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    
    console.log('=== TRADE DETAILS ===');
    console.log('Crypto:', selectedCrypto);
    console.log('Amount:', amount);
    console.log('Price:', price);
    console.log('Total:', total);
    console.log('Fee:', fee);
    console.log('Total Cost:', totalCost);
    console.log('Balance:', currentBalance);
    console.log('Order Type:', currentOrderType);
    
    if (currentOrderType === 'buy') {
        if (totalCost > currentBalance) { 
            showNotification(`Insufficient balance! You have $${currentBalance.toFixed(2)} but need $${totalCost.toFixed(2)}. Try buying a smaller amount.`, 'error'); 
            return; 
        }
        
        const newBalance = currentBalance - totalCost;
        if (currentUser.accountMode === 'demo') {
            currentUser.demoBalance = newBalance;
        } else {
            currentUser.realBalance = newBalance;
        }
        
        addTransaction('buy', amount, price, total, fee);
        saveUserData();
        showNotification(`✅ Successfully bought ${amount.toFixed(6)} ${selectedCrypto} at $${price.toFixed(2)}`, 'success');
    } else {
        // Sell order - check if user has enough crypto (simplified)
        const newBalance = currentBalance + totalCost;
        if (currentUser.accountMode === 'demo') {
            currentUser.demoBalance = newBalance;
        } else {
            currentUser.realBalance = newBalance;
        }
        
        addTransaction('sell', amount, price, total, fee);
        saveUserData();
        showNotification(`✅ Successfully sold ${amount.toFixed(6)} ${selectedCrypto} at $${price.toFixed(2)}`, 'success');
    }
    
    // Reset form
    document.getElementById('amount').value = '';
    if (document.getElementById('limitPrice')) {
        document.getElementById('limitPrice').value = '';
    }
    
    updateBalance();
    calculateTotal();
    loadTradeHistory();
    refreshUserData();
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
        accountMode: currentUser.accountMode, 
        status: 'completed', 
        date: new Date().toISOString(),
        pnl: type === 'sell' ? total - fee : 0
    };
    
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift(transaction);
    
    tradeHistory.unshift(transaction);
    localStorage.setItem('pocket_trade_history', JSON.stringify(tradeHistory.slice(0, 50)));
    
    if (!currentUser.stats) currentUser.stats = {};
    currentUser.stats.totalTrades = (currentUser.stats.totalTrades || 0) + 1;
    currentUser.stats.totalVolume = (currentUser.stats.totalVolume || 0) + total;
}

function loadTradeHistory() {
    const container = document.getElementById('tradeHistory');
    if (!container || !currentUser) return;
    const userTrades = (currentUser.transactions || []).filter(t => t.type === 'buy' || t.type === 'sell').slice(0, 10);
    if (userTrades.length === 0) { 
        container.innerHTML = '<div class="empty-state">No recent trades</div>'; 
        return; 
    }
    container.innerHTML = userTrades.map(trade => `
        <div class="trade-item">
            <div class="trade-info">
                <span class="trade-type ${trade.type}">${trade.type}</span>
                <span class="trade-crypto">${trade.crypto}</span>
                <span class="trade-amount">${trade.amount.toFixed(6)} @ $${trade.price.toFixed(2)}</span>
            </div>
            <div class="trade-total">$${trade.total.toFixed(2)}</div>
            <div class="trade-time">${new Date(trade.date).toLocaleTimeString()}</div>
        </div>
    `).join('');
}

function clearAllOrders() { 
    showNotification('All orders cleared', 'success'); 
}

function startPriceUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    priceUpdateInterval = setInterval(() => {
        Object.keys(cryptoPrices).forEach(symbol => {
            const change = (Math.random() - 0.5) * 100;
            const newPrice = Math.max(0.01, cryptoPrices[symbol].price + change);
            const percentChange = ((newPrice - cryptoPrices[symbol].price) / cryptoPrices[symbol].price) * 100;
            cryptoPrices[symbol] = { ...cryptoPrices[symbol], price: newPrice, change: percentChange };
        });
        loadMarketPrices();
        updateCurrentPrice();
        calculateTotal();
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) lastUpdated.textContent = new Date().toLocaleTimeString();
    }, 5000);
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

function refreshUserData() {
    const refreshedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (refreshedUser) {
        currentUser = JSON.parse(refreshedUser);
        updateBalance();
    }
}

function showNotification(message, type) {
    const existing = document.querySelector('.trade-notification');
    if (existing) existing.remove();
    const notification = document.createElement('div');
    notification.textContent = message;
    const bgColor = type === 'error' ? '#FF4757' : (type === 'warning' ? '#FFA502' : '#00D897');
    notification.style.cssText = `position:fixed;top:20px;right:20px;background:${bgColor};color:white;padding:12px 20px;border-radius:12px;font-size:14px;z-index:10000;animation:slideIn 0.3s ease-out;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:350px;`;
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

window.changeCrypto = changeCrypto;
window.handleLogout = handleLogout;
