// Dashboard page functionality - Supabase Integration
// File: js/dashboard.js

let currentUser = null;
let chart = null;
let priceUpdateInterval = null;

// Admin email
const ADMIN_EMAIL = 'ephregojo@gmail.com';

// Cryptocurrency data for top list
let cryptoData = [
    { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.5, icon: '₿', volume: '32.5B' },
    { symbol: 'ETH', name: 'Ethereum', price: 2250.80, change: 1.8, icon: 'Ξ', volume: '15.2B' },
    { symbol: 'BNB', name: 'Binance Coin', price: 305.60, change: -0.5, icon: 'B', volume: '2.1B' },
    { symbol: 'SOL', name: 'Solana', price: 98.40, change: 5.2, icon: 'S', volume: '1.8B' },
    { symbol: 'XRP', name: 'Ripple', price: 0.62, change: 0.3, icon: 'X', volume: '1.2B' },
    { symbol: 'ADA', name: 'Cardano', price: 0.48, change: -1.2, icon: 'A', volume: '0.8B' }
];

// Binance API for real prices
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Dashboard page loaded');
    
    if (typeof supabaseDB === 'undefined') {
        setTimeout(() => initDashboardPage(), 500);
        return;
    }
    
    await initDashboardPage();
});

async function initDashboardPage() {
    await loadUser();
    renderNavLinks();
    renderUserInfo();
    
    if (!currentUser) {
        renderLoginPrompt();
    } else {
        renderDashboardInterface();
        await loadDashboardData();
        setupEventListeners();
        startRealTimeUpdates();
        await fetchRealCryptoPrices();
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
    const container = document.getElementById('dashboardContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="login-prompt">
            <h3>🔒 Login Required</h3>
            <p>Please login or create an account to view your dashboard</p>
            <div class="login-buttons">
                <a href="login.html" class="btn-login" style="background: transparent; color: var(--primary); padding: 10px 28px; border: 1px solid var(--primary); border-radius: 10px; text-decoration: none; font-weight: 500;">Login</a>
                <a href="register.html" class="btn-signup" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; padding: 10px 28px; border: none; border-radius: 10px; text-decoration: none; font-weight: 500;">Sign Up</a>
            </div>
        </div>
    `;
}

function renderDashboardInterface() {
    const container = document.getElementById('dashboardContent');
    if (!container) return;
    
    const currentBalance = currentUser.balance || 0;
    
    container.innerHTML = `
        <!-- Stats Cards -->
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-label">Total Balance</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                    </svg>
                </div>
                <div class="stat-value" id="totalBalance">$${currentBalance.toFixed(2)}</div>
                <div class="stat-change" id="balanceChange">0% from start</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-label">24h Volume</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9h-4m-7 9A9 9 0 013 12m9 9v-4M3 12a9 9 0 019-9m-9 9h4m7-9a9 9 0 00-9 9"/>
                    </svg>
                </div>
                <div class="stat-value" id="dailyVolume">$0.00</div>
                <div class="stat-change positive" id="volumeChange">+0%</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-label">Total Profit/Loss</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M3 17v2h6v-2M3 7v2h6V7M13 5v2h6V5M13 11v2h6v-2M13 17v2h6v-2"/>
                    </svg>
                </div>
                <div class="stat-value" id="totalProfit">$0.00</div>
                <div class="stat-change positive" id="profitChange">+0%</div>
            </div>
            <div class="stat-card">
                <div class="stat-header">
                    <span class="stat-label">Active Trades</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M9 12h6M12 9v6M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/>
                    </svg>
                </div>
                <div class="stat-value" id="activeTrades">0</div>
                <div class="stat-change">Currently open</div>
            </div>
        </div>

        <!-- Trading Chart and Market Data -->
        <div class="trading-section">
            <div class="chart-container">
                <div class="section-header">
                    <h2>Market Overview</h2>
                    <select id="timeframe" class="timeframe-select">
                        <option value="1H">1H</option>
                        <option value="24H" selected>24H</option>
                        <option value="7D">7D</option>
                        <option value="30D">30D</option>
                    </select>
                </div>
                <div class="chart-placeholder">
                    <canvas id="priceChart"></canvas>
                </div>
            </div>

            <div class="market-data">
                <div class="section-header">
                    <h2>Top Cryptocurrencies</h2>
                </div>
                <div class="crypto-list" id="cryptoList">
                    Loading...
                </div>
            </div>
        </div>

        <!-- Recent Transactions -->
        <div class="transactions-section">
            <div class="section-header">
                <h2>Recent Transactions</h2>
                <a href="#" class="view-all" style="color: var(--primary); text-decoration: none; font-size: 0.8rem;">View All</a>
            </div>
            <div class="transactions-table">
                <table>
                    <thead>
                        <tr>
                            <th>Type</th>
                            <th>Amount</th>
                            <th>Status</th>
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody id="transactionsList">
                        <tr>
                            <td colspan="4" style="text-align: center; padding: 2rem;">No transactions yet</td--</tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

async function loadDashboardData() {
    await updateStats();
    await loadTransactions();
    await initChart();
}

async function updateStats() {
    if (!currentUser) return;
    
    const currentBalance = currentUser.balance || 0;
    const totalBalanceElem = document.getElementById('totalBalance');
    if (totalBalanceElem) {
        totalBalanceElem.textContent = `$${currentBalance.toFixed(2)}`;
        if (currentBalance > 0) {
            totalBalanceElem.className = 'stat-value positive';
        } else {
            totalBalanceElem.className = 'stat-value';
        }
    }
    
    // Calculate daily volume from transactions
    const today = new Date().toDateString();
    const todayTransactions = (currentUser.transactions || []).filter(t => 
        new Date(t.date).toDateString() === today && (t.type === 'trade' || t.type === 'buy' || t.type === 'sell')
    );
    const dailyVolume = todayTransactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
    const dailyVolumeElem = document.getElementById('dailyVolume');
    if (dailyVolumeElem) dailyVolumeElem.textContent = `$${dailyVolume.toFixed(2)}`;
    
    // Calculate profit/loss
    const trades = (currentUser.transactions || []).filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    let totalProfit = 0;
    
    trades.forEach(trade => {
        if (trade.pnl) {
            totalProfit += trade.pnl;
        }
    });
    
    const profitElem = document.getElementById('totalProfit');
    if (profitElem) {
        const sign = totalProfit >= 0 ? '+' : '';
        profitElem.textContent = `${sign}$${totalProfit.toFixed(2)}`;
        profitElem.style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    }
    
    // Count active trades (pending transactions)
    const activeTrades = (currentUser.transactions || []).filter(t => t.status === 'pending').length;
    const tradesElem = document.getElementById('activeTrades');
    if (tradesElem) tradesElem.textContent = activeTrades;
}

async function loadTransactions() {
    const tbody = document.getElementById('transactionsList');
    if (!tbody) return;
    
    const userTransactions = currentUser.transactions || [];
    const recentTransactions = userTransactions.slice(-5).reverse();
    
    if (recentTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No transactions yet</td--</tr>';
        return;
    }
    
    tbody.innerHTML = recentTransactions.map(transaction => {
        let typeDisplay = transaction.type;
        let amountDisplay = `$${transaction.amount.toFixed(2)}`;
        let typeClass = '';
        
        if (transaction.type === 'buy') {
            typeDisplay = 'Buy';
            amountDisplay = `+ $${transaction.amount.toFixed(2)}`;
            typeClass = 'buy';
        } else if (transaction.type === 'sell') {
            typeDisplay = 'Sell';
            amountDisplay = `- $${transaction.amount.toFixed(2)}`;
            typeClass = 'sell';
        } else if (transaction.type === 'deposit') {
            typeDisplay = 'Deposit';
            amountDisplay = `+ $${transaction.amount.toFixed(2)}`;
            typeClass = 'deposit';
        } else if (transaction.type === 'withdraw') {
            typeDisplay = 'Withdraw';
            amountDisplay = `- $${transaction.amount.toFixed(2)}`;
            typeClass = 'withdraw';
        }
        
        const statusClass = transaction.status === 'completed' ? 'status-completed' : 'status-pending';
        
        return `
            <tr>
                <td><span class="transaction-type ${typeClass}">${typeDisplay}</span></td>
                <td class="${transaction.type === 'deposit' || transaction.type === 'buy' ? 'positive-amount' : 'negative-amount'}">${amountDisplay}</td>
                <td><span class="status-badge ${statusClass}">${transaction.status}</span></td>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
}

async function initChart() {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;
    
    const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
    const data = Array.from({ length: 24 }, () => Math.random() * 1000 + 40000);
    
    chart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'BTC/USD',
                data: data,
                borderColor: '#F7931A',
                backgroundColor: 'rgba(247, 147, 26, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#F7931A',
                pointHoverBorderColor: '#FFFFFF',
                pointHoverBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: true,
            plugins: {
                legend: {
                    labels: { color: '#A0AAB5', font: { size: 12 } }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: '#151E2C',
                    titleColor: '#FFFFFF',
                    bodyColor: '#A0AAB5',
                    borderColor: '#F7931A',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            return `Price: $${context.parsed.y.toFixed(2)}`;
                        }
                    }
                }
            },
            scales: {
                y: {
                    grid: { color: '#2A3545', drawBorder: false },
                    ticks: { color: '#A0AAB5', callback: function(value) { return '$' + value.toLocaleString(); } }
                },
                x: {
                    grid: { color: '#2A3545', drawBorder: false },
                    ticks: { color: '#A0AAB5', maxRotation: 45, minRotation: 45 }
                }
            }
        }
    });
}

function setupEventListeners() {
    const timeframeSelect = document.getElementById('timeframe');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', function(e) {
            updateChartTimeframe(e.target.value);
        });
    }
}

function updateChartTimeframe(timeframe) {
    let dataPoints = 24;
    
    switch(timeframe) {
        case '1H':
            dataPoints = 60;
            break;
        case '24H':
            dataPoints = 24;
            break;
        case '7D':
            dataPoints = 168;
            break;
        case '30D':
            dataPoints = 720;
            break;
    }
    
    const newData = Array.from({ length: dataPoints }, () => Math.random() * 1000 + 40000);
    const labels = Array.from({ length: dataPoints }, (_, i) => {
        if (timeframe === '1H') return `${i}m`;
        if (timeframe === '24H') return `${i}:00`;
        return `Day ${Math.floor(i/24)+1}`;
    });
    
    if (chart) {
        chart.data.labels = labels;
        chart.data.datasets[0].data = newData;
        chart.update();
    }
}

async function fetchRealCryptoPrices() {
    try {
        const cryptoDataWithPrices = [];
        
        for (const crypto of cryptoData) {
            try {
                const binanceSymbol = crypto.symbol === 'BTC' ? 'BTCUSDT' :
                                     crypto.symbol === 'ETH' ? 'ETHUSDT' :
                                     crypto.symbol === 'BNB' ? 'BNBUSDT' :
                                     crypto.symbol === 'SOL' ? 'SOLUSDT' : null;
                
                if (binanceSymbol) {
                    const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${binanceSymbol}`);
                    if (response.ok) {
                        const data = await response.json();
                        cryptoDataWithPrices.push({
                            ...crypto,
                            price: parseFloat(data.lastPrice),
                            change: parseFloat(data.priceChangePercent)
                        });
                    } else {
                        cryptoDataWithPrices.push(crypto);
                    }
                } else {
                    cryptoDataWithPrices.push(crypto);
                }
            } catch (err) {
                cryptoDataWithPrices.push(crypto);
            }
        }
        
        cryptoData = cryptoDataWithPrices;
        loadCryptoList();
        
    } catch (error) {
        console.error('Error fetching crypto prices:', error);
        loadCryptoList();
    }
}

function loadCryptoList() {
    const container = document.getElementById('cryptoList');
    if (!container) return;
    
    container.innerHTML = cryptoData.map(crypto => {
        const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
        const changeSign = crypto.change >= 0 ? '+' : '';
        
        return `
            <div class="crypto-item" onclick="window.location.href='trade.html?crypto=${crypto.symbol}'">
                <div class="crypto-info">
                    <div class="crypto-icon">${crypto.icon}</div>
                    <div>
                        <div class="crypto-symbol">${crypto.symbol}</div>
                        <div class="crypto-name">${crypto.name}</div>
                    </div>
                </div>
                <div class="crypto-price">
                    <div class="crypto-price-value">$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="crypto-change ${changeClass}">
                        ${changeSign}${crypto.change.toFixed(2)}%
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function startRealTimeUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    
    priceUpdateInterval = setInterval(async () => {
        await fetchRealCryptoPrices();
        await updateStats();
        await loadTransactions();
        
        // Update chart with new data point
        if (chart && chart.data.datasets[0].data.length > 0 && cryptoData[0]) {
            const newPrice = cryptoData[0].price;
            const newData = chart.data.datasets[0].data.slice(1);
            newData.push(newPrice);
            chart.data.datasets[0].data = newData;
            chart.update('none');
        }
    }, 30000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

window.handleLogout = handleLogout;
