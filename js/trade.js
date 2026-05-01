// Trades Page Controller - PocketTrading
// File: js/trades.js

class TradesManager {
    constructor() {
        this.currentUser = null;
        this.allTrades = [];
        this.filteredTrades = [];
        this.currentTab = 'open';
        this.symbolFilter = 'all';
        this.typeFilter = 'all';
        this.searchTerm = '';
        this.currentSort = 'date';
        this.sortDirection = 'desc';
        this.performanceChart = null;
        this.updateInterval = null;
        this.currentPrices = {};
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

        await this.loadUserData();
        this.setupUserInterface();
        await this.loadTrades();
        this.setupEventListeners();
        this.startPriceUpdates();
        
        // Load market prices for P&L calculations
        await this.loadCurrentPrices();
    }

    async loadUserData() {
        try {
            const userData = await supabaseDB.getUserByEmail(this.currentUser.email);
            if (userData) {
                this.currentUser = { ...this.currentUser, ...userData };
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    setupUserInterface() {
        const userElements = document.querySelectorAll('.user-only');
        const userNameElements = document.querySelectorAll('.user-name');
        const userEmailElements = document.querySelectorAll('.user-email');
        
        userElements.forEach(el => el.style.display = 'block');
        
        if (this.currentUser) {
            userNameElements.forEach(el => el.textContent = this.currentUser.name || 'Trader');
            userEmailElements.forEach(el => el.textContent = this.currentUser.email || '');
        }
        
        const adminElements = document.querySelectorAll('.admin-only');
        if (this.currentUser?.isAdmin) {
            adminElements.forEach(el => el.style.display = 'block');
        }
    }

    async loadTrades() {
        try {
            // Load trades from Supabase
            const trades = await supabaseDB.getUserTrades(this.currentUser.id);
            
            if (trades && trades.length > 0) {
                this.allTrades = trades.map(t => ({
                    ...t,
                    pnl: t.pnl || 0,
                    close_price: t.close_price || null,
                    close_date: t.close_date || null
                }));
            } else {
                // Demo trades for testing
                this.allTrades = this.getDemoTrades();
                // Save demo trades to Supabase for persistence
                for (const trade of this.allTrades) {
                    await supabaseDB.insert('trades', trade);
                }
            }
            
            this.applyFilters();
            this.updateStats();
            this.renderTrades();
            this.updatePerformanceChart();
        } catch (error) {
            console.error('Error loading trades:', error);
            this.allTrades = this.getDemoTrades();
            this.applyFilters();
            this.updateStats();
            this.renderTrades();
        }
    }

    getDemoTrades() {
        const now = new Date();
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        
        return [
            {
                id: 1001,
                user_id: this.currentUser?.id,
                symbol: 'BTC/USD',
                type: 'buy',
                amount: 1000,
                leverage: 5,
                entry_price: 68432.50,
                current_price: 69123.75,
                status: 'open',
                pnl: 101.20,
                pnl_percentage: 10.12,
                created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 1002,
                user_id: this.currentUser?.id,
                symbol: 'ETH/USD',
                type: 'sell',
                amount: 500,
                leverage: 3,
                entry_price: 3821.75,
                current_price: 3756.30,
                status: 'open',
                pnl: 85.70,
                pnl_percentage: 17.14,
                created_at: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 1003,
                user_id: this.currentUser?.id,
                symbol: 'SOL/USD',
                type: 'buy',
                amount: 800,
                leverage: 10,
                entry_price: 168.42,
                current_price: 172.15,
                status: 'open',
                pnl: 176.50,
                pnl_percentage: 22.06,
                created_at: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 1004,
                user_id: this.currentUser?.id,
                symbol: 'BTC/USD',
                type: 'buy',
                amount: 2000,
                leverage: 2,
                entry_price: 67500.00,
                close_price: 69000.00,
                pnl: 450.00,
                pnl_percentage: 22.5,
                status: 'closed',
                created_at: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000).toISOString(),
                close_date: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 1005,
                user_id: this.currentUser?.id,
                symbol: 'ETH/USD',
                type: 'sell',
                amount: 300,
                leverage: 5,
                entry_price: 3900.00,
                close_price: 3850.00,
                pnl: 75.00,
                pnl_percentage: 25.0,
                status: 'closed',
                created_at: new Date(now.getTime() - 15 * 24 * 60 * 60 * 1000).toISOString(),
                close_date: new Date(now.getTime() - 12 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 1006,
                user_id: this.currentUser?.id,
                symbol: 'DOGE/USD',
                type: 'buy',
                amount: 200,
                leverage: 20,
                entry_price: 0.162,
                close_price: 0.175,
                pnl: 320.99,
                pnl_percentage: 160.49,
                status: 'closed',
                created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(),
                close_date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString()
            },
            {
                id: 1007,
                user_id: this.currentUser?.id,
                symbol: 'XRP/USD',
                type: 'buy',
                amount: 400,
                leverage: 3,
                entry_price: 0.624,
                close_price: 0.598,
                pnl: -50.00,
                pnl_percentage: -12.5,
                status: 'closed',
                created_at: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                close_date: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000).toISOString()
            }
        ];
    }

    async loadCurrentPrices() {
        try {
            const markets = await supabaseDB.getAll('market_prices');
            if (markets && markets.length > 0) {
                markets.forEach(m => {
                    this.currentPrices[m.symbol] = m.price;
                });
            } else {
                // Default prices
                this.currentPrices = {
                    'BTC/USD': 69123.75,
                    'ETH/USD': 3756.30,
                    'SOL/USD': 172.15,
                    'XRP/USD': 0.618,
                    'DOGE/USD': 0.168,
                    'ADA/USD': 0.479,
                    'AVAX/USD': 43.20,
                    'MATIC/USD': 0.92
                };
            }
            
            // Update open trades with current prices
            this.updateOpenTradePrices();
        } catch (error) {
            console.error('Error loading current prices:', error);
        }
    }

    updateOpenTradePrices() {
        let updated = false;
        
        this.allTrades = this.allTrades.map(trade => {
            if (trade.status === 'open' && this.currentPrices[trade.symbol]) {
                const currentPrice = this.currentPrices[trade.symbol];
                const newPnL = this.calculatePnL(trade, currentPrice);
                
                if (trade.current_price !== currentPrice || trade.pnl !== newPnL) {
                    updated = true;
                    return {
                        ...trade,
                        current_price: currentPrice,
                        pnl: newPnL,
                        pnl_percentage: (newPnL / trade.amount * 100)
                    };
                }
            }
            return trade;
        });
        
        if (updated) {
            this.applyFilters();
            this.updateStats();
            this.renderTrades();
        }
    }

    calculatePnL(trade, currentPrice) {
        const positionSize = trade.amount * trade.leverage;
        const priceDiff = trade.type === 'buy' 
            ? currentPrice - trade.entry_price 
            : trade.entry_price - currentPrice;
        const pnl = (positionSize / trade.entry_price) * priceDiff;
        return parseFloat(pnl.toFixed(2));
    }

    applyFilters() {
        let filtered = [...this.allTrades];
        
        // Apply tab filter
        if (this.currentTab === 'open') {
            filtered = filtered.filter(t => t.status === 'open');
        } else if (this.currentTab === 'closed') {
            filtered = filtered.filter(t => t.status === 'closed');
        }
        
        // Apply symbol filter
        if (this.symbolFilter !== 'all') {
            filtered = filtered.filter(t => t.symbol === this.symbolFilter);
        }
        
        // Apply type filter
        if (this.typeFilter !== 'all') {
            filtered = filtered.filter(t => t.type === this.typeFilter);
        }
        
        // Apply search
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(t => 
                t.symbol.toLowerCase().includes(term)
            );
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            let aVal, bVal;
            switch(this.currentSort) {
                case 'symbol':
                    aVal = a.symbol;
                    bVal = b.symbol;
                    break;
                case 'type':
                    aVal = a.type;
                    bVal = b.type;
                    break;
                case 'entryPrice':
                    aVal = a.entry_price;
                    bVal = b.entry_price;
                    break;
                case 'currentPrice':
                    aVal = a.current_price || a.close_price || 0;
                    bVal = b.current_price || b.close_price || 0;
                    break;
                case 'amount':
                    aVal = a.amount;
                    bVal = b.amount;
                    break;
                case 'leverage':
                    aVal = a.leverage;
                    bVal = b.leverage;
                    break;
                case 'pnl':
                    aVal = a.pnl || 0;
                    bVal = b.pnl || 0;
                    break;
                case 'status':
                    aVal = a.status;
                    bVal = b.status;
                    break;
                default:
                    aVal = new Date(a.created_at);
                    bVal = new Date(b.created_at);
            }
            
            if (this.sortDirection === 'asc') {
                return aVal > bVal ? 1 : -1;
            } else {
                return aVal < bVal ? 1 : -1;
            }
        });
        
        this.filteredTrades = filtered;
    }

    updateStats() {
        const totalInvested = this.allTrades.reduce((sum, t) => sum + t.amount, 0);
        const totalPnL = this.allTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        const closedTrades = this.allTrades.filter(t => t.status === 'closed');
        const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length * 100).toFixed(1) : 0;
        const activeTrades = this.allTrades.filter(t => t.status === 'open').length;
        
        const totalInvestedEl = document.getElementById('totalInvested');
        const totalPnLEl = document.getElementById('totalPnL');
        const pnlPercentageEl = document.getElementById('pnlPercentage');
        const winRateEl = document.getElementById('winRate');
        const totalTradesEl = document.getElementById('totalTrades');
        const activeTradesEl = document.getElementById('activeTrades');
        
        if (totalInvestedEl) totalInvestedEl.textContent = `$${totalInvested.toLocaleString()}`;
        if (totalPnLEl) {
            totalPnLEl.innerHTML = `<span style="color: ${totalPnL >= 0 ? '#00D897' : '#FF4757'}">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span>`;
        }
        if (pnlPercentageEl) {
            const pnlPercent = totalInvested > 0 ? (totalPnL / totalInvested * 100).toFixed(1) : 0;
            pnlPercentageEl.innerHTML = `<span style="color: ${pnlPercent >= 0 ? '#00D897' : '#FF4757'}">${pnlPercent >= 0 ? '+' : ''}${pnlPercent}%</span>`;
        }
        if (winRateEl) winRateEl.textContent = `${winRate}%`;
        if (totalTradesEl) totalTradesEl.textContent = this.allTrades.length;
        if (activeTradesEl) activeTradesEl.textContent = `${activeTrades} Active`;
    }

    renderTrades() {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody) return;
        
        if (this.filteredTrades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="9">
                        <div class="empty-state">
                            <div class="empty-state-icon">📊</div>
                            <p>No trades found</p>
                            <small>Start trading from the Markets page</small>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = this.filteredTrades.map(trade => {
            const isOpen = trade.status === 'open';
            const currentPrice = isOpen ? (trade.current_price || 0) : (trade.close_price || 0);
            const pnl = trade.pnl || 0;
            const pnlClass = pnl >= 0 ? 'positive' : 'negative';
            const pnlSymbol = pnl >= 0 ? '+' : '';
            
            return `
                <tr>
                    <td><strong>${trade.symbol}</strong></td>
                    <td>
                        <span class="trade-type-badge ${trade.type === 'buy' ? 'trade-type-buy' : 'trade-type-sell'}">
                            ${trade.type === 'buy' ? 'BUY/LONG' : 'SELL/SHORT'}
                        </span>
                    </td>
                    <td>$${trade.entry_price.toLocaleString(undefined, { minimumFractionDigits: trade.entry_price < 1 ? 4 : 2 })}</td>
                    <td>$${currentPrice.toLocaleString(undefined, { minimumFractionDigits: currentPrice < 1 ? 4 : 2 })}</td>
                    <td>$${trade.amount.toLocaleString()}</td>
                    <td>${trade.leverage}x</td>
                    <td class="${pnlClass}">
                        ${pnlSymbol}$${Math.abs(pnl).toLocaleString()}
                        <br><small>(${pnlSymbol}${(trade.pnl_percentage || 0).toFixed(2)}%)</small>
                    </td>
                    <td>
                        <span class="status-badge status-${trade.status}">
                            ${trade.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                    </td>
                    <td>
                        ${isOpen ? `
                            <button class="close-trade-btn" onclick="tradesManager.showCloseTradeModal(${trade.id})">Close</button>
                            <button class="view-details-btn" onclick="tradesManager.showTradeDetails(${trade.id})" style="margin-left: 8px;">Details</button>
                        ` : `
                            <button class="view-details-btn" onclick="tradesManager.showTradeDetails(${trade.id})">Details</button>
                        `}
                    </td>
                </tr>
            `;
        }).join('');
        
        // Update symbol filter dropdown
        this.updateSymbolFilter();
    }

    updateSymbolFilter() {
        const symbols = [...new Set(this.allTrades.map(t => t.symbol))];
        const filterSelect = document.getElementById('symbolFilter');
        
        if (filterSelect && filterSelect.children.length <= 1) {
            symbols.forEach(symbol => {
                const option = document.createElement('option');
                option.value = symbol;
                option.textContent = symbol;
                filterSelect.appendChild(option);
            });
        }
    }

    async closeTrade(tradeId) {
        const trade = this.allTrades.find(t => t.id === tradeId);
        if (!trade || trade.status !== 'open') return;
        
        const currentPrice = this.currentPrices[trade.symbol] || trade.current_price;
        const pnl = this.calculatePnL(trade, currentPrice);
        
        // Update trade record
        trade.status = 'closed';
        trade.close_price = currentPrice;
        trade.close_date = new Date().toISOString();
        trade.pnl = pnl;
        trade.pnl_percentage = (pnl / trade.amount * 100);
        
        // Update user balance with profit/loss
        await auth.updateBalance(this.currentUser.id, pnl, {
            type: 'trade_close',
            trade_id: tradeId,
            symbol: trade.symbol,
            pnl: pnl
        });
        
        // Update in Supabase
        await supabaseDB.update('trades', tradeId, {
            status: 'closed',
            close_price: currentPrice,
            close_date: new Date().toISOString(),
            pnl: pnl,
            pnl_percentage: (pnl / trade.amount * 100)
        });
        
        this.applyFilters();
        this.updateStats();
        this.renderTrades();
        this.updatePerformanceChart();
        
        auth.showSuccess(`Position closed! ${pnl >= 0 ? 'Profit' : 'Loss'}: $${Math.abs(pnl).toFixed(2)}`);
        
        this.closeCloseTradeModal();
    }

    showTradeDetails(tradeId) {
        const trade = this.allTrades.find(t => t.id === tradeId);
        if (!trade) return;
        
        const modal = document.getElementById('tradeDetailsModal');
        const body = document.getElementById('tradeDetailsBody');
        
        const isOpen = trade.status === 'open';
        const currentPrice = isOpen ? (trade.current_price || 0) : (trade.close_price || 0);
        const positionSize = trade.amount * trade.leverage;
        
        body.innerHTML = `
            <div class="trade-detail-row">
                <span class="trade-detail-label">Market</span>
                <span class="trade-detail-value">${trade.symbol}</span>
            </div>
            <div class="trade-detail-row">
                <span class="trade-detail-label">Type</span>
                <span class="trade-detail-value ${trade.type === 'buy' ? 'positive' : 'negative'}">${trade.type === 'buy' ? 'BUY/LONG' : 'SELL/SHORT'}</span>
            </div>
            <div class="trade-detail-row">
                <span class="trade-detail-label">Entry Price</span>
                <span class="trade-detail-value">$${trade.entry_price.toLocaleString()}</span>
            </div>
            <div class="trade-detail-row">
                <span class="trade-detail-label">${isOpen ? 'Current Price' : 'Exit Price'}</span>
                <span class="trade-detail-value">$${currentPrice.toLocaleString()}</span>
            </div>
            <div class="trade-detail-row">
                <span class="trade-detail-label">Amount</span>
                <span class="trade-detail-value">$${trade.amount.toLocaleString()}</span>
            </div>
            <div class="trade-detail-row">
                <span class="trade-detail-label">Leverage</span>
                <span class="trade-detail-value">${trade.leverage}x</span>
            </div>
            <div class="trade-detail-row">
                <span class="trade-detail-label">Position Size</span>
                <span class="trade-detail-value">$${positionSize.toLocaleString()}</span>
            </div>
            <div class="trade-detail-row">
                <span class="trade-detail-label">Open Date</span>
                <span class="trade-detail-value">${new Date(trade.created_at).toLocaleString()}</span>
            </div>
            ${trade.close_date ? `
                <div class="trade-detail-row">
                    <span class="trade-detail-label">Close Date</span>
                    <span class="trade-detail-value">${new Date(trade.close_date).toLocaleString()}</span>
                </div>
            ` : ''}
            <div class="trade-detail-row">
                <span class="trade-detail-label">P&L</span>
                <span class="trade-detail-value ${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}">
                    ${(trade.pnl || 0) >= 0 ? '+' : ''}$${Math.abs(trade.pnl || 0).toLocaleString()}
                    (${(trade.pnl_percentage || 0) >= 0 ? '+' : ''}${(trade.pnl_percentage || 0).toFixed(2)}%)
                </span>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
    }

    showCloseTradeModal(tradeId) {
        const trade = this.allTrades.find(t => t.id === tradeId);
        if (!trade) return;
        
        const modal = document.getElementById('closeTradeModal');
        const detailsDiv = document.getElementById('closeTradeDetails');
        const messageEl = document.getElementById('closeTradeMessage');
        const currentPrice = this.currentPrices[trade.symbol] || trade.current_price;
        const estimatedPnl = this.calculatePnL(trade, currentPrice);
        
        messageEl.textContent = `Are you sure you want to close your ${trade.symbol} position?`;
        
        detailsDiv.innerHTML = `
            <div style="display: flex; justify-content: space-between;">
                <span>Entry Price:</span>
                <span>$${trade.entry_price.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Current Price:</span>
                <span>$${currentPrice.toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Position Size:</span>
                <span>$${(trade.amount * trade.leverage).toLocaleString()}</span>
            </div>
            <div style="display: flex; justify-content: space-between;">
                <span>Estimated P&L:</span>
                <span style="color: ${estimatedPnl >= 0 ? '#00D897' : '#FF4757'}">
                    ${estimatedPnl >= 0 ? '+' : ''}$${Math.abs(estimatedPnl).toLocaleString()}
                </span>
            </div>
        `;
        
        modal.style.display = 'flex';
        
        const confirmBtn = document.getElementById('confirmCloseBtn');
        confirmBtn.onclick = () => this.closeTrade(tradeId);
        
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.onclick = () => this.closeCloseTradeModal();
        window.onclick = (e) => { if (e.target === modal) this.closeCloseTradeModal(); };
    }

    closeCloseTradeModal() {
        const modal = document.getElementById('closeTradeModal');
        if (modal) modal.style.display = 'none';
    }

    async updatePerformanceChart() {
        const canvas = document.getElementById('performanceChart');
        if (!canvas || typeof Chart === 'undefined') return;
        
        const period = parseInt(document.getElementById('chartPeriod')?.value || '30');
        const closedTrades = this.allTrades.filter(t => t.status === 'closed');
        
        // Generate daily P&L data
        const dailyData = this.generateDailyPnLData(closedTrades, period);
        
        if (this.performanceChart) {
            this.performanceChart.destroy();
        }
        
        const ctx = canvas.getContext('2d');
        this.performanceChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: dailyData.labels,
                datasets: [
                    {
                        label: 'Cumulative P&L',
                        data: dailyData.cumulativePnL,
                        borderColor: '#00D897',
                        backgroundColor: 'rgba(0, 216, 151, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    },
                    {
                        label: 'Daily P&L',
                        data: dailyData.dailyPnL,
                        borderColor: '#FFA502',
                        backgroundColor: 'rgba(255, 165, 2, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                        yAxisID: 'y1'
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        labels: { color: '#FFFFFF' }
                    },
                    tooltip: {
                        mode: 'index',
                        intersect: false,
                        callbacks: {
                            label: function(context) {
                                let label = context.dataset.label || '';
                                let value = context.raw;
                                return `${label}: ${value >= 0 ? '+' : ''}$${value.toLocaleString()}`;
                            }
                        }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#FFFFFF' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.1)' },
                        ticks: { color: '#FFFFFF' },
                        title: {
                            display: true,
                            text: 'Cumulative P&L ($)',
                            color: '#00D897'
                        }
                    },
                    y1: {
                        position: 'right',
                        grid: { drawOnChartArea: false },
                        ticks: { color: '#FFA502' },
                        title: {
                            display: true,
                            text: 'Daily P&L ($)',
                            color: '#FFA502'
                        }
                    }
                }
            }
        });
    }

    generateDailyPnLData(trades, days) {
        const labels = [];
        const dailyPnL = [];
        const cumulativePnL = [];
        
        let runningTotal = 0;
        
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString();
            labels.push(dateStr);
            
            // Sum P&L for this day
            const dayPnL = trades
                .filter(t => {
                    const closeDate = new Date(t.close_date);
                    return closeDate.toLocaleDateString() === dateStr;
                })
                .reduce((sum, t) => sum + (t.pnl || 0), 0);
            
            dailyPnL.push(dayPnL);
            runningTotal += dayPnL;
            cumulativePnL.push(runningTotal);
        }
        
        return { labels, dailyPnL, cumulativePnL };
    }

    setupEventListeners() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                this.applyFilters();
                this.renderTrades();
            });
        });
        
        // Symbol filter
        const symbolFilter = document.getElementById('symbolFilter');
        if (symbolFilter) {
            symbolFilter.addEventListener('change', (e) => {
                this.symbolFilter = e.target.value;
                this.applyFilters();
                this.renderTrades();
            });
        }
        
        // Type filter
        const typeFilter = document.getElementById('typeFilter');
        if (typeFilter) {
            typeFilter.addEventListener('change', (e) => {
                this.typeFilter = e.target.value;
                this.applyFilters();
                this.renderTrades();
            });
        }
        
        // Search
        const searchInput = document.getElementById('searchTrades');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.applyFilters();
                this.renderTrades();
            });
        }
        
        // Sortable columns
        const headers = document.querySelectorAll('.trades-table th');
        headers.forEach(header => {
            header.addEventListener('click', () => {
                const sortKey = header.dataset.sort;
                if (sortKey) {
                    if (this.currentSort === sortKey) {
                        this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
                    } else {
                        this.currentSort = sortKey;
                        this.sortDirection = 'asc';
                    }
                    this.applyFilters();
                    this.renderTrades();
                }
            });
        });
        
        // Chart period
        const chartPeriod = document.getElementById('chartPeriod');
        if (chartPeriod) {
            chartPeriod.addEventListener('change', () => this.updatePerformanceChart());
        }
        
        // Mobile menu
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
        }
    }

    startPriceUpdates() {
        this.updateInterval = setInterval(async () => {
            await this.loadCurrentPrices();
        }, 30000);
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize when DOM is ready
let tradesManager = null;

document.addEventListener('DOMContentLoaded', () => {
    tradesManager = new TradesManager();
});

// Make functions globally accessible
window.closeTradeModal = (tradeId) => tradesManager?.showCloseTradeModal(tradeId);
window.showTradeDetails = (tradeId) => tradesManager?.showTradeDetails(tradeId);
window.closeCloseTradeModal = () => tradesManager?.closeCloseTradeModal();
window.logout = () => { if (auth) auth.logout(); };
