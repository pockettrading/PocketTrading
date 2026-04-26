// Advanced Trading View - Real Binance API
// Layout: Chart (Left) | Trading Panel + Order Book (Right Stacked)

let currentUser = null;
let chart = null;
let currentSymbol = 'SOL';
let currentBinanceSymbol = 'SOLUSDT';
let currentCoinName = 'Solana';
let currentInterval = '1h';
let priceUpdateInterval = null;
let orderBookInterval = null;
let candlestickSeries = null;
let currentPrice = 0;
let currentTradeType = 'buy';

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
    'polkadot': { symbol: 'DOT', binanceSymbol: 'DOTUSDT', name: 'Polkadot' },
    'chainlink': { symbol: 'LINK', binanceSymbol: 'LINKUSDT', name: 'Chainlink' },
    'uniswap': { symbol: 'UNI', binanceSymbol: 'UNIUSDT', name: 'Uniswap' }
};

// Interval mapping for Binance
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
    
    // Get symbol from URL
    const urlSymbol = getUrlParameter('symbol');
    if (urlSymbol && symbolMap[urlSymbol]) {
        currentSymbol = symbolMap[urlSymbol].symbol;
        currentBinanceSymbol = symbolMap[urlSymbol].binanceSymbol;
        currentCoinName = symbolMap[urlSymbol].name;
        document.getElementById('symbolName').textContent = `${currentSymbol}/USDT`;
    }
    
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
    await fetchOrderBook();
    setupEventListeners();
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
        // Fetch 24hr ticker
        const tickerResponse = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${currentBinanceSymbol}`);
        const tickerData = await tickerResponse.json();
        
        currentPrice = parseFloat(tickerData.lastPrice);
        const change = parseFloat(tickerData.priceChangePercent);
        const high = parseFloat(tickerData.highPrice);
        const low = parseFloat(tickerData.lowPrice);
        const quoteVolume = parseFloat(tickerData.quoteVolume);
        
        document.getElementById('currentPrice').textContent = `$${currentPrice.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const changeElem = document.getElementById('priceChange');
        changeElem.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeElem.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('high24h').textContent = `$${high.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('low24h').textContent = `$${low.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('volume24h').textContent = `$${quoteVolume.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        document.getElementById('orderPrice').textContent = `$${currentPrice.toFixed(2)}`;
        
        // Fetch candlestick data
        await fetchCandlestickData();
        
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
        }
    } catch (error) {
        console.error('Error fetching candlestick data:', error);
    }
}

async function fetchOrderBook() {
    try {
        const response = await fetch(`${BINANCE_BASE_URL}/depth?symbol=${currentBinanceSymbol}&limit=15`);
        const data = await response.json();
        
        // Process asks (sell orders) - displayed above spread
        const asks = data.asks.slice(0, 10).map(ask => ({
            price: parseFloat(ask[0]),
            amount: parseFloat(ask[1]),
            total: parseFloat(ask[0]) * parseFloat(ask[1])
        }));
        
        // Process bids (buy orders) - displayed below spread
        const bids = data.bids.slice(0, 10).map(bid => ({
            price: parseFloat(bid[0]),
            amount: parseFloat(bid[1]),
            total: parseFloat(bid[0]) * parseFloat(bid[1])
        }));
        
        renderOrderBook(bids, asks);
        
        // Calculate spread
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
    // Render asks (sell orders) - RED color
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
    
    // Render bids (buy orders) - GREEN color
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
    
    saveUserData();
    document.getElementById('tradeAmount').value = '';
    calculateOrderTotal();
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

function startRealTimeUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    if (orderBookInterval) clearInterval(orderBookInterval);
    
    // Update price every 5 seconds
    priceUpdateInterval = setInterval(async () => {
        await fetchMarketData();
    }, 5000);
    
    // Update order book every 3 seconds
    orderBookInterval = setInterval(async () => {
        await fetchOrderBook();
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.setOrderPrice = setOrderPrice;
window.handleLogout = handleLogout;
