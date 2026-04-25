// Dashboard functionality with Candlestick Chart and Real Binance API

let currentUser = null;
let chart = null;
let currentSymbol = 'BTC';
let currentInterval = '1h';
let priceUpdateInterval = null;
let candlestickSeries = null;

// Binance API endpoints
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Cryptocurrency data for top list
let cryptoData = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'BNB', name: 'Binance Coin', icon: 'B' },
    { symbol: 'SOL', name: 'Solana', icon: 'S' },
    { symbol: 'XRP', name: 'Ripple', icon: 'X' },
    { symbol: 'ADA', name: 'Cardano', icon: 'A' }
];

// Mapping for Binance symbols
const binanceSymbols = {
    BTC: 'BTCUSDT',
    ETH: 'ETHUSDT',
    BNB: 'BNBUSDT',
    SOL: 'SOLUSDT',
    XRP: 'XRPUSDT',
    ADA: 'ADAUSDT'
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

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard page loaded');
    loadUser();
    renderUserSection();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    initDashboard();
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

async function initDashboard() {
    updateBalanceDisplay();
    loadTransactions();
    updateStats();
    setupEventListeners();
    await initChart();
    await fetchCandlestickData();
    await fetchCurrentPrice();
    await loadCryptoList();
    startRealTimeUpdates();
}

function updateBalanceDisplay() {
    if (!currentUser) return;
    
    const currentBalance = currentUser.balance || 0;
    const totalBalanceElem = document.getElementById('totalBalance');
    const demoBalanceElem = document.getElementById('demoBalance');
    
    if (totalBalanceElem) {
        totalBalanceElem.textContent = `$${currentBalance.toFixed(2)}`;
        totalBalanceElem.className = currentBalance > 0 ? 'stat-value positive' : 'stat-value';
    }
    
    if (demoBalanceElem) {
        demoBalanceElem.textContent = `$${currentBalance.toFixed(2)}`;
    }
}

function updateStats() {
    if (!currentUser) return;
    
    const today = new Date().toDateString();
    const todayTransactions = (currentUser.transactions || []).filter(t => 
        new Date(t.date).toDateString() === today && (t.type === 'trade' || t.type === 'buy' || t.type === 'sell')
    );
    const dailyVolume = todayTransactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
    document.getElementById('dailyVolume').textContent = `$${dailyVolume.toFixed(2)}`;
    
    const trades = (currentUser.transactions || []).filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    let totalProfit = currentUser.stats?.totalProfit || 0;
    trades.forEach(trade => { if (trade.pnl) totalProfit += trade.pnl; });
    
    const profitElem = document.getElementById('totalProfit');
    profitElem.textContent = `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`;
    profitElem.style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    
    const activeTrades = (currentUser.transactions || []).filter(t => t.status === 'open').length;
    document.getElementById('activeTrades').textContent = activeTrades;
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

async function fetchCandlestickData() {
    const symbol = binanceSymbols[currentSymbol];
    const interval = intervalMap[currentInterval];
    
    try {
        const response = await fetch(`${BINANCE_BASE_URL}/klines?symbol=${symbol}&interval=${interval}&limit=200`);
        const data = await response.json();
        
        const candlestickData = data.map(item => ({
            time: Math.floor(item[0] / 1000),
            open: parseFloat(item[1]),
            high: parseFloat(item[2]),
            low: parseFloat(item[3]),
            close: parseFloat(item[4]),
        }));
        
        candlestickSeries.setData(candlestickData);
        chart.timeScale().fitContent();
    } catch (error) {
        console.error('Error fetching candlestick data:', error);
        generateDemoData();
    }
}

function generateDemoData() {
    const candlestickData = [];
    let basePrice = currentSymbol === 'BTC' ? 43000 : (currentSymbol === 'ETH' ? 2200 : 300);
    const now = Math.floor(Date.now() / 1000);
    const intervalSeconds = currentInterval === '1h' ? 3600 : (currentInterval === '1m' ? 60 : 86400);
    
    for (let i = 200; i > 0; i--) {
        const time = now - (i * intervalSeconds);
        const change = (Math.random() - 0.5) * 100;
        const open = basePrice;
        const close = basePrice + change;
        const high = Math.max(open, close) + Math.random() * 50;
        const low = Math.min(open, close) - Math.random() * 50;
        
        candlestickData.push({ time, open, high, low, close });
        basePrice = close;
    }
    
    candlestickSeries.setData(candlestickData);
    chart.timeScale().fitContent();
}

async function fetchCurrentPrice() {
    const symbol = binanceSymbols[currentSymbol];
    
    try {
        const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${symbol}`);
        const data = await response.json();
        
        const price = parseFloat(data.lastPrice);
        const change = parseFloat(data.priceChangePercent);
        const high = parseFloat(data.highPrice);
        const low = parseFloat(data.lowPrice);
        const volume = parseFloat(data.volume) * price;
        
        document.getElementById('currentPrice').textContent = `$${price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        
        const changeElem = document.getElementById('priceChange');
        changeElem.textContent = `${change >= 0 ? '+' : ''}${change.toFixed(2)}%`;
        changeElem.className = `price-change ${change >= 0 ? 'positive' : 'negative'}`;
        
        document.getElementById('high24h').textContent = `$${high.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('low24h').textContent = `$${low.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        document.getElementById('volume24h').textContent = `$${volume.toLocaleString(undefined, {maximumFractionDigits: 0})}`;
        
        document.getElementById('chartSymbol').textContent = `${currentSymbol}/USD`;
    } catch (error) {
        console.error('Error fetching price:', error);
        const demoPrice = currentSymbol === 'BTC' ? 43000 + (Math.random() - 0.5) * 500 : 
                         (currentSymbol === 'ETH' ? 2200 + (Math.random() - 0.5) * 50 : 300 + (Math.random() - 0.5) * 10);
        document.getElementById('currentPrice').textContent = `$${demoPrice.toFixed(2)}`;
    }
}

async function loadCryptoList() {
    const container = document.getElementById('cryptoList');
    if (!container) return;
    
    const updatedData = await Promise.all(cryptoData.map(async (crypto) => {
        try {
            const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${binanceSymbols[crypto.symbol]}`);
            const data = await response.json();
            return { ...crypto, price: parseFloat(data.lastPrice), change: parseFloat(data.priceChangePercent) };
        } catch {
            return { ...crypto, price: 0, change: 0 };
        }
    }));
    
    container.innerHTML = updatedData.map(crypto => {
        const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
        const changeSign = crypto.change >= 0 ? '+' : '';
        return `
            <div class="crypto-item" onclick="changeChartSymbol('${crypto.symbol}')">
                <div class="crypto-info">
                    <div class="crypto-icon">${crypto.icon}</div>
                    <div>
                        <div class="crypto-symbol">${crypto.symbol}</div>
                        <div class="crypto-name">${crypto.name}</div>
                    </div>
                </div>
                <div class="crypto-price">
                    <div class="crypto-price-value">$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="crypto-change ${changeClass}">${changeSign}${crypto.change.toFixed(2)}%</div>
                </div>
            </div>
        `;
    }).join('');
}

function loadTransactions() {
    const tbody = document.getElementById('transactionsList');
    if (!tbody) return;
    
    const transactions = (currentUser.transactions || []).slice(-5).reverse();
    if (transactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No transactions yet</td--</tr>';
        return;
    }
    
    tbody.innerHTML = transactions.map(t => {
        const isPositive = t.type === 'deposit' || t.type === 'buy';
        return `
            <tr>
                <td><span class="transaction-type ${t.type}">${t.type.charAt(0).toUpperCase() + t.type.slice(1)}</span></td>
                <td class="${isPositive ? 'positive-amount' : 'negative-amount'}">${isPositive ? '+' : '-'}$${Math.abs(t.amount).toFixed(2)}</td>
                <td><span class="status-badge status-${t.status}">${t.status}</span></td>
                <td>${new Date(t.date).toLocaleDateString()}</td>
            </table>
        `;
    }).join('');
}

function setupEventListeners() {
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.symbol-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentSymbol = btn.dataset.symbol;
            await fetchCandlestickData();
            await fetchCurrentPrice();
        });
    });
    
    document.querySelectorAll('.timeframe-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
            document.querySelectorAll('.timeframe-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentInterval = btn.dataset.interval;
            await fetchCandlestickData();
        });
    });
}

function startRealTimeUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    priceUpdateInterval = setInterval(async () => {
        await fetchCurrentPrice();
        await loadCryptoList();
    }, 10000);
}

async function changeChartSymbol(symbol) {
    document.querySelectorAll('.symbol-btn').forEach(btn => {
        if (btn.dataset.symbol === symbol) btn.classList.add('active');
        else btn.classList.remove('active');
    });
    currentSymbol = symbol;
    await fetchCandlestickData();
    await fetchCurrentPrice();
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

window.changeChartSymbol = changeChartSymbol;
window.handleLogout = handleLogout;
