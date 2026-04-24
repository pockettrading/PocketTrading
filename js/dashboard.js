// Dashboard functionality - Complete working version

let currentUser = null;
let chart = null;
let priceUpdateInterval = null;

let cryptoData = [
    { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.5, icon: '₿', volume: '32.5B' },
    { symbol: 'ETH', name: 'Ethereum', price: 2250.80, change: 1.8, icon: 'Ξ', volume: '15.2B' },
    { symbol: 'BNB', name: 'Binance Coin', price: 305.60, change: -0.5, icon: 'B', volume: '2.1B' },
    { symbol: 'SOL', name: 'Solana', price: 98.40, change: 5.2, icon: 'S', volume: '1.8B' },
    { symbol: 'XRP', name: 'Ripple', price: 0.62, change: 0.3, icon: 'X', volume: '1.2B' },
    { symbol: 'ADA', name: 'Cardano', price: 0.48, change: -1.2, icon: 'A', volume: '0.8B' }
];

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
    if (storedUser) currentUser = JSON.parse(storedUser);
}

function updateUserDisplay() {
    const userNameSpan = document.getElementById('userNameDisplay');
    if (userNameSpan && currentUser) {
        userNameSpan.textContent = currentUser.name || currentUser.email.split('@')[0];
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
    
    document.getElementById('demoBalance').textContent = `$${currentUser.demoBalance.toFixed(2)}`;
    document.getElementById('realBalance').textContent = `$${currentUser.realBalance.toFixed(2)}`;
    
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    document.getElementById('totalBalance').textContent = currentBalance.toFixed(2);
    
    document.querySelectorAll('.mode-btn').forEach(btn => {
        if (btn.dataset.mode === currentUser.accountMode) btn.classList.add('active');
        else btn.classList.remove('active');
    });
}

function updateModeUI() {
    const upgradeSection = document.getElementById('upgradeSection');
    if (upgradeSection) {
        upgradeSection.style.display = !currentUser.hasRealAccount ? 'block' : 'none';
    }
}

function updateStats() {
    if (!currentUser) return;
    
    const today = new Date().toDateString();
    const todayTransactions = (currentUser.transactions || []).filter(t => 
        new Date(t.date).toDateString() === today && (t.type === 'trade' || t.type === 'buy' || t.type === 'sell')
    );
    const dailyVolume = todayTransactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
    document.getElementById('dailyVolume').textContent = dailyVolume.toFixed(2);
    
    const trades = (currentUser.transactions || []).filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    let totalProfit = 0;
    trades.forEach(trade => { if (trade.pnl) totalProfit += trade.pnl; });
    
    const profitElem = document.getElementById('totalProfit');
    profitElem.textContent = `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`;
    profitElem.style.color = totalProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    
    const activeTrades = (currentUser.transactions || []).filter(t => t.status === 'open').length;
    document.getElementById('activeTrades').textContent = activeTrades;
    
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const initialBalance = currentUser.accountMode === 'demo' ? 10000 : currentUser.realBalance;
    
    if (initialBalance > 0) {
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
    
    container.innerHTML = cryptoData.map(crypto => `
        <div class="crypto-item" onclick="window.location.href='trade.html?crypto=${crypto.symbol}'">
            <div class="crypto-info"><div class="crypto-icon">${crypto.icon}</div><div><div class="crypto-symbol">${crypto.symbol}</div><div class="crypto-name">${crypto.name}</div></div></div>
            <div class="crypto-price"><div class="crypto-price-value">$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
            <div class="crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}">${crypto.change >= 0 ? '+' : ''}${crypto.change.toFixed(2)}%</div></div>
            <div class="crypto-volume"><div class="crypto-volume-label">Vol</div><div class="crypto-volume-value">${crypto.volume}</div></div>
        </div>
    `).join('');
}

function loadTransactions() {
    const tbody = document.getElementById('transactionsList');
    if (!tbody) return;
    
    const userTransactions = currentUser.transactions || [];
    const recentTransactions = userTransactions.slice(-5).reverse();
    
    if (recentTransactions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No transactions yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = recentTransactions.map(t => {
        let typeDisplay = t.type, amountDisplay = `$${t.amount.toFixed(2)}`, typeClass = '';
        if (t.type === 'buy') { typeDisplay = 'Buy'; amountDisplay = `+ $${t.amount.toFixed(2)}`; typeClass = 'buy'; }
        else if (t.type === 'sell') { typeDisplay = 'Sell'; amountDisplay = `- $${t.amount.toFixed(2)}`; typeClass = 'sell'; }
        else if (t.type === 'deposit') { typeDisplay = 'Deposit'; amountDisplay = `+ $${t.amount.toFixed(2)}`; typeClass = 'deposit'; }
        else if (t.type === 'withdraw') { typeDisplay = 'Withdraw'; amountDisplay = `- $${t.amount.toFixed(2)}`; typeClass = 'withdraw'; }
        return `<tr><td><span class="transaction-type ${typeClass}">${typeDisplay}</span></td>
                <td class="${t.type === 'deposit' || t.type === 'buy' ? 'positive-amount' : 'negative-amount'}">${amountDisplay}</td>
                <td><span class="status-badge status-${t.status}">${t.status}</span></td>
                <td>${new Date(t.date).toLocaleDateString()}</td></tr>`;
    }).join('');
}

function initChart() {
    const ctx = document.getElementById('priceChart');
    if (!ctx) return;
    
    chart = new Chart(ctx, {
        type: 'line',
        data: { labels: Array.from({ length: 24 }, (_, i) => `${i}:00`), datasets: [{ label: 'BTC/USD', data: Array.from({ length: 24 }, () => Math.random() * 1000 + 40000), borderColor: '#F7931A', backgroundColor: 'rgba(247, 147, 26, 0.1)', borderWidth: 2, fill: true, tension: 0.4, pointRadius: 0, pointHoverRadius: 6, pointHoverBackgroundColor: '#F7931A', pointHoverBorderColor: '#FFFFFF', pointHoverBorderWidth: 2 }] },
        options: { responsive: true, maintainAspectRatio: true, plugins: { legend: { labels: { color: '#A0AAB5', font: { size: 12 } } }, tooltip: { mode: 'index', intersect: false, backgroundColor: '#151E2C', titleColor: '#FFFFFF', bodyColor: '#A0AAB5', borderColor: '#F7931A', borderWidth: 1, callbacks: { label: function(context) { return `Price: $${context.parsed.y.toFixed(2)}`; } } } }, scales: { y: { grid: { color: '#2A3545', drawBorder: false }, ticks: { color: '#A0AAB5', callback: function(value) { return '$' + value.toLocaleString(); } } }, x: { grid: { color: '#2A3545', drawBorder: false }, ticks: { color: '#A0AAB5', maxRotation: 45, minRotation: 45 } } } }
    });
}

function setupEventListeners() {
    const timeframeSelect = document.getElementById('timeframe');
    if (timeframeSelect) {
        timeframeSelect.addEventListener('change', function(e) {
            let dataPoints = e.target.value === '1H' ? 60 : e.target.value === '24H' ? 24 : e.target.value === '7D' ? 168 : 720;
            chart.data.labels = Array.from({ length: dataPoints }, (_, i) => e.target.value === '1H' ? `${i}m` : e.target.value === '24H' ? `${i}:00` : `Day ${Math.floor(i/24)+1}`);
            chart.data.datasets[0].data = Array.from({ length: dataPoints }, () => Math.random() * 1000 + 40000);
            chart.update();
        });
    }
}

function startRealTimeUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    priceUpdateInterval = setInterval(() => {
        cryptoData = cryptoData.map(c => ({ ...c, price: Math.max(0.01, c.price + (Math.random() - 0.5) * 100), change: c.change + (Math.random() - 0.5) * 0.3 }));
        loadCryptoList();
        if (chart && chart.data.datasets[0].data.length > 0) {
            const newData = chart.data.datasets[0].data.slice(1);
            newData.push(cryptoData[0].price);
            chart.data.datasets[0].data = newData;
            chart.update('none');
        }
    }, 5000);
}

function refreshData() { loadUser(); if(currentUser) { updateBalanceDisplay(); updateModeUI(); updateStats(); loadTransactions(); } }

function switchAccountMode(mode) {
    if (!currentUser) return;
    if (mode === 'real' && !currentUser.hasRealAccount) { showNotification('Create a real account first. Minimum deposit $100 required.', 'error'); return; }
    currentUser.accountMode = mode;
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) users[idx] = currentUser;
    localStorage.setItem('pocket_users', JSON.stringify(users));
    if (localStorage.getItem('pocket_user')) localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    if (sessionStorage.getItem('pocket_user')) sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    showNotification(`Switched to ${mode === 'demo' ? 'Demo Account' : 'Real Account'}. Balance: $${(mode === 'demo' ? currentUser.demoBalance : currentUser.realBalance).toFixed(2)}`, 'success');
    refreshData();
}

function showUpgradeModal() { document.getElementById('upgradeModal').style.display = 'flex'; }
function closeModal() { document.getElementById('upgradeModal').style.display = 'none'; }

function processUpgrade() {
    const amount = parseFloat(document.getElementById('depositAmount')?.value);
    if (!amount || amount < 100) { showNotification('Minimum deposit is $100', 'error'); return; }
    if (amount > 100000) { showNotification('Maximum deposit is $100,000', 'error'); return; }
    currentUser.hasRealAccount = true;
    currentUser.realBalance += amount;
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift({ id: Date.now(), type: 'deposit', amount: amount, status: 'completed', date: new Date().toISOString(), description: `Real account created with $${amount} deposit` });
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const idx = users.findIndex(u => u.id === currentUser.id);
    if (idx !== -1) users[idx] = currentUser;
    localStorage.setItem('pocket_users', JSON.stringify(users));
    if (localStorage.getItem('pocket_user')) localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    if (sessionStorage.getItem('pocket_user')) sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    showNotification(`Real account created! $${amount} added to your real balance.`, 'success');
    closeModal();
    refreshData();
}

function showNotification(message, type) {
    const existing = document.querySelector('.dashboard-notification');
    if (existing) existing.remove();
    const n = document.createElement('div');
    n.textContent = message;
    n.style.cssText = `position:fixed;top:20px;right:20px;background:${type === 'error' ? '#FF4757' : '#00D897'};color:white;padding:12px 20px;border-radius:12px;font-size:14px;z-index:10000;animation:slideIn 0.3s ease-out;box-shadow:0 4px 12px rgba(0,0,0,0.3);max-width:350px;`;
    document.body.appendChild(n);
    setTimeout(() => { n.style.animation = 'slideOut 0.3s ease-out'; setTimeout(() => n.remove(), 300); }, 3000);
}

function handleLogout() { localStorage.removeItem('pocket_user'); sessionStorage.removeItem('pocket_user'); window.location.href = 'home.html'; }

window.switchAccountMode = switchAccountMode;
window.showUpgradeModal = showUpgradeModal;
window.closeModal = closeModal;
window.processUpgrade = processUpgrade;
window.handleLogout = handleLogout;
