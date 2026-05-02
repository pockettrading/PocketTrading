// Dashboard Page Controller - PocketTrading
// File: js/dashboard.js

class DashboardManager {
    constructor() {
        this.currentUser = null;
        this.userTrades = [];
        this.pnlChart = null;
        this.distributionChart = null;
        this.init();
    }

    async init() {
        if (typeof auth === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.currentUser = auth.getUser();
        
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        await this.loadData();
        this.setupUI();
        this.initCharts();
        this.setupEventListeners();
    }

    async loadData() {
        try {
            const trades = localStorage.getItem(`trades_${this.currentUser.id}`);
            this.userTrades = trades ? JSON.parse(trades) : [];
        } catch (error) {
            console.error('Error loading data:', error);
            this.userTrades = [];
        }
    }

    setupUI() {
        // Update welcome message
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg) {
            const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
            welcomeMsg.textContent = `Welcome back, ${userName}! 👋`;
        }

        // Update stats
        const balance = this.currentUser.balance || 0;
        const totalTrades = this.userTrades.length;
        const closedTrades = this.userTrades.filter(t => t.status === 'closed');
        const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length * 100).toFixed(1) : 0;
        const totalPnL = this.userTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);

        document.getElementById('accountBalance').innerHTML = `$${balance.toLocaleString()}`;
        document.getElementById('totalTrades').textContent = totalTrades;
        document.getElementById('winRate').textContent = `${winRate}%`;
        document.getElementById('totalPnL').innerHTML = `<span class="${totalPnL >= 0 ? 'positive' : 'negative'}">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span>`;

        // Render activities
        this.renderActivities();
    }

    renderActivities() {
        const activityList = document.getElementById('activityList');
        if (!activityList) return;

        const activities = this.userTrades.slice(-10).reverse().map(trade => ({
            type: 'trade',
            title: `${trade.type?.toUpperCase() || 'Trade'} ${trade.symbol || 'Market'}`,
            amount: trade.amount || 0,
            date: trade.created_at,
            icon: trade.type === 'buy' ? '📈' : '📉'
        }));

        if (activities.length === 0) {
            activityList.innerHTML = '<div style="text-align: center; padding: 20px; color: #8B93A5;">No recent activity. Start trading!</div>';
            return;
        }

        activityList.innerHTML = activities.map(activity => `
            <div class="activity-item">
                <div class="activity-icon">${activity.icon}</div>
                <div class="activity-details">
                    <div class="activity-title">${activity.title}</div>
                    <div class="activity-date">${new Date(activity.date).toLocaleDateString()}</div>
                </div>
                <div class="activity-amount positive">$${activity.amount.toLocaleString()}</div>
            </div>
        `).join('');
    }

    initCharts() {
        const pnlCtx = document.getElementById('pnlChart')?.getContext('2d');
        const distCtx = document.getElementById('distributionChart')?.getContext('2d');
        
        if (pnlCtx) {
            const last7Days = [];
            const dailyPnL = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                last7Days.push(date.toLocaleDateString());
                
                const dayPnL = this.userTrades.filter(t => {
                    const tradeDate = new Date(t.created_at);
                    return tradeDate.toLocaleDateString() === date.toLocaleDateString() && t.status === 'closed';
                }).reduce((sum, t) => sum + (t.pnl || 0), 0);
                dailyPnL.push(dayPnL);
            }
            
            this.pnlChart = new Chart(pnlCtx, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'Daily P&L',
                        data: dailyPnL,
                        borderColor: '#00D897',
                        backgroundColor: 'rgba(0, 216, 151, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#FFFFFF' } } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } },
                        y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } }
                    }
                }
            });
        }
        
        if (distCtx) {
            const closedTrades = this.userTrades.filter(t => t.status === 'closed');
            const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
            const losses = closedTrades.filter(t => (t.pnl || 0) <= 0).length;
            
            this.distributionChart = new Chart(distCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Winning Trades', 'Losing Trades'],
                    datasets: [{
                        data: [wins, losses],
                        backgroundColor: ['#00D897', '#FF4757'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#FFFFFF' } } }
                }
            });
        }
    }

    setupEventListeners() {
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }
}

// Initialize dashboard
let dashboardManager = null;
document.addEventListener('DOMContentLoaded', () => {
    dashboardManager = new DashboardManager();
});

window.handleLogout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        localStorage.removeItem('pocket_user');
        sessionStorage.removeItem('pocket_user');
        window.location.href = 'home.html';
    }
};
