// Trading functionality

class TradeManager {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user'));
        this.orderType = 'buy';
        this.cryptoPrices = {
            BTC: { price: 43250.00, change: 2.5, icon: '₿', name: 'Bitcoin' },
            ETH: { price: 2250.80, change: 1.8, icon: 'Ξ', name: 'Ethereum' },
            BNB: { price: 305.60, change: -0.5, icon: 'B', name: 'Binance Coin' },
            SOL: { price: 98.40, change: 5.2, icon: 'S', name: 'Solana' }
        };
        this.selectedCrypto = 'BTC';
        this.openOrders = JSON.parse(localStorage.getItem('pocket_orders') || '[]');
        this.tradeHistory = JSON.parse(localStorage.getItem('pocket_trade_history') || '[]');
        this.init();
    }

    init() {
        if (!this.user) {
            window.location.href = 'login.html';
            return;
        }
        this.setupEventListeners();
        this.updateBalance();
        this.loadMarketPrices();
        this.loadOpenOrders();
        this.loadTradeHistory();
        this.startPriceUpdates();
        this.updateCurrentPrice();
    }

    updateBalance() {
        const currentBalance = this.user.accountMode === 'demo' ? this.user.demoBalance : this.user.realBalance;
        const balanceElement = document.getElementById('availableBalance');
        const badgeElement = document.getElementById('accountBadge');
        
        if (balanceElement) {
            balanceElement.textContent = `$${currentBalance.toFixed(2)}`;
        }
        
        if (badgeElement) {
            badgeElement.textContent = this.user.accountMode === 'demo' ? 'Demo' : 'Real';
            badgeElement.className = `account-badge ${this.user.accountMode === 'demo' ? 'demo' : 'real'}`;
        }
    }

    setupEventListeners() {
        // Order type tabs (Buy/Sell)
        document.querySelectorAll('.order-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                const orderType = tab.dataset.order;
                this.setOrderType(orderType);
            });
        });

        // Order type radio (Market/Limit)
        document.querySelectorAll('input[name="orderType"]').forEach(radio => {
            radio.addEventListener('change', (e) => {
                const limitGroup = document.getElementById('limitPriceGroup');
                limitGroup.style.display = e.target.value === 'limit' ? 'block' : 'none';
            });
        });

        // Amount input
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.addEventListener('input', () => this.calculateTotal());
        }

        // Quick amount buttons
        document.querySelectorAll('.quick-amount').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const percent = parseInt(btn.dataset.percent);
                this.setQuickAmount(percent);
            });
        });

        // Crypto selector dropdown
        const selectedCrypto = document.getElementById('selectedCrypto');
        const cryptoDropdown = document.getElementById('cryptoDropdown');
        
        if (selectedCrypto) {
            selectedCrypto.addEventListener('click', () => {
                cryptoDropdown.style.display = cryptoDropdown.style.display === 'none' ? 'block' : 'none';
            });
        }

        // Crypto options
        document.querySelectorAll('.crypto-option').forEach(option => {
            option.addEventListener('click', () => {
                const symbol = option.dataset.symbol;
                const name = option.dataset.name;
                const icon = option.dataset.icon;
                this.changeCrypto(symbol, name, icon);
                cryptoDropdown.style.display = 'none';
            });
        });

        // Close dropdown when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.crypto-selector')) {
                if (cryptoDropdown) cryptoDropdown.style.display = 'none';
            }
        });

        // Form submission
        const tradeForm = document.getElementById('tradeForm');
        if (tradeForm) {
            tradeForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.placeOrder();
            });
        }

        // Limit price input
        const limitPrice = document.getElementById('limitPrice');
        if (limitPrice) {
            limitPrice.addEventListener('input', () => this.calculateTotal());
        }
    }

    setOrderType(type) {
        this.orderType = type;
        
        // Update tab styles
        document.querySelectorAll('.order-tab').forEach(tab => {
            if (tab.dataset.order === type) {
                tab.classList.add('active');
            } else {
                tab.classList.remove('active');
            }
        });
        
        // Update button style
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            const crypto = this.selectedCrypto;
            const cryptoName = this.cryptoPrices[crypto].name;
            
            if (type === 'buy') {
                placeOrderBtn.textContent = `Buy ${cryptoName} (${crypto})`;
                placeOrderBtn.className = 'btn-buy btn-block';
            } else {
                placeOrderBtn.textContent = `Sell ${cryptoName} (${crypto})`;
                placeOrderBtn.className = 'btn-sell btn-block';
            }
        }
        
        this.calculateTotal();
    }

    setQuickAmount(percent) {
        const currentBalance = this.user.accountMode === 'demo' ? this.user.demoBalance : this.user.realBalance;
        const currentPrice = this.cryptoPrices[this.selectedCrypto].price;
        const maxAmount = currentBalance / currentPrice;
        const amount = maxAmount * (percent / 100);
        
        const amountInput = document.getElementById('amount');
        if (amountInput) {
            amountInput.value = amount.toFixed(6);
            this.calculateTotal();
        }
    }

    calculateTotal() {
        const amount = parseFloat(document.getElementById('amount').value) || 0;
        const currentPrice = this.cryptoPrices[this.selectedCrypto].price;
        const orderTypeRadio = document.querySelector('input[name="orderType"]:checked');
        const isLimit = orderTypeRadio && orderTypeRadio.value === 'limit';
        
        let price = currentPrice;
        if (isLimit) {
            const limitPrice = parseFloat(document.getElementById('limitPrice').value);
            if (limitPrice && limitPrice > 0) {
                price = limitPrice;
            }
        }
        
        const total = amount * price;
        const fee = total * 0.001; // 0.1% fee
        const totalCost = this.orderType === 'buy' ? total + fee : total - fee;
        
        document.getElementById('totalValue').textContent = `$${total.toFixed(2)}`;
        document.getElementById('feeAmount').textContent = `$${fee.toFixed(2)}`;
        document.getElementById('totalCost').textContent = `$${totalCost.toFixed(2)}`;
        
        return { total, fee, totalCost, price };
    }

    changeCrypto(symbol, name, icon) {
        this.selectedCrypto = symbol;
        
        // Update selected crypto display
        const selectedCrypto = document.getElementById('selectedCrypto');
        if (selectedCrypto) {
            selectedCrypto.innerHTML = `
                <span class="crypto-icon">${icon}</span>
                <span class="crypto-symbol">${symbol}</span>
                <span class="crypto-name">${name}</span>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                    <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"/>
                </svg>
            `;
        }
        
        this.updateCurrentPrice();
        this.calculateTotal();
        
        // Update button text
        const placeOrderBtn = document.getElementById('placeOrderBtn');
        if (placeOrderBtn) {
            if (this.orderType === 'buy') {
                placeOrderBtn.textContent = `Buy ${name} (${symbol})`;
            } else {
                placeOrderBtn.textContent = `Sell ${name} (${symbol})`;
            }
        }
    }

    updateCurrentPrice() {
        const crypto = this.cryptoPrices[this.selectedCrypto];
        const priceElement = document.getElementById('currentPrice');
        const changeElement = document.getElementById('priceChange');
        
        if (priceElement) {
            priceElement.textContent = `$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
        }
        
        if (changeElement) {
            const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
            changeElement.textContent = `${crypto.change >= 0 ? '+' : ''}${crypto.change.toFixed(2)}%`;
            changeElement.className = `price-change ${changeClass}`;
        }
    }

    placeOrder() {
        const amount = parseFloat(document.getElementById('amount').value);
        const orderTypeRadio = document.querySelector('input[name="orderType"]:checked');
        const isLimit = orderTypeRadio && orderTypeRadio.value === 'limit';
        
        if (!amount || amount <= 0) {
            this.showNotification('Please enter a valid amount', 'error');
            return;
        }
        
        const currentPrice = this.cryptoPrices[this.selectedCrypto].price;
        let price = currentPrice;
        
        if (isLimit) {
            const limitPrice = parseFloat(document.getElementById('limitPrice').value);
            if (!limitPrice || limitPrice <= 0) {
                this.showNotification('Please enter a valid limit price', 'error');
                return;
            }
            price = limitPrice;
        }
        
        const total = amount * price;
        const fee = total * 0.001;
        const totalCost = this.orderType === 'buy' ? total + fee : total - fee;
        
        const currentBalance = this.user.accountMode === 'demo' ? this.user.demoBalance : this.user.realBalance;
        
        if (this.orderType === 'buy') {
            if (totalCost > currentBalance) {
                this.showNotification('Insufficient balance', 'error');
                return;
            }
            
            // Process buy order
            const newBalance = currentBalance - totalCost;
            if (this.user.accountMode === 'demo') {
                this.user.demoBalance = newBalance;
            } else {
                this.user.realBalance = newBalance;
            }
            
            this.addTransaction('buy', this.selectedCrypto, amount, price, total, fee);
            this.updateUserData();
            
            this.showNotification(`Successfully bought ${amount.toFixed(6)} ${this.selectedCrypto} at $${price.toFixed(2)}`, 'success');
        } else {
            // Check if user has enough crypto (simplified - in real app you'd track holdings)
            const newBalance = currentBalance + totalCost;
            if (this.user.accountMode === 'demo') {
                this.user.demoBalance = newBalance;
            } else {
                this.user.realBalance = newBalance;
            }
            
            this.addTransaction('sell', this.selectedCrypto, amount, price, total, fee);
            this.updateUserData();
            
            this.showNotification(`Successfully sold ${amount.toFixed(6)} ${this.selectedCrypto} at $${price.toFixed(2)}`, 'success');
        }
        
        // Reset form
        document.getElementById('amount').value = '';
        if (isLimit) {
            document.getElementById('limitPrice').value = '';
        }
        
        this.updateBalance();
        this.calculateTotal();
        this.loadTradeHistory();
    }

    addTransaction(type, crypto, amount, price, total, fee) {
        const transaction = {
            id: Date.now(),
            type: type,
            crypto: crypto,
            amount: amount,
            price: price,
            total: total,
            fee: fee,
            accountMode: this.user.accountMode,
            status: 'completed',
            date: new Date().toISOString(),
            pnl: type === 'sell' ? (total - fee) : 0
        };
        
        // Add to user transactions
        if (!this.user.transactions) this.user.transactions = [];
        this.user.transactions.unshift(transaction);
        
        // Add to trade history
        this.tradeHistory.unshift(transaction);
        localStorage.setItem('pocket_trade_history', JSON.stringify(this.tradeHistory.slice(0, 50))); // Keep last 50 trades
        
        // Update user stats
        if (!this.user.stats) this.user.stats = {};
        this.user.stats.totalTrades = (this.user.stats.totalTrades || 0) + 1;
        this.user.stats.totalVolume = (this.user.stats.totalVolume || 0) + total;
        
        this.updateUserData();
    }

    updateUserData() {
        // Update in users array
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.user.id);
        if (userIndex !== -1) {
            users[userIndex] = this.user;
            localStorage.setItem('pocket_users', JSON.stringify(users));
        }
        
        // Update current session
        if (localStorage.getItem('pocket_user')) {
            localStorage.setItem('pocket_user', JSON.stringify(this.user));
        }
        if (sessionStorage.getItem('pocket_user')) {
            sessionStorage.setItem('pocket_user', JSON.stringify(this.user));
        }
        
        // Update global auth reference
        if (window.auth) {
            window.auth.currentUser = this.user;
        }
    }

    loadMarketPrices() {
        const container = document.getElementById('marketPrices');
        if (!container) return;
        
        container.innerHTML = Object.entries(this.cryptoPrices).map(([symbol, data]) => `
            <div class="market-item ${symbol === this.selectedCrypto ? 'active' : ''}" onclick="window.tradeManager.changeCrypto('${symbol}', '${data.name}', '${data.icon}')">
                <div class="market-item-info">
                    <span class="market-icon">${data.icon}</span>
                    <div>
                        <div class="market-symbol">${symbol}</div>
                        <div class="market-name">${data.name}</div>
                    </div>
                </div>
                <div class="market-item-price">
                    <div class="market-price">$${data.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}</div>
                    <div class="market-change ${data.change >= 0 ? 'positive' : 'negative'}">
                        ${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%
                    </div>
                </div>
            </div>
        `).join('');
    }

    loadOpenOrders() {
        const container = document.getElementById('openOrdersList');
        if (!container) return;
        
        const userOpenOrders = this.openOrders.filter(order => order.userId === this.user.id);
        
        if (userOpenOrders.length === 0) {
            container.innerHTML = '<div class="empty-state">No open orders</div>';
            return;
        }
        
        container.innerHTML = userOpenOrders.map(order => `
            <div class="order-item">
                <div class="order-info">
                    <span class="order-type ${order.type}">${order.type}</span>
                    <span class="order-crypto">${order.crypto}</span>
                    <span class="order-amount">${order.amount} @ $${order.price}</span>
                </div>
                <button class="order-cancel" onclick="window.tradeManager.cancelOrder(${order.id})">Cancel</button>
            </div>
        `).join('');
    }

    loadTradeHistory() {
        const container = document.getElementById('tradeHistory');
        if (!container) return;
        
        const userTrades = this.tradeHistory.filter(trade => trade.accountMode === this.user.accountMode).slice(0, 10);
        
        if (userTrades.length === 0) {
            container.innerHTML = '<div class="empty-state">No recent trades</div>';
            return;
        }
        
        container.innerHTML = userTrades.map(trade => `
            <div class="trade-item">
                <div class="trade-info">
                    <span class="trade-type ${trade.type}">${trade.type}</span>
                    <span class="trade-crypto">${trade.crypto}</span>
                    <span class="trade-amount">${trade.amount.toFixed(6)} @ $${trade.price.toFixed(2)}</span>
                </div>
                <div class="trade-total">$${trade.total.toFixed(2)}</div>
                <div class="trade-time">${new Date(trade.date).toLocaleTimeString()}</div>
            </div>
        `).join('');
    }

    cancelOrder(orderId) {
        this.openOrders = this.openOrders.filter(o => o.id !== orderId);
        localStorage.setItem('pocket_orders', JSON.stringify(this.openOrders));
        this.loadOpenOrders();
        this.showNotification('Order cancelled', 'success');
    }

    startPriceUpdates() {
        setInterval(() => {
            // Simulate price changes
            Object.keys(this.cryptoPrices).forEach(crypto => {
                const change = (Math.random() - 0.5) * 100;
                const newPrice = Math.max(1, this.cryptoPrices[crypto].price + change);
                const percentChange = ((newPrice - this.cryptoPrices[crypto].price) / this.cryptoPrices[crypto].price) * 100;
                
                this.cryptoPrices[crypto] = {
                    ...this.cryptoPrices[crypto],
                    price: newPrice,
                    change: percentChange
                };
            });
            
            this.loadMarketPrices();
            this.updateCurrentPrice();
            this.calculateTotal();
        }, 5000);
    }

    showNotification(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification-${type}`;
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'error' ? '#FF4757' : '#00D897'};
            color: white;
            padding: 12px 20px;
            border-radius: 12px;
            font-size: 14px;
            z-index: 10000;
            animation: slideIn 0.3s ease-out;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease-out';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
}

// Global functions
function clearAllOrders() {
    if (window.tradeManager) {
        window.tradeManager.openOrders = window.tradeManager.openOrders.filter(o => o.userId !== window.tradeManager.user.id);
        localStorage.setItem('pocket_orders', JSON.stringify(window.tradeManager.openOrders));
        window.tradeManager.loadOpenOrders();
        window.tradeManager.showNotification('All orders cleared', 'success');
    }
}

// Initialize trade manager
document.addEventListener('DOMContentLoaded', () => {
    window.tradeManager = new TradeManager();
});

// Make functions globally available
window.clearAllOrders = clearAllOrders;
