// Dashboard functionality - Complete working version

let currentUser = null;
let chart = null;
let priceUpdateInterval = null;

// Cryptocurrency data
let cryptoData = [
    { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.5, icon: '₿', volume: '32.5B' },
    { symbol: 'ETH', name: 'Ethereum', price: 2250.80, change: 1.8, icon: 'Ξ', volume: '15.2B' },
    { symbol: 'BNB', name: 'Binance Coin', price: 305.60, change: -0.5, icon: 'B', volume: '2.1B' },
    { symbol: 'SOL', name: 'Solana', price: 98.40, change: 5.2, icon: 'S', volume: '1.8B' },
    { symbol: 'XRP', name: 'Ripple', price: 0.62, change: 0.3, icon: 'X', volume: '1.2B' },
    { symbol: 'ADA', name: 'Cardano', price: 0.48, change: -1.2, icon: 'A', volume: '0.8B' }
];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Dashboard page loaded');
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    updateUserDisplay();
    initDashboard();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
    }
}

function updateUserDisplay() {
    const userNameSpan = document.getElementById('userNameText');
    if (userNameSpan && currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        userNameSpan.textContent = displayName;
    }
    
    const welcomeNameSpan = document.getElementById('userName');
    if (welcomeNameSpan && currentUser) {
        welcomeNameSpan.textContent = currentUser.name || currentUser.email.split('@')[0];
    }
}

function initDashboard() {
    updateBalanceDisplay();
    updateModeUI();
    loadCryptoList();
    loadTransactions();
    initChart();
    updateStats();
    setupEventListeners();
    startRealTimeUpdates();
}

function updateBalanceDisplay() {
    if (!currentUser) return;
    
    // Update demo balance display
    const demoBalanceElem = document.getElementById('demoBalance');
    if (demoBalanceElem) {
        demoBalanceElem.textContent = `$${currentUser.demoBalance.toFixed(2)}`;
    }
    
    // Update real balance display
    const realBalanceElem = document.getElementById('realBalance');
    if (realBalanceElem) {
        realBalanceElem.textContent = `$${currentUser.realBalance.toFixed(2)}`;
    }
    
    // Show current active balance in stats
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const totalBalanceElem = document.getElementById('totalBalance');
    if (totalBalanceElem) {
        totalBalanceElem.textContent = currentBalance.toFixed(2);
    }
    
    // Highlight active mode
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === currentUser.accountMode) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function updateModeUI() {
    if (!currentUser) return;
    
    const upgradeSection = document.getElementById('upgradeSection');
    if (upgradeSection) {
        if (!currentUser.hasRealAccount) {
            upgradeSection.style.display = 'block';
        } else {
            upgradeSection.style.display = 'none';
        }
    }
}

function updateStats() {
    if (!currentUser) return;
    
    // Calculate daily volume from transactions
    const today = new Date().toDateString();
    const todayTransactions = (currentUser.transactions || []).filter(t => 
        new Date(t.date).toDateString() === today && (t.type === 'trade' || t.type === 'buy' || t.type === 'sell')
    );
    const dailyVolume = todayTransactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
    const dailyVolumeElem = document.getElementById('dailyVolume');
    if (dailyVolumeElem) dailyVolumeElem.textContent = dailyVolume.toFixed(2);
    
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
    
    // Count active trades
    const activeTrades = (currentUser.transactions || []).filter(t => t.status === 'open').length;
    const tradesElem = document.getElementById('activeTrades');
    if (tradesElem) tradesElem.textContent = activeTrades;
    
    // Update balance change percentage
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const initialBalance = currentUser.accountMode === 'demo' ? 10000 : currentUser.realBalance;
    
    if (initialBalance > 0 && document.getElementById('balanceChange')) {
        const changePercent = ((currentBalance - initialBalance) / initialBalance * 100).toFixed(1);
        const changeElement = document.getElementById('balanceChange');
        if (changePercent >= 0) {
            changeElement.innerHTML = `+${changePercent}% from start`;
            changeElement.className = 'stat-change positive';
        } else {
            changeElement.innerHTML = `${changePercent}% from start`;
            changeElement.className = 'stat-change negative';
        }
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
                <div class="crypto-volume">
                    <div class="crypto-volume-label">Vol</div>
                    <div class="crypto-volume-value">${crypto.volume}</div>
                </div>
            </div>
        `;
    }).join('');
}

function loadTransactions() {
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
        
        return `
            <tr>
                <td><span class="transaction-type ${typeClass}">${typeDisplay}</span></td>
                <td class="${transaction.type === 'deposit' || transaction.type === 'buy' ? 'positive-amount' : 'negative-amount'}">${amountDisplay}</td>
                <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
            </tr>
        `;
    }).join('');
}

function initChart() {
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

function startRealTimeUpdates() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
    }
    
    priceUpdateInterval = setInterval(function() {
        // Update crypto prices with random changes
        cryptoData = cryptoData.map(crypto => {
            const change = (Math.random() - 0.5) * 100;
            const newPrice = Math.max(0.01, crypto.price + change);
            const percentChange = ((newPrice - crypto.price) / crypto.price) * 100;
            
            return {
                ...crypto,
                price: newPrice,
                change: percentChange
            };
        });
        
        loadCryptoList();
        
        // Update chart with new data point
        if (chart && chart.data.datasets[0].data.length > 0) {
            const newPrice = cryptoData[0].price;
            const newData = chart.data.datasets[0].data.slice(1);
            newData.push(newPrice);
            chart.data.datasets[0].data = newData;
            chart.update('none');
        }
    }, 5000);
}

function refreshData() {
    loadUser();
    if (currentUser) {
        updateBalanceDisplay();
        updateModeUI();
        updateStats();
        loadTransactions();
    }
}

function switchAccountMode(mode) {
    if (!currentUser) return;
    
    if (mode === 'real' && !currentUser.hasRealAccount) {
        showNotification('You need to create a real account first. Minimum deposit $100 required.', 'error');
        return;
    }
    
    currentUser.accountMode = mode;
    
    // Update in users array
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pocket_users', JSON.stringify(users));
    }
    
    // Update current session
    if (localStorage.getItem('pocket_user')) {
        localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
    if (sessionStorage.getItem('pocket_user')) {
        sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
    
    const modeName = mode === 'demo' ? 'Demo Account' : 'Real Account';
    const balance = mode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    showNotification(`Switched to ${modeName}. Balance: $${balance.toFixed(2)}`, 'success');
    
    refreshData();
}

function showUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) modal.style.display = 'flex';
}

function closeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) modal.style.display = 'none';
}

function processUpgrade() {
    const amountInput = document.getElementById('depositAmount');
    const amount = parseFloat(amountInput?.value);
    
    if (!amount || amount < 100) {
        showNotification('Minimum deposit is $100', 'error');
        return;
    }
    
    if (amount > 100000) {
        showNotification('Maximum deposit is $100,000', 'error');
        return;
    }
    
    currentUser.hasRealAccount = true;
    currentUser.realBalance += amount;
    
    // Add transaction
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift({
        id: Date.now(),
        type: 'deposit',
        amount: amount,
        status: 'completed',
        date: new Date().toISOString(),
        description: `Real account created with $${amount} deposit`
    });
    
    // Save user data
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
    
    showNotification(`Real account created! $${amount} added to your real balance.`, 'success');
    closeModal();
    refreshData();
}

function showNotification(message, type) {
    const existing = document.querySelector('.dashboard-notification');
    if (existing) existing.remove();
    
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
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.switchAccountMode = switchAccountMode;
window.showUpgradeModal = showUpgradeModal;
window.closeModal = closeModal;
window.processUpgrade = processUpgrade;
window.handleLogout = handleLogout;
