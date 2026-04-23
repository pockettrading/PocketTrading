// Dashboard functionality with chart and real-time data

class DashboardManager {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user'));
        this.transactions = JSON.parse(localStorage.getItem('pocket_transactions') || '[]');
        this.cryptoData = this.getCryptoData();
        this.chart = null;
        this.init();
    }

    init() {
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }
        this.updateUserInfo();
        this.updateBalanceDisplay();
        this.updateModeUI();
        this.loadCryptoList();
        this.loadTransactions();
        this.initChart();
        this.startRealTimeUpdates();
        this.updateStats();
    }

    updateUserInfo() {
        if (this.user && document.getElementById('userName')) {
            document.getElementById('userName').textContent = this.user.name || this.user.email.split('@')[0];
        }
    }

    updateBalanceDisplay() {
        // Update demo balance display
        if (document.getElementById('demoBalance')) {
            document.getElementById('demoBalance').textContent = `$${this.user.demoBalance.toFixed(2)}`;
        }
        
        // Update real balance display
        if (document.getElementById('realBalance')) {
            document.getElementById('realBalance').textContent = `$${this.user.realBalance.toFixed(2)}`;
        }
        
        // Show current active balance in stats
        const currentBalance = this.user.accountMode === 'demo' ? this.user.demoBalance : this.user.realBalance;
        if (document.getElementById('totalBalance')) {
            document.getElementById('totalBalance').textContent = currentBalance.toFixed(2);
        }
        
        // Highlight active mode
        document.querySelectorAll('.mode-btn').forEach(btn => {
            if (btn.dataset.mode === this.user.accountMode) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
    }

    updateModeUI() {
        // Show/hide upgrade section
        const upgradeSection = document.getElementById('upgradeSection');
        if (upgradeSection) {
            if (!this.user.hasRealAccount) {
                upgradeSection.style.display = 'block';
            } else {
                upgradeSection.style.display = 'none';
            }
        }
    }

    updateStats() {
        // Calculate daily volume from transactions
        const today = new Date().toDateString();
        const todayTransactions = (this.user.transactions || []).filter(t => 
            new Date(t.date).toDateString() === today && t.type === 'trade'
        );
        const dailyVolume = todayTransactions.reduce((sum, t) => sum + (t.amount || 0), 0);
        document.getElementById('dailyVolume').textContent = dailyVolume.toFixed(2);
        
        // Calculate profit/loss
        const trades = (this.user.transactions || []).filter(t => t.type === 'trade');
        const profits = trades.filter(t => t.result === 'profit');
        const losses = trades.filter(t => t.result === 'loss');
        const totalProfit = profits.reduce((sum, p) => sum + (p.profit || 0), 0);
        const totalLoss = losses.reduce((sum, l) => sum + (l.loss || 0), 0);
        const netProfit = totalProfit - totalLoss;
        document.getElementById('totalProfit').textContent = netProfit.toFixed(2);
        
        // Count active trades
        const activeTrades = (this.user.transactions || []).filter(t => t.status === 'open').length;
        document.getElementById('activeTrades').textContent = activeTrades;
        
        // Update balance change percentage
        const currentBalance = this.user.accountMode === 'demo' ? this.user.demoBalance : this.user.realBalance;
        const initialBalance = this.user.accountMode === 'demo' ? 10000 : (this.user.realBalance - netProfit);
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

    getCryptoData() {
        return [
            { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.5, icon: '₿' },
            { symbol: 'ETH', name: 'Ethereum', price: 2250.80, change: 1.8, icon: 'Ξ' },
            { symbol: 'BNB', name: 'Binance Coin', price: 305.60, change: -0.5, icon: 'B' },
            { symbol: 'SOL', name: 'Solana', price: 98.40, change: 5.2, icon: 'S' },
            { symbol: 'XRP', name: 'Ripple', price: 0.62, change: 0.3, icon: 'X' },
            { symbol: 'ADA', name: 'Cardano', price: 0.48, change: -1.2, icon: 'A' }
        ];
    }

    loadCryptoList() {
        const container = document.getElementById('cryptoList');
        if (!container) return;
        
        container.innerHTML = this.cryptoData.map(crypto => `
            <div class="crypto-item">
                <div class="crypto-info">
                    <div class="crypto-icon" style="font-size: 1.5rem;">${crypto.icon}</div>
                    <div>
                        <div class="crypto-symbol">${crypto.symbol}</div>
                        <div class="crypto-name">${crypto.name}</div>
                    </div>
                </div>
                <div class="crypto-price">
                    <div class="crypto-price-value">$${crypto.price.toLocaleString()}</div>
                    <div class="crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}">
                        ${crypto.change >= 0 ? '+' : ''}${crypto.change}%
                    </div>
                </div>
            </div>
        `).join('');
    }

    loadTransactions() {
        const tbody = document.getElementById('transactionsList');
        if (!tbody) return;
        
        const userTransactions = this.user.transactions || [];
        const recentTransactions = userTransactions.slice(-5).reverse();
        
        if (recentTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No transactions yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = recentTransactions.map(transaction => `
            <tr>
                <td style="text-transform: capitalize;">${transaction.type}</td>
                <td>$${transaction.amount.toFixed(2)}</td>
                <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    initChart() {
        const ctx = document.getElementById('priceChart');
        if (!ctx) return;
        
        const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        const data = Array.from({ length: 24 }, () => Math.random() * 1000 + 40000);
        
        this.chart = new Chart(ctx, {
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
                    pointHoverRadius: 5
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#A0AAB5' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        backgroundColor: '#151E2C',
                        titleColor: '#FFFFFF',
                        bodyColor: '#A0AAB5',
                        borderColor: '#F7931A',
                        borderWidth: 1
                    }
                },
                scales: {
                    y: {
                        grid: { color: '#2A3545' },
                        ticks: { color: '#A0AAB5' },
                        title: {
                            display: true,
                            text: 'Price (USD)',
                            color: '#A0AAB5'
                        }
                    },
                    x: {
                        grid: { color: '#2A3545' },
                        ticks: { color: '#A0AAB5' }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    startRealTimeUpdates() {
        // Simulate real-time price updates every 5 seconds
        setInterval(() => {
            this.updateCryptoPrices();
        }, 5000);
    }

    updateCryptoPrices() {
        this.cryptoData = this.cryptoData.map(crypto => ({
            ...crypto,
            price: crypto.price * (1 + (Math.random() - 0.5) * 0.002),
            change: crypto.change + (Math.random() - 0.5) * 0.3
        }));
        
        this.loadCryptoList();
        
        // Update chart with new data point
        if (this.chart) {
            const newPrice = this.cryptoData[0].price;
            const newData = this.chart.data.datasets[0].data.slice(1);
            newData.push(newPrice);
            this.chart.data.datasets[0].data = newData;
            this.chart.update('none');
        }
    }

    refreshData() {
        // Refresh user data
        this.user = JSON.parse(localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user'));
        this.updateBalanceDisplay();
        this.updateModeUI();
        this.updateStats();
        this.loadTransactions();
    }
}

// Global functions for account management
function switchAccountMode(mode) {
    if (window.auth && window.auth.currentUser) {
        const success = window.auth.switchAccountMode(window.auth.currentUser.id, mode);
        if (success && window.dashboard) {
            setTimeout(() => {
                window.dashboard.refreshData();
            }, 100);
        }
    }
}

function showUpgradeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) {
        modal.style.display = 'flex';
    }
}

function closeModal() {
    const modal = document.getElementById('upgradeModal');
    if (modal) {
        modal.style.display = 'none';
        const amountInput = document.getElementById('depositAmount');
        if (amountInput) amountInput.value = '';
    }
}

function processUpgrade() {
    const amountInput = document.getElementById('depositAmount');
    const amount = parseFloat(amountInput?.value);
    
    if (!amount || amount < 100) {
        alert('Minimum deposit is $100');
        return;
    }
    
    if (window.auth && window.auth.currentUser) {
        const success = window.auth.upgradeToRealAccount(window.auth.currentUser.id, amount);
        if (success) {
            closeModal();
            if (window.dashboard) {
                setTimeout(() => {
                    window.dashboard.refreshData();
                    alert('Real account created successfully! You can now switch to Real mode.');
                }, 500);
            }
        }
    }
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modal = document.getElementById('upgradeModal');
    if (event.target === modal) {
        closeModal();
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    window.dashboard = new DashboardManager();
});

// Make functions globally available
window.switchAccountMode = switchAccountMode;
window.showUpgradeModal = showUpgradeModal;
window.closeModal = closeModal;
window.processUpgrade = processUpgrade;
