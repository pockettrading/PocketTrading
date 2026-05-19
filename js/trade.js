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
            window.location.href = 'login.html';
            return;
        }
        
        this.updateNavbar();
        await this.loadUserBalance();
        this.showTradeForm();
        this.initTradingView();
        this.setupEventListeners();
        this.startPriceUpdates();
        
        window.addEventListener('authStateChanged', (e) => {
            this.currentUser = e.detail.user;
            this.updateNavbar();
            if (this.currentUser) {
                this.loadUserBalance();
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
    }

    async loadUserBalance() {
        try {
            const userData = await supabaseDB.getUserById(this.currentUser.id);
            if (userData) {
                this.currentUser.balance = userData.balance || 0;
                const balanceEl = document.getElementById('availableBalance');
                if (balanceEl) {
                    balanceEl.textContent = `${this.currentUser.balance.toFixed(2)} USDT`;
                    balanceEl.style.color = this.currentUser.balance > 0 ? '#00D897' : '#FF4757';
                }
            }
        } catch (error) {
            console.error('Error loading balance:', error);
        }
    }

    showTradeForm() {
        const container = document.getElementById('tradeFormSection');
        if (!container) return;
        
        const cryptoData = {
            BTC: { name: 'Bitcoin', price: 78312.00 },
            ETH: { name: 'Ethereum', price: 2297.32 },
            SOL: { name: 'Solana', price: 168.42 },
            XRP: { name: 'Ripple', price: 0.624 },
            DOGE: { name: 'Dogecoin', price: 0.162 },
            BNB: { name: 'Binance Coin', price: 615.81 },
            ADA: { name: 'Cardano', price: 0.483 }
        };
        
        container.innerHTML = `
            <div class="trade-type-buttons">
                <button class="trade-type-btn buy active" data-type="buy">BUY</button>
                <button class="trade-type-btn sell" data-type="sell">SELL</button>
            </div>

            <div class="selected-coin">
                <div class="coin-name-large" id="selectedCoinName">${cryptoData[this.currentSymbol].name}</div>
                <div class="coin-symbol" id="selectedCoinSymbol">${this.currentSymbol}/USD</div>
                <div class="current-price-large" id="currentPrice">$${cryptoData[this.currentSymbol].price.toLocaleString()}</div>
                <div class="live-badge">● LIVE</div>
            </div>

            <div class="form-group">
                <div class="form-label">Amount (USDT)</div>
                <input type="number" id="tradeAmount" class="amount-input" placeholder="Enter amount" min="10" step="10">
            </div>

            <div class="form-label">Select Duration</div>
            <div class="duration-grid" id="durationGrid">
                <div class="duration-btn active" data-duration="30" data-payout="12" data-min="100">
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
                    <span id="availableBalance">${(this.currentUser?.balance || 0).toFixed(2)} USDT</span>
                </div>
                <div class="summary-row">
                    <span>Transaction Fee (2%):</span>
                    <span id="feeAmount">0.00 USDT</span>
                </div>
                <div class="summary-row total">
                    <span>Total to Pay:</span>
                    <span id="totalAmount" style="color: #00D897;">0.00 USDT</span>
                </div>
                <div class="summary-row potential-win" style="margin-top: 8px; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.1);">
                    <span>🎯 Potential Win:</span>
                    <span id="potentialWinAmount" style="color: #00D897; font-weight: 700;">$0.00</span>
                </div>
                <div class="summary-row total-return">
                    <span>💰 Total Return if Win:</span>
                    <span id="totalReturnAmount" style="color: #00D897; font-weight: 700;">$0.00</span>
                </div>
            </div>

            <button class="confirm-btn" id="confirmTrade">Confirm Trade</button>
        `;
        
        this.attachEvents();
        this.updateTradeSummary();
    }

    attachEvents() {
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
        if (amountInput) {
            amountInput.addEventListener('input', () => this.updateTradeSummary());
        }

        const confirmBtn = document.getElementById('confirmTrade');
        if (confirmBtn) {
            confirmBtn.addEventListener('click', () => this.executeTrade());
        }
    }

    updateTradeSummary() {
        const amount = parseFloat(document.getElementById('tradeAmount')?.value) || 0;
        const fee = amount * 0.02;
        const total = amount + fee;
        
        const profitAmount = amount * (this.selectedPayout / 100);
        const totalReturn = amount + profitAmount;
        
        const feeEl = document.getElementById('feeAmount');
        const totalEl = document.getElementById('totalAmount');
        const potentialWinEl = document.getElementById('potentialWinAmount');
        const totalReturnEl = document.getElementById('totalReturnAmount');
        const confirmBtn = document.getElementById('confirmTrade');
        const balance = this.currentUser?.balance || 0;
        
        if (feeEl) feeEl.textContent = `${fee.toFixed(2)} USDT`;
        if (totalEl) totalEl.textContent = `${total.toFixed(2)} USDT`;
        
        if (potentialWinEl) {
            if (amount > 0) {
                potentialWinEl.innerHTML = `+$${profitAmount.toFixed(2)} (${this.selectedPayout}%)`;
            } else {
                potentialWinEl.textContent = '$0.00';
            }
        }
        
        if (totalReturnEl) {
            if (amount > 0) {
                totalReturnEl.innerHTML = `$${totalReturn.toFixed(2)}`;
            } else {
                totalReturnEl.textContent = '$0.00';
            }
        }
        
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
        
        const profitAmount = amount * (this.selectedPayout / 100);
        const winAmount = amount + profitAmount;
        
        try {
            // Deduct balance for the trade (amount + fee)
            const newBalance = (this.currentUser.balance || 0) - total;
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
                expected_payout: winAmount,
                created_at: new Date().toISOString()
            };
            
            await supabaseDB.createTrade(trade);
            
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: this.currentUser.id,
                type: 'trade',
                title: 'Trade Placed',
                description: `${this.currentTradeType.toUpperCase()} $${amount} ${this.currentSymbol} for ${this.selectedDuration}s (${this.selectedPayout}% payout)`,
                created_at: new Date().toISOString()
            });
            
            this.showNotification(`Trade placed! ${this.currentTradeType.toUpperCase()} $${amount} for ${this.selectedDuration}s. Potential win: $${profitAmount.toFixed(2)} (${this.selectedPayout}%)`, 'success');
            
            // Reset amount input
            document.getElementById('tradeAmount').value = '';
            this.updateTradeSummary();
            this.updateBalanceDisplay();
            
            // Simulate trade result
            this.simulateTradeResult(trade);
            
        } catch (error) {
            console.error('Error executing trade:', error);
            this.showNotification('Failed to execute trade. Please try again.', 'error');
        }
    }

    async updateBalanceDisplay() {
        try {
            const userData = await supabaseDB.getUserById(this.currentUser.id);
            if (userData) {
                this.currentUser.balance = userData.balance || 0;
                const balanceEl = document.getElementById('availableBalance');
                if (balanceEl) {
                    balanceEl.textContent = `${this.currentUser.balance.toFixed(2)} USDT`;
                    balanceEl.style.color = this.currentUser.balance > 0 ? '#00D897' : '#FF4757';
                }
            }
        } catch (error) {
            console.error('Error updating balance display:', error);
        }
    }

    simulateTradeResult(trade) {
        const profitAmount = trade.amount * (trade.payout_percent / 100);
        const winAmount = trade.amount + profitAmount;
        
        this.showNotification(`Trade in progress! Result in ${trade.duration} seconds...`, 'info');
        
        setTimeout(async () => {
            const isWin = Math.random() < 0.55;
            
            if (isWin) {
                // WIN: Add win amount to balance
                const newBalance = (this.currentUser.balance || 0) + winAmount;
                await supabaseDB.updateUserBalance(this.currentUser.id, newBalance);
                this.currentUser.balance = newBalance;
                
                await supabaseDB.updateTrade(trade.id, {
                    status: 'closed',
                    result: 'win',
                    pnl: winAmount,
                    profit_percent: trade.payout_percent,
                    closed_at: new Date().toISOString()
                });
                
                await supabaseDB.createUserActivity({
                    id: Date.now(),
                    user_id: this.currentUser.id,
                    type: 'trade_win',
                    title: 'Trade Won!',
                    description: `Won $${winAmount.toFixed(2)} on ${trade.symbol} ($${profitAmount.toFixed(2)} profit at ${trade.payout_percent}%)`,
                    created_at: new Date().toISOString()
                });
                
                await supabaseDB.createTransaction({
                    id: Date.now(),
                    user_id: this.currentUser.id,
                    amount: winAmount,
                    type: 'trade_win',
                    description: `Won trade on ${trade.symbol}`,
                    date: new Date().toISOString()
                });
                
                this.updateBalanceDisplay();
                this.showNotification(`🎉 WIN! You won $${winAmount.toFixed(2)}! ($${profitAmount.toFixed(2)} profit at ${trade.payout_percent}%)`, 'success');
                
            } else {
                // LOSS: No balance change (already deducted)
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
                
                this.showNotification(`😢 LOSS! You lost $${trade.amount.toFixed(2)}`, 'error');
            }
        }, trade.duration * 1000);
    }

    initTradingView() {
        const container = document.getElementById('tv_chart_container');
        if (!container || typeof TradingView === 'undefined') return;
        
        const cryptoData = {
            BTC: { pair: 'BINANCE:BTCUSDT' },
            ETH: { pair: 'BINANCE:ETHUSDT' },
            SOL: { pair: 'BINANCE:SOLUSDT' },
            XRP: { pair: 'BINANCE:XRPUSDT' },
            DOGE: { pair: 'BINANCE:DOGEUSDT' },
            BNB: { pair: 'BINANCE:BNBUSDT' },
            ADA: { pair: 'BINANCE:ADAUSDT' }
        };
        
        if (this.tvWidget) this.tvWidget.remove();
        
        this.tvWidget = new TradingView.widget({
            container_id: "tv_chart_container",
            width: "100%",
            height: "100%",
            symbol: cryptoData[this.currentSymbol].pair,
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
            const cryptoData = {
                BTC: 'BINANCE:BTCUSDT', ETH: 'BINANCE:ETHUSDT', SOL: 'BINANCE:SOLUSDT',
                XRP: 'BINANCE:XRPUSDT', DOGE: 'BINANCE:DOGEUSDT', BNB: 'BINANCE:BNBUSDT',
                ADA: 'BINANCE:ADAUSDT'
            };
            this.tvWidget.setSymbol(cryptoData[symbol]);
        }
        this.updateTradeSummary();
    }

    changeInterval(interval) {
        if (this.tvWidget) this.tvWidget.setInterval(interval);
    }

    startPriceUpdates() {
        const cryptoData = {
            BTC: 78312, ETH: 2297.32, SOL: 168.42, XRP: 0.624,
            DOGE: 0.162, BNB: 615.81, ADA: 0.483
        };
        
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
                bottom: 20px;
                right: 20px;
                background: ${type === 'error' ? '#FF4757' : (type === 'success' ? '#00D897' : '#FFA502')};
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                z-index: 10000;
                animation: slideIn 0.3s ease;
                box-shadow: 0 4px 12px rgba(0,0,0,0.3);
                font-weight: 500;
                max-width: 350px;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 4000);
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
        window.location.href = 'index.html';
    }
};
