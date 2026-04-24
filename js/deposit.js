// Deposit functionality - Real accounts only with crypto deposits

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
    console.log('Deposit page loaded');
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    updateUserDisplay();
    initDepositPage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
    }
}

function updateUserDisplay() {
    const userNameSpan = document.getElementById('userNameText');
    if (userNameSpan && currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        userNameSpan.textContent = displayName;
    }
}

function initDepositPage() {
    checkRealAccountStatus();
    setupCryptoSelection();
    setupAmountInput();
    updateWalletAddress();
    setupFileUpload();
}

function checkRealAccountStatus() {
    const demoAlert = document.getElementById('demoAlert');
    const depositForm = document.getElementById('depositForm');
    const cryptoCards = document.querySelector('.crypto-cards');
    
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
            cryptoCards.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            selectedCrypto = this.dataset.crypto;
            updateWalletAddress();
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
            depositAmount = isNaN(amount) ? 0 : amount;
            validateAmount();
        });
    }
    
    const quickAmounts = document.querySelectorAll('.quick-amount');
    quickAmounts.forEach(btn => {
        btn.addEventListener('click', function() {
            const amount = parseInt(this.dataset.amount);
            if (amountInput) {
                amountInput.value = amount;
                depositAmount = amount;
                validateAmount();
            }
        });
    });
    
    if (depositBtn) {
        depositBtn.addEventListener('click', submitDepositRequest);
    }
}

function validateAmount() {
    const depositBtn = document.getElementById('depositBtn');
    const minAmount = cryptoDetails[selectedCrypto].minAmount;
    const maxAmount = cryptoDetails[selectedCrypto].maxAmount;
    
    if (depositAmount >= minAmount && depositAmount <= maxAmount && selectedFile) {
        if (depositBtn) depositBtn.disabled = false;
        return true;
    } else {
        if (depositBtn) depositBtn.disabled = true;
        if (depositAmount > 0 && depositAmount < minAmount) {
            showNotification(`Minimum deposit is $${minAmount}`, 'error');
        } else if (depositAmount > maxAmount) {
            showNotification(`Maximum deposit is $${maxAmount}`, 'error');
        } else if (!selectedFile && depositAmount >= minAmount) {
            showNotification('Please upload a screenshot of your payment', 'error');
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

function setupFileUpload() {
    const fileInput = document.getElementById('screenshot');
    const uploadArea = document.querySelector('.upload-area');
    const fileInfo = document.getElementById('fileInfo');
    
    if (fileInput) {
        fileInput.addEventListener('change', function(e) {
            const file = e.target.files[0];
            
            if (file) {
                if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
                    showNotification('Please upload JPG or PNG image', 'error');
                    fileInput.value = '';
                    return;
                }
                
                if (file.size > 5 * 1024 * 1024) {
                    showNotification('File size must be less than 5MB', 'error');
                    fileInput.value = '';
                    return;
                }
                
                selectedFile = file;
                
                if (fileInfo) {
                    fileInfo.style.display = 'block';
                    fileInfo.innerHTML = `✅ Screenshot uploaded: ${file.name}`;
                }
                
                if (uploadArea) {
                    uploadArea.style.borderColor = 'var(--success)';
                    uploadArea.style.background = 'rgba(0, 216, 151, 0.05)';
                }
                
                validateAmount();
            }
        });
    }
}

function submitDepositRequest(e) {
    e.preventDefault();
    
    if (!currentUser) {
        showNotification('Please login to deposit', 'error');
        window.location.href = 'login.html';
        return;
    }
    
    if (!currentUser.hasRealAccount) {
        showNotification('Please create a Real Account first', 'error');
        return;
    }
    
    if (!validateAmount()) {
        return;
    }
    
    const amount = depositAmount;
    const cryptoName = cryptoDetails[selectedCrypto].name;
    
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
    
    // Add transaction record
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift({
        id: Date.now(),
        type: 'deposit',
        amount: amount,
        crypto: selectedCrypto,
        status: 'pending',
        date: new Date().toISOString(),
        description: `Deposit request of $${amount} via ${cryptoName} - Pending Admin Approval`
    });
    
    // Save user data
    saveUserData();
    
    showNotification(`Deposit request submitted! Send $${amount} worth of ${cryptoName} to the provided address. Admin will verify within 24 hours.`, 'success');
    
    // Reset form
    resetForm();
    
    // Redirect to dashboard after 3 seconds
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 3000);
}

function resetForm() {
    const amountInput = document.getElementById('depositAmount');
    const fileInput = document.getElementById('screenshot');
    const fileInfo = document.getElementById('fileInfo');
    const uploadArea = document.querySelector('.upload-area');
    
    if (amountInput) amountInput.value = '';
    depositAmount = 0;
    selectedFile = null;
    if (fileInput) fileInput.value = '';
    if (fileInfo) fileInfo.style.display = 'none';
    if (uploadArea) {
        uploadArea.style.borderColor = '';
        uploadArea.style.background = '';
    }
    
    const depositBtn = document.getElementById('depositBtn');
    if (depositBtn) depositBtn.disabled = true;
}

function saveUserData() {
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pocket_users', JSON.stringify(users));
    }
    
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
    }, 4000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.copyAddress = copyAddress;
window.handleLogout = handleLogout;
