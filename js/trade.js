// js/trade.js
class TradeManager {
    constructor() {
        this.user = JSON.parse(localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user'));
        this.orderType = 'buy';
        this.cryptoPrices = {
            BTC: 43250,
            ETH: 2250,
            BNB: 305,
            SOL: 98
        };
        this.openOrders = JSON.parse(localStorage.getItem('pocket_orders') || '[]');
        this.init();
    }

    init() {
        this.updateBalance();
        this.setupEventListeners();
        this.loadMarketPrices();
        this.loadOpenOrders();
        this.startPriceUpdates();
    }

    updateBalance() {
        document.getElementById('tradeBalance').textContent = this.user?.balance?.toFixed(2) || '0';
    }

    setupEventListeners() {
        // Order type toggle
        document.querySelectorAll('.order-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                document.querySelectorAll('.order-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.orderType = btn.dataset.type;
                this.updateOrderButton();
            });
        });

        // Order type select
        const orderTypeSelect = document.getElementById('orderType');
        orderTypeSelect.addEventListener('change', (e) => {
            const limitGroup = document.getElementById('limitPriceGroup');
            limitGroup.style.display = e.target.value === 'limit' ? 'block' : 'none';
        });

        // Amount input
        const amountInput = document.getElementById('amount');
        amountInput.addEventListener('input', () => this.calculateTotal());

        // Place order
        document.getElementById('placeOrderBtn').addEventListener('click', () => this.placeOrder());
    }

    calculateTotal() {
        const amount = parseFloat(document.getElementById('amount').value) || 0;
        const crypto = document.getElementById('cryptoSelect').value;
        const price = this.cryptoPrices[crypto];
        const total = amount * price;
        const fee = total * 0.001;
        
        document.getElementById('totalValue').textContent = `$${total.toFixed(2)}`;
        document.getElementById('feeAmount').textContent = `$${fee.toFixed(2)}`;
        
        return { total, fee };
    }

    updateOrderButton() {
        const btn = document.getElementById('placeOrderBtn');
        btn.textContent = this.orderType === 'buy' ? 'Buy Now' : 'Sell Now';
        btn.className = `btn-primary btn-block ${this.orderType === 'buy' ? 'buy-btn' : 'sell-btn'}`;
    }

    placeOrder() {
        const amount = parseFloat(document.getElementById('amount').value);
        const crypto = document.getElementById('cryptoSelect').value;
        const orderTypeSelect = document.getElementById('orderType').value;
        const limitPrice = parseFloat(document.getElementById('limitPrice').value);
        const currentPrice = this.cryptoPrices[crypto];
        const price = orderTypeSelect === 'market' ? currentPrice : limitPrice;
        const total = amount * price;
        const fee = total * 0.001;
        
        if (!amount || amount <= 0) {
            this.showError('Please enter a valid amount');
            return;
        }
        
        if (this.orderType === 'buy') {
            if (total + fee > this.user.balance) {
                this.showError('Insufficient balance');
                return;
            }
            
            // Process buy order
            this.user.balance -= (total + fee);
            this.addTransaction('buy', crypto, amount, price, total, fee);
            this.showSuccess(`Successfully bought ${amount} ${crypto}`);
        } else {
            // Check if user has enough crypto (simplified)
            this.user.balance += (total - fee);
            this.addTransaction('sell', crypto, amount, price, total, fee);
            this.showSuccess(`Successfully sold ${amount} ${crypto}`);
        }
        
        // Update storage and UI
        this.updateUserData();
        this.updateBalance();
        document.getElementById('amount').value = '';
        this.calculateTotal();
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
            status: 'completed',
            date: new Date().toISOString()
        };
        
        const transactions = JSON.parse(localStorage.getItem('pocket_transactions') || '[]');
        transactions.push(transaction);
        localStorage.setItem('pocket_transactions', JSON.stringify(transactions));
    }

    updateUserData() {
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const userIndex = users.findIndex(u => u.id === this.user.id);
        if (userIndex !== -1) {
            users[userIndex] = this.user;
            localStorage.setItem('pocket_users', JSON.stringify(users));
            localStorage.setItem('pocket_user', JSON.stringify(this.user));
        }
    }

    loadMarketPrices() {
        const container = document.getElementById('marketPrices');
        container.innerHTML = Object.entries(this.cryptoPrices).map(([symbol, price]) => `
            <div class="market-item">
                <div>
                    <strong>${symbol}</strong>
                    <small>/USD</small>
                </div>
                <div class="market-price">$${price.toLocaleString()}</div>
            </div>
        `).join('');
    }

    loadOpenOrders() {
        const tbody = document.getElementById('openOrdersList');
        if (this.openOrders.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No open orders</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.openOrders.map(order => `
            <tr>
                <td class="${order.type}">${order.type}</td>
                <td>${order.crypto}</td>
                <td>${order.amount}</td>
                <td>$${order.price}</td>
                <td>$${order.total}</td>
                <td><span class="status-badge status-pending">Open</span></td>
                <td><button onclick="cancelOrder(${order.id})" class="cancel-btn">Cancel</button></td>
            </tr>
        `).join('');
    }

    startPriceUpdates() {
        setInterval(() => {
            // Simulate price changes
            Object.keys(this.cryptoPrices).forEach(crypto => {
                const change = (Math.random() - 0.5) * 100;
                this.cryptoPrices[crypto] = Math.max(1, this.cryptoPrices[crypto] + change);
            });
            this.loadMarketPrices();
        }, 5000);
    }

    showError(message) {
        const errorDiv = this.createNotification(message, 'error');
        document.querySelector('.order-form').insertBefore(errorDiv, document.querySelector('.order-form').firstChild);
        setTimeout(() => errorDiv.remove(), 3000);
    }

    showSuccess(message) {
        const successDiv = this.createNotification(message, 'success');
        document.querySelector('.order-form').insertBefore(successDiv, document.querySelector('.order-form').firstChild);
        setTimeout(() => successDiv.remove(), 3000);
    }

    createNotification(message, type) {
        const div = document.createElement('div');
        div.className = `notification-${type}`;
        div.textContent = message;
        div.style.cssText = `
            background: ${type === 'error' ? 'rgba(255, 71, 87, 0.1)' : 'rgba(0, 216, 151, 0.1)'};
            color: ${type === 'error' ? '#FF4757' : '#00D897'};
            padding: 12px;
            border-radius: 12px;
            margin-bottom: 1rem;
            text-align: center;
        `;
        return div;
    }
}

// Initialize trade manager
const trade = new TradeManager();

function cancelOrder(orderId) {
    trade.openOrders = trade.openOrders.filter(o => o.id !== orderId);
    localStorage.setItem('pocket_orders', JSON.stringify(trade.openOrders));
    trade.loadOpenOrders();
}
