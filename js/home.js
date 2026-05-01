// Home Page Controller - PocketTrading
// File: js/home.js

class HomeManager {
    constructor() {
        this.currentUser = null;
        this.marketsData = [];
        this.chart = null;
        this.updateInterval = null;
        this.init();
    }

    async init() {
        // Wait for auth to be ready
        if (typeof auth === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.currentUser = auth.getUser();
        
        // Check if user is logged in
        if (this.currentUser) {
            await this.loadUserData();
            this.setupUserInterface();
        } else {
            this.setupGuestInterface();
        }

        await this.loadMarketsData();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.initializeCharts();
        this.setupMobileMenu();
    }

    async loadUserData() {
        try {
            // Get user's latest data from cloud
            const userData = await supabaseDB.getUserByEmail(this.currentUser.email);
            if (userData) {
                this.currentUser = { ...this.currentUser, ...userData };
                this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                
                // Get user's trades
                const trades = await supabaseDB.getUserTrades(this.currentUser.id);
                const stats = this.calculateStats(trades);
                
                this.updateDashboardStats(stats);
                this.updateBalanceDisplay();
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    calculateStats(trades) {
        const totalTrades = trades.length;
        const winningTrades = trades.filter(t => t.pnl > 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
        const totalPnL = trades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        
        return {
            totalTrades,
            winRate,
            totalPnL,
            winningTrades
        };
    }

    updateDashboardStats(stats) {
        const elements = {
            totalTrades: document.getElementById('totalTrades'),
            winRate: document.getElementById('winRate'),
            totalPnL: document.getElementById('totalPnL'),
            winningTrades: document.getElementById('winningTrades')
        };

        if (elements.totalTrades) elements.totalTrades.textContent = stats.totalTrades;
        if (elements.winRate) elements.winRate.textContent = `${stats.winRate}%`;
        if (elements.totalPnL) {
            const pnlColor = stats.totalPnL >= 0 ? '#00D897' : '#FF4757';
            elements.totalPnL.innerHTML = `<span style="color: ${pnlColor}">${stats.totalPnL >= 0 ? '+' : ''}$${stats.totalPnL.toFixed(2)}</span>`;
        }
        if (elements.winningTrades) elements.winningTrades.textContent = stats.winningTrades;
    }

    updateBalanceDisplay() {
        const balanceElements = document.querySelectorAll('.user-balance, .balance-amount');
        balanceElements.forEach(el => {
            el.textContent = `$${(this.currentUser?.balance || 0).toFixed(2)}`;
        });
    }

    setupUserInterface() {
        // Show user-specific elements
        const userNameElements = document.querySelectorAll('.user-name, .profile-name');
        userNameElements.forEach(el => {
            el.textContent = this.currentUser?.name || 'Trader';
        });

        const userEmailElements = document.querySelectorAll('.user-email');
        userEmailElements.forEach(el => {
            el.textContent = this.currentUser?.email || '';
        });

        // Show/hide admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        if (this.currentUser?.isAdmin) {
            adminElements.forEach(el => el.style.display = 'block');
        } else {
            adminElements.forEach(el => el.style.display = 'none');
        }

        // Hide deposit CTA if user has balance or has deposited before
        const depositCta = document.querySelector('.deposit-cta');
        if (depositCta && (this.currentUser?.balance > 0 || this.currentUser?.hasDeposited)) {
            depositCta.style.display = 'none';
        }
    }

    setupGuestInterface() {
        // Show guest-specific content
        const guestElements = document.querySelectorAll('.guest-only');
        guestElements.forEach(el => el.style.display = 'block');
        
        const userElements = document.querySelectorAll('.user-only');
        userElements.forEach(el => el.style.display = 'none');
        
        // Update balance to $0.00 for guests
        const balanceElements = document.querySelectorAll('.user-balance, .balance-amount');
        balanceElements.forEach(el => el.textContent = '$0.00');
    }

    async loadMarketsData() {
        try {
            // Fetch market data from API or Supabase
            const markets = await supabaseDB.getAll('market_prices');
            if (markets && markets.length > 0) {
                this.marketsData = markets;
            } else {
                // Fallback to default markets
                this.marketsData = this.getDefaultMarkets();
            }
            
            this.renderMarketsTable();
        } catch (error) {
            console.error('Error loading markets:', error);
            this.marketsData = this.getDefaultMarkets();
            this.renderMarketsTable();
        }
    }

    getDefaultMarkets() {
        return [
            { symbol: 'BTC/USD', name: 'Bitcoin', price: 68432.50, change: 2.34, volume: '32.5B', high: 69200, low: 67800 },
            { symbol: 'ETH/USD', name: 'Ethereum', price: 3821.75, change: 1.87, volume: '18.2B', high: 3850, low: 3780 },
            { symbol: 'SOL/USD', name: 'Solana', price: 168.42, change: 5.23, volume: '4.8B', high: 172, low: 162 },
            { symbol: 'XRP/USD', name: 'Ripple', price: 0.624, change: -0.45, volume: '1.2B', high: 0.63, low: 0.62 },
            { symbol: 'DOGE/USD', name: 'Dogecoin', price: 0.162, change: 8.91, volume: '892M', high: 0.168, low: 0.158 }
        ];
    }

    renderMarketsTable() {
        const tableBody = document.getElementById('marketsTableBody');
        if (!tableBody) return;

        tableBody.innerHTML = this.marketsData.map(market => `
            <tr class="market-row" data-symbol="${market.symbol}">
                <td>
                    <div class="market-info">
                        <span class="market-symbol">${market.symbol}</span>
                        <span class="market-name">${market.name}</span>
                    </div>
                </td>
                <td class="market-price">$${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td class="market-change ${market.change >= 0 ? 'positive' : 'negative'}">
                    ${market.change >= 0 ? '+' : ''}${market.change}%
                </td>
                <td class="market-volume">${market.volume}</td>
                <td>
                    <button class="btn-trade" onclick="homeManager.openTradeModal('${market.symbol}', ${market.price})">
                        Trade
                    </button>
                </td>
            </tr>
        `).join('');

        // Add click handlers to rows
        document.querySelectorAll('.market-row').forEach(row => {
            row.addEventListener('click', (e) => {
                if (!e.target.classList.contains('btn-trade')) {
                    const symbol = row.dataset.symbol;
                    const market = this.marketsData.find(m => m.symbol === symbol);
                    if (market) this.openTradeModal(market.symbol, market.price);
                }
            });
        });
    }

    openTradeModal(symbol, currentPrice) {
        // Check if user is logged in
        if (!auth.isLoggedIn()) {
            if (confirm('Please login to start trading. Go to login page?')) {
                window.location.href = 'login.html';
            }
            return;
        }

        // Create modal if it doesn't exist
        let modal = document.getElementById('tradeModal');
        if (!modal) {
            modal = this.createTradeModal();
        }

        // Update modal content
        document.getElementById('modalSymbol').textContent = symbol;
        document.getElementById('modalPrice').textContent = `$${currentPrice.toLocaleString()}`;
        document.getElementById('tradeSymbol').value = symbol;
        document.getElementById('currentPrice').value = currentPrice;
        
        // Reset form
        document.getElementById('tradeAmount').value = '';
        document.getElementById('tradeType').value = 'buy';
        document.getElementById('leverage').value = '1';
        
        this.updateTradeEstimate();
        
        modal.style.display = 'flex';
    }

    createTradeModal() {
        const modalHTML = `
            <div id="tradeModal" class="modal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>Place Trade - <span id="modalSymbol">BTC/USD</span></h3>
                        <span class="modal-close">&times;</span>
                    </div>
                    <div class="modal-body">
                        <div class="current-price-display">
                            Current Price: <strong id="modalPrice">$0.00</strong>
                        </div>
                        <div class="form-group">
                            <label>Trade Type</label>
                            <div class="trade-type-buttons">
                                <button type="button" class="trade-type-btn buy active" data-type="buy">BUY/LONG</button>
                                <button type="button" class="trade-type-btn sell" data-type="sell">SELL/SHORT</button>
                            </div>
                        </div>
                        <div class="form-group">
                            <label>Amount (USD)</label>
                            <input type="number" id="tradeAmount" class="form-input" placeholder="Enter amount" step="10" min="10">
                            <small>Available balance: $<span id="availableBalance">${(this.currentUser?.balance || 0).toFixed(2)}</span></small>
                        </div>
                        <div class="form-group">
                            <label>Leverage (1x - 100x)</label>
                            <select id="leverage" class="form-input">
                                <option value="1">1x</option>
                                <option value="2">2x</option>
                                <option value="5">5x</option>
                                <option value="10">10x</option>
                                <option value="20">20x</option>
                                <option value="50">50x</option>
                                <option value="100">100x</option>
                            </select>
                        </div>
                        <div class="trade-estimate">
                            <div class="estimate-row">
                                <span>Position Size:</span>
                                <span id="positionSize">$0</span>
                            </div>
                            <div class="estimate-row">
                                <span>Required Margin:</span>
                                <span id="requiredMargin">$0</span>
                            </div>
                            <div class="estimate-row">
                                <span>Est. Profit (10% move):</span>
                                <span id="estProfit">$0</span>
                            </div>
                        </div>
                        <button id="confirmTradeBtn" class="btn-primary">Confirm Trade</button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', modalHTML);
        
        const modal = document.getElementById('tradeModal');
        const closeBtn = modal.querySelector('.modal-close');
        const tradeTypeBtns = modal.querySelectorAll('.trade-type-btn');
        const tradeAmount = document.getElementById('tradeAmount');
        const leverage = document.getElementById('leverage');
        const confirmBtn = document.getElementById('confirmTradeBtn');
        
        closeBtn.onclick = () => modal.style.display = 'none';
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        
        tradeTypeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tradeTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tradeType').value = btn.dataset.type;
                this.updateTradeEstimate();
            });
        });
        
        tradeAmount.addEventListener('input', () => this.updateTradeEstimate());
        leverage.addEventListener('change', () => this.updateTradeEstimate());
        confirmBtn.addEventListener('click', () => this.executeTrade());
        
        return modal;
    }

    updateTradeEstimate() {
        const amount = parseFloat(document.getElementById('tradeAmount')?.value) || 0;
        const leverageVal = parseFloat(document.getElementById('leverage')?.value) || 1;
        const positionSize = amount * leverageVal;
        
        document.getElementById('positionSize').textContent = `$${positionSize.toFixed(2)}`;
        document.getElementById('requiredMargin').textContent = `$${amount.toFixed(2)}`;
        
        const estProfit10 = positionSize * 0.10;
        document.getElementById('estProfit').innerHTML = `<span style="color: #00D897;">+$${estProfit10.toFixed(2)}</span>`;
        
        // Validate against balance
        const balance = this.currentUser?.balance || 0;
        const confirmBtn = document.getElementById('confirmTradeBtn');
        if (amount > balance) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Insufficient Balance';
        } else if (amount < 10) {
            confirmBtn.disabled = true;
            confirmBtn.textContent = 'Minimum $10';
        } else {
            confirmBtn.disabled = false;
            confirmBtn.textContent = 'Confirm Trade';
        }
    }

    async executeTrade() {
        const symbol = document.getElementById('tradeSymbol').value;
        const amount = parseFloat(document.getElementById('tradeAmount').value);
        const leverageVal = parseFloat(document.getElementById('leverage').value);
        const tradeType = document.getElementById('tradeType').value;
        const currentPrice = parseFloat(document.getElementById('currentPrice').value);
        
        if (amount > (this.currentUser?.balance || 0)) {
            auth.showError('Insufficient balance');
            return;
        }
        
        // Deduct balance for margin
        const success = await auth.updateBalance(this.currentUser.id, -amount, {
            type: 'trade_margin',
            symbol: symbol,
            amount: amount,
            leverage: leverageVal,
            trade_type: tradeType
        });
        
        if (success) {
            // Create trade record
            const trade = {
                id: Date.now(),
                user_id: this.currentUser.id,
                symbol: symbol,
                type: tradeType,
                amount: amount,
                leverage: leverageVal,
                entry_price: currentPrice,
                status: 'open',
                created_at: new Date().toISOString()
            };
            
            await supabaseDB.insert('trades', trade);
            
            auth.showSuccess(`Trade opened: ${tradeType.toUpperCase()} ${amount} USD @ ${leverageVal}x`);
            
            // Close modal and refresh data
            document.getElementById('tradeModal').style.display = 'none';
            await this.loadUserData();
        }
    }

    initializeCharts() {
        const chartCanvas = document.getElementById('priceChart');
        if (!chartCanvas || typeof Chart === 'undefined') return;
        
        // Sample price data
        const ctx = chartCanvas.getContext('2d');
        this.chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: this.generateTimeLabels(30),
                datasets: [{
                    label: 'BTC/USD',
                    data: this.generatePriceData(68432, 30),
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
                plugins: {
                    legend: { labels: { color: '#FFFFFF' } },
                    tooltip: { mode: 'index', intersect: false }
                },
                scales: {
                    x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } },
                    y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } }
                }
            }
        });
    }

    generateTimeLabels(days) {
        const labels = [];
        for (let i = days; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            labels.push(date.toLocaleDateString());
        }
        return labels;
    }

    generatePriceData(startPrice, points) {
        const data = [startPrice];
        for (let i = 1; i <= points; i++) {
            const change = (Math.random() - 0.5) * 500;
            data.push(data[i-1] + change);
        }
        return data;
    }

    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateMarketPrices();
        }, 30000); // Update every 30 seconds
    }

    async updateMarketPrices() {
        try {
            // Simulate price updates
            this.marketsData = this.marketsData.map(market => ({
                ...market,
                price: market.price * (1 + (Math.random() - 0.5) * 0.002),
                change: market.change + (Math.random() - 0.5) * 0.5
            }));
            this.renderMarketsTable();
            
            // Update chart if needed
            if (this.chart) {
                const newPrice = this.marketsData[0]?.price || 68432;
                this.chart.data.datasets[0].data.push(newPrice);
                this.chart.data.datasets[0].data.shift();
                this.chart.update();
            }
        } catch (error) {
            console.error('Error updating prices:', error);
        }
    }

    setupEventListeners() {
        // Quick action buttons
        const depositBtn = document.getElementById('depositBtn');
        if (depositBtn) depositBtn.addEventListener('click', () => this.navigateTo('deposit.html'));
        
        const withdrawBtn = document.getElementById('withdrawBtn');
        if (withdrawBtn) withdrawBtn.addEventListener('click', () => this.navigateTo('withdraw.html'));
        
        const viewTradesBtn = document.getElementById('viewTradesBtn');
        if (viewTradesBtn) viewTradesBtn.addEventListener('click', () => this.navigateTo('trades.html'));
        
        const startTradingBtn = document.querySelector('.start-trading-btn, .cta-button');
        if (startTradingBtn) startTradingBtn.addEventListener('click', () => this.scrollToMarkets());
        
        // Search functionality
        const searchInput = document.getElementById('marketSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.filterMarkets(e.target.value));
        }
    }

    filterMarkets(searchTerm) {
        const filtered = this.marketsData.filter(market => 
            market.symbol.toLowerCase().includes(searchTerm.toLowerCase()) ||
            market.name.toLowerCase().includes(searchTerm.toLowerCase())
        );
        
        const tableBody = document.getElementById('marketsTableBody');
        if (!tableBody) return;
        
        tableBody.innerHTML = filtered.map(market => `
            <tr class="market-row" data-symbol="${market.symbol}">
                <td>
                    <div class="market-info">
                        <span class="market-symbol">${market.symbol}</span>
                        <span class="market-name">${market.name}</span>
                    </div>
                </td>
                <td class="market-price">$${market.price.toLocaleString()}</td>
                <td class="market-change ${market.change >= 0 ? 'positive' : 'negative'}">
                    ${market.change >= 0 ? '+' : ''}${market.change}%
                </td>
                <td class="market-volume">${market.volume}</td>
                <td><button class="btn-trade">Trade</button></td>
            </tr>
        `).join('');
    }

    scrollToMarkets() {
        const marketsSection = document.getElementById('marketsSection');
        if (marketsSection) {
            marketsSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    setupMobileMenu() {
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
        }
    }

    navigateTo(page) {
        if (!auth.isLoggedIn() && (page === 'deposit.html' || page === 'withdraw.html' || page === 'trades.html')) {
            if (confirm('Please login to access this page. Go to login?')) {
                window.location.href = 'login.html';
            }
        } else {
            window.location.href = page;
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize when DOM is ready
let homeManager = null;

document.addEventListener('DOMContentLoaded', () => {
    homeManager = new HomeManager();
});

// CSS styles to add
const homeStyles = document.createElement('style');
homeStyles.textContent = `
    .market-row {
        cursor: pointer;
        transition: background 0.2s;
    }
    .market-row:hover {
        background: rgba(255,255,255,0.05);
    }
    .positive {
        color: #00D897;
    }
    .negative {
        color: #FF4757;
    }
    .btn-trade {
        background: linear-gradient(135deg, #00D897, #00B8A0);
        border: none;
        padding: 6px 16px;
        border-radius: 20px;
        color: white;
        cursor: pointer;
        font-size: 12px;
        font-weight: 500;
        transition: transform 0.2s;
    }
    .btn-trade:hover {
        transform: scale(1.05);
    }
    .modal {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 10000;
    }
    .modal-content {
        background: #1E2A3A;
        border-radius: 16px;
        width: 90%;
        max-width: 500px;
        max-height: 90vh;
        overflow-y: auto;
    }
    .modal-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 20px;
        border-bottom: 1px solid rgba(255,255,255,0.1);
    }
    .modal-close {
        font-size: 28px;
        cursor: pointer;
        color: #888;
    }
    .modal-close:hover {
        color: #fff;
    }
    .modal-body {
        padding: 20px;
    }
    .trade-type-buttons {
        display: flex;
        gap: 12px;
    }
    .trade-type-btn {
        flex: 1;
        padding: 10px;
        border: 1px solid rgba(255,255,255,0.2);
        background: transparent;
        color: white;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.2s;
    }
    .trade-type-btn.buy.active {
        background: #00D897;
        border-color: #00D897;
    }
    .trade-type-btn.sell.active {
        background: #FF4757;
        border-color: #FF4757;
    }
    .trade-estimate {
        background: rgba(0,0,0,0.3);
        padding: 15px;
        border-radius: 12px;
        margin: 20px 0;
    }
    .estimate-row {
        display: flex;
        justify-content: space-between;
        margin-bottom: 8px;
        font-size: 14px;
    }
`;

document.head.appendChild(homeStyles);
