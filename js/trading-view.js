// Advanced Trading View - Working Chart + Guest/Registered Access Control

let currentUser = null;
let chart = null;
let currentSymbol = 'BTC';
let currentBinanceSymbol = 'BTCUSDT';
let currentCoinName = 'Bitcoin';
let currentInterval = '1h';
let priceUpdateInterval = null;
let orderBookInterval = null;
let candlestickSeries = null;
let currentPrice = 0;
let currentTradeType = 'buy';
let priceAlerts = [];

// Binance API
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Symbol mapping
const symbolMap = {
    'bitcoin': { symbol: 'BTC', binanceSymbol: 'BTCUSDT', name: 'Bitcoin' },
    'ethereum': { symbol: 'ETH', binanceSymbol: 'ETHUSDT', name: 'Ethereum' },
    'binancecoin': { symbol: 'BNB', binanceSymbol: 'BNBUSDT', name: 'Binance Coin' },
    'solana': { symbol: 'SOL', binanceSymbol: 'SOLUSDT', name: 'Solana' },
    'ripple': { symbol: 'XRP', binanceSymbol: 'XRPUSDT', name: 'Ripple' },
    'cardano': { symbol: 'ADA', binanceSymbol: 'ADAUSDT', name: 'Cardano' },
    'dogecoin': { symbol: 'DOGE', binanceSymbol: 'DOGEUSDT', name: 'Dogecoin' },
    'polkadot': { symbol: 'DOT', binanceSymbol: 'DOTUSDT', name: 'Polkadot' }
};

// Interval mapping
const intervalMap = {
    '1m': '1m',
    '5m': '5m',
    '15m': '15m',
    '1h': '1h',
    '4h': '4h',
    '1d': '1d',
    '1w': '1w'
};

// Get URL parameter
function getUrlParameter(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Trading View page loaded');
    loadUser();
    renderUserSection();
    loadPriceAlerts();
    
    const urlSymbol = getUrlParameter('symbol');
    if (urlSymbol && symbolMap[urlSymbol]) {
        currentSymbol = symbolMap[urlSymbol].symbol;
        currentBinanceSymbol = symbolMap[urlSymbol].binanceSymbol;
        currentCoinName = symbolMap[urlSymbol].name;
        document.getElementById('symbolName').textContent = `${currentSymbol}/USDT`;
    }
    
    await initTradingView();
    renderTradingPanel();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User logged in:', currentUser.email);
    } else {
        currentUser = null;
        console.log('Guest mode - trading disabled');
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

function renderTradingPanel() {
    const panel = document.getElementById('tradingPanel');
    if (!panel) return;
    
    if (currentUser) {
        // Logged in user - Full trading panel
        panel.innerHTML = `
            <div class="trade-tabs">
                <button class="trade-tab buy active" data-trade="buy">BUY</button>
                <button class="trade-tab sell" data-trade="sell">SELL</button>
            </div>
            
            <div class="input-group">
                <label>Amount (USDT)</label>
                <input type="number" id="tradeAmount" class="amount-input" placeholder="0.00" value="0">
                <div class="quick-amounts">
                    <button class="quick-amount" data-percent="25">25%</button>
                    <button class="quick-amount" data-percent="50">50%</button>
                    <button class="quick-amount" data-percent="75">75%</button>
                    <button class="quick-amount" data-percent="100">100%</button>
                </div>
            </div>
            
            <div class="order-summary">
                <div class="summary-row">
                    <span>Price (USDT)</span>
                    <strong id="orderPrice">$0.00</strong>
                </div>
                <div class="summary-row">
                    <span>Amount</span>
                    <strong id="orderAmount">0.0000 BTC</strong>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <strong id="orderTotal">$0.00</strong>
                </div>
            </div>
            
            <button class="trade-btn buy" id="executeTradeBtn">BUY BTC</button>
            
            <div class="alerts-section">
                <div class="alerts-header">
                    <span class="alerts-title">Price Alerts</span>
                    <button class="add-alert-btn" id="addAlertBtn">+ Add</button>
                </div>
                <div class="alerts-list" id="alertsList">
                    <div class="no-alerts">No alerts</div>
                </div>
            </div>
        `;
        
        // Re-attach event listeners for trading panel
        setupTradingEventListeners();
        renderAlerts();
    } else {
        // Guest user - Show login prompt, disable trading
        panel.innerHTML = `
            <div class="trade-tabs">
                <button class="trade-tab buy active" disabled style="opacity:0.5">BUY</button>
                <button class="trade-tab sell" disabled style="opacity:0.5">SELL</button>
            </div>
            
            <div class="input-group">
                <label>Amount (USDT)</label>
                <input type="number" id="tradeAmount" class="amount-input" placeholder="Login to trade" value="0" disabled>
                <div class="quick-amounts">
                    <button class="quick-amount" disabled>25%</button>
                    <button class="quick-amount" disabled>50%</button>
                    <button class="quick-amount" disabled>75%</button>
                    <button class="quick-amount" disabled>100%</button>
                </div>
            </div>
            
            <div class="order-summary">
                <div class="summary-row">
                    <span>Price (USDT)</span>
                    <strong id="orderPrice">$0.00</strong>
                </div>
                <div class="summary-row">
                    <span>Amount</span>
                    <strong id="orderAmount">0.0000 BTC</strong>
                </div>
                <div class="summary-row total">
                    <span>Total</span>
                    <strong id="orderTotal">$0.00</strong>
                </div>
            </div>
            
            <button class="trade-btn buy" id="executeTradeBtn" disabled style="opacity:0.5">Login to Trade</button>
            
            <div class="login-prompt">
                🔒 <a href="login.html">Login</a> or <a href="register.html">Sign Up</a> to start trading
            </div>
            
            <div class="alerts-section">
                <div class="alerts-header">
                    <span class="alerts-title">Price Alerts</span>
                    <button class="add-alert-btn" id="addAlertBtn" disabled>+ Add</button>
                </div>
                <div class="alerts-list" id="alertsList">
                    <div class="no-alerts">Login to set alerts</div>
                </div>
            </div>
        `;
    }
}

function setupTradingEventListeners() {
    // Trade tabs
    document.querySelectorAll('.trade-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.trade-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentTradeType = tab.dataset.trade;
            
            const tradeBtn = document.getElementById('executeTradeBtn');
            if (currentTradeType === 'buy') {
                tradeBtn.textContent = `BUY ${currentSymbol}`;
                tradeBtn.className = 'trade-btn buy';
            } else {
                tradeBtn.textContent = `SELL ${currentSymbol}`;
                tradeBtn.className = 'trade-btn sell';
            }
        });
    });
    
    // Quick amount buttons
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            const percent = parseInt(btn.dataset.percent);
            const balance = currentUser?.balance || 0;
            const amount = balance * (percent / 100);
            document.getElementById('tradeAmount').value = amount.toFixed(2);
            calculateOrderTotal();
        });
    });
    
    // Amount input
    const amountInput = document.getElementById('tradeAmount');
    if (amountInput) {
        amountInput.addEventListener('input', calculateOrderTotal);
    }
    
    // Trade button
    const tradeBtn = document.getElementById('executeTradeBtn');
    if (tradeBtn) {
        tradeBtn.addEventListener('click', executeTrade);
    }
    
    // Add alert button
    const addAlertBtn = document.getElementById('addAlertBtn');
    if (addAlertBtn) {
        addAlertBtn.addEventListener('click', () => addAlert());
    }
}

function loadPriceAlerts() {
    const saved = localStorage.getItem('price_alerts');
    if (saved) {
        priceAlerts = JSON.parse(saved);
    }
}

function savePriceAlerts() {
    localStorage.setItem('price_alerts', JSON.stringify(priceAlerts));
}

function renderAlerts() {
    const alertsContainer = document.getElementById('alertsList');
    if (!alertsContainer) return;
    
    if (priceAlerts.length === 0) {
        alertsContainer.innerHTML = '<div class="no-alerts">No alerts</div>';
        return;
    }
    
    alertsContainer.innerHTML = priceAlerts.map(alert => `
        <div class="alert-item">
            <span>When price reaches</span>
            <span class="alert-price">$${alert.price.toFixed(2)}</span>
            <button class="remove-alert" onclick="removeAlert(${alert.id})">✕</button>
        </div>
    `).join('');
}

function addAlert() {
    if (!currentUser) {
        alert('Please login to set price alerts');
        return;
    }
    
    const price = currentPrice;
    const newAlert = {
        id: Date.now(),
        price: price,
        symbol: currentSymbol,
        triggered: false
    };
    priceAlerts.push(newAlert);
    savePriceAlerts();
    renderAlerts();
}

function removeAlert(id) {
    priceAlerts = priceAlerts.filter(a => a.id !== id);
    savePriceAlerts();
    renderAlerts();
}

function checkAlerts() {
    priceAlerts.forEach(alert => {
        if (!alert.triggered) {
            if ((alert.price >= currentPrice && alert.price - 10 <= currentPrice) ||
                (alert.price <= currentPrice && alert.price + 10 >= currentPrice)) {
                alert.triggered = true;
                showNotification(`⚠️ Price Alert! ${currentSymbol} reached $${currentPrice.toFixed(2)}`, 'warning');
            }
        }
    });
    savePriceAlerts();
    renderAlerts();
}

async function initTradingView() {
    await initChart();
    await fetchMarketData();
    await fetchOrderBook();
    setupChartEventListeners();
    startRealTimeUpdates();
}

async function initChart() {
    const chartElement = document.getElementById('chart');
    if (!chartElement) return;
    
    chart = LightweightCharts.createChart(chartElement, {
        width: chartElement.clientWidth,
        height: 450,
        layout: { background: { color: 'transparent' }, textColor: '#A0AAB5' },
        grid: { vertLines: { color: '#2A3545' }, horzLines: { color: '#2A3545' } },
        crosshair: { mode: LightweightCharts.CrosshairMode.Normal },
        rightPriceScale: { borderColor: '#2A3545' },
        timeScale: { borderColor: '#2A3545', timeVisible: true, secondsVisible: false },
    });
    
    candlestickSeries = chart.addCandlestickSeries({
        upColor: '#00D897',
        downColor: '#FF4757',
        borderDownColor: '#FF4757',
        borderUpColor: '#00D897',
        wickDownColor: '#FF4757',
        wickUpColor: '#00D897',
    });
    
    window.addEventListener('resize', () => chart.applyOptions({ width: chartElement.clientWidth }));
}

async function fetchMarketData() {
    try {
        const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${currentBinanceSymbol}`);
        const data = await response.json();
        
        currentPrice = parseFloat(data.lastPrice);
        const change = parseFloat(data.priceChangePercent);
        const high = parseFloat(data.highPrice);
        const low = parseFloat(data.lowPrice);
        const quoteVolume = parseFloat(data.quoteVolume);
        
        document.getElementById('currentPrice').textContent = `$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('orderPrice').textContent = `$${currentPrice.toFixed(2)}`;
        
        const changeElem = document.getElementById('priceChange');
        changeElem.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeElem.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('high24h').textContent = `$${high.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('low24h').textContent = `$${low.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('volume24h').textContent = `$${quoteVolume.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        
        await fetchCandlestickData();
        if (currentUser) checkAlerts();
        calculateOrderTotal();
        
    } catch (error) {
        console.error('Error fetching market data:', error);
    }
}

async function fetchCandlestickData() {
    const interval = intervalMap[currentInterval] || '1h';
    
    try {
        const response = await fetch(`${BINANCE_BASE_URL}/klines?symbol=${currentBinanceSymbol}&interval=${interval}&limit=200`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const candlestickData = data.map(candle => ({
                time: Math.floor(candle[0] / 1000),
                open: parseFloat(candle[1]),
                high: parseFloat(candle[2]),
                low: parseFloat(candle[3]),
                close: parseFloat(candle[4])
            }));
            
            candlestickSeries.setData(candlestickData);
            chart.timeScale().fitContent();
            console.log(`Loaded ${candlestickData.length} candles`);
        }
    } catch (error) {
        console.error('Error fetching candlestick data:', error);
    }
}

async function fetchOrderBook() {
    try {
        const response = await fetch(`${BINANCE_BASE_URL}/depth?symbol=${currentBinanceSymbol}&limit=15`);
        const data = await response.json();
        
        const asks = data.asks.slice(0, 10).map(ask => ({
            price: parseFloat(ask[0]),
            amount: parseFloat(ask[1]),
            total: parseFloat(ask[0]) * parseFloat(ask[1])
        }));
        
        const bids = data.bids.slice(0, 10).map(bid => ({
            price: parseFloat(bid[0]),
            amount: parseFloat(bid[1]),
            total: parseFloat(bid[0]) * parseFloat(bid[1])
        }));
        
        renderOrderBook(bids, asks);
        
        const bestBid = bids[0]?.price || 0;
        const bestAsk = asks[0]?.price || 0;
        const spread = bestAsk - bestBid;
        const spreadPercent = (spread / bestAsk * 100).toFixed(2);
        document.getElementById('orderbookSpread').innerHTML = `Spread: $${spread.toFixed(2)} (${spreadPercent}%)`;
        
    } catch (error) {
        console.error('Error fetching order book:', error);
    }
}

function renderOrderBook(bids, asks) {
    const asksContainer = document.getElementById('asksContainer');
    if (asksContainer && asks.length > 0) {
        asksContainer.innerHTML = asks.map(order => `
            <div class="orderbook-row orderbook-ask" onclick="setOrderPrice(${order.price})">
                <span>${order.price.toFixed(2)}</span>
                <span>${order.amount.toFixed(4)}</span>
                <span>$${order.total.toFixed(2)}</span>
            </div>
        `).join('');
    } else {
        asksContainer.innerHTML = '<div class="loading">No asks available</div>';
    }
    
    const bidsContainer = document.getElementById('bidsContainer');
    if (bidsContainer && bids.length > 0) {
        bidsContainer.innerHTML = bids.map(order => `
            <div class="orderbook-row orderbook-bid" onclick="setOrderPrice(${order.price})">
                <span>${order.price.toFixed(2)}</span>
                <span>${order.amount.toFixed(4)}</span>
                <span>$${order.total.toFixed(2)}</span>
            </div>
        `).join('');
    } else {
        bidsContainer.innerHTML = '<div class="loading">No bids available</div>';
    }
}

function setOrderPrice(price) {
    document.getElementById('orderPrice').textContent = `$${price.toFixed(2)}`;
    calculateOrderTotal();
}

function calculateOrderTotal() {
    const amount = parseFloat(document.getElementById('tradeAmount')?.value || 0);
    const price = currentPrice;
    const total = amount;
    const cryptoAmount = amount / price;
    
    const orderAmountElem = document.getElementById('orderAmount');
    const orderTotalElem = document.getElementById('orderTotal');
    
    if (orderAmountElem) orderAmountElem.textContent = `${cryptoAmount.toFixed(6)} ${currentSymbol}`;
    if (orderTotalElem) orderTotalElem.textContent = `$${total.toFixed(2)}`;
}

function setupChartEventListeners() {
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInterval = btn.dataset.interval;
            await fetchCandlestickData();
        });
    });
}

function executeTrade() {
    if (!currentUser) {
        alert('Please login to trade');
        window.location.href = 'login.html';
        return;
    }
    
    const amount = parseFloat(document.getElementById('tradeAmount').value) || 0;
    
    if (amount <= 0) {
        alert('Please enter a valid amount');
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
            type: 'buy',
            amount: amount,
            crypto: currentSymbol,
            price: currentPrice,
            status: 'completed',
            date: new Date().toISOString()
        });
        
        showNotification(`Successfully bought ${(amount / currentPrice).toFixed(6)} ${currentSymbol} at $${currentPrice.toFixed(2)}`, 'success');
    } else {
        currentUser.balance += amount;
        
        currentUser.transactions.unshift({
            id: Date.now(),
            type: 'sell',
            amount: amount,
            crypto: currentSymbol,
            price: currentPrice,
            status: 'completed',
            date: new Date().toISOString()
        });
        
        showNotification(`Successfully sold ${(amount / currentPrice).toFixed(6)} ${currentSymbol} at $${currentPrice.toFixed(2)}`, 'success');
    }
    
    saveUserData();
    document.getElementById('tradeAmount').value = '';
    calculateOrderTotal();
    updateBalanceDisplay();
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

function updateBalanceDisplay() {
    // This will be called from dashboard.js when needed
}

function startRealTimeUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    if (orderBookInterval) clearInterval(orderBookInterval);
    
    priceUpdateInterval = setInterval(async () => {
        await fetchMarketData();
    }, 5000);
    
    orderBookInterval = setInterval(async () => {
        await fetchOrderBook();
    }, 3000);
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#FF4757' : (type === 'warning' ? '#FFA502' : '#00D897')};
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
window.setOrderPrice = setOrderPrice;
window.removeAlert = removeAlert;
window.handleLogout = handleLogout;
