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
        
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }
        
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
            if (userData) {
                this.currentUser = { ...this.currentUser, ...userData };
                this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async loadTrades() {
        try {
            this.allTrades = await supabaseDB.getUserTrades(this.currentUser.id);
            this.applyFilters();
            this.renderTrades();
        } catch (error) {
            console.error('Error loading trades:', error);
            this.allTrades = [];
            this.renderTrades();
        }
    }

    setupNavigation() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        
        const isAdmin = this.currentUser.email === 'ephremgojo@gmail.com';
        const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
        
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link">Markets</a>
                <a href="trades.html" class="nav-link active">Trades</a>
                <a href="profile.html" class="nav-link">My Profile</a>
            `;
        }
        
        if (rightNav) {
            rightNav.innerHTML = `
                <div class="user-section">
                    <div class="user-info">
                        <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                        <div class="user-name">${userName}${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</div>
                    </div>
                    ${isAdmin ? '<a href="admin.html" class="admin-link">⚙️ Admin Panel</a>' : ''}
                    <button class="logout-btn" onclick="handleLogout()">Logout</button>
                </div>
            `;
        }
        
        if (mobileMenu) {
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">🏠 Home</a>
                <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
                <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
                <a href="profile.html" class="mobile-nav-link">👤 My Profile</a>
                ${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}
                <button class="logout-btn" style="margin-top:12px;" onclick="handleLogout()">Logout</button>
            `;
        }
    }

    setupTradeForm() {
        const tradeFormSection = document.getElementById('tradeFormSection');
        if (!tradeFormSection) return;
        
        tradeFormSection.innerHTML = `
            <div class="trade-type-buttons">
                <button class="trade-type-btn buy active" data-type="buy">BUY</button>
                <button class="trade-type-btn sell" data-type="sell">SELL</button>
            </div>

            <div class="selected-coin">
                <div class="coin-name-large" id="selectedCoinName">Bitcoin</div>
                <div class="coin-symbol" id="selectedCoinSymbol">BTC/USD</div>
                <div class="current-price-large" id="currentPrice">$78,312.00</div>
                <div class="live-badge">● LIVE</div>
            </div>

            <div class="form-group">
                <div class="form-label">Amount (USDT)</div>
                <input type="number" id="tradeAmount" class="amount-input" placeholder="Enter amount" min="10" step="10">
            </div>

            <div class="form-label">Select Duration</div>
            <div class="duration-grid" id="durationGrid">
                <div class="duration-btn" data-duration="30" data-payout="12" data-min="100">
                    <div class="duration-time">30s</div>
                    <div class="duration-payout">+12%</div>
                    <div class="duration-min">Min $100</div>
                </div>
                <div class="duration-btn" data-duration="60" data-payout="18" data-min="15000">
                    <div class="duration-time">60s</div>
                    <div class="duration-payout">+18%</div>
                    <div class="duration-min">Min $15K</div>
                </div>
                <div class="duration-btn" data-duration="90" data-payout="25" data-min="50000">
                    <div class="duration-time">90s</div>
                    <div class="duration-payout">+25%</div>
                    <div class="duration-min">Min $50K</div>
                </div>
                <div class="duration-btn" data-duration="180" data-payout="32" data-min="200000">
                    <div class="duration-time">180s</div>
                    <div class="duration-payout">+32%</div>
                    <div class="duration-min">Min $200K</div>
                </div>
                <div class="duration-btn" data-duration="300" data-payout="45" data-min="900000">
                    <div class="duration-time">300s</div>
                    <div class="duration-payout">+45%</div>
                    <div class="duration-min">Min $900K</div>
                </div>
            </div>

            <div class="trade-summary">
                <div class="summary-row">
                    <span>Available:</span>
                    <span id="availableBalance">0.00 USDT</span>
                </div>
                <div class="summary-row">
                    <span>Fee (2%):</span>
                    <span id="feeAmount">0.00 USDT</span>
                </div>
                <div class="summary-row total">
                    <span>Total:</span>
                    <span id="totalAmount" style="color: #00D897;">0.00 USDT</span>
                </div>
            </div>

            <button class="confirm-btn" id="confirmTrade">Confirm Trade</button>
        `;
        
        this.attachTradeFormEvents();
    }

    attachTradeFormEvents() {
        const buyBtn = document.querySelector('.trade-type-btn.buy');
        const sellBtn = document.querySelector('.trade-type-btn.sell');
        
        if (buyBtn && sellBtn) {
            buyBtn.addEventListener('click', () => {
                buyBtn.classList.add('active');
                sellBtn.classList.remove('active');
                this.currentTradeType = 'buy';
                this.updateTradeSummary();
            });
            sellBtn.addEventListener('click', () => {
                sellBtn.classList.add('active');
                buyBtn.classList.remove('active');
                this.currentTradeType = 'sell';
                this.updateTradeSummary();
            });
        }

        document.querySelectorAll('.duration-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.duration-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.selectedDuration = parseInt(btn.dataset.duration);
                this.selectedPayout = parseInt(btn.dataset.payout);
                this.selectedMinAmount = parseInt(btn.dataset.min);
                this.updateTradeSummary();
            });
        });

        const amountInput = document.getElementById('tradeAmount');
        if (amountInput) amountInput.addEventListener('input', () => this.updateTradeSummary());

        const confirmBtn = document.getElementById('confirmTrade');
        if (confirmBtn) confirmBtn.addEventListener('click', () => this.executeTrade());
    }

    initTradingView() {
        const container = document.getElementById('tv_chart_container');
        if (!container || typeof TradingView === 'undefined') return;
        
        const pair = `BINANCE:${this.currentSymbol}USDT`;
        
        if (this.tvWidget) this.tvWidget.remove();
        
        this.tvWidget = new TradingView.widget({
            container_id: "tv_chart_container",
            width: "100%",
            height: "100%",
            symbol: pair,
            interval: "1",
            timezone: "Etc/UTC",
            theme: "dark",
            style: "1",
            locale: "en",
            toolbar_bg: "#131722",
            enable_publishing: false,
            hide_side_toolbar: false,
            allow_symbol_change: false,
            studies: ["RSI@tv-basicstudies", "MACD@tv-basicstudies"],
            save_image: false,
            autosize: true
        });
        
        this.updateSelectedCoinDisplay();
    }

    updateSelectedCoinDisplay() {
        const coinNames = {
            BTC: { name: 'Bitcoin', price: 78312.00 },
            ETH: { name: 'Ethereum', price: 2297.32 },
            SOL: { name: 'Solana', price: 168.42 },
            XRP: { name: 'Ripple', price: 0.624 },
            DOGE: { name: 'Dogecoin', price: 0.162 },
            BNB: { name: 'Binance Coin', price: 615.81 },
            ADA: { name: 'Cardano', price: 0.483 }
        };
        
        const coin = coinNames[this.currentSymbol] || coinNames.BTC;
        this.currentPrice = coin.price;
        
        const nameEl = document.getElementById('selectedCoinName');
        const symbolEl = document.getElementById('selectedCoinSymbol');
        const priceEl = document.getElementById('currentPrice');
        
        if (nameEl) nameEl.textContent = coin.name;
        if (symbolEl) symbolEl.textContent = `${this.currentSymbol}/USD`;
        if (priceEl) priceEl.textContent = `$${this.currentPrice.toLocaleString()}`;
    }

    updateTradeSummary() {
        const amount = parseFloat(document.getElementById('tradeAmount')?.value) || 0;
        const fee = amount * 0.02;
        const total = amount + fee;
        
        const feeEl = document.getElementById('feeAmount');
        const totalEl = document.getElementById('totalAmount');
        const confirmBtn = document.getElementById('confirmTrade');
        const balance = this.currentUser?.balance || 0;
        
        if (feeEl) feeEl.textContent = `${fee.toFixed(2)} USDT`;
        if (totalEl) totalEl.textContent = `${total.toFixed(2)} USDT`;
        
        if (confirmBtn) {
            if (amount < this.selectedMinAmount && amount > 0) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = `Min $${this.selectedMinAmount.toLocaleString()}`;
            } else if (amount > balance) {
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
        
        const balanceEl = document.getElementById('availableBalance');
        if (balanceEl) {
            balanceEl.textContent = `${balance.toFixed(2)} USDT`;
            balanceEl.style.color = balance > 0 ? '#00D897' : '#FF4757';
        }
    }

    async executeTrade() {
        const amount = parseFloat(document.getElementById('tradeAmount')?.value);
        
        if (!amount || amount < 10) {
            this.showNotification('Please enter a valid amount (minimum $10)', 'error');
            return;
        }
        
        if (amount < this.selectedMinAmount) {
            this.showNotification(`Minimum amount for ${this.selectedDuration}s is $${this.selectedMinAmount.toLocaleString()}`, 'error');
            return;
        }
        
        const fee = amount * 0.02;
        const total = amount + fee;
        
        if (total > (this.currentUser?.balance || 0)) {
            this.showNotification('Insufficient balance', 'error');
            return;
        }
        
        const newBalance = (this.currentUser.balance || 0) - total;
        
        try {
            // Update balance in Supabase
            await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
            this.currentUser.balance = newBalance;
            
            // Create trade record
            const trade = {
                id: Date.now(),
                user_id: this.currentUser.id,
                symbol: this.currentSymbol,
                type: this.currentTradeType,
                amount: amount,
                leverage: 1,
                entry_price: this.currentPrice,
                fee: fee,
                status: 'open',
                duration: this.selectedDuration,
                payout_percent: this.selectedPayout,
                created_at: new Date().toISOString()
            };
            
            await supabaseDB.createTrade(trade);
            
            // Create activity record
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: this.currentUser.id,
                type: 'trade',
                title: 'Trade Placed',
                description: `${this.currentTradeType.toUpperCase()} $${amount} ${this.currentSymbol}`,
                created_at: new Date().toISOString()
            });
            
            this.showNotification(`Trade placed! ${this.currentTradeType.toUpperCase()} $${amount} ${this.currentSymbol} for ${this.selectedDuration}s`, 'success');
            
            // Reset form
            const amountInput = document.getElementById('tradeAmount');
            if (amountInput) amountInput.value = '';
            this.updateTradeSummary();
            
            // Update balance display
            const balanceElements = document.querySelectorAll('.user-balance');
            balanceElements.forEach(el => {
                el.textContent = `$${newBalance.toFixed(2)}`;
            });
            
            // Simulate trade result
            this.simulateTradeResult(trade);
            
        } catch (error) {
            console.error('Error executing trade:', error);
            this.showNotification('Failed to execute trade', 'error');
        }
    }

    async simulateTradeResult(trade) {
        setTimeout(async () => {
            const isWin = Math.random() < 0.55;
            
            if (isWin) {
                const winAmount = trade.amount * (1 + trade.payout_percent / 100);
                const newBalance = (this.currentUser.balance || 0) + winAmount;
                
                // Update balance
                await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
                this.currentUser.balance = newBalance;
                
                // Update trade record
                await supabaseDB.updateTrade(trade.id, {
                    status: 'closed',
                    result: 'win',
                    pnl: winAmount,
                    closed_at: new Date().toISOString()
                });
                
                // Create activity
                await supabaseDB.createUserActivity({
                    id: Date.now(),
                    user_id: this.currentUser.id,
                    type: 'trade_win',
                    title: 'Trade Won!',
                    description: `Won $${winAmount.toFixed(2)} on ${trade.symbol}`,
                    created_at: new Date().toISOString()
                });
                
                this.showNotification(`🎉 WIN! You won $${winAmount.toFixed(2)} on ${trade.symbol}!`, 'success');
            } else {
                // Update trade record as loss
                await supabaseDB.updateTrade(trade.id, {
                    status: 'closed',
                    result: 'loss',
                    pnl: -trade.amount,
                    closed_at: new Date().toISOString()
                });
                
                // Create activity
                await supabaseDB.createUserActivity({
                    id: Date.now(),
                    user_id: this.currentUser.id,
                    type: 'trade_loss',
                    title: 'Trade Lost',
                    description: `Lost $${trade.amount.toFixed(2)} on ${trade.symbol}`,
                    created_at: new Date().toISOString()
                });
                
                this.showNotification(`😢 LOSS! You lost $${trade.amount.toFixed(2)} on ${trade.symbol}`, 'error');
            }
            
            // Update stats
            await this.loadTrades();
            this.updateStats();
            
            // Update balance display
            const balanceElements = document.querySelectorAll('.user-balance, #availableBalance');
            balanceElements.forEach(el => {
                el.textContent = `$${(this.currentUser.balance || 0).toFixed(2)} USDT`;
            });
        }, this.selectedDuration * 1000);
    }

    applyFilters() {
        let filtered = [...this.allTrades];
        
        if (this.currentTab === 'open') {
            filtered = filtered.filter(t => t.status === 'open');
        } else if (this.currentTab === 'closed') {
            filtered = filtered.filter(t => t.status === 'closed');
        }
        
        this.filteredTrades = filtered;
    }

    renderTrades() {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody) return;
        
        if (this.filteredTrades.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="8">
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
            const currentPrice = trade.current_price || trade.entry_price;
            const pnl = trade.pnl || 0;
            const pnlClass = pnl >= 0 ? 'positive' : 'negative';
            const pnlSymbol = pnl >= 0 ? '+' : '';
            
            return `
                <tr>
                    <td><strong>${trade.symbol}/USD</strong></td>
                    <td>
                        <span class="trade-type-badge ${trade.type === 'buy' ? 'trade-type-buy' : 'trade-type-sell'}">
                            ${trade.type === 'buy' ? 'BUY/LONG' : 'SELL/SHORT'}
                        </span>
                    </td>
                    <td>$${this.formatPrice(trade.entry_price)}</td>
                    <td>$${this.formatPrice(currentPrice)}</td>
                    <td>$${trade.amount.toLocaleString()}</td>
                    <td>${trade.leverage || 1}x</td>
                    <td class="${pnlClass}">
                        ${pnlSymbol}$${Math.abs(pnl).toLocaleString()}
                        ${trade.payout_percent ? `<br><small>(${trade.payout_percent}% payout)</small>` : ''}
                    </td>
                    <td>
                        <span class="status-badge status-${trade.status}">
                            ${trade.status === 'open' ? 'Open' : 'Closed'}
                        </span>
                    </td>
                </tr>
            `;
        }).join('');
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
        const winRateEl = document.getElementById('winRate');
        const totalTradesEl = document.getElementById('totalTrades');
        const activeTradesEl = document.getElementById('activeTrades');
        
        if (totalInvestedEl) totalInvestedEl.textContent = `$${totalInvested.toLocaleString()}`;
        if (totalPnLEl) {
            totalPnLEl.innerHTML = `<span style="color: ${totalPnL >= 0 ? '#00D897' : '#FF4757'}">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span>`;
        }
        if (winRateEl) winRateEl.textContent = `${winRate}%`;
        if (totalTradesEl) totalTradesEl.textContent = this.allTrades.length;
        if (activeTradesEl) activeTradesEl.textContent = `${activeTrades} Active`;
    }

    formatPrice(price) {
        if (!price) return '0.00';
        if (price < 1) return price.toFixed(4);
        return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
        
        // Crypto selector
        const cryptoBtns = document.querySelectorAll('.crypto-btn');
        cryptoBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                cryptoBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentSymbol = btn.dataset.symbol;
                if (this.tvWidget) {
                    this.tvWidget.setSymbol(`BINANCE:${this.currentSymbol}USDT`);
                }
                this.updateSelectedCoinDisplay();
                this.updateTradeSummary();
            });
        });
        
        // Timeframe buttons
        const timeBtns = document.querySelectorAll('.time-btn');
        timeBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                timeBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                if (this.tvWidget) {
                    this.tvWidget.setInterval(btn.dataset.interval);
                }
            });
        });
        
        // Mobile menu
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    startPriceUpdates() {
        this.priceUpdateInterval = setInterval(() => {
            // Simulate small price changes
            const change = (Math.random() - 0.5) * 100;
            this.currentPrice = Math.max(0.01, this.currentPrice + change);
            const priceEl = document.getElementById('currentPrice');
            if (priceEl) priceEl.textContent = `$${this.currentPrice.toLocaleString()}`;
        }, 5000);
    }

    showNotification(message, type) {
        if (typeof auth !== 'undefined' && auth.showNotification) {
            auth.showNotification(message, type);
        } else {
            alert(message);
        }
    }

    destroy() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }
    }
}

// Initialize when DOM is ready
let tradesManager = null;

document.addEventListener('DOMContentLoaded', () => {
    tradesManager = new TradesManager();
});

// Global functions
window.handleLogout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        window.location.href = 'index.html';
    }
};
