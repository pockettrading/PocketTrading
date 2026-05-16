// Trades Page Controller - PocketTrading
// File: js/trades.js
// Pure Supabase - No localStorage

class TradesManager {
    constructor() {
        this.currentUser = null;
        this.currentSymbol = 'BTC';
        this.currentPrice = 78312.00;
        this.currentTradeType = 'buy';
        this.selectedDuration = 30;
        this.selectedPayout = 12;
        this.selectedMinAmount = 100;
        this.tvWidget = null;
        this.priceUpdateInterval = null;
        this.init();
    }

    async init() {
        await this.waitForDependencies();
        await this.waitForSession();
        
        this.currentUser = auth.getUser();
        
        if (!this.currentUser) {
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) {
                try {
                    const user = await supabaseDB.getUserById(parseInt(userId));
                    if (user) {
                        this.currentUser = user;
                        this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                        if (typeof auth !== 'undefined') auth.currentUser = user;
                    }
                } catch (e) {}
            }
        }
        
        this.updateNavbar();
        
        if (this.currentUser) {
            await this.loadUserBalance();
            this.showTradeForm();
            this.initTradingView();
            this.setupEventListeners();
            this.startPriceUpdates();
        } else {
            this.showLoginRequired();
            this.initTradingView();
            this.setupEventListeners();
            this.startPriceUpdates();
        }
        
        window.addEventListener('authStateChanged', (e) => {
            this.currentUser = e.detail.user;
            this.updateNavbar();
            if (this.currentUser) {
                this.showTradeForm();
                this.loadUserBalance();
            } else {
                this.showLoginRequired();
            }
        });
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && typeof supabaseDB !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 5000);
        });
    }

    async waitForSession() {
        return new Promise((resolve) => {
            if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                resolve();
                return;
            }
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) {
                resolve();
                return;
            }
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 3000);
        });
    }

    updateNavbar() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (!navLinks) return;
        
        if (this.currentUser) {
            const isAdmin = this.currentUser.email === 'ephremgojo@gmail.com';
            const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
            
            navLinks.innerHTML = `
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link">Markets</a>
                <a href="trades.html" class="nav-link active">Trades</a>
                <a href="profile.html" class="nav-link">My Profile</a>
            `;
            
            rightNav.innerHTML = `
                <div class="user-section">
                    <div class="user-info">
                        <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                        <div class="user-name">${userName}${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</div>
                    </div>
                    ${isAdmin ? '<a href="admin.html" class="admin-link">⚙️ Admin Panel</a>' : ''}
                    <button class="logout-btn" onclick="window.logout()">Logout</button>
                </div>
            `;
            
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">🏠 Home</a>
                <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
                <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
                <a href="profile.html" class="mobile-nav-link">👤 My Profile</a>
                ${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}
                <button class="logout-btn" style="margin-top:12px;" onclick="window.logout()">Logout</button>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link">Markets</a>
                <a href="trades.html" class="nav-link active">Trades</a>
            `;
            
            rightNav.innerHTML = `
                <div class="guest-buttons">
                    <a href="login.html" class="btn-login">Login</a>
                    <a href="login.html" class="btn-register">Register</a>
                </div>
            `;
            
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">🏠 Home</a>
                <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
                <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
                <a href="login.html" class="mobile-nav-link">🔐 Login</a>
                <a href="login.html" class="mobile-nav-link">📝 Register</a>
            `;
        }
    }

    showLoginRequired() {
        const container = document.getElementById('tradeFormSection');
        if (!container) return;
        
        container.innerHTML = `
            <div class="login-required">
                <div class="login-required-icon">🔒</div>
                <h3>Login Required</h3>
                <p>Please login or register to start trading</p>
                <div class="login-buttons">
                    <a href="login.html" class="btn-login">Login</a>
                    <a href="login.html" class="btn-register">Register</a>
                </div>
            </div>
        `;
    }

    showTradeForm() {
        const container = document.getElementById('tradeFormSection');
        if (!container) return;
        
        container.innerHTML = `
            <div class="trade-type-buttons">
                <button class="trade-type-btn buy active" data-type="buy">BUY</button>
                <button class="trade-type-btn sell" data-type="sell">SELL</button>
            </div>

            <div class="selected-coin">
                <div class="coin-name-large" id="selectedCoinName">Bitcoin</div>
                <div class="coin-symbol" id="selectedCoinSymbol">BTC/USD</div>
                <div class="current-price-large" id="currentPrice">$${this.currentPrice.toLocaleString()}</div>
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
                    <span>Available Balance:</span>
                    <span id="availableBalance">0.00 USDT</span>
                </div>
                <div class="summary-row">
                    <span>Transaction Fee (2%):</span>
                    <span id="feeAmount">0.00 USDT</span>
                </div>
                <div class="summary-row total">
                    <span>Total to Pay:</span>
                    <span id="totalAmount" style="color: #00D897;">0.00 USDT</span>
                </div>
            </div>

            <button class="confirm-btn" id="confirmTrade">Confirm Trade</button>
        `;
        
        this.attachTradeFormEvents();
        this.updateUserBalance();
        this.updateTradeSummary();
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

    async loadUserBalance() {
        if (this.currentUser) {
            const balance = this.currentUser.balance || 0;
            const balanceEl = document.getElementById('availableBalance');
            if (balanceEl) {
                balanceEl.textContent = `${balance.toFixed(2)} USDT`;
                balanceEl.style.color = balance > 0 ? '#00D897' : '#FF4757';
            }
        }
    }

    updateUserBalance() {
        if (this.currentUser) {
            const balance = this.currentUser.balance || 0;
            const balanceEl = document.getElementById('availableBalance');
            if (balanceEl) {
                balanceEl.textContent = `${balance.toFixed(2)} USDT`;
                balanceEl.style.color = balance > 0 ? '#00D897' : '#FF4757';
            }
        }
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
            } else if (amount < 10 && amount > 0) {
                confirmBtn.disabled = true;
                confirmBtn.textContent = 'Minimum $10';
            } else {
                confirmBtn.disabled = false;
                confirmBtn.textContent = 'Confirm Trade';
            }
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
            if (typeof supabaseDB !== 'undefined') {
                await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
            }
            
            this.currentUser.balance = newBalance;
            sessionStorage.setItem('pocket_user_id', this.currentUser.id);
            
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
            
            if (typeof supabaseDB !== 'undefined') {
                await supabaseDB.createTrade(trade);
                await supabaseDB.createUserActivity({
                    id: Date.now(),
                    user_id: this.currentUser.id,
                    type: 'trade',
                    title: 'Trade Placed',
                    description: `${this.currentTradeType.toUpperCase()} $${amount} ${this.currentSymbol}`,
                    created_at: new Date().toISOString()
                });
            }
            
            this.showNotification(`Trade placed! ${this.currentTradeType.toUpperCase()} $${amount} ${this.currentSymbol} for ${this.selectedDuration}s`, 'success');
            
            const amountInput = document.getElementById('tradeAmount');
            if (amountInput) amountInput.value = '';
            this.updateTradeSummary();
            this.updateUserBalance();
            
            this.simulateTradeResult(trade);
        } catch (error) {
            console.error('Error executing trade:', error);
            this.showNotification('Failed to execute trade', 'error');
        }
    }

    simulateTradeResult(trade) {
        setTimeout(async () => {
            const isWin = Math.random() < 0.55;
            
            if (isWin) {
                const winAmount = trade.amount * (1 + trade.payout_percent / 100);
                const newBalance = (this.currentUser.balance || 0) + winAmount;
                
                if (typeof supabaseDB !== 'undefined') {
                    await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
                    await supabaseDB.updateTrade(trade.id, {
                        status: 'closed',
                        result: 'win',
                        pnl: winAmount,
                        closed_at: new Date().toISOString()
                    });
                    await supabaseDB.createUserActivity({
                        id: Date.now(),
                        user_id: this.currentUser.id,
                        type: 'trade_win',
                        title: 'Trade Won!',
                        description: `Won $${winAmount.toFixed(2)} on ${trade.symbol}`,
                        created_at: new Date().toISOString()
                    });
                }
                
                this.currentUser.balance = newBalance;
                this.showNotification(`🎉 WIN! You won $${winAmount.toFixed(2)} on ${trade.symbol}!`, 'success');
            } else {
                if (typeof supabaseDB !== 'undefined') {
                    await supabaseDB.updateTrade(trade.id, {
                        status: 'closed',
                        result: 'loss',
                        pnl: -trade.amount,
                        closed_at: new Date().toISOString()
                    });
                    await supabaseDB.createUserActivity({
                        id: Date.now(),
                        user_id: this.currentUser.id,
                        type: 'trade_loss',
                        title: 'Trade Lost',
                        description: `Lost $${trade.amount.toFixed(2)} on ${trade.symbol}`,
                        created_at: new Date().toISOString()
                    });
                }
                
                this.showNotification(`😢 LOSS! You lost $${trade.amount.toFixed(2)} on ${trade.symbol}`, 'error');
            }
            
            this.updateUserBalance();
        }, this.selectedDuration * 1000);
    }

    initTradingView() {
        const container = document.getElementById('tv_chart_container');
        if (!container || typeof TradingView === 'undefined') return;
        
        if (this.tvWidget) this.tvWidget.remove();
        
        this.tvWidget = new TradingView.widget({
            container_id: "tv_chart_container",
            width: "100%",
            height: "100%",
            symbol: `BINANCE:${this.currentSymbol}USDT`,
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
            BTC: { name: 'Bitcoin', price: 78312 },
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

    changeSymbol(symbol) {
        this.currentSymbol = symbol;
        this.updateSelectedCoinDisplay();
        if (this.tvWidget) {
            this.tvWidget.setSymbol(`BINANCE:${symbol}USDT`);
        }
        this.updateTradeSummary();
    }

    changeInterval(interval) {
        if (this.tvWidget) this.tvWidget.setInterval(interval);
    }

    startPriceUpdates() {
        this.priceUpdateInterval = setInterval(() => {
            const change = (Math.random() - 0.5) * 50;
            this.currentPrice = Math.max(0.01, this.currentPrice + change);
            const priceEl = document.getElementById('currentPrice');
            if (priceEl) priceEl.textContent = `$${this.currentPrice.toLocaleString()}`;
            this.updateTradeSummary();
        }, 5000);
    }

    setupEventListeners() {
        document.querySelectorAll('.crypto-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.crypto-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.changeSymbol(btn.dataset.symbol);
            });
        });

        document.querySelectorAll('.time-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.time-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.changeInterval(btn.dataset.interval);
            });
        });

        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    showNotification(message, type) {
        if (typeof auth !== 'undefined' && auth.showNotification) {
            auth.showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#FF4757' : '#00D897'};
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                z-index: 10000;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    }

    destroy() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }
    }
}

let tradesManager = null;

document.addEventListener('DOMContentLoaded', () => {
    tradesManager = new TradesManager();
});

window.logout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        sessionStorage.removeItem('pocket_user_id');
        localStorage.removeItem('pocket_user_id');
        window.location.href = 'index.html';
    }
};
