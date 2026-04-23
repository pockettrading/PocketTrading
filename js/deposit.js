// Deposit functionality - Complete working version

// Global variables
let currentUser = null;
let selectedMethod = 'card';
let depositAmount = 0;

// Fee rates for different methods
const feeRates = {
    card: 1.5,      // 1.5% fee
    crypto: 0.5,    // 0.5% fee
    bank: 0,        // 0% fee
    ewallet: 2      // 2% fee
};

// Method names
const methodNames = {
    card: 'Credit/Debit Card',
    crypto: 'Cryptocurrency',
    bank: 'Bank Transfer',
    ewallet: 'E-Wallet (PayPal/Skrill/Neteller)'
};

// Payment details for each method
const paymentDetails = {
    card: {
        fields: [
            { label: 'Card Number', value: '**** **** **** 1234', placeholder: 'Enter your card number' },
            { label: 'Cardholder Name', value: currentUser?.name || 'John Doe', placeholder: 'Name on card' },
            { label: 'Expiry Date', value: '12/28', placeholder: 'MM/YY' },
            { label: 'CVV', value: '***', placeholder: '123' }
        ]
    },
    crypto: {
        addresses: {
            BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
            ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
            USDT: 'TXLAQ63Xg1NAzckPwKHvpx7yxvVQjEaHVd',
            BNB: 'bnb1xqf8lqy2k6w9x0r8y7t6u5i4o3p2l1k0j9h8g7f',
            SOL: 'So11111111111111111111111111111111111111111'
        }
    },
    bank: {
        details: {
            bankName: 'Pocket Trading Bank',
            accountName: 'Pocket Trading Ltd',
            accountNumber: '1234567890',
            routingNumber: '021000021',
            swiftCode: 'PTBKUS33',
            iban: 'US12345678901234567890'
        }
    },
    ewallet: {
        options: ['PayPal', 'Skrill', 'Neteller', 'WebMoney'],
        emails: {
            PayPal: 'payments@pockettrading.com',
            Skrill: 'merchant@skrill.pockettrading.com',
            Neteller: 'merchant@neteller.pockettrading.com',
            WebMoney: 'WM1234567890'
        }
    }
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    initDepositPage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
}

function initDepositPage() {
    setupMethodSelection();
    setupAmountInput();
    updateBalanceDisplay();
}

function setupMethodSelection() {
    const methods = document.querySelectorAll('.method-card');
    
    methods.forEach(method => {
        method.addEventListener('click', function() {
            // Remove active class from all methods
            methods.forEach(m => m.classList.remove('active'));
            // Add active class to clicked method
            this.classList.add('active');
            // Store selected method
            selectedMethod = this.dataset.method;
            // Update form
            updateDepositForm();
        });
    });
}

function setupAmountInput() {
    const amountInput = document.getElementById('depositAmount');
    const depositBtn = document.getElementById('depositBtn');
    const warningMsg = document.getElementById('warningMessage');
    
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            let amount = parseFloat(this.value);
            
            if (isNaN(amount)) {
                amount = 0;
            }
            
            depositAmount = amount;
            
            // Validate amount
            if (amount < 1000 && amount > 0) {
                warningMsg.innerHTML = '<p>⚠️ Minimum deposit amount is $1,000</p>';
                warningMsg.style.display = 'block';
                if (depositBtn) depositBtn.disabled = true;
            } else if (amount > 100000) {
                warningMsg.innerHTML = '<p>⚠️ Maximum deposit amount is $100,000</p>';
                warningMsg.style.display = 'block';
                if (depositBtn) depositBtn.disabled = true;
            } else if (amount >= 1000 && amount <= 100000) {
                warningMsg.style.display = 'none';
                if (depositBtn) depositBtn.disabled = false;
            } else {
                warningMsg.style.display = 'block';
                if (depositBtn) depositBtn.disabled = true;
            }
            
            updateTotalAmount();
        });
    }
    
    // Quick amount buttons
    const quickBtns = document.querySelectorAll('.quick-amount-btn');
    quickBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            if (amountInput) {
                amountInput.value = amount;
                amountInput.dispatchEvent(new Event('input'));
            }
        });
    });
    
    // Deposit button
    if (depositBtn) {
        depositBtn.addEventListener('click', processDeposit);
    }
}

function updateDepositForm() {
    const formContainer = document.getElementById('depositFormContainer');
    const formTitle = document.getElementById('formTitle');
    const feePercentage = document.getElementById('feePercentage');
    const paymentDetailsDiv = document.getElementById('paymentDetails');
    
    if (formContainer) {
        formContainer.style.display = 'block';
    }
    
    if (formTitle) {
        formTitle.textContent = `Deposit via ${methodNames[selectedMethod]}`;
    }
    
    if (feePercentage) {
        feePercentage.textContent = `${feeRates[selectedMethod]}%`;
    }
    
    // Generate payment details based on selected method
    if (paymentDetailsDiv) {
        paymentDetailsDiv.innerHTML = generatePaymentDetails();
    }
    
    updateTotalAmount();
}

function generatePaymentDetails() {
    switch(selectedMethod) {
        case 'card':
            return `
                <h4>Card Details</h4>
                <div class="detail-row">
                    <span class="detail-label">Card Number</span>
                    <span class="detail-value">
                        <input type="text" id="cardNumber" class="detail-input" placeholder="1234 5678 9012 3456" style="background: var(--darker-bg); border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: white; width: 200px;">
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Cardholder Name</span>
                    <span class="detail-value">
                        <input type="text" id="cardName" class="detail-input" placeholder="${currentUser?.name || 'John Doe'}" style="background: var(--darker-bg); border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: white; width: 200px;">
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Expiry Date</span>
                    <span class="detail-value">
                        <input type="text" id="expiryDate" class="detail-input" placeholder="MM/YY" style="background: var(--darker-bg); border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: white; width: 100px;">
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">CVV</span>
                    <span class="detail-value">
                        <input type="password" id="cvv" class="detail-input" placeholder="123" style="background: var(--darker-bg); border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: white; width: 80px;">
                    </span>
                </div>
            `;
            
        case 'crypto':
            return `
                <h4>Cryptocurrency Details</h4>
                <div class="detail-row">
                    <span class="detail-label">Select Currency</span>
                    <span class="detail-value">
                        <select id="cryptoCurrency" style="background: var(--darker-bg); border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: white;">
                            <option value="BTC">Bitcoin (BTC)</option>
                            <option value="ETH">Ethereum (ETH)</option>
                            <option value="USDT">Tether (USDT)</option>
                            <option value="BNB">Binance Coin (BNB)</option>
                            <option value="SOL">Solana (SOL)</option>
                        </select>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Send to Address</span>
                    <span class="detail-value" id="cryptoAddress">${paymentDetails.crypto.addresses.BTC}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${paymentDetails.crypto.addresses.BTC}')">Copy</button>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Network</span>
                    <span class="detail-value">ERC-20 / BEP-20</span>
                </div>
                <div class="warning-message" style="margin-top: 1rem;">
                    <p>⚠️ Send only the selected cryptocurrency to this address. Other currencies will be lost.</p>
                </div>
            `;
            
        case 'bank':
            return `
                <h4>Bank Transfer Details</h4>
                <div class="detail-row">
                    <span class="detail-label">Bank Name</span>
                    <span class="detail-value">${paymentDetails.bank.details.bankName}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${paymentDetails.bank.details.bankName}')">Copy</button>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Account Name</span>
                    <span class="detail-value">${paymentDetails.bank.details.accountName}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${paymentDetails.bank.details.accountName}')">Copy</button>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Account Number</span>
                    <span class="detail-value">${paymentDetails.bank.details.accountNumber}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${paymentDetails.bank.details.accountNumber}')">Copy</button>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Routing Number</span>
                    <span class="detail-value">${paymentDetails.bank.details.routingNumber}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${paymentDetails.bank.details.routingNumber}')">Copy</button>
                </div>
                <div class="detail-row">
                    <span class="detail-label">SWIFT Code</span>
                    <span class="detail-value">${paymentDetails.bank.details.swiftCode}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${paymentDetails.bank.details.swiftCode}')">Copy</button>
                </div>
                <div class="detail-row">
                    <span class="detail-label">IBAN</span>
                    <span class="detail-value">${paymentDetails.bank.details.iban}</span>
                    <button class="copy-btn" onclick="copyToClipboard('${paymentDetails.bank.details.iban}')">Copy</button>
                </div>
                <div class="warning-message" style="margin-top: 1rem;">
                    <p>⚠️ Please use your registered email as reference. Transfers take 1-3 business days.</p>
                </div>
            `;
            
        case 'ewallet':
            return `
                <h4>E-Wallet Details</h4>
                <div class="detail-row">
                    <span class="detail-label">Select Wallet</span>
                    <span class="detail-value">
                        <select id="walletType" onchange="updateWalletEmail()" style="background: var(--darker-bg); border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: white;">
                            <option value="PayPal">PayPal</option>
                            <option value="Skrill">Skrill</option>
                            <option value="Neteller">Neteller</option>
                            <option value="WebMoney">WebMoney</option>
                        </select>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Send to Email/ID</span>
                    <span class="detail-value" id="walletEmail">${paymentDetails.ewallet.emails.PayPal}</span>
                    <button class="copy-btn" onclick="copyToClipboard(document.getElementById('walletEmail').innerText)">Copy</button>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Your Email/ID</span>
                    <span class="detail-value">
                        <input type="text" id="userWalletId" placeholder="Enter your ${paymentDetails.ewallet.options[0]} email/ID" style="background: var(--darker-bg); border: 1px solid var(--border); padding: 8px; border-radius: 6px; color: white; width: 100%;">
                    </span>
                </div>
                <div class="warning-message" style="margin-top: 1rem;">
                    <p>⚠️ Make sure to use the same email/ID for faster processing.</p>
                </div>
            `;
            
        default:
            return '<p>Select a payment method</p>';
    }
}

function updateWalletEmail() {
    const walletSelect = document.getElementById('walletType');
    const walletEmailSpan = document.getElementById('walletEmail');
    
    if (walletSelect && walletEmailSpan) {
        const selectedWallet = walletSelect.value;
        walletEmailSpan.innerText = paymentDetails.ewallet.emails[selectedWallet];
    }
}

function updateTotalAmount() {
    const amount = depositAmount;
    const feeRate = feeRates[selectedMethod];
    const fee = amount * (feeRate / 100);
    const total = amount + fee;
    const receiveAmount = amount;
    
    const totalSpan = document.getElementById('totalAmount');
    const receiveSpan = document.getElementById('receiveAmount');
    
    if (totalSpan) {
        totalSpan.textContent = `$${total.toFixed(2)}`;
    }
    
    if (receiveSpan) {
        receiveSpan.textContent = `$${receiveAmount.toFixed(2)}`;
    }
}

function updateBalanceDisplay() {
    if (!currentUser) return;
    
    const balanceBadge = document.getElementById('accountBadge');
    if (balanceBadge) {
        balanceBadge.textContent = currentUser.accountMode === 'demo' ? 'Demo' : 'Real';
    }
}

function processDeposit() {
    if (!currentUser) {
        showNotification('Please login to deposit', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    const amount = depositAmount;
    
    if (!amount || amount < 1000) {
        showNotification('Minimum deposit amount is $1,000', 'error');
        return;
    }
    
    if (amount > 100000) {
        showNotification('Maximum deposit amount is $100,000', 'error');
        return;
    }
    
    // Validate payment details based on method
    if (selectedMethod === 'card') {
        const cardNumber = document.getElementById('cardNumber')?.value;
        const cardName = document.getElementById('cardName')?.value;
        const expiryDate = document.getElementById('expiryDate')?.value;
        const cvv = document.getElementById('cvv')?.value;
        
        if (!cardNumber || !cardName || !expiryDate || !cvv) {
            showNotification('Please fill in all card details', 'error');
            return;
        }
    }
    
    if (selectedMethod === 'ewallet') {
        const userWalletId = document.getElementById('userWalletId')?.value;
        if (!userWalletId) {
            showNotification('Please enter your wallet email/ID', 'error');
            return;
        }
    }
    
    const feeRate = feeRates[selectedMethod];
    const fee = amount * (feeRate / 100);
    const totalDeducted = amount + fee;
    
    // Process deposit based on account mode
    if (currentUser.accountMode === 'demo') {
        // Demo account - just add to demo balance
        currentUser.demoBalance += amount;
        showNotification(`$${amount.toLocaleString()} added to your demo account!`, 'success');
    } else {
        // Real account - add to real balance
        currentUser.realBalance += amount;
        showNotification(`$${amount.toLocaleString()} added to your real account!`, 'success');
    }
    
    // Add transaction record
    addDepositTransaction(amount, fee, totalDeducted);
    
    // Save user data
    saveUserData();
    
    // Reset form
    document.getElementById('depositAmount').value = '';
    depositAmount = 0;
    updateTotalAmount();
    
    // Update balance display
    updateBalanceDisplay();
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
}

function addDepositTransaction(amount, fee, total) {
    const transaction = {
        id: Date.now(),
        type: 'deposit',
        method: selectedMethod,
        amount: amount,
        fee: fee,
        total: total,
        accountMode: currentUser.accountMode,
        status: 'completed',
        date: new Date().toISOString(),
        description: `Deposit via ${methodNames[selectedMethod]}`
    };
    
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift(transaction);
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

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showNotification('Copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy', 'error');
    });
}

function showNotification(message, type) {
    const existing = document.querySelector('.deposit-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'deposit-notification';
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
window.copyToClipboard = copyToClipboard;
window.updateWalletEmail = updateWalletEmail;
window.handleLogout = handleLogout;
