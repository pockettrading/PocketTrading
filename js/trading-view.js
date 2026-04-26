// Advanced Trading View - CoinGecko API

let currentUser = null;
let chart = null;
let currentCryptoId = 'bitcoin';
let currentSymbol = 'BTC';
let currentInterval = '1h';
let priceUpdateInterval = null;
let candlestickSeries = null;
let currentPrice = 0;
let currentTradeType = 'buy';

// Order book data (simulated based on current price)
let bids = [];
let asks = [];

// CoinGecko API
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Crypto mapping
const cryptoMapping = {
    BTC: { id: 'bitcoin', name: 'Bitcoin', symbol: 'BTC' },
    ETH: { id: 'ethereum', name: 'Ethereum', symbol: 'ETH' },
    BNB: { id: 'binancecoin', name: 'Binance Coin', symbol: 'BNB' },
    SOL: { id: 'solana', name: 'Solana', symbol: 'SOL' }
};

// Interval mapping for days
const intervalDaysMap = {
    '1m': 1,
    '5m': 1,
    '15m': 1,
    '1h': 1,
    '4h': 7,
    '1d': 30,
    '1w': 90
};

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Trading View page loaded');
    loadUser();
    renderUserSection();
    await initTradingView();
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

async function initTradingView() {
    await initChart();
    await fetchMarketData();
    await generateOrderBook();
    setupEventListeners();
    startRealTimeUpdates();
}

async function initChart() {
    const chartElement = document.getElementById('chart');
    if (!chartElement) return;
    
    chart = LightweightCharts.createChart(chartElement, {
        width: chartElement.clientWidth,
        height: 400,
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
        // Fetch current price and 24h stats
        const priceUrl = `${COINGECKO_BASE_URL}/simple/price?ids=${currentCryptoId}&vs_currencies=usd&include_24hr_change=true&include_24hr_vol=true&include_24hr_high=true&include_24hr_low=true&include_market_cap=true`;
        const priceResponse = await fetch(priceUrl);
        const priceData = await priceResponse.json();
        const coinData = priceData[currentCryptoId];
        
        if (coinData) {
            currentPrice = coinData.usd;
            const change = coinData.usd_24h_change || 0;
            const high = coinData.usd_24h_high || currentPrice;
            const low = coinData.usd_24h_low || currentPrice;
            const volume = coinData.usd_24h_vol || 0;
            const marketCap = coinData.usd_market_cap || 0;
            
            document.getElementById('currentPrice').textContent = `$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            
            const changeElem = document.getElementById('priceChange');
            changeElem.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
            changeElem.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
            
            document.getElementById('high24h').textContent = `$${high.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            document.getElementById('low24h').textContent = `$${low.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
            document.getElementById('volume24h').textContent = `$${volume.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
            document.getElementById('marketCap').textContent = `$${marketCap.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
            document.getElementById('symbolName').textContent = `${currentSymbol}/USDT`;
            document.getElementById('orderPrice').textContent = `$${currentPrice.toFixed(2)}`;
        }
        
        // Fetch candlestick data
        await fetchCandlestickData();
        
    } catch (error) {
        console.error('Error fetching market data:', error);
    }
}

async function fetchCandlestickData() {
    const days = intervalDaysMap[currentInterval] || 1;
    
    try {
        const url = `${COINGECKO_BASE_URL}/coins/${currentCryptoId}/ohlc?vs_currency=usd&days=${days}`;
        const response = await fetch(url);
        const data = await response.json();
        
        if (data && data.length > 0) {
            const candlestickData = data.map(candle => ({
                time: Math.floor(candle[0] / 1000),
                open: candle[1],
                high: candle[2],
                low: candle[3],
                close: candle[4]
            }));
            
            candlestickSeries.setData(candlestickData);
            chart.timeScale().fitContent();
        }
    } catch (error) {
        console.error('Error fetching candlestick data:', error);
    }
}

async function generateOrderBook() {
    // Generate simulated order book based on current price
    const spread = currentPrice * 0.001; // 0.1% spread
    const bidPrice = currentPrice - spread / 2;
    const askPrice = currentPrice + spread / 2;
    
    // Generate bids (buy orders) - descending price
    bids = [];
    for (let i = 0; i < 10; i++) {
        const price = bidPrice - (i * currentPrice * 0.0005);
        const amount = (Math.random() * 2 + 0.1).toFixed(4);
        const total = (price * amount).toFixed(2);
        bids.push({ price: price.toFixed(2), amount, total });
    }
    
    // Generate asks (sell orders) - ascending price
    asks = [];
    for (let i = 0; i < 10; i++) {
        const price = askPrice + (i * currentPrice * 0.0005);
        const amount = (Math.random() * 2 + 0.1).toFixed(4);
        const total = (price * amount).toFixed(2);
        asks.push({ price: price.toFixed(2), amount, total });
    }
    
    // Render order book
    renderOrderBook();
}

function renderOrderBook() {
    // Render asks (sell orders) - sell side (red)
    const asksContainer = document.getElementById('asksContainer');
    if (asksContainer) {
        asksContainer.innerHTML = asks.slice().reverse().map(order => `
            <div class="orderbook-row orderbook-ask" onclick="setOrderPrice(${order.price})">
                <span>${order.price}</span>
                <span>${order.amount}</span>
                <span>$${order.total}</span>
            </div>
        `).join('');
    }
    
    // Render bids (buy orders) - buy side (green)
    const bidsContainer = document.getElementById('bidsContainer');
    if (bidsContainer) {
        bidsContainer.innerHTML = bids.map(order => `
            <div class="orderbook-row orderbook-bid" onclick="setOrderPrice(${order.price})">
                <span>${order.price}</span>
                <span>${order.amount}</span>
                <span>$${order.total}</span>
            </div>
        `).join('');
    }
    
    // Update spread
    const bestBid = bids[0]?.price || 0;
    const bestAsk = asks[0]?.price || 0;
    const spread = (bestAsk - bestBid).toFixed(2);
    const spreadPercent = ((spread / currentPrice) * 100).toFixed(2);
    document.getElementById('orderbookSpread').innerHTML = `Spread: $${spread} (${spreadPercent}%)`;
}

function setOrderPrice(price) {
    document.getElementById('orderPrice').textContent = `$${parseFloat(price).toFixed(2)}`;
    calculateOrderTotal();
}

function calculateOrderTotal() {
    const amount = parseFloat(document.getElementById('tradeAmount').value) || 0;
    const price = currentPrice;
    const total = amount;
    const cryptoAmount = amount / price;
    
    document.getElementById('orderAmount').textContent = `${cryptoAmount.toFixed(6)} ${currentSymbol}`;
    document.getElementById('orderTotal').textContent = `$${total.toFixed(2)}`;
}

function setupEventListeners() {
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
    
    // Timeframe buttons
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInterval = btn.dataset.interval;
            await fetchCandlestickData();
        });
    });
    
    // Quick amount buttons
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', () => {
            if (!currentUser) {
                alert('Please login to trade');
                return;
            }
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
        
        // Add transaction
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
        
        alert(`Successfully bought ${(amount / currentPrice).toFixed(6)} ${currentSymbol} at $${currentPrice.toFixed(2)}`);
    } else {
        // For sell, need to check if user has crypto (simplified)
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
        
        alert(`Successfully sold ${(amount / currentPrice).toFixed(6)} ${currentSymbol} at $${currentPrice.toFixed(2)}`);
    }
    
    // Save user data
    saveUserData();
    
    // Reset form
    document.getElementById('tradeAmount').value = '';
    calculateOrderTotal();
    
    // Update balance display
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
    const balanceElem = document.getElementById('totalBalance');
    if (balanceElem && currentUser) {
        balanceElem.textContent = `$${currentUser.balance.toFixed(2)}`;
    }
}

function startRealTimeUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    priceUpdateInterval = setInterval(async () => {
        await fetchMarketData();
        await generateOrderBook();
    }, 30000); // Update every 30 seconds
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.setOrderPrice = setOrderPrice;
window.handleLogout = handleLogout;
