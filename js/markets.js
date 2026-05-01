// Markets Page Controller - PocketTrading
// File: js/markets.js

// Wait for supabaseDB to be ready
function waitForSupabase() {
    return new Promise((resolve) => {
        if (typeof supabaseDB !== 'undefined') {
            resolve();
        } else {
            const checkInterval = setInterval(() => {
                if (typeof supabaseDB !== 'undefined') {
                    clearInterval(checkInterval);
                    resolve();
                }
            }, 100);
            
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(checkInterval);
                console.warn('SupabaseDB timeout, using fallback');
                resolve();
            }, 5000);
        }
    });
}

class MarketsManager {
    constructor() {
        this.currentUser = null;
        this.allMarkets = [];
        this.filteredMarkets = [];
        this.watchlist = [];
        this.updateInterval = null;
        this.currentCategory = 'all';
        this.currentSort = 'rank';
        this.searchTerm = '';
        this.init();
    }

    async init() {
        // Wait for supabaseDB
        await waitForSupabase();
        
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
        } else {
            this.setupGuestInterface();
        }
        
        await this.loadMarkets();
        this.setupEventListeners();
        this.startRealTimeUpdates();
        this.updateMarketStats();
    }

    async loadUserData() {
        try {
            if (typeof supabaseDB !== 'undefined') {
                const userData = await supabaseDB.getUserByEmail(this.currentUser.email);
                if (userData) {
                    this.currentUser = { ...this.currentUser, ...userData };
                }
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
        
        // Update balance display
        const balanceElements = document.querySelectorAll('.user-balance');
        balanceElements.forEach(el => {
            el.textContent = `$${(this.currentUser?.balance || 0).toFixed(2)}`;
        });
        
        // Admin elements
        const adminElements = document.querySelectorAll('.admin-only');
        if (this.currentUser?.isAdmin) {
            adminElements.forEach(el => el.style.display = 'block');
        }
    }

    setupGuestInterface() {
        const guestElements = document.querySelectorAll('.guest-only');
        guestElements.forEach(el => el.style.display = 'block');
        
        const userElements = document.querySelectorAll('.user-only');
        userElements.forEach(el => el.style.display = 'none');
    }

    async loadWatchlist() {
        if (!this.currentUser) return;
        
        try {
            const savedWatchlist = localStorage.getItem(`watchlist_${this.currentUser.id}`);
            if (savedWatchlist) {
                this.watchlist = JSON.parse(savedWatchlist);
            } else {
                this.watchlist = [];
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
        this.renderMarkets(); // Re-render to update star icons
    }

    async loadMarkets() {
        try {
            // Try to fetch from Supabase first
            let markets = [];
            
            if (typeof supabaseDB !== 'undefined') {
                const dbMarkets = await supabaseDB.getAll('market_prices');
                if (dbMarkets && dbMarkets.length > 0) {
                    markets = dbMarkets;
                }
            }
            
            if (markets.length === 0) {
                // Use default markets
                markets = this.getDefaultMarkets();
            }
            
            this.allMarkets = markets;
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
            { id: 11, symbol: 'EUR/USD', name: 'Euro', category: 'forex', price: 1.092, change: 0.12, volume: '124B', high24h: 1.095, low24h: 1.088, icon: '€', rank: 11 },
            { id: 12, symbol: 'GBP/USD', name: 'British Pound', category: 'forex', price: 1.284, change: -0.08, volume: '98B', high24h: 1.287, low24h: 1.281, icon: '£', rank: 12 },
            { id: 13, symbol: 'AAPL', name: 'Apple Inc.', category: 'stocks', price: 192.45, change: 0.56, volume: '45M', high24h: 193.20, low24h: 191.80, icon: '🍎', rank: 13 },
            { id: 14, symbol: 'GOOGL', name: 'Google', category: 'stocks', price: 142.67, change: -0.23, volume: '32M', high24h: 143.50, low24h: 142.00, icon: 'G', rank: 14 },
            { id: 15, symbol: 'GOLD', name: 'Gold', category: 'commodities', price: 2345.60, change: 0.89, volume: '12B', high24h: 2350.00, low24h: 2340.00, icon: '🥇', rank: 15 }
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
                    const volA = parseFloat(a.volume) || 0;
                    const volB = parseFloat(b.volume) || 0;
                    return volB - volA;
                default:
                    return (a.rank || 999) - (b.rank || 999);
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
        
        grid.innerHTML = this.filteredMarkets.map(market => {
            const isInWatchlist = this.watchlist.includes(market.symbol);
            return `
            <div class="market-card" data-symbol="${market.symbol}">
                <div class="card-header">
                    <div class="market-info">
                        <div class="market-icon">${market.icon || '📈'}</div>
                        <div class="market-details">
                            <h3>${market.symbol}</h3>
                            <p>${market.name}</p>
                        </div>
                    </div>
                    <button class="favorite-btn ${isInWatchlist ? 'active' : ''}" data-symbol="${market.symbol}" onclick="marketsManager.toggleWatchlist('${market.symbol}')">
                        ${isInWatchlist ? '★' : '☆'}
                    </button>
                </div>
                <div class="card-price">
                    <div class="current-price">$${this.formatPrice(market.price)}</div>
                    <div class="price-change ${market.change >= 0 ? 'positive' : 'negative'}">
                        ${market.change >= 0 ? '▲' : '▼'} ${Math.abs(market.change)}%
                    </div>
                </div>
                <div class="card-stats">
                    <div class="stat">
                        <div class="stat-label-sm">24h High</div>
                        <div class="stat-value-sm">$${this.formatPrice(market.high24h)}</div>
                    </div>
                    <div class="stat">
                        <div class="stat-label-sm">24h Low</div>
                        <div class="stat-value-sm">$${this.formatPrice(market.low24h)}</div>
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
        `}).join('');
    }

    formatPrice(price) {
        if (!price && price !== 0) return '0.00';
        if (price < 1) {
            return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        }
        return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderWatchlist() {
        const container = document.getElementById('watchlistContainer');
        if (!container) return;
        
        if (!this.currentUser) {
            container.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon">🔒</div>
                    <p>Login to create your watchlist</p>
                    <a href="login.html" class="btn-outline" style="display: inline-block; margin-top: 12px;">Login Now</a>
                </div>
            `;
            return;
        }
        
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
                    <p>Markets in your watchlist are not available</p>
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
                                    <div class="market-icon" style="width: 32px; height: 32px; font-size: 16px; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.05); border-radius: 50%;">${market.icon || '📈'}</div>
                                    <div>
                                        <strong>${market.symbol}</strong><br>
                                        <small style="color: #8B93A5;">${market.name}</small>
                                    </div>
                                </div>
                              </td>
                            <td class="current-price">$${this.formatPrice(market.price)}</td>
                            <td class="${market.change >= 0 ? 'positive' : 'negative'}">
                                ${market.change >= 0 ? '+' : ''}${market.change}%
                            </td>
                            <td>${market.volume || '—'}</td>
                            <td>
                                <button class="remove-watchlist" onclick="marketsManager.removeFromWatchlist('${market.symbol}')" style="background: none; border: none; color: #FF4757; cursor: pointer; font-size: 18px;">🗑️</button>
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
            let vol = 0;
            if (typeof m.volume === 'string') {
                if (m.volume.includes('B')) vol = parseFloat(m.volume) * 1000;
                else if (m.volume.includes('M')) vol = parseFloat(m.volume);
                else vol = parseFloat(m.volume) || 0;
            } else {
                vol = m.volume || 0;
            }
            return sum + vol;
        }, 0);
        
        const btcMarket = this.allMarkets.find(m => m.symbol === 'BTC/USD');
        const btcPrice = btcMarket ? btcMarket.price : 68432;
        
        const marketCapEl = document.getElementById('totalMarketCap');
        const volumeEl = document.getElementById('totalVolume');
        const btcPriceEl = document.getElementById('btcPrice');
        const changeEl = document.getElementById('marketCapChange');
        
        if (marketCapEl) marketCapEl.textContent = `$${(btcPrice * 19.5 / 1e12).toFixed(2)}T`;
        if (volumeEl) volumeEl.textContent = `$${(totalVolume).toFixed(1)}B`;
        if (btcPriceEl) btcPriceEl.textContent = `$${btcPrice.toLocaleString()}`;
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
            closeBtn.onclick = () => {
                if (modal) modal.style.display = 'none';
            };
        }
        if (modal) {
            window.onclick = (e) => { 
                if (e.target === modal) modal.style.display = 'none'; 
            };
        }
        
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
                const tradeTypeInput = document.getElementById('tradeType');
                if (tradeTypeInput) tradeTypeInput.value = btn.dataset.type;
                this.updateTradeEstimate();
            });
        });
        
        const confirmBtn = document.getElementById('confirmTradeBtn');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.executeTrade());
    }

    openTradeModal(symbol, currentPrice) {
        if (!this.currentUser) {
            if (confirm('Please login to start trading. Go to login page?')) {
                window.location.href = 'login.html';
            }
            return;
        }
        
        const modal = document.getElementById('tradeModal');
        if (!modal) return;
        
        const modalSymbol = document.getElementById('modalSymbol');
        const modalPrice = document.getElementById('modalPrice');
        const tradeSymbol = document.getElementById('tradeSymbol');
        const currentPriceInput = document.getElementById('currentPrice');
        const availableBalance = document.getElementById('availableBalance');
        
        if (modalSymbol) modalSymbol.textContent = symbol;
        if (modalPrice) modalPrice.textContent = `$${this.formatPrice(currentPrice)}`;
        if (tradeSymbol) tradeSymbol.value = symbol;
        if (currentPriceInput) currentPriceInput.value = currentPrice;
        if (availableBalance) availableBalance.textContent = (this.currentUser?.balance || 0).toFixed(2);
        
        const amountInput = document.getElementById('tradeAmount');
        const leverageSelect = document.getElementById('leverage');
        if (amountInput) amountInput.value = '';
        if (leverageSelect) leverageSelect.value = '1';
        
        const tradeTypeInput = document.getElementById('tradeType');
        if (tradeTypeInput) tradeTypeInput.value = 'buy';
        
        const buyBtn = document.querySelector('.trade-type-btn.buy');
        const sellBtn = document.querySelector('.trade-type-btn.sell');
        if (buyBtn) buyBtn.classList.add('active');
        if (sellBtn) sellBtn.classList.remove('active');
        
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
        const symbol = document.getElementById('tradeSymbol')?.value;
        const amount = parseFloat(document.getElementById('tradeAmount')?.value);
        const leverageVal = parseFloat(document.getElementById('leverage')?.value);
        const tradeType = document.getElementById('tradeType')?.value;
        const currentPrice = parseFloat(document.getElementById('currentPrice')?.value);
        
        if (!amount || amount < 10) {
            this.showNotification('Minimum trade amount is $10', 'error');
            return;
        }
        
        if (amount > (this.currentUser?.balance || 0)) {
            this.showNotification('Insufficient balance', 'error');
            return;
        }
        
        // Update balance (deduct margin)
        const newBalance = (this.currentUser.balance || 0) - amount;
        
        try {
            if (typeof supabaseDB !== 'undefined' && supabaseDB.updateUserBalance) {
                await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
            }
            
            // Update local user object
            this.currentUser.balance = newBalance;
            if (localStorage.getItem('pocket_user')) {
                const user = JSON.parse(localStorage.getItem('pocket_user'));
                user.balance = newBalance;
                localStorage.setItem('pocket_user', JSON.stringify(user));
            }
            if (sessionStorage.getItem('pocket_user')) {
                const user = JSON.parse(sessionStorage.getItem('pocket_user'));
                user.balance = newBalance;
                sessionStorage.setItem('pocket_user', JSON.stringify(user));
            }
            
            // Create trade record
            const trade = {
                id: Date.now(),
                user_id: this.currentUser.id,
                symbol: symbol,
                type: tradeType,
                amount: amount,
                leverage: leverageVal,
                entry_price: currentPrice,
                current_price: currentPrice,
                pnl: 0,
                status: 'open',
                created_at: new Date().toISOString()
            };
            
            // Save trade
            const existingTrades = JSON.parse(localStorage.getItem(`trades_${this.currentUser.id}`) || '[]');
            existingTrades.push(trade);
            localStorage.setItem(`trades_${this.currentUser.id}`, JSON.stringify(existingTrades));
            
            if (typeof supabaseDB !== 'undefined' && supabaseDB.insert) {
                await supabaseDB.insert('trades', trade);
            }
            
            this.showNotification(`Trade opened: ${tradeType.toUpperCase()} ${amount} USD @ ${leverageVal}x`, 'success');
            
            // Close modal and refresh
            const modal = document.getElementById('tradeModal');
            if (modal) modal.style.display = 'none';
            
            // Update balance display
            const balanceElements = document.querySelectorAll('.user-balance');
            balanceElements.forEach(el => {
                el.textContent = `$${newBalance.toFixed(2)}`;
            });
            
        } catch (error) {
            console.error('Error executing trade:', error);
            this.showNotification('Failed to execute trade', 'error');
        }
    }

    startRealTimeUpdates() {
        this.updateInterval = setInterval(() => {
            this.updateMarketPrices();
        }, 30000);
    }

    updateMarketPrices() {
        try {
            this.allMarkets = this.allMarkets.map(market => {
                const changePercent = (Math.random() - 0.5) * 0.5;
                const newPrice = market.price * (1 + changePercent / 100);
                return {
                    ...market,
                    price: newPrice,
                    change: market.change + changePercent
                };
            });
            
            this.applyFilters();
            this.renderMarkets();
            this.renderWatchlist();
            this.updateMarketStats();
        } catch (error) {
            console.error('Error updating prices:', error);
        }
    }

    showNotification(message, type) {
        if (typeof auth !== 'undefined' && auth.showNotification) {
            auth.showNotification(message, type);
        } else {
            // Create simple notification
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                bottom: 20px;
                right: 20px;
                background: ${type === 'error' ? '#FF4757' : '#00D897'};
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                z-index: 10000;
                animation: fadeInOut 3s ease;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
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
window.logout = () => { if (typeof auth !== 'undefined' && auth.logout) auth.logout(); };
