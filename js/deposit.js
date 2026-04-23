// Deposit functionality - Real accounts only with crypto deposits

// Global variables
let currentUser = null;
let selectedCrypto = 'ETH';
let selectedFile = null;
let depositAmount = 0;

// Admin wallet addresses (update these with your actual addresses)
const adminWallets = {
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    USDT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh'
};

// Crypto details
const cryptoDetails = {
    ETH: {
        name: 'Ethereum',
        symbol: 'ETH',
        icon: '⟠',
        network: 'ERC-20',
        minAmount: 100,
        maxAmount: 10000
    },
    USDT: {
        name: 'Tether',
        symbol: 'USDT',
        icon: '₮',
        network: 'ERC-20',
        minAmount: 100,
        maxAmount: 10000
    },
    BTC: {
        name: 'Bitcoin',
        symbol: 'BTC',
        icon: '₿',
        network: 'Bitcoin',
        minAmount: 100,
        maxAmount: 10000
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
    // Check if user has real account
    checkRealAccountStatus();
    
    // Setup crypto selection
    setupCryptoSelection();
    
    // Setup amount input
    setupAmountInput();
    
    // Update address display
    updateWalletAddress();
}

function checkRealAccountStatus() {
    const demoAlert = document.getElementById('demoAlert');
    const depositForm = document.getElementById('depositForm');
    const cryptoCards = document.getElementById('cryptoCards');
    
    // Only allow deposits for real accounts
    if (!currentUser.hasRealAccount) {
        if (demoAlert) {
            demoAlert.style.display = 'block';
            demoAlert.innerHTML = `
                <strong>⚠️ Real Account Required</strong><br>
                You are currently using a Demo Account. To make real deposits, please go to your Dashboard and click "Create Real Account" first.
            `;
        }
        if (depositForm) depositForm.style.opacity = '0.5';
        if (cryptoCards) cryptoCards.style.opacity = '0.5';
        
        // Disable all interactive elements
        const depositBtn = document.getElementById('depositBtn');
        if (depositBtn) depositBtn.disabled = true;
        
        showNotification('Please create a Real Account first from your Dashboard', 'error');
    } else {
        if (demoAlert) demoAlert.style.display = 'none';
        if (depositForm) depositForm.style.opacity = '1';
        if (cryptoCards) cryptoCards.style.opacity = '1';
    }
}

function setupCryptoSelection() {
    const cryptoCards = document.querySelectorAll('.crypto-card');
    
    cryptoCards.forEach(card => {
        card.addEventListener('click', function() {
            // Remove active class from all cards
            cryptoCards.forEach(c => c.classList.remove('active'));
            // Add active class to clicked card
            this.classList.add('active');
            // Store selected crypto
            selectedCrypto = this.dataset.crypto;
            // Update wallet address
            updateWalletAddress();
            // Validate amount
            validateAmount();
        });
    });
    
    // Set default active card
    const defaultCard = document.querySelector('[data-crypto="ETH"]');
    if (defaultCard) defaultCard.classList.add('active');
}

function setupAmountInput() {
    const amountInput = document.getElementById('depositAmount');
    const depositBtn = document.getElementById('depositBtn');
    
    if (amountInput) {
        amountInput.addEventListener('input', function() {
            let amount = parseFloat(this.value);
            
            if (isNaN(amount)) {
                amount = 0;
            }
            
            depositAmount = amount;
            validateAmount();
        });
    }
    
    // Quick amount buttons
    const quickAmounts = document.querySelectorAll('.quick-amount');
    quickAmounts.forEach(btn => {
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
        depositBtn.addEventListener('click', submitDepositRequest);
    }
}

function validateAmount() {
    const amount = depositAmount;
    const depositBtn = document.getElementById('depositBtn');
    const minAmount = 100;
    const maxAmount = 10000;
    
    if (amount >= minAmount && amount <= maxAmount) {
        if (depositBtn) depositBtn.disabled = false;
        return true;
    } else {
        if (depositBtn) depositBtn.disabled = true;
        if (amount > 0 && amount < minAmount) {
            showNotification(`Minimum deposit is $${minAmount}`, 'error');
        } else if (amount > maxAmount) {
            showNotification(`Maximum deposit is $${maxAmount}`, 'error');
        }
        return false;
    }
}

function updateWalletAddress() {
    const addressElement = document.getElementById('walletAddress');
    if (addressElement) {
        addressElement.textContent = adminWallets[selectedCrypto];
    }
}

function handleFileUpload(input) {
    const file = input.files[0];
    const fileInfo = document.getElementById('fileInfo');
    const uploadArea = document.getElementById('uploadArea');
    
    if (file) {
        // Check file type
        if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
            showNotification('Please upload JPG or PNG image', 'error');
            input.value = '';
            return;
        }
        
        // Check file size (max 5MB)
        if (file.size > 5 * 1024 * 1024) {
            showNotification('File size must be less than 5MB', 'error');
            input.value = '';
            return;
        }
        
        selectedFile = file;
        
        // Show file info
        if (fileInfo) {
            fileInfo.style.display = 'block';
            fileInfo.innerHTML = `✅ Screenshot uploaded: ${file.name}`;
            fileInfo.style.background = 'var(--success)';
        }
        
        if (uploadArea) {
            uploadArea.style.borderColor = 'var(--success)';
            uploadArea.style.background = 'rgba(0, 216, 151, 0.05)';
        }
        
        validateAmount();
    }
}

function submitDepositRequest() {
    if (!currentUser) {
        showNotification('Please login to deposit', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    // Check if user has real account
    if (!currentUser.hasRealAccount) {
        showNotification('Please create a Real Account first', 'error');
        return;
    }
    
    // Validate amount
    if (!validateAmount()) {
        return;
    }
    
    // Validate screenshot
    if (!selectedFile) {
        showNotification('Please upload a screenshot of your payment', 'error');
        return;
    }
    
    const amount = depositAmount;
    const cryptoName = cryptoDetails[selectedCrypto].name;
    const cryptoSymbol = cryptoDetails[selectedCrypto].symbol;
    
    // Create deposit request
    const depositRequest = {
        id: Date.now(),
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        crypto: selectedCrypto,
        cryptoName: cryptoName,
        amount: amount,
        status: 'pending',
        date: new Date().toISOString(),
        screenshot: selectedFile.name,
        adminAddress: adminWallets[selectedCrypto]
    };
    
    // Save deposit request to localStorage
    let depositRequests = JSON.parse(localStorage.getItem('pocket_deposit_requests') || '[]');
    depositRequests.push(depositRequest);
    localStorage.setItem('pocket_deposit_requests', JSON.stringify(depositRequests));
    
    // Add to user's pending deposits
    if (!currentUser.pendingDeposits) currentUser.pendingDeposits = [];
    currentUser.pendingDeposits.push({
        id: depositRequest.id,
        amount: amount,
        crypto: selectedCrypto,
        status: 'pending',
        date: new Date().toISOString()
    });
    
    // Save user data
    saveUserData();
    
    // Show success message
    showNotification(`Deposit request submitted! Send ${amount} USDT worth of ${cryptoName} to the provided address. Admin will verify within 24 hours.`, 'success');
    
    // Reset form
    document.getElementById('depositAmount').value = '';
    depositAmount = 0;
    selectedFile = null;
    document.getElementById('screenshot').value = '';
    document.getElementById('fileInfo').style.display = 'none';
    document.getElementById('uploadArea').style.borderColor = '';
    document.getElementById('uploadArea').style.background = '';
    document.getElementById('depositBtn').disabled = true;
    
    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 3000);
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

function copyAddress() {
    const address = adminWallets[selectedCrypto];
    navigator.clipboard.writeText(address).then(() => {
        showNotification('Address copied to clipboard!', 'success');
    }).catch(() => {
        showNotification('Failed to copy address', 'error');
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
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() { notification.remove(); }, 300);
    }, 5000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'login.html';
}

// Make functions global for HTML onclick
window.copyAddress = copyAddress;
window.handleFileUpload = handleFileUpload;
window.handleLogout = handleLogout;
