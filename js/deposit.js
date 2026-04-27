// Deposit functionality - With admin configurable addresses

let currentUser = null;
let selectedCrypto = 'ETH';
let selectedFile = null;

// Default addresses (these can be changed by admin)
// These will be stored in localStorage and can be updated via admin panel
let walletAddresses = {
    ETH: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
    BTC: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
    USDT: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Deposit page loaded');
    loadUser();
    renderUserInfo();
    renderNavLinks();
    loadWalletAddresses();
    setupEventListeners();
    updateAddressDisplay();
    
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
    }
}

function renderUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    if (currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        userInfo.innerHTML = `
            <span class="username">${displayName}</span>
            <span class="logout-link" onclick="handleLogout()">Logout</span>
        `;
    } else {
        userInfo.innerHTML = '';
    }
}

function renderNavLinks() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    const hasProfileLink = Array.from(navLinks.children).some(link => link.textContent === 'My Profile');
    if (currentUser && !hasProfileLink) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'nav-link';
        profileLink.textContent = 'My Profile';
        navLinks.appendChild(profileLink);
    }
}

function loadWalletAddresses() {
    // Load addresses from localStorage (set by admin panel)
    const savedAddresses = localStorage.getItem('wallet_addresses');
    if (savedAddresses) {
        walletAddresses = JSON.parse(savedAddresses);
    }
    updateAddressDisplay();
}

function updateAddressDisplay() {
    const ethElem = document.getElementById('ethAddress');
    const btcElem = document.getElementById('btcAddress');
    const usdtElem = document.getElementById('usdtAddress');
    
    if (ethElem) ethElem.textContent = walletAddresses.ETH;
    if (btcElem) btcElem.textContent = walletAddresses.BTC;
    if (usdtElem) usdtElem.textContent = walletAddresses.USDT;
}

function setupEventListeners() {
    // Crypto card selection
    const cryptoCards = document.querySelectorAll('.crypto-card');
    cryptoCards.forEach(card => {
        card.addEventListener('click', () => {
            cryptoCards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
            selectedCrypto = card.dataset.crypto;
            
            // Update currency select
            const currencySelect = document.getElementById('currencySelect');
            if (currencySelect) {
                currencySelect.value = selectedCrypto;
            }
        });
    });
    
    // Currency select change
    const currencySelect = document.getElementById('currencySelect');
    if (currencySelect) {
        currencySelect.addEventListener('change', (e) => {
            selectedCrypto = e.target.value;
            cryptoCards.forEach(card => {
                if (card.dataset.crypto === selectedCrypto) {
                    card.classList.add('active');
                } else {
                    card.classList.remove('active');
                }
            });
        });
    }
    
    // File upload
    const fileInput = document.getElementById('proofFile');
    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }
    
    // Form submission
    const depositForm = document.getElementById('depositFormElement');
    if (depositForm) {
        depositForm.addEventListener('submit', submitDepositRequest);
    }
}

function handleFileUpload(event) {
    const file = event.target.files[0];
    const fileNameSpan = document.getElementById('fileName');
    
    if (file) {
        if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
            alert('Please upload JPG or PNG image');
            event.target.value = '';
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            alert('File size must be less than 5MB');
            event.target.value = '';
            return;
        }
        
        selectedFile = file;
        if (fileNameSpan) {
            fileNameSpan.textContent = `✅ ${file.name}`;
            fileNameSpan.style.color = 'var(--success)';
        }
    } else {
        selectedFile = null;
        if (fileNameSpan) fileNameSpan.textContent = '';
    }
}

function submitDepositRequest(event) {
    event.preventDefault();
    
    if (!currentUser) {
        alert('Please login to deposit');
        window.location.href = 'login.html';
        return;
    }
    
    const amount = parseFloat(document.getElementById('depositAmount').value);
    const currency = document.getElementById('currencySelect').value;
    
    if (!amount || amount <= 0) {
        alert('Please enter a valid amount');
        return;
    }
    
    if (amount < 10) {
        alert('Minimum deposit amount is $10 USDT');
        return;
    }
    
    if (!selectedFile) {
        alert('Please upload a screenshot of your payment');
        return;
    }
    
    // Create deposit request
    const depositRequest = {
        id: Date.now(),
        userId: currentUser.id,
        userEmail: currentUser.email,
        userName: currentUser.name,
        amount: amount,
        currency: currency,
        status: 'pending',
        date: new Date().toISOString(),
        screenshot: selectedFile.name,
        walletAddress: walletAddresses[currency]
    };
    
    // Save deposit request
    let depositRequests = JSON.parse(localStorage.getItem('deposit_requests') || '[]');
    depositRequests.push(depositRequest);
    localStorage.setItem('deposit_requests', JSON.stringify(depositRequests));
    
    // Add to user's pending deposits
    if (!currentUser.pendingDeposits) currentUser.pendingDeposits = [];
    currentUser.pendingDeposits.push({
        id: depositRequest.id,
        amount: amount,
        currency: currency,
        status: 'pending',
        date: new Date().toISOString()
    });
    
    // Add transaction record
    if (!currentUser.transactions) currentUser.transactions = [];
    currentUser.transactions.unshift({
        id: Date.now(),
        type: 'deposit',
        amount: amount,
        currency: currency,
        status: 'pending',
        date: new Date().toISOString(),
        description: `Deposit request of $${amount} via ${currency} - Pending Approval`
    });
    
    // Save user data
    saveUserData();
    
    alert(`Deposit request submitted! Amount: $${amount} ${currency}\n\nAdmin will review and approve within 24 hours.`);
    
    // Reset form
    document.getElementById('depositAmount').value = '';
    document.getElementById('proofFile').value = '';
    document.getElementById('fileName').textContent = '';
    selectedFile = null;
    
    // Redirect to dashboard after 2 seconds
    setTimeout(() => {
        window.location.href = 'dashboard.html';
    }, 2000);
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

function copyAddress(crypto) {
    let address = '';
    switch(crypto) {
        case 'eth':
            address = walletAddresses.ETH;
            break;
        case 'btc':
            address = walletAddresses.BTC;
            break;
        case 'usdt':
            address = walletAddresses.USDT;
            break;
    }
    
    navigator.clipboard.writeText(address).then(() => {
        alert('Address copied to clipboard!');
    }).catch(() => {
        alert('Failed to copy address');
    });
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.copyAddress = copyAddress;
window.handleLogout = handleLogout;
