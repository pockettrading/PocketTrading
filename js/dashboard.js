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
        this.setupTimeframeSelector();
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
            new Date(t.date).toDateString() === today && (t.type === 'trade' || t.type === 'buy' || t.type === 'sell')
        );
        const dailyVolume = todayTransactions.reduce((sum, t) => sum + (t.amount || t.total || 0), 0);
        const dailyVolumeElem = document.getElementById('dailyVolume');
        if (dailyVolumeElem) dailyVolumeElem.textContent = dailyVolume.toFixed(2);
        
        // Calculate profit/loss
        const trades = (this.user.transactions || []).filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
        let totalProfit = 0;
        let totalLoss = 0;
        
        trades.forEach(trade => {
            if (trade.profit) totalProfit += trade.profit;
            if (trade.loss) totalLoss += trade.loss;
            if (trade.pnl) {
                if (trade.pnl > 0) totalProfit += trade.pnl;
                else totalLoss += Math.abs(trade.pnl);
            }
        });
        
        const netProfit = totalProfit - totalLoss;
        const profitElem = document.getElementById('totalProfit');
        if (profitElem) {
            profitElem.textContent = netProfit.toFixed(2);
            if (netProfit >= 0) {
                profitElem.parentElement.classList.add('positive');
                profitElem.parentElement.classList.remove('negative');
            } else {
                profitElem.parentElement.classList.add('negative');
                profitElem.parentElement.classList.remove('positive');
            }
        }
        
        // Count active trades
        const activeTrades = (this.user.transactions || []).filter(t => t.status === 'open').length;
        const tradesElem = document.getElementById('activeTrades');
        if (tradesElem) tradesElem.textContent = activeTrades;
        
        // Update balance change percentage
        const currentBalance = this.user.accountMode === 'demo' ? this.user.demoBalance : this.user.realBalance;
        const initialBalance = this.user.accountMode === 'demo' ? 10000 : (this.user.realBalance - netProfit);
        
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

    getCryptoData() {
        return [
            { symbol: 'BTC', name: 'Bitcoin', price: 43250.00, change: 2.5, icon: '₿', volume: '32.5B' },
            { symbol: 'ETH', name: 'Ethereum', price: 2250.80, change: 1.8, icon: 'Ξ', volume: '15.2B' },
            { symbol: 'BNB', name: 'Binance Coin', price: 305.60, change: -0.5, icon: 'B', volume: '2.1B' },
            { symbol: 'SOL', name: 'Solana', price: 98.40, change: 5.2, icon: 'S', volume: '1.8B' },
            { symbol: 'XRP', name: 'Ripple', price: 0.62, change: 0.3, icon: 'X', volume: '1.2B' },
            { symbol: 'ADA', name: 'Cardano', price: 0.48, change: -1.2, icon: 'A', volume: '0.8B' }
        ];
    }

    loadCryptoList() {
        const container = document.getElementById('cryptoList');
        if (!container) return;
        
        container.innerHTML = this.cryptoData.map(crypto => `
            <div class="crypto-item" onclick="window.location.href='trade.html?crypto=${crypto.symbol}'">
                <div class="crypto-info">
                    <div class="crypto-icon" style="font-size: 1.5rem;">${crypto.icon}</div>
                    <div>
                        <div class="crypto-symbol">${crypto.symbol}</div>
                        <div class="crypto-name">${crypto.name}</div>
                    </div>
                </div>
                <div class="crypto-price">
                    <div class="crypto-price-value">$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="crypto-change ${crypto.change >= 0 ? 'positive' : 'negative'}">
                        ${crypto.change >= 0 ? '+' : ''}${crypto.change.toFixed(2)}%
                    </div>
                </div>
                <div class="crypto-volume">
                    <div class="crypto-volume-label">Vol</div>
                    <div class="crypto-volume-value">${crypto.volume}</div>
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
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; padding: 2rem;">No transactions yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = recentTransactions.map(transaction => {
            let typeDisplay = transaction.type;
            let amountDisplay = `$${transaction.amount.toFixed(2)}`;
            
            if (transaction.type === 'buy') {
                typeDisplay = 'Buy';
                amountDisplay = `+ $${transaction.amount.toFixed(2)}`;
            } else if (transaction.type === 'sell') {
                typeDisplay = 'Sell';
                amountDisplay = `- $${transaction.amount.toFixed(2)}`;
            } else if (transaction.type === 'deposit') {
                typeDisplay = 'Deposit';
                amountDisplay = `+ $${transaction.amount.toFixed(2)}`;
            } else if (transaction.type === 'withdraw') {
                typeDisplay = 'Withdraw';
                amountDisplay = `- $${transaction.amount.toFixed(2)}`;
            }
            
            return `
                <tr>
                    <td><span class="transaction-type ${transaction.type}">${typeDisplay}</span></td>
                    <td class="${transaction.type === 'deposit' || transaction.type === 'buy' ? 'positive-amount' : 'negative-amount'}">${amountDisplay}</td>
                    <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
                    <td>${new Date(transaction.date).toLocaleDateString()} ${new Date(transaction.date).toLocaleTimeString()}</td>
                </tr>
            `;
        }).join('');
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
                        ticks: { color: '#A0AAB5', callback: function(value) { return '$' + value.toLocaleString(); } },
                        title: {
                            display: true,
                            text: 'Price (USD)',
                            color: '#A0AAB5',
                            font: { size: 11 }
                        }
                    },
                    x: {
                        grid: { color: '#2A3545', drawBorder: false },
                        ticks: { color: '#A0AAB5', maxRotation: 45, minRotation: 45 }
                    }
                },
                interaction: {
                    intersect: false,
                    mode: 'index'
                }
            }
        });
    }

    setupTimeframeSelector() {
        const selector = document.getElementById('timeframe');
        if (selector) {
            selector.addEventListener('change', (e) => {
                this.updateChartTimeframe(e.target.value);
            });
        }
    }

    updateChartTimeframe(timeframe) {
        let dataPoints = 24;
        let labelInterval = 1;
        
        switch(timeframe) {
            case '1H':
                dataPoints = 60;
                labelInterval = 10;
                break;
            case '24H':
                dataPoints = 24;
                labelInterval = 1;
                break;
            case '7D':
                dataPoints = 168;
                labelInterval = 24;
                break;
            case '30D':
                dataPoints = 720;
                labelInterval = 24;
                break;
        }
        
        const newData = Array.from({ length: dataPoints }, () => Math.random() * 1000 + 40000);
        const labels = Array.from({ length: dataPoints }, (_, i) => {
            if (timeframe === '1H') return `${i}m`;
            if (timeframe === '24H') return `${i}:00`;
            if (timeframe === '7D') return `Day ${Math.floor(i/24)+1}`;
            return `Day ${Math.floor(i/24)+1}`;
        });
        
        // Filter labels for display
        const filteredLabels = labels.filter((_, i) => i % labelInterval === 0);
        
        this.chart.data.labels = labels;
        this.chart.data.datasets[0].data = newData;
        this.chart.update();
    }

    startRealTimeUpdates() {
        // Simulate real-time price updates every 5 seconds
        this.priceUpdateInterval = setInterval(() => {
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
        if (this.chart && this.chart.data.datasets[0].data.length > 0) {
            const newPrice = this.cryptoData[0].price;
            const newData = this.chart.data.datasets[0].data.slice(1);
            newData.push(newPrice);
            this.chart.data.datasets[0].data = newData;
            this.chart.update('none');
        }
    }

    refreshData() {
        // Refresh user data from storage
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            this.user = JSON.parse(storedUser);
            this.updateBalanceDisplay();
            this.updateModeUI();
            this.updateStats();
            this.loadTransactions();
        }
    }

    // Method to add a new transaction
    addTransaction(type, amount, details = {}) {
        const transaction = {
            id: Date.now(),
            type: type,
            amount: amount,
            accountMode: this.user.accountMode,
            status: 'completed',
            date: new Date().toISOString(),
            ...details
        };
        
        if (!this.user.transactions) this.user.transactions = [];
        this.user.transactions.unshift(transaction);
        
        // Update balance based on transaction type
        if (type === 'deposit') {
            if (this.user.accountMode === 'demo') {
                this.user.demoBalance += amount;
            } else {
                this.user.realBalance += amount;
            }
        } else if (type === 'withdraw') {
            if (this.user.accountMode === 'demo') {
                this.user.demoBalance -= amount;
            } else {
                this.user.realBalance -= amount;
            }
        }
        
        // Save updated user
        this.saveUser();
        this.refreshData();
        
        return transaction;
    }

    saveUser() {
        // Update in users array
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.user.id);
        if (userIndex !== -1) {
            users[userIndex] = this.user;
            localStorage.setItem('pocket_users', JSON.stringify(users));
        }
        
        // Update current session
        if (localStorage.getItem('pocket_user')) {
            localStorage.setItem('pocket_user', JSON.stringify(this.user));
        }
        if (sessionStorage.getItem('pocket_user')) {
            sessionStorage.setItem('pocket_user', JSON.stringify(this.user));
        }
    }

    // Clean up on page unload
    destroy() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }
    }
}

// Global functions for account management
function switchAccountMode(mode) {
    if (window.auth && window.auth.currentUser) {
        const success = window.auth.switchAccountMode(window.auth.currentUser.id, mode);
        if (success && window.dashboard) {
            setTimeout(() => {
                window.dashboard.refreshData();
                showNotification(`Switched to ${mode === 'demo' ? 'Demo Account' : 'Real Account'}`, 'success');
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
        showNotification('Minimum deposit is $100', 'error');
        return;
    }
    
    if (window.auth && window.auth.currentUser) {
        const success = window.auth.upgradeToRealAccount(window.auth.currentUser.id, amount);
        if (success) {
            closeModal();
            if (window.dashboard) {
                setTimeout(() => {
                    window.dashboard.refreshData();
                    showNotification('Real account created successfully! You can now switch to Real mode.', 'success');
                }, 500);
            }
        }
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.className = `notification-${type}`;
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
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
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

// Clean up on page unload
window.addEventListener('beforeunload', () => {
    if (window.dashboard) {
        window.dashboard.destroy();
    }
});

// Make functions globally available
window.switchAccountMode = switchAccountMode;
window.showUpgradeModal = showUpgradeModal;
window.closeModal = closeModal;
window.processUpgrade = processUpgrade;
window.showNotification = showNotification;
