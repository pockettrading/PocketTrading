// Markets Page Controller - PocketTrading
// File: js/markets.js

class MarketsManager {
    constructor() {
        this.currentUser = null;
        this.allMarkets = [];
        this.filteredMarkets = [];
        this.watchlist = [];
        self.updateInterval = null;
        this.currentCategory = 'all';
        this.currentSort = 'rank';
        this.searchTerm = '';
        this.init();
    }

    async init() {
        // Wait for auth to be ready
        if (typeof auth === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.currentUser = auth.getUser();
        
        // Load user data if logged in
        if (this.currentUser) {
            await this.loadUserData();
            this.setupUserInterface();
            await this.loadWatchlist();
        }
        
        await this.loadMarkets();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.updateMarketStats();
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
        
        // Admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        if (this.currentUser?.isAdmin) {
            adminElements.forEach(el => el.style.display = 'block');
        }
    }

    async loadWatchlist() {
        if (!this.currentUser) return;
        
        try {
            const savedWatchlist = localStorage.getItem(`watchlist_${this.currentUser.id}`);
            if (savedWatchlist) {
                this.watchlist = JSON.parse(savedWatchlist);
            } else {
                // Try to load from Supabase
                const watchlistData = await supabaseDB.getUserWatchlist(this.currentUser.id);
                if (watchlistData && watchlistData.length > 0) {
                    this.watchlist = watchlistData;
                } else {
                    this.watchlist = [];
                }
            }
            this.renderWatchlist();
        } catch (error) {
            console.error('Error loading watchlist:', error);
            this.watchlist = [];
        }
    }

    saveWatchlist() {
        if (!this.currentUser) return;
        localStorage.setItem(`watchlist_${this.currentUser.id}`, JSON.stringify(this.watchlist));
        this.renderWatchlist();
    }

    async loadMarkets() {
        try {
            // Try to fetch from Supabase first
            const markets = await supabaseDB.getAll('market_prices');
            if (markets && markets.length > 0) {
                this.allMarkets = markets;
            } else {
                // Use default markets
                this.allMarkets = this.getDefaultMarkets();
            }
            
            this.filteredMarkets = [...this.allMarkets];
            this.applyFilters();
            this.renderMarkets();
        } catch (error) {
            console.error('Error loading markets:', error);
            this.allMarkets = this.getDefaultMarkets();
            this.filteredMarkets = [...this.allMarkets];
            this.renderMarkets();
        }
    }

    getDefaultMarkets() {
        return [
            { id: 1, symbol: 'BTC/USD', name: 'Bitcoin', category: 'crypto', price: 68432.50, change: 2.34, volume: '32.5B', high24h: 69200, low24h: 67800, marketCap: '1.35T', icon: '₿', rank: 1 },
            { id: 2, symbol: 'ETH/USD', name: 'Ethereum', category: 'crypto', price: 3821.75, change: 1.87, volume: '18.2B', high24h: 3850, low24h: 3780, marketCap: '459B', icon: 'Ξ', rank: 2 },
            { id: 3, symbol: 'SOL/USD', name: 'Solana', category: 'crypto', price: 168.42, change: 5.23, volume: '4.8B', high24h: 172, low24h: 162, marketCap: '72B', icon: '◎', rank: 3 },
            { id: 4, symbol: 'XRP/USD', name: 'Ripple', category: 'crypto', price: 0.624, change: -0.45, volume: '1.2B', high24h: 0.63, low24h: 0.62, marketCap: '33.5B', icon: 'X', rank: 4 },
            { id: 5, symbol: 'DOGE/USD', name: 'Dogecoin', category: 'crypto', price: 0.162, change: 8.91, volume: '892M', high24h: 0.168, low24h: 0.158, marketCap: '23.2B', icon: 'Ð', rank: 5 },
            { id: 6, symbol: 'ADA/USD', name: 'Cardano', category: 'crypto', price: 0.483, change: -1.23, volume: '456M', high24h: 0.49, low24h: 0.478, marketCap: '17.1B', icon: 'A', rank: 6 },
            { id: 7, symbol: 'AVAX/USD', name: 'Avalanche', category: 'crypto', price: 42.15, change: 3.45, volume: '678M', high24h: 43.2, low24h: 41.1, marketCap: '15.8B', icon: 'A', rank: 7 },
            { id: 8, symbol: 'MATIC/USD', name: 'Polygon', category: 'crypto', price: 0.89, change: -2.11, volume: '345M', high24h: 0.91, low24h: 0.88, marketCap: '8.7B', icon: 'M', rank: 8 },
            { id: 9, symbol: 'LINK/USD', name: 'Chainlink', category: 'crypto', price: 18.34, change: 1.56, volume: '234M', high24h: 18.6, low24h: 18.1, marketCap: '10.2B', icon: 'L', rank: 9 },
            { id: 10, symbol: 'UNI/USD', name: 'Uniswap', category: 'crypto', price: 11.23, change: -0.89, volume: '167M', high24h: 11.4, low24h: 11.1, marketCap: '6.5B', icon: 'U', rank: 10 },
            { id: 11, symbol: 'EUR/USD', name: 'Euro', category: 'forex', price: 1.092, change: 0.12, volume: '124B', icon: '€', rank: 11 },
            { id: 12, symbol: 'GBP/USD', name: 'British Pound', category: 'forex', price: 1.284, change: -0.08, volume: '98B', icon: '£', rank: 12 },
            { id: 13, symbol: 'AAPL', name: 'Apple Inc.', category: 'stocks', price: 192.45, change: 0.56, volume: '45M', icon: '🍎', rank: 13 },
            { id: 14, symbol: 'GOOGL', name: 'Google', category: 'stocks', price: 142.67, change: -0.23, volume: '32M', icon: 'G', rank: 14 },
            { id: 15, symbol: 'GOLD', name: 'Gold', category: 'commodities', price: 2345.60, change: 0.89, volume: '12B', icon: '🥇', rank: 15 }
        ];
    }

    applyFilters() {
        let filtered = [...this.allMarkets];
        
        // Apply category filter
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(m => m.category === this.currentCategory);
        }
        
        // Apply search term
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(m => 
                m.symbol.toLowerCase().includes(term) || 
                m.name.toLowerCase().includes(term)
            );
        }
        
        // Apply sorting
        filtered.sort((a, b) => {
            switch(this.currentSort) {
                case 'name':
                    return a.name.localeCompare(b.name);
                case 'price':
                    return a.price - b.price;
                case 'price-desc':
                    return b.price - a.price;
                case 'change':
                    return b.change - a.change;
                case 'volume':
                    return parseFloat(b.volume) - parseFloat(a.volume);
                default:
                    return a.rank - b.rank;
            }
        });
        
        this.filteredMarkets = filtered;
    }

    renderMarkets() {
        const grid = document.getElementById('marketsGrid');
        if (!grid) return;
        
        if (this.filteredMarkets.length === 0) {
            grid.innerHTML = `
                <div class="empty-state" style="grid-column: 1/-1;">
                    <div class="empty-state-icon">🔍</div>
                    <p>No markets found</p>
                    <small>Try adjusting your search or filters</small>
                </div>
            `;
            return;
        }
        
        grid.innerHTML = this.filteredMarkets.map(market => `
            <div class="market-card" data-symbol="${market.symbol}">
                <div class="card-header">
                    <div class="market-info">
                        <div class="market-icon">${market.icon || '📈'}</div>
                        <div class="market-details">
                            <h3>${market.symbol}</h3>
                            <p>${market.name}</p>
                        </div>
                    </div>
                    <button class="favorite-btn ${this.isInWatchlist(market.symbol) ? 'active' : ''}" data-symbol="${market.symbol}" onclick="marketsManager.toggleWatchlist('${market.symbol}')">
                        ${this.isInWatchlist(market.symbol) ? '★' : '☆'}
                    </button>
                </div>
                <div class="card-price">
                    <div class="current-price">$${market.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: market.price < 1 ? 4 : 2 })}</div>
                    <div class="price-change ${market.change >= 0 ? 'positive' : 'negative'}">
                        ${market.change >= 0 ? '▲' : '▼'} ${Math.abs(market.change)}%
                    </div>
                </div>
                <div class="card-stats">
                    <div class="stat">
                        <div class="stat-label-sm">24h High</div>
                        <div class="stat-value-sm">$${market.high24h?.toLocaleString() || '—'}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label-sm">24h Low</div>
                        <div class="stat-value-sm">$${market.low24h?.toLocaleString() || '—'}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label-sm">Volume</div>
                        <div class="stat-value-sm">${market.volume || '—'}</div>
                    </div>
                </div>
                <button class="trade-btn" onclick="marketsManager.openTradeModal('${market.symbol}', ${market.price})">
                    Trade ${market.symbol.split('/')[0]}
                </button>
            </div>
        `).join('');
    }

    renderWatchlist() {
        const container = document.getElementById('watchlistContainer');
        if (!container) return;
        
        if (this.watchlist.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⭐</div>
                    <p>No markets in your watchlist yet</p>
                    <small>Click the star icon on any market to add it to your watchlist</small>
                </div>
            `;
            return;
        }
        
        const watchlistMarkets = this.allMarkets.filter(m => this.watchlist.includes(m.symbol));
        
        if (watchlistMarkets.length === 0) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">⭐</div>
                    <p>No markets in your watchlist yet</p>
                    <small>Click the star icon on any market to add it to your watchlist</small>
                </div>
            `;
            return;
        }
        
        container.innerHTML = `
            <table class="watchlist-table">
                <thead>
                    <tr>
                        <th>Market</th>
                        <th>Price</th>
                        <th>24h Change</th>
                        <th>Volume</th>
                        <th>Action</th>
                    </tr>
                </thead>
                <tbody>
                    ${watchlistMarkets.map(market => `
                        <tr>
                            <td>
                                <div class="market-info" style="display: flex; align-items: center; gap: 12px;">
                                    <div class="market-icon" style="width: 32px; height: 32px; font-size: 16px;">${market.icon || '📈'}</div>
                                    <div>
                                        <strong>${market.symbol}</strong><br>
                                        <small style="color: #8B93A5;">${market.name}</small>
                                    </div>
                                </div>
                             </td>
                            <td class="current-price">$${market.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                            <td class="${market.change >= 0 ? 'positive' : 'negative'}">
                                ${market.change >= 0 ? '+' : ''}${market.change}%
                            </td>
                            <td>${market.volume || '—'}</td>
                            <td>
                                <button class="remove-watchlist" onclick="marketsManager.removeFromWatchlist('${market.symbol}')">🗑️</button>
                                <button class="trade-btn" style="margin-top: 4px; padding: 6px 12px; font-size: 12px;" onclick="marketsManager.openTradeModal('${market.symbol}', ${market.price})">Trade</button>
                             </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    }

    isInWatchlist(symbol) {
        return this.watchlist.includes(symbol);
    }

    toggleWatchlist(symbol) {
        if (!this.currentUser) {
            if (confirm('Please login to add markets to your watchlist. Go to login?')) {
                window.location.href = 'login.html';
            }
            return;
        }
        
        if (this.watchlist.includes(symbol)) {
            this.watchlist = this.watchlist.filter(s => s !== symbol);
            this.showNotification(`${symbol} removed from watchlist`, 'info');
        } else {
            if (this.watchlist.length >= 20) {
                this.showNotification('Watchlist limit reached (20 items)', 'error');
                return;
            }
            this.watchlist.push(symbol);
            this.showNotification(`${symbol} added to watchlist`, 'success');
        }
        
        this.saveWatchlist();
        this.renderMarkets();
        this.renderWatchlist();
    }

    removeFromWatchlist(symbol) {
        this.watchlist = this.watchlist.filter(s => s !== symbol);
        this.saveWatchlist();
        this.renderMarkets();
        this.renderWatchlist();
        this.showNotification(`${symbol} removed from watchlist`, 'info');
    }

    updateMarketStats() {
        const totalChange = this.allMarkets.reduce((sum, m) => sum + (m.change || 0), 0) / this.allMarkets.length;
        const totalVolume = this.allMarkets.reduce((sum, m) => {
            const vol = parseFloat(m.volume);
            return sum + (isNaN(vol) ? 0 : vol);
        }, 0);
        
        const totalMarketCap = this.allMarkets.reduce((sum, m) => {
            const cap = parseFloat(m.marketCap);
            return sum + (isNaN(cap) ? 0 : cap);
        }, 0);
        
        const btcMarket = this.allMarkets.find(m => m.symbol === 'BTC/USD');
        const btcDominance = btcMarket ? (parseFloat(btcMarket.marketCap) / totalMarketCap * 100).toFixed(1) : 48.2;
        
        const marketCapEl = document.getElementById('totalMarketCap');
        const volumeEl = document.getElementById('totalVolume');
        const dominanceEl = document.getElementById('btcDominance');
        const changeEl = document.getElementById('marketCapChange');
        
        if (marketCapEl) marketCapEl.textContent = `$${(totalMarketCap / 1e12).toFixed(2)}T`;
        if (volumeEl) volumeEl.textContent = `$${(totalVolume / 1e9).toFixed(1)}B`;
        if (dominanceEl) dominanceEl.textContent = `${btcDominance}%`;
        if (changeEl) {
            changeEl.textContent = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}%`;
            changeEl.className = `stat-change ${totalChange >= 0 ? 'positive' : 'negative'}`;
        }
    }

    setupEventListeners() {
        // Category filters
        const filterBtns = document.querySelectorAll('.filter-btn');
        filterBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                filterBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.applyFilters();
                this.renderMarkets();
            });
        });
        
        // Search input
        const searchInput = document.getElementById('marketSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.applyFilters();
                this.renderMarkets();
            });
        }
        
        // Sort select
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) {
            sortSelect.addEventListener('change', (e) => {
                this.currentSort = e.target.value;
                this.applyFilters();
                this.renderMarkets();
            });
        }
        
        // Clear watchlist button
        const clearBtn = document.getElementById('clearWatchlistBtn');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                if (confirm('Are you sure you want to clear your entire watchlist?')) {
                    this.watchlist = [];
                    this.saveWatchlist();
                    this.renderMarkets();
                    this.renderWatchlist();
                    this.showNotification('Watchlist cleared', 'info');
                }
            });
        }
        
        // Mobile menu
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
        }
        
        // Trade modal close
        const modal = document.getElementById('tradeModal');
        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.onclick = () => modal.style.display = 'none';
        }
        window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        
        // Trade form inputs
        const tradeAmount = document.getElementById('tradeAmount');
        const leverage = document.getElementById('leverage');
        const tradeTypeBtns = document.querySelectorAll('.trade-type-btn');
        
        if (tradeAmount) tradeAmount.addEventListener('input', () => this.updateTradeEstimate());
        if (leverage) leverage.addEventListener('change', () => this.updateTradeEstimate());
        
        tradeTypeBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                tradeTypeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                document.getElementById('tradeType').value = btn.dataset.type;
                this.updateTradeEstimate();
            });
        });
        
        const confirmBtn = document.getElementById('confirmTradeBtn');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.executeTrade());
    }

    openTradeModal(symbol, currentPrice) {
        if (!auth.isLoggedIn()) {
            if (confirm('Please login to start trading. Go to login page?')) {
                window.location.href = 'login.html';
            }
            return;
        }
        
        const modal = document.getElementById('tradeModal');
        const modalSymbol = document.getElementById('modalSymbol');
        const modalPrice = document.getElementById('modalPrice');
        const tradeSymbol = document.getElementById('tradeSymbol');
        const currentPriceInput = document.getElementById('currentPrice');
        const availableBalance = document.getElementById('availableBalance');
        
        if (modalSymbol) modalSymbol.textContent = symbol;
        if (modalPrice) modalPrice.textContent = `$${currentPrice.toLocaleString()}`;
        if (tradeSymbol) tradeSymbol.value = symbol;
        if (currentPriceInput) currentPriceInput.value = currentPrice;
        if (availableBalance) availableBalance.textContent = (this.currentUser?.balance || 0).toFixed(2);
        
        document.getElementById('tradeAmount').value = '';
        document.getElementById('leverage').value = '1';
        document.getElementById('tradeType').value = 'buy';
        
        document.querySelectorAll('.trade-type-btn').forEach(btn => {
            btn.classList.remove('active');
            if (btn.dataset.type === 'buy') btn.classList.add('active');
        });
        
        this.updateTradeEstimate();
        modal.style.display = 'flex';
    }

    updateTradeEstimate() {
        const amount = parseFloat(document.getElementById('tradeAmount')?.value) || 0;
        const leverageVal = parseFloat(document.getElementById('leverage')?.value) || 1;
        const positionSize = amount * leverageVal;
        
        const positionSizeEl = document.getElementById('positionSize');
        const requiredMarginEl = document.getElementById('requiredMargin');
        const estProfitEl = document.getElementById('estProfit');
        const confirmBtn = document.getElementById('confirmTradeBtn');
        
        if (positionSizeEl) positionSizeEl.textContent = `$${positionSize.toFixed(2)}`;
        if (requiredMarginEl) requiredMarginEl.textContent = `$${amount.toFixed(2)}`;
        
        const estProfit10 = positionSize * 0.10;
        if (estProfitEl) estProfitEl.innerHTML = `<span style="color: #00D897;">+$${estProfit10.toFixed(2)}</span>`;
        
        const balance = this.currentUser?.balance || 0;
        if (confirmBtn) {
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
        
        const success = await auth.updateBalance(this.currentUser.id, -amount, {
            type: 'trade_margin',
            symbol: symbol,
            amount: amount,
            leverage: leverageVal,
            trade_type: tradeType
        });
        
        if (success) {
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
            
            document.getElementById('tradeModal').style.display = 'none';
            await this.loadUserData();
            
            const availableBalance = document.getElementById('availableBalance');
            if (availableBalance) availableBalance.textContent = (this.currentUser?.balance || 0).toFixed(2);
        }
    }

    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateMarketPrices();
        }, 30000);
    }

    async updateMarketPrices() {
        try {
            this.allMarkets = this.allMarkets.map(market => ({
                ...market,
                price: market.price * (1 + (Math.random() - 0.5) * 0.002),
                change: market.change + (Math.random() - 0.5) * 0.3
            }));
            
            this.applyFilters();
            this.renderMarkets();
            this.renderWatchlist();
            this.updateMarketStats();
        } catch (error) {
            console.error('Error updating prices:', error);
        }
    }

    showNotification(message, type) {
        if (auth && auth.showNotification) {
            auth.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    destroy() {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
        }
    }
}

// Initialize when DOM is ready
let marketsManager = null;

document.addEventListener('DOMContentLoaded', () => {
    marketsManager = new MarketsManager();
});

// Make functions globally accessible
window.toggleWatchlist = (symbol) => marketsManager?.toggleWatchlist(symbol);
window.removeFromWatchlist = (symbol) => marketsManager?.removeFromWatchlist(symbol);
window.openTradeModal = (symbol, price) => marketsManager?.openTradeModal(symbol, price);
window.logout = () => { if (auth) auth.logout(); };
