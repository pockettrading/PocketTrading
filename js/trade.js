// Trades Page Controller - PocketTrading
// File: js/trades.js
// Pure Supabase - No localStorage

class TradesManager {
    constructor() {
        this.currentUser = null;
        this.allTrades = [];
        this.filteredTrades = [];
        this.currentTab = 'open';
        this.currentSymbol = 'BTC';
        this.currentPrice = 78312.00;
        this.selectedDuration = 30;
        this.selectedPayout = 12;
        this.selectedMinAmount = 100;
        this.currentTradeType = 'buy';
        this.tvWidget = null;
        this.priceUpdateInterval = null;
        this.init();
    }

    async init() {
        await this.waitForDependencies();
        this.currentUser = auth.getUser();
        if (!this.currentUser) { window.location.href = 'login.html'; return; }
        await this.loadUserData();
        await this.loadTrades();
        this.setupNavigation();
        this.initTradingView();
        this.setupTradeForm();
        this.setupEventListeners();
        this.startPriceUpdates();
        this.updateStats();
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
            if (userData) this.currentUser = { ...this.currentUser, ...userData };
        } catch (error) { console.error('Error loading user data:', error); }
    }

    async loadTrades() {
        try {
            this.allTrades = await supabaseDB.getUserTrades(this.currentUser.id);
            this.applyFilters();
            this.renderTrades();
        } catch (error) { this.allTrades = []; this.renderTrades(); }
    }

    setupNavigation() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        const isAdmin = this.currentUser.email === 'ephremgojo@gmail.com';
        const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
        if (navLinks) navLinks.innerHTML = `<a href="index.html" class="nav-link">Home</a><a href="markets.html" class="nav-link">Markets</a><a href="trades.html" class="nav-link active">Trades</a><a href="profile.html" class="nav-link">My Profile</a>`;
        if (rightNav) rightNav.innerHTML = `<div class="user-section"><div class="user-info"><div class="user-avatar">${userName.charAt(0).toUpperCase()}</div><div class="user-name">${userName}${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</div></div>${isAdmin ? '<a href="admin.html" class="admin-link">⚙️ Admin Panel</a>' : ''}<button class="logout-btn" onclick="handleLogout()">Logout</button></div>`;
        if (mobileMenu) mobileMenu.innerHTML = `<a href="index.html" class="mobile-nav-link">🏠 Home</a><a href="markets.html" class="mobile-nav-link">📊 Markets</a><a href="trades.html" class="mobile-nav-link">🔄 Trades</a><a href="profile.html" class="mobile-nav-link">👤 My Profile</a>${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}<button class="logout-btn" style="margin-top:12px;" onclick="handleLogout()">Logout</button>`;
    }

    setupTradeForm() {
        const container = document.getElementById('tradeFormSection');
        if (!container) return;
        container.innerHTML = `<div class="trade-type-buttons"><button class="trade-type-btn buy active" data-type="buy">BUY</button><button class="trade-type-btn sell" data-type="sell">SELL</button></div>
            <div class="selected-coin"><div class="coin-name-large" id="selectedCoinName">Bitcoin</div><div class="coin-symbol" id="selectedCoinSymbol">BTC/USD</div><div class="current-price-large" id="currentPrice">$78,312.00</div><div class="live-badge">● LIVE</div></div>
            <div class="form-group"><div class="form-label">Amount (USDT)</div><input type="number" id="tradeAmount" class="amount-input" placeholder="Enter amount" min="10" step="10"></div>
            <div class="form-label">Select Duration</div>
            <div class="duration-grid"><div class="duration-btn" data-duration="30" data-payout="12" data-min="100"><div class="duration-time">30s</div><div class="duration-payout">+12%</div><div class="duration-min">Min $100</div></div>
            <div class="duration-btn" data-duration="60" data-payout="18" data-min="15000"><div class="duration-time">60s</div><div class="duration-payout">+18%</div><div class="duration-min">Min $15K</div></div>
            <div class="duration-btn" data-duration="90" data-payout="25" data-min="50000"><div class="duration-time">90s</div><div class="duration-payout">+25%</div><div class="duration-min">Min $50K</div></div>
            <div class="duration-btn" data-duration="180" data-payout="32" data-min="200000"><div class="duration-time">180s</div><div class="duration-payout">+32%</div><div class="duration-min">Min $200K</div></div>
            <div class="duration-btn" data-duration="300" data-payout="45" data-min="900000"><div class="duration-time">300s</div><div class="duration-payout">+45%</div><div class="duration-min">Min $900K</div></div></div>
            <div class="trade-summary"><div class="summary-row"><span>Available Balance:</span><span id="availableBalance">0.00 USDT</span></div>
            <div class="summary-row"><span>Transaction Fee (2%):</span><span id="feeAmount">0.00 USDT</span></div>
            <div class="summary-row total"><span>Total to Pay:</span><span id="totalAmount" style="color: #00D897;">0.00 USDT</span></div></div>
            <button class="confirm-btn" id="confirmTrade">Confirm Trade</button>`;
        this.attachTradeFormEvents();
    }

    attachTradeFormEvents() {
        const buyBtn = document.querySelector('.trade-type-btn.buy');
        const sellBtn = document.querySelector('.trade-type-btn.sell');
        if (buyBtn && sellBtn) {
            buyBtn.addEventListener('click', () => { buyBtn.classList.add('active'); sellBtn.classList.remove('active'); this.currentTradeType = 'buy'; this.updateTradeSummary(); });
            sellBtn.addEventListener('click', () => { sellBtn.classList.add('active'); buyBtn.classList.remove('active'); this.currentTradeType = 'sell'; this.updateTradeSummary(); });
        }
        document.querySelectorAll('.duration-btn').forEach(btn => btn.addEventListener('click', () => {
            document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.selectedDuration = parseInt(btn.dataset.duration);
            this.selectedPayout = parseInt(btn.dataset.payout);
            this.selectedMinAmount = parseInt(btn.dataset.min);
            this.updateTradeSummary();
        }));
        const amountInput = document.getElementById('tradeAmount');
        if (amountInput) amountInput.addEventListener('input', () => this.updateTradeSummary());
        const confirmBtn = document.getElementById('confirmTrade');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.executeTrade());
    }

    initTradingView() {
        const container = document.getElementById('tv_chart_container');
        if (!container || typeof TradingView === 'undefined') return;
        if (this.tvWidget) this.tvWidget.remove();
        this.tvWidget = new TradingView.widget({ container_id: "tv_chart_container", width: "100%", height: "100%", symbol: `BINANCE:${this.currentSymbol}USDT`, interval: "1", timezone: "Etc/UTC", theme: "dark", style: "1", locale: "en", toolbar_bg: "#131722", enable_publishing: false, hide_side_toolbar: false, allow_symbol_change: false, studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"], save_image: false, autosize: true });
        this.updateSelectedCoinDisplay();
    }

    updateSelectedCoinDisplay() {
        const coins = { BTC: { name: 'Bitcoin', price: 78312 }, ETH: { name: 'Ethereum', price: 2297.32 }, SOL: { name: 'Solana', price: 168.42 }, XRP: { name: 'Ripple', price: 0.624 }, DOGE: { name: 'Dogecoin', price: 0.162 }, BNB: { name: 'Binance Coin', price: 615.81 }, ADA: { name: 'Cardano', price: 0.483 } };
        const coin = coins[this.currentSymbol] || coins.BTC;
        this.currentPrice = coin.price;
        document.getElementById('selectedCoinName').textContent = coin.name;
        document.getElementById('selectedCoinSymbol').textContent = `${this.currentSymbol}/USD`;
        document.getElementById('currentPrice').textContent = `$${this.currentPrice.toLocaleString()}`;
    }

    updateTradeSummary() {
        const amount = parseFloat(document.getElementById('tradeAmount')?.value) || 0;
        const fee = amount * 0.02;
        const total = amount + fee;
        document.getElementById('feeAmount').textContent = `${fee.toFixed(2)} USDT`;
        document.getElementById('totalAmount').textContent = `${total.toFixed(2)} USDT`;
        const confirmBtn = document.getElementById('confirmTrade');
        const balance = this.currentUser?.balance || 0;
        if (confirmBtn) {
            if (amount < this.selectedMinAmount && amount > 0) { confirmBtn.disabled = true; confirmBtn.textContent = `Min $${this.selectedMinAmount.toLocaleString()}`; }
            else if (amount > balance) { confirmBtn.disabled = true; confirmBtn.textContent = 'Insufficient Balance'; }
            else if (amount < 10) { confirmBtn.disabled = true; confirmBtn.textContent = 'Minimum $10'; }
            else { confirmBtn.disabled = false; confirmBtn.textContent = 'Confirm Trade'; }
        }
        const balanceEl = document.getElementById('availableBalance');
        if (balanceEl) { balanceEl.textContent = `${balance.toFixed(2)} USDT`; balanceEl.style.color = balance > 0 ? '#00D897' : '#FF4757'; }
    }

    async executeTrade() {
        const amount = parseFloat(document.getElementById('tradeAmount')?.value);
        if (!amount || amount < 10) { this.showNotification('Please enter a valid amount (minimum $10)', 'error'); return; }
        if (amount < this.selectedMinAmount) { this.showNotification(`Minimum amount for ${this.selectedDuration}s is $${this.selectedMinAmount.toLocaleString()}`, 'error'); return; }
        const fee = amount * 0.02;
        const total = amount + fee;
        if (total > (this.currentUser?.balance || 0)) { this.showNotification('Insufficient balance', 'error'); return; }
        const newBalance = (this.currentUser.balance || 0) - total;
        try {
            await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
            this.currentUser.balance = newBalance;
            const trade = { id: Date.now(), user_id: this.currentUser.id, symbol: this.currentSymbol, type: this.currentTradeType, amount: amount, leverage: 1, entry_price: this.currentPrice, fee: fee, status: 'open', duration: this.selectedDuration, payout_percent: this.selectedPayout, created_at: new Date().toISOString() };
            await supabaseDB.createTrade(trade);
            await supabaseDB.createUserActivity({ id: Date.now(), user_id: this.currentUser.id, type: 'trade', title: 'Trade Placed', description: `${this.currentTradeType.toUpperCase()} $${amount} ${this.currentSymbol}`, created_at: new Date().toISOString() });
            this.showNotification(`Trade placed! ${this.currentTradeType.toUpperCase()} $${amount} ${this.currentSymbol} for ${this.selectedDuration}s`, 'success');
            document.getElementById('tradeAmount').value = '';
            this.updateTradeSummary();
            document.querySelectorAll('.user-balance, #availableBalance').forEach(el => el.textContent = `${newBalance.toFixed(2)} USDT`);
            this.simulateTradeResult(trade);
        } catch (error) { this.showNotification('Failed to execute trade', 'error'); }
    }

    async simulateTradeResult(trade) {
        setTimeout(async () => {
            const isWin = Math.random() < 0.55;
            if (isWin) {
                const winAmount = trade.amount * (1 + trade.payout_percent / 100);
                const newBalance = (this.currentUser.balance || 0) + winAmount;
                await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
                this.currentUser.balance = newBalance;
                await supabaseDB.updateTrade(trade.id, { status: 'closed', result: 'win', pnl: winAmount, closed_at: new Date().toISOString() });
                await supabaseDB.createUserActivity({ id: Date.now(), user_id: this.currentUser.id, type: 'trade_win', title: 'Trade Won!', description: `Won $${winAmount.toFixed(2)} on ${trade.symbol}`, created_at: new Date().toISOString() });
                this.showNotification(`🎉 WIN! You won $${winAmount.toFixed(2)} on ${trade.symbol}!`, 'success');
            } else {
                await supabaseDB.updateTrade(trade.id, { status: 'closed', result: 'loss', pnl: -trade.amount, closed_at: new Date().toISOString() });
                await supabaseDB.createUserActivity({ id: Date.now(), user_id: this.currentUser.id, type: 'trade_loss', title: 'Trade Lost', description: `Lost $${trade.amount.toFixed(2)} on ${trade.symbol}`, created_at: new Date().toISOString() });
                this.showNotification(`😢 LOSS! You lost $${trade.amount.toFixed(2)} on ${trade.symbol}`, 'error');
            }
            this.updateTradeSummary();
            document.querySelectorAll('.user-balance, #availableBalance').forEach(el => el.textContent = `${(this.currentUser.balance || 0).toFixed(2)} USDT`);
        }, this.selectedDuration * 1000);
    }

    applyFilters() {
        let filtered = [...this.allTrades];
        if (this.currentTab === 'open') filtered = filtered.filter(t => t.status === 'open');
        else if (this.currentTab === 'closed') filtered = filtered.filter(t => t.status === 'closed');
        this.filteredTrades = filtered;
    }

    renderTrades() {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody) return;
        if (this.filteredTrades.length === 0) { tbody.innerHTML = `<tr><td colspan="8"><div class="empty-state"><div class="empty-state-icon">📊</div><p>No trades found</p><small>Start trading from the Markets page</small></div></td></tr>`; return; }
        tbody.innerHTML = this.filteredTrades.map(trade => {
            const isOpen = trade.status === 'open';
            const currentPrice = trade.current_price || trade.entry_price;
            const pnl = trade.pnl || 0;
            return `<tr><td><strong>${trade.symbol}/USD</strong></td><td><span class="trade-type-badge ${trade.type === 'buy' ? 'trade-type-buy' : 'trade-type-sell'}">${trade.type === 'buy' ? 'BUY/LONG' : 'SELL/SHORT'}</span></td><td>$${this.formatPrice(trade.entry_price)}</td><td>$${this.formatPrice(currentPrice)}</td><td>$${trade.amount.toLocaleString()}</td><td>${trade.leverage || 1}x</td><td class="${pnl >= 0 ? 'positive' : 'negative'}">${pnl >= 0 ? '+' : ''}$${Math.abs(pnl).toLocaleString()}${trade.payout_percent ? `<br><small>(${trade.payout_percent}% payout)</small>` : ''}</td><td><span class="status-badge status-${trade.status}">${trade.status === 'open' ? 'Open' : 'Closed'}</span></td></tr>`;
        }).join('');
    }

    updateStats() {
        const totalInvested = this.allTrades.reduce((s, t) => s + t.amount, 0);
        const totalPnL = this.allTrades.reduce((s, t) => s + (t.pnl || 0), 0);
        const closedTrades = this.allTrades.filter(t => t.status === 'closed');
        const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length * 100).toFixed(1) : 0;
        const activeTrades = this.allTrades.filter(t => t.status === 'open').length;
        document.getElementById('totalInvested').textContent = `$${totalInvested.toLocaleString()}`;
        document.getElementById('totalPnL').innerHTML = `<span style="color: ${totalPnL >= 0 ? '#00D897' : '#FF4757'}">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span>`;
        document.getElementById('winRate').textContent = `${winRate}%`;
        document.getElementById('totalTrades').textContent = this.allTrades.length;
        document.getElementById('activeTrades').textContent = `${activeTrades} Active`;
    }

    formatPrice(price) { if (!price) return '0.00'; if (price < 1) return price.toFixed(4); return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }

    setupEventListeners() {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', () => {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentTab = btn.dataset.tab;
            this.applyFilters();
            this.renderTrades();
        }));
        document.querySelectorAll('.crypto-btn').forEach(btn => btn.addEventListener('click', () => {
            document.querySelectorAll('.crypto-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            this.currentSymbol = btn.dataset.symbol;
            if (this.tvWidget) this.tvWidget.setSymbol(`BINANCE:${this.currentSymbol}USDT`);
            this.updateSelectedCoinDisplay();
            this.updateTradeSummary();
        }));
        document.querySelectorAll('.time-btn').forEach(btn => btn.addEventListener('click', () => {
            document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            if (this.tvWidget) this.tvWidget.setInterval(btn.dataset.interval);
        }));
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
    }

    startPriceUpdates() { this.priceUpdateInterval = setInterval(() => { const change = (Math.random() - 0.5) * 100; this.currentPrice = Math.max(0.01, this.currentPrice + change); const priceEl = document.getElementById('currentPrice'); if (priceEl) priceEl.textContent = `$${this.currentPrice.toLocaleString()}`; }, 5000); }
    showNotification(message, type) { if (auth?.showNotification) auth.showNotification(message, type); else alert(message); }
    destroy() { if (this.priceUpdateInterval) clearInterval(this.priceUpdateInterval); }
}

let tradesManager = null;
document.addEventListener('DOMContentLoaded', () => { tradesManager = new TradesManager(); });
window.handleLogout = function() { if (auth?.logout) auth.logout(); else window.location.href = 'index.html'; };
