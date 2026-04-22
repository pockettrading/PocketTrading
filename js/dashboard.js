// js/dashboard.js
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
        this.updateUserInfo();
        this.updateStats();
        this.loadCryptoList();
        this.loadTransactions();
        this.initChart();
        this.startRealTimeUpdates();
    }

    updateUserInfo() {
        if (this.user && document.getElementById('userName')) {
            document.getElementById('userName').textContent = this.user.name;
        }
    }

    updateStats() {
        // Calculate stats from user data
        const totalBalance = this.user?.balance || 0;
        const dailyVolume = this.calculateDailyVolume();
        const totalProfit = this.calculateTotalProfit();
        const activeTrades = this.getActiveTrades();
        
        document.getElementById('totalBalance').textContent = totalBalance.toFixed(2);
        document.getElementById('dailyVolume').textContent = dailyVolume.toFixed(2);
        document.getElementById('totalProfit').textContent = totalProfit.toFixed(2);
        document.getElementById('activeTrades').textContent = activeTrades;
    }

    calculateDailyVolume() {
        const today = new Date().toDateString();
        const todayTransactions = this.transactions.filter(t => 
            new Date(t.date).toDateString() === today && t.type === 'trade'
        );
        return todayTransactions.reduce((sum, t) => sum + t.amount, 0);
    }

    calculateTotalProfit() {
        const trades = this.transactions.filter(t => t.type === 'trade');
        const profits = trades.filter(t => t.result === 'profit');
        const losses = trades.filter(t => t.result === 'loss');
        const totalProfit = profits.reduce((sum, p) => sum + p.profit, 0);
        const totalLoss = losses.reduce((sum, l) => sum + l.loss, 0);
        return totalProfit - totalLoss;
    }

    getActiveTrades() {
        return this.transactions.filter(t => t.status === 'open').length;
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
                    <div class="crypto-icon">${crypto.icon}</div>
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
        
        const recentTransactions = this.transactions.slice(-5).reverse();
        
        if (recentTransactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align: center;">No transactions yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = recentTransactions.map(transaction => `
            <tr>
                <td>${transaction.type}</td>
                <td>$${transaction.amount.toFixed(2)}</td>
                <td><span class="status-badge status-${transaction.status}">${transaction.status}</span></td>
                <td>${new Date(transaction.date).toLocaleDateString()}</td>
            </tr>
        `).join('');
    }

    initChart() {
        const ctx = document.getElementById('priceChart');
        if (!ctx) return;
        
        const canvas = ctx.getContext('2d');
        const labels = Array.from({ length: 24 }, (_, i) => `${i}:00`);
        const data = Array.from({ length: 24 }, () => Math.random() * 1000 + 40000);
        
        this.chart = new Chart(canvas, {
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
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: {
                        labels: { color: '#A0AAB5' }
                    }
                },
                scales: {
                    y: {
                        grid: { color: '#2A3545' },
                        ticks: { color: '#A0AAB5' }
                    },
                    x: {
                        grid: { color: '#2A3545' },
                        ticks: { color: '#A0AAB5' }
                    }
                }
            }
        });
    }

    startRealTimeUpdates() {
        // Simulate real-time price updates
        setInterval(() => {
            this.updateCryptoPrices();
        }, 5000);
    }

    updateCryptoPrices() {
        this.cryptoData = this.cryptoData.map(crypto => ({
            ...crypto,
            price: crypto.price * (1 + (Math.random() - 0.5) * 0.002),
            change: crypto.change + (Math.random() - 0.5) * 0.5
        }));
        
        this.loadCryptoList();
        
        // Update chart with new data point
        if (this.chart) {
            const newData = this.chart.data.datasets[0].data.slice(1);
            newData.push(this.cryptoData[0].price);
            this.chart.data.datasets[0].data = newData;
            this.chart.update();
        }
    }
}

// Initialize dashboard
if (document.getElementById('priceChart')) {
    const dashboard = new DashboardManager();
}
