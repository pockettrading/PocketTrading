// Markets Page Controller - PocketTrading
// File: js/markets.js
// Pure Supabase - No localStorage

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
        await this.waitForDependencies();
        
        this.currentUser = auth.getUser();
        
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

    async waitForDependencies() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && typeof supabaseDB !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    async loadUserData() {
        try {
            const userData = await supabaseDB.getUserById(this.currentUser.id);
            if (userData) {
                this.currentUser = { ...this.currentUser, ...userData };
                this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
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
        
        const balanceElements = document.querySelectorAll('.user-balance');
        balanceElements.forEach(el => {
            el.textContent = `$${(this.currentUser?.balance || 0).toFixed(2)}`;
        });
        
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
            const watchlistData = await supabaseDB.getUserWatchlist(this.currentUser.id);
            this.watchlist = watchlistData.map(w => w.symbol);
            this.renderWatchlist();
        } catch (error) {
            console.error('Error loading watchlist:', error);
            this.watchlist = [];
        }
    }

    async toggleWatchlist(symbol) {
        if (!this.currentUser) {
            if (confirm('Please login to add markets to your watchlist. Go to login?')) {
                window.location.href = 'login.html';
            }
            return;
        }
        
        try {
            if (this.watchlist.includes(symbol)) {
                await supabaseDB.removeFromWatchlist(this.currentUser.id, symbol);
                this.watchlist = this.watchlist.filter(s => s !== symbol);
                this.showNotification(`${symbol} removed from watchlist`, 'info');
            } else {
                if (this.watchlist.length >= 20) {
                    this.showNotification('Watchlist limit reached (20 items)', 'error');
                    return;
                }
                await supabaseDB.addToWatchlist(this.currentUser.id, symbol);
                this.watchlist.push(symbol);
                this.showNotification(`${symbol} added to watchlist`, 'success');
            }
            this.renderWatchlist();
            this.renderMarkets();
        } catch (error) {
            console.error('Error toggling watchlist:', error);
            this.showNotification('Failed to update watchlist', 'error');
        }
    }

    async removeFromWatchlist(symbol) {
        if (!this.currentUser) return;
        try {
            await supabaseDB.removeFromWatchlist(this.currentUser.id, symbol);
            this.watchlist = this.watchlist.filter(s => s !== symbol);
            this.renderWatchlist();
            this.renderMarkets();
            this.showNotification(`${symbol} removed from watchlist`, 'info');
        } catch (error) {
            console.error('Error removing from watchlist:', error);
            this.showNotification('Failed to remove from watchlist', 'error');
        }
    }

    isInWatchlist(symbol) {
        return this.watchlist.includes(symbol);
    }

    async loadMarkets() {
        try {
            let markets = await supabaseDB.getAllMarkets();
            if (!markets || markets.length === 0) {
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
            { id: 1, symbol: 'BTC', name: 'Bitcoin', category: 'crypto', price: 78312.00, change_24h: 2.34, volume: '32.5B', high_24h: 79200, low_24h: 77500, market_cap: '1.56T', icon: '₿', rank: 1 },
            { id: 2, symbol: 'ETH', name: 'Ethereum', category: 'crypto', price: 2297.32, change_24h: 1.29, volume: '18.2B', high_24h: 2320, low_24h: 2280, market_cap: '276B', icon: 'Ξ', rank: 2 },
            { id: 3, symbol: 'SOL', name: 'Solana', category: 'crypto', price: 168.42, change_24h: 5.23, volume: '4.8B', high_24h: 172, low_24h: 162, market_cap: '72B', icon: '◎', rank: 3 },
            { id: 4, symbol: 'XRP', name: 'Ripple', category: 'crypto', price: 0.624, change_24h: -0.45, volume: '1.2B', high_24h: 0.63, low_24h: 0.62, market_cap: '33.5B', icon: 'X', rank: 4 },
            { id: 5, symbol: 'DOGE', name: 'Dogecoin', category: 'crypto', price: 0.162, change_24h: 8.91, volume: '892M', high_24h: 0.168, low_24h: 0.158, market_cap: '23.2B', icon: 'Ð', rank: 5 },
            { id: 6, symbol: 'BNB', name: 'Binance Coin', category: 'crypto', price: 615.81, change_24h: 0.21, volume: '2.1B', high_24h: 620, low_24h: 610, market_cap: '94B', icon: 'B', rank: 6 },
            { id: 7, symbol: 'ADA', name: 'Cardano', category: 'crypto', price: 0.483, change_24h: -1.23, volume: '456M', high_24h: 0.49, low_24h: 0.478, market_cap: '17.1B', icon: 'A', rank: 7 }
        ];
    }

    applyFilters() {
        let filtered = [...this.allMarkets];
        if (this.currentCategory !== 'all') {
            filtered = filtered.filter(m => m.category === this.currentCategory);
        }
        if (this.searchTerm) {
            const term = this.searchTerm.toLowerCase();
            filtered = filtered.filter(m => m.symbol.toLowerCase().includes(term) || m.name.toLowerCase().includes(term));
        }
        filtered.sort((a, b) => {
            switch(this.currentSort) {
                case 'name': return a.name.localeCompare(b.name);
                case 'price': return a.price - b.price;
                case 'price-desc': return b.price - a.price;
                case 'change': return b.change_24h - a.change_24h;
                case 'volume':
                    const volA = parseFloat(a.volume) || 0;
                    const volB = parseFloat(b.volume) || 0;
                    return volB - volA;
                default: return (a.rank || 999) - (b.rank || 999);
            }
        });
        this.filteredMarkets = filtered;
    }

    renderMarkets() {
        const grid = document.getElementById('marketsGrid');
        if (!grid) return;
        if (this.filteredMarkets.length === 0) {
            grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;"><div class="empty-state-icon">🔍</div><p>No markets found</p><small>Try adjusting your search or filters</small></div>`;
            return;
        }
        grid.innerHTML = this.filteredMarkets.map(market => {
            const isInWatchlist = this.isInWatchlist(market.symbol);
            return `
            <div class="market-card" data-symbol="${market.symbol}">
                <div class="card-header">
                    <div class="market-info">
                        <div class="market-icon">${market.icon || '📈'}</div>
                        <div class="market-details"><h3>${market.symbol}/USD</h3><p>${market.name}</p></div>
                    </div>
                    <button class="favorite-btn ${isInWatchlist ? 'active' : ''}" data-symbol="${market.symbol}" onclick="marketsManager.toggleWatchlist('${market.symbol}')">${isInWatchlist ? '★' : '☆'}</button>
                </div>
                <div class="card-price">
                    <div class="current-price">$${this.formatPrice(market.price)}</div>
                    <div class="price-change ${market.change_24h >= 0 ? 'positive' : 'negative'}">${market.change_24h >= 0 ? '▲' : '▼'} ${Math.abs(market.change_24h)}%</div>
                </div>
                <div class="card-stats">
                    <div class="stat"><div class="stat-label-sm">24h High</div><div class="stat-value-sm">$${this.formatPrice(market.high_24h)}</div></div>
                    <div class="stat"><div class="stat-label-sm">24h Low</div><div class="stat-value-sm">$${this.formatPrice(market.low_24h)}</div></div>
                    <div class="stat"><div class="stat-label-sm">Volume</div><div class="stat-value-sm">${market.volume || '—'}</div></div>
                </div>
                <button class="trade-btn" onclick="marketsManager.openTradeModal('${market.symbol}', ${market.price})">Trade ${market.symbol}</button>
            </div>`;
        }).join('');
    }

    formatPrice(price) {
        if (!price && price !== 0) return '0.00';
        if (price < 1) return price.toLocaleString(undefined, { minimumFractionDigits: 4, maximumFractionDigits: 4 });
        return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderWatchlist() {
        const container = document.getElementById('watchlistContainer');
        if (!container) return;
        if (!this.currentUser) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">🔒</div><p>Login to create your watchlist</p><a href="login.html" class="btn-outline" style="display: inline-block; margin-top: 12px;">Login Now</a></div>`;
            return;
        }
        if (this.watchlist.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⭐</div><p>No markets in your watchlist yet</p><small>Click the star icon on any market to add it to your watchlist</small></div>`;
            return;
        }
        const watchlistMarkets = this.allMarkets.filter(m => this.watchlist.includes(m.symbol));
        if (watchlistMarkets.length === 0) {
            container.innerHTML = `<div class="empty-state"><div class="empty-state-icon">⭐</div><p>Markets in your watchlist are not available</p></div>`;
            return;
        }
        container.innerHTML = `<table class="watchlist-table"><thead><tr><th>Market</th><th>Price</th><th>24h Change</th><th>Volume</th><th>Action</th></tr></thead><tbody>${watchlistMarkets.map(market => `<tr><td><div class="market-info"><div class="market-icon">${market.icon || '📈'}</div><div><strong>${market.symbol}/USD</strong><br><small>${market.name}</small></div></div></td><td>$${this.formatPrice(market.price)}</td><td class="${market.change_24h >= 0 ? 'positive' : 'negative'}">${market.change_24h >= 0 ? '+' : ''}${market.change_24h}%</td><td>${market.volume || '—'}</td><td><button class="remove-watchlist" onclick="marketsManager.removeFromWatchlist('${market.symbol}')">🗑️</button><button class="trade-btn" onclick="marketsManager.openTradeModal('${market.symbol}', ${market.price})">Trade</button></td></tr>`).join('')}</tbody></table>`;
    }

    updateMarketStats() {
        const totalChange = this.allMarkets.reduce((sum, m) => sum + (m.change_24h || 0), 0) / this.allMarkets.length;
        const totalVolume = this.allMarkets.reduce((sum, m) => {
            let vol = 0;
            if (typeof m.volume === 'string') {
                if (m.volume.includes('B')) vol = parseFloat(m.volume);
                else if (m.volume.includes('M')) vol = parseFloat(m.volume) / 1000;
            } else { vol = m.volume || 0; }
            return sum + vol;
        }, 0);
        const btcMarket = this.allMarkets.find(m => m.symbol === 'BTC');
        const btcPrice = btcMarket ? btcMarket.price : 78312;
        const marketCapEl = document.getElementById('totalMarketCap');
        const volumeEl = document.getElementById('totalVolume');
        const changeEl = document.getElementById('marketCapChange');
        if (marketCapEl) marketCapEl.innerHTML = `$${(btcPrice * 19.5 / 1e12).toFixed(2)}T`;
        if (volumeEl) volumeEl.innerHTML = `$${totalVolume.toFixed(1)}B`;
        if (changeEl) { changeEl.innerHTML = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}%`; changeEl.className = `stat-change ${totalChange >= 0 ? 'positive' : 'negative'}`; }
    }

    setupEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentCategory = btn.dataset.category;
            this.applyFilters();
            this.renderMarkets();
        }));
        const searchInput = document.getElementById('marketSearch');
        if (searchInput) searchInput.addEventListener('input', (e) => { this.searchTerm = e.target.value; this.applyFilters(); this.renderMarkets(); });
        const sortSelect = document.getElementById('sortSelect');
        if (sortSelect) sortSelect.addEventListener('change', (e) => { this.currentSort = e.target.value; this.applyFilters(); this.renderMarkets(); });
        const clearBtn = document.getElementById('clearWatchlistBtn');
        if (clearBtn) clearBtn.addEventListener('click', async () => {
            if (confirm('Clear watchlist?')) {
                for (const symbol of this.watchlist) await supabaseDB.removeFromWatchlist(this.currentUser.id, symbol);
                this.watchlist = []; this.renderWatchlist(); this.renderMarkets(); this.showNotification('Watchlist cleared', 'info');
            }
        });
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        if (menuBtn && sidebar) menuBtn.addEventListener('click', () => sidebar.classList.toggle('show'));
        const modal = document.getElementById('tradeModal');
        const closeBtn = document.querySelector('.modal-close');
        if (closeBtn) closeBtn.onclick = () => { if (modal) modal.style.display = 'none'; };
        if (modal) window.onclick = (e) => { if (e.target === modal) modal.style.display = 'none'; };
        const tradeAmount = document.getElementById('tradeAmount');
        const leverage = document.getElementById('leverage');
        const tradeTypeBtns = document.querySelectorAll('.trade-type-btn');
        if (tradeAmount) tradeAmount.addEventListener('input', () => this.updateTradeEstimate());
        if (leverage) leverage.addEventListener('change', () => this.updateTradeEstimate());
        tradeTypeBtns.forEach(btn => btn.addEventListener('click', () => {
            tradeTypeBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const tradeTypeInput = document.getElementById('tradeType');
            if (tradeTypeInput) tradeTypeInput.value = btn.dataset.type;
            this.updateTradeEstimate();
        }));
        const confirmBtn = document.getElementById('confirmTradeBtn');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.executeTrade());
    }

    openTradeModal(symbol, currentPrice) {
        if (!this.currentUser) { if (confirm('Please login to start trading. Go to login page?')) window.location.href = 'login.html'; return; }
        const modal = document.getElementById('tradeModal'); if (!modal) return;
        document.getElementById('modalSymbol').textContent = `${symbol}/USD`;
        document.getElementById('modalPrice').textContent = `$${this.formatPrice(currentPrice)}`;
        document.getElementById('tradeSymbol').value = symbol;
        document.getElementById('currentPrice').value = currentPrice;
        document.getElementById('availableBalance').textContent = (this.currentUser?.balance || 0).toFixed(2);
        document.getElementById('tradeAmount').value = '';
        document.getElementById('leverage').value = '1';
        document.getElementById('tradeType').value = 'buy';
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
        document.getElementById('positionSize').textContent = `$${positionSize.toFixed(2)}`;
        document.getElementById('requiredMargin').textContent = `$${amount.toFixed(2)}`;
        document.getElementById('estProfit').innerHTML = `<span style="color: #00D897;">+$${(positionSize * 0.10).toFixed(2)}</span>`;
        const balance = this.currentUser?.balance || 0;
        const confirmBtn = document.getElementById('confirmTradeBtn');
        if (confirmBtn) {
            if (amount > balance) { confirmBtn.disabled = true; confirmBtn.textContent = 'Insufficient Balance'; }
            else if (amount < 10) { confirmBtn.disabled = true; confirmBtn.textContent = 'Minimum $10'; }
            else { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm Trade'; }
        }
    }

    async executeTrade() {
        const symbol = document.getElementById('tradeSymbol')?.value;
        const amount = parseFloat(document.getElementById('tradeAmount')?.value);
        const leverageVal = parseFloat(document.getElementById('leverage')?.value);
        const tradeType = document.getElementById('tradeType')?.value;
        const currentPrice = parseFloat(document.getElementById('currentPrice')?.value);
        if (!amount || amount < 10) { this.showNotification('Minimum trade amount is $10', 'error'); return; }
        if (amount > (this.currentUser?.balance || 0)) { this.showNotification('Insufficient balance', 'error'); return; }
        const newBalance = (this.currentUser.balance || 0) - amount;
        try {
            await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
            this.currentUser.balance = newBalance;
            const trade = { id: Date.now(), user_id: this.currentUser.id, symbol: symbol, type: tradeType, amount: amount, leverage: leverageVal, entry_price: currentPrice, current_price: currentPrice, pnl: 0, status: 'open', created_at: new Date().toISOString() };
            await supabaseDB.createTrade(trade);
            await supabaseDB.createUserActivity({ id: Date.now(), user_id: this.currentUser.id, type: 'trade', title: 'Trade Opened', description: `Opened ${tradeType.toUpperCase()} ${amount} USD ${symbol} @ ${leverageVal}x`, created_at: new Date().toISOString() });
            this.showNotification(`Trade opened: ${tradeType.toUpperCase()} ${amount} USD @ ${leverageVal}x`, 'success');
            document.getElementById('tradeModal').style.display = 'none';
            document.querySelectorAll('.user-balance').forEach(el => el.textContent = `$${newBalance.toFixed(2)}`);
            this.simulateTradeResult(trade);
        } catch (error) { this.showNotification('Failed to execute trade', 'error'); }
    }

    async simulateTradeResult(trade) {
        setTimeout(async () => {
            const isWin = Math.random() < 0.55;
            if (isWin) {
                const winAmount = trade.amount * 1.8;
                const newBalance = (this.currentUser.balance || 0) + winAmount;
                await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
                this.currentUser.balance = newBalance;
                await supabaseDB.updateTrade(trade.id, { status: 'closed', result: 'win', pnl: winAmount, close_price: trade.entry_price * 1.02, closed_at: new Date().toISOString() });
                await supabaseDB.createUserActivity({ id: Date.now(), user_id: this.currentUser.id, type: 'trade_win', title: 'Trade Won!', description: `Won $${winAmount.toFixed(2)} on ${trade.symbol}`, created_at: new Date().toISOString() });
                this.showNotification(`🎉 WIN! You won $${winAmount.toFixed(2)} on ${trade.symbol}!`, 'success');
            } else {
                await supabaseDB.updateTrade(trade.id, { status: 'closed', result: 'loss', pnl: -trade.amount, closed_at: new Date().toISOString() });
                await supabaseDB.createUserActivity({ id: Date.now(), user_id: this.currentUser.id, type: 'trade_loss', title: 'Trade Lost', description: `Lost $${trade.amount.toFixed(2)} on ${trade.symbol}`, created_at: new Date().toISOString() });
                this.showNotification(`😢 LOSS! You lost $${trade.amount.toFixed(2)} on ${trade.symbol}`, 'error');
            }
            document.querySelectorAll('.user-balance').forEach(el => el.textContent = `$${(this.currentUser.balance || 0).toFixed(2)}`);
        }, 60000);
    }

    startRealTimeUpdates() { this.updateInterval = setInterval(async () => { await this.updateMarketPrices(); }, 30000); }

    async updateMarketPrices() {
        try {
            const markets = await supabaseDB.getAllMarkets();
            if (markets && markets.length > 0) this.allMarkets = markets;
            else this.allMarkets = this.allMarkets.map(market => ({ ...market, price: market.price * (1 + (Math.random() - 0.5) * 0.002), change_24h: market.change_24h + (Math.random() - 0.5) * 0.2 }));
            this.applyFilters(); this.renderMarkets(); this.renderWatchlist(); this.updateMarketStats();
        } catch (error) { console.error('Error updating prices:', error); }
    }

    showNotification(message, type) { if (auth?.showNotification) auth.showNotification(message, type); else alert(message); }
    destroy() { if (this.updateInterval) clearInterval(this.updateInterval); }
}

let marketsManager = null;
document.addEventListener('DOMContentLoaded', () => { marketsManager = new MarketsManager(); });
window.toggleWatchlist = (symbol) => marketsManager?.toggleWatchlist(symbol);
window.removeFromWatchlist = (symbol) => marketsManager?.removeFromWatchlist(symbol);
window.openTradeModal = (symbol, price) => marketsManager?.openTradeModal(symbol, price);
window.logout = () => { if (auth?.logout) auth.logout(); };
