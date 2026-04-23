// Trading functionality - Complete working version

// Global variables
let currentUser = null;
let currentOrderType = 'buy';
let selectedCrypto = 'BTC';
let cryptoPrices = {
    BTC: { price: 43250.00, change: 2.5, icon: '₿', name: 'Bitcoin' },
    ETH: { price: 2250.80, change: 1.8, icon: 'Ξ', name: 'Ethereum' },
    BNB: { price: 305.60, change: -0.5, icon: 'B', name: 'Binance Coin' },
    SOL: { price: 98.40, change: 5.2, icon: 'S', name: 'Solana' }
};
let openOrders = [];
let tradeHistory = [];
let priceUpdateInterval = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    initTradePage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
}

function initTradePage() {
    updateBalance();
    loadMarketPrices();
    loadOpenOrders();
    loadTradeHistory();
    startPriceUpdates();
    updateCurrentPrice();
    setupEventListeners();
}

function updateBalance() {
    if (!currentUser) return;
    
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const balanceElement = document.getElementById('availableBalance');
    const badgeElement = document.getElementById('accountBadge');
    
    if (balanceElement) {
        balanceElement.textContent = `$${currentBalance.toFixed(2)}`;
    }
    
    if (badgeElement) {
        badgeElement.textContent = currentUser.accountMode === 'demo' ? 'Demo' : 'Real';
        badgeElement.className = `account-badge ${currentUser.accountMode === 'demo' ? 'demo' : 'real'}`;
    }
}

function setupEventListeners() {
    // Buy/Sell tabs
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    
    if (buyTab) {
        buyTab.addEventListener('click', function() {
            setOrderType('buy');
        });
    }
    
    if (sellTab) {
        sellTab.addEventListener('click', function() {
            setOrderType('sell');
        });
    }
    
    // Order type radio buttons
    const marketRadio = document.querySelector('input[value="market"]');
    const limitRadio = document.querySelector('input[value="limit"]');
    
    if (marketRadio) {
        marketRadio.addEventListener('change', function() {
            const limitGroup = document.getElementById('limitPriceGroup');
            if (limitGroup) limitGroup.style.display = 'none';
            calculateTotal();
        });
    }
    
    if (limitRadio) {
        limitRadio.addEventListener('change', function() {
            const limitGroup = document.getElementById('limitPriceGroup');
            if (limitGroup) limitGroup.style.display = 'block';
            calculateTotal();
        });
    }
    
    // Amount input
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.addEventListener('input', calculateTotal);
    }
    
    // Limit price input
    const limitPrice = document.getElementById('limitPrice');
    if (limitPrice) {
        limitPrice.addEventListener('input', calculateTotal);
    }
    
    // Quick amount buttons
    document.querySelectorAll('.quick-amount').forEach(btn => {
        btn.addEventListener('click', function() {
            const percent = parseInt(this.dataset.percent);
            setQuickAmount(percent);
        });
    });
    
    // Crypto selector
    const selectedCryptoDiv = document.getElementById('selectedCrypto');
    const cryptoDropdown = document.getElementById('cryptoDropdown');
    
    if (selectedCryptoDiv) {
        selectedCryptoDiv.addEventListener('click', function(e) {
            e.stopPropagation();
            if (cryptoDropdown) {
                cryptoDropdown.style.display = cryptoDropdown.style.display === 'none' ? 'block' : 'none';
            }
        });
    }
    
    // Crypto options
    document.querySelectorAll('.crypto-option').forEach(option => {
        option.addEventListener('click', function(e) {
            e.stopPropagation();
            const symbol = this.dataset.symbol;
            const name = this.dataset.name;
            const icon = this.dataset.icon;
            changeCrypto(symbol, name, icon);
            if (cryptoDropdown) {
                cryptoDropdown.style.display = 'none';
            }
        });
    });
    
    // Close dropdown when clicking outside
    document.addEventListener('click', function() {
        if (cryptoDropdown) {
            cryptoDropdown.style.display = 'none';
        }
    });
    
    // Form submission
    const tradeForm = document.getElementById('tradeForm');
    if (tradeForm) {
        tradeForm.addEventListener('submit', function(e) {
            e.preventDefault();
            placeOrder();
        });
    }
    
    // Clear orders button
    const clearBtn = document.getElementById('clearOrdersBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearAllOrders);
    }
}

function setOrderType(type) {
    currentOrderType = type;
    
    // Update tab styles
    const buyTab = document.getElementById('buyTab');
    const sellTab = document.getElementById('sellTab');
    
    if (buyTab && sellTab) {
        if (type === 'buy') {
            buyTab.classList.add('active');
            sellTab.classList.remove('active');
        } else {
            sellTab.classList.add('active');
            buyTab.classList.remove('active');
        }
    }
    
    // Update button
    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) {
        const cryptoName = cryptoPrices[selectedCrypto]?.name || selectedCrypto;
        if (type === 'buy') {
            placeBtn.textContent = `Buy ${cryptoName} (${selectedCrypto})`;
            placeBtn.className = 'btn-buy';
        } else {
            placeBtn.textContent = `Sell ${cryptoName} (${selectedCrypto})`;
            placeBtn.className = 'btn-sell';
        }
    }
    
    calculateTotal();
}

function setQuickAmount(percent) {
    if (!currentUser) return;
    
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const currentPrice = cryptoPrices[selectedCrypto]?.price || 0;
    const maxAmount = currentBalance / currentPrice;
    const amount = maxAmount * (percent / 100);
    
    const amountInput = document.getElementById('amount');
    if (amountInput) {
        amountInput.value = amount.toFixed(6);
        calculateTotal();
    }
}

function calculateTotal() {
    const amount = parseFloat(document.getElementById('amount')?.value || 0);
    const currentPrice = cryptoPrices[selectedCrypto]?.price || 0;
    const isLimit = document.querySelector('input[name="orderType"]:checked')?.value === 'limit';
    
    let price = currentPrice;
    if (isLimit) {
        const limitPrice = parseFloat(document.getElementById('limitPrice')?.value || 0);
        if (limitPrice && limitPrice > 0) {
            price = limitPrice;
        }
    }
    
    const total = amount * price;
    const fee = total * 0.001;
    const totalCost = currentOrderType === 'buy' ? total + fee : total - fee;
    
    const totalElem = document.getElementById('totalValue');
    const feeElem = document.getElementById('feeAmount');
    const costElem = document.getElementById('totalCost');
    
    if (totalElem) totalElem.textContent = `$${total.toFixed(2)}`;
    if (feeElem) feeElem.textContent = `$${fee.toFixed(2)}`;
    if (costElem) costElem.textContent = `$${totalCost.toFixed(2)}`;
}

function changeCrypto(symbol, name, icon) {
    selectedCrypto = symbol;
    
    // Update display
    const selectedDiv = document.getElementById('selectedCrypto');
    if (selectedDiv) {
        selectedDiv.innerHTML = `
            <span class="crypto-icon">${icon}</span>
            <span class="crypto-symbol">${symbol}</span>
            <span class="crypto-name">${name}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                <path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2"/>
            </svg>
        `;
    }
    
    updateCurrentPrice();
    calculateTotal();
    
    // Update button text
    const placeBtn = document.getElementById('placeOrderBtn');
    if (placeBtn) {
        if (currentOrderType === 'buy') {
            placeBtn.textContent = `Buy ${name} (${symbol})`;
        } else {
            placeBtn.textContent = `Sell ${name} (${symbol})`;
        }
    }
}

function updateCurrentPrice() {
    const crypto = cryptoPrices[selectedCrypto];
    if (!crypto) return;
    
    const priceElem = document.getElementById('currentPrice');
    const changeElem = document.getElementById('priceChange');
    
    if (priceElem) {
        priceElem.textContent = `$${crypto.price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2})}`;
    }
    
    if (changeElem) {
        const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
        changeElem.textContent = `${crypto.change >= 0 ? '+' : ''}${crypto.change.toFixed(2)}%`;
        changeElem.className = `price-change ${changeClass}`;
    }
}

function placeOrder() {
    if (!currentUser) {
        showNotification('Please login to trade', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const amount = parseFloat(document.getElementById('amount')?.value || 0);
    const isLimit = document.querySelector('input[name="orderType"]:checked')?.value === 'limit';
    
    if (!amount || amount <= 0) {
        showNotification('Please enter a valid amount', 'error');
        return;
    }
    
    const currentPrice = cryptoPrices[selectedCrypto]?.price || 0;
    let price = currentPrice;
    
    if (isLimit) {
        const limitPrice = parseFloat(document.getElementById('limitPrice')?.value || 0);
        if (!limitPrice || limitPrice <= 0) {
            showNotification('Please enter a valid limit price', 'error');
            return;
        }
        price = limitPrice;
    }
    
    const total = amount * price;
    const fee = total * 0.001;
    const totalCost = currentOrderType === 'buy' ? total + fee : total - fee;
    
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    
    if (currentOrderType === 'buy') {
        if (totalCost > currentBalance) {
            showNotification('Insufficient balance', 'error');
            return;
        }
        
        // Process buy order
        const newBalance = currentBalance - totalCost;
        if (currentUser.accountMode === 'demo') {
            currentUser.demoBalance = newBalance;
        } else {
            currentUser.realBalance = newBalance;
        }
        
        addTransaction('buy', amount, price, total, fee);
        saveUserData();
        
        showNotification(`Successfully bought ${amount.toFixed(6)} ${selectedCrypto} at $${price.toFixed(2)}`, 'success');
    } else {
        // Process sell order
        const newBalance = currentBalance + totalCost;
        if (currentUser.accountMode === 'demo') {
            currentUser.demoBalance = newBalance;
        } else {
            currentUser.realBalance = newBalance;
        }
        
        addTransaction('sell', amount, price, total, fee);
        saveUserData();
        
        showNotification(`Successfully sold ${amount.toFixed(6)} ${selectedCrypto} at $${price.toFixed(2)}`, 'success');
    }
    
    // Reset form
    const amountInput = document.getElementById('amount');
    if (amountInput) amountInput.value = '';
    
    const limitPriceInput = document.getElementById('limitPrice');
    if (limitPriceInput) limitPriceInput.value = '';
    
    updateBalance();
    calculateTotal();
    loadTradeHistory();
}

function addTransaction(type, amount, price, total, fee) {
    const transaction = {
        id: Date.now(),
        type: type,
        crypto: selectedCrypto,
        amount: amount,
        price: price,
        total: total,
        fee: fee,
        accountMode: currentUser.accountMode,
        status: 'completed',
        date: new Date().toISOString()
    };
    
    // Add to user transactions
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift(transaction);
    
    // Add to trade history
    tradeHistory.unshift(transaction);
    localStorage.setItem('pocket_trade_history', JSON.stringify(tradeHistory.slice(0, 50)));
}

function saveUserData() {
    // Update in users array
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pocket_users', JSON.stringify(users));
    }
    
    // Update current session
    if (localStorage.getItem('pocket_user')) {
        localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
    if (sessionStorage.getItem('pocket_user')) {
        sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
}

function loadMarketPrices() {
    const container = document.getElementById('marketPrices');
    if (!container) return;
    
    container.innerHTML = Object.entries(cryptoPrices).map(([symbol, data]) => `
        <div class="market-item" onclick="changeCrypto('${symbol}', '${data.name}', '${data.icon}')">
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

function loadOpenOrders() {
    const container = document.getElementById('openOrdersList');
    if (!container) return;
    
    const userOrders = openOrders.filter(order => order.userId === currentUser?.id);
    
    if (userOrders.length === 0) {
        container.innerHTML = '<div class="empty-state">No open orders</div>';
        return;
    }
    
    container.innerHTML = userOrders.map(order => `
        <div class="order-item">
            <div class="order-info">
                <span class="order-type ${order.type}">${order.type}</span>
                <span class="order-crypto">${order.crypto}</span>
                <span class="order-amount">${order.amount} @ $${order.price}</span>
            </div>
            <button class="order-cancel" onclick="cancelOrder(${order.id})">Cancel</button>
        </div>
    `).join('');
}

function loadTradeHistory() {
    const container = document.getElementById('tradeHistory');
    if (!container) return;
    
    if (!currentUser) return;
    
    const userTrades = tradeHistory.filter(t => t.accountMode === currentUser.accountMode).slice(0, 10);
    
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

function cancelOrder(orderId) {
    openOrders = openOrders.filter(o => o.id !== orderId);
    localStorage.setItem('pocket_orders', JSON.stringify(openOrders));
    loadOpenOrders();
    showNotification('Order cancelled', 'success');
}

function clearAllOrders() {
    if (currentUser) {
        openOrders = openOrders.filter(o => o.userId !== currentUser.id);
        localStorage.setItem('pocket_orders', JSON.stringify(openOrders));
        loadOpenOrders();
        showNotification('All orders cleared', 'success');
    }
}

function startPriceUpdates() {
    if (priceUpdateInterval) {
        clearInterval(priceUpdateInterval);
    }
    
    priceUpdateInterval = setInterval(function() {
        // Update prices
        Object.keys(cryptoPrices).forEach(crypto => {
            const change = (Math.random() - 0.5) * 100;
            const newPrice = Math.max(1, cryptoPrices[crypto].price + change);
            const percentChange = ((newPrice - cryptoPrices[crypto].price) / cryptoPrices[crypto].price) * 100;
            
            cryptoPrices[crypto] = {
                ...cryptoPrices[crypto],
                price: newPrice,
                change: percentChange
            };
        });
        
        loadMarketPrices();
        updateCurrentPrice();
        calculateTotal();
        
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            lastUpdated.textContent = new Date().toLocaleTimeString();
        }
    }, 5000);
}

function showNotification(message, type) {
    const existing = document.querySelector('.trade-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = `trade-notification`;
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
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'login.html';
}

// Make functions global for HTML onclick
window.changeCrypto = changeCrypto;
window.cancelOrder = cancelOrder;
window.handleLogout = handleLogout;
