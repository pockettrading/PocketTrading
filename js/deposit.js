// Deposit page functionality - Supabase Integration
// File: js/deposit.js

let currentUser = null;
let selectedCrypto = 'ETH';
let selectedFile = null;

// Admin email
const ADMIN_EMAIL = 'ephregojo@gmail.com';

// Wallet addresses (loaded from Supabase)
let walletAddresses = {
    ETH: '',
    BTC: '',
    USDT: ''
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Deposit page loaded');
    
    if (typeof supabaseDB === 'undefined') {
        setTimeout(() => initDepositPage(), 500);
        return;
    }
    
    await initDepositPage();
});

async function initDepositPage() {
    await loadUser();
    renderNavLinks();
    renderUserInfo();
    await loadWalletAddresses();
    
    if (!currentUser) {
        renderLoginPrompt();
    } else {
        renderDepositInterface();
        setupEventListeners();
        updateAddressDisplay();
    }
}

async function loadUser() {
    try {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            
            // Verify user still exists in cloud
            const cloudUser = await supabaseDB.getUserByEmail(currentUser.email);
            if (cloudUser) {
                currentUser = cloudUser;
                currentUser.isAdmin = (currentUser.email === ADMIN_EMAIL);
                
                // Update session
                if (localStorage.getItem('pocket_user')) {
                    localStorage.setItem('pocket_user', JSON.stringify(currentUser));
                }
                if (sessionStorage.getItem('pocket_user')) {
                    sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
                }
            } else {
                currentUser = null;
            }
            console.log('User loaded:', currentUser?.email, 'Is Admin:', currentUser?.isAdmin);
        } else {
            console.log('Guest mode - no user logged in');
            currentUser = null;
        }
    } catch(e) {
        console.log('Error loading user:', e);
        currentUser = null;
    }
}

function renderNavLinks() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    // Clear existing dynamic links (keep Home, Markets, Trades)
    const existingLinks = navLinks.querySelectorAll('.nav-link:not([href="home.html"]):not([href="markets.html"]):not([href="trade.html"])');
    existingLinks.forEach(link => link.remove());
    
    // Add My Profile link only for registered users
    if (currentUser) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'nav-link';
        profileLink.textContent = 'My Profile';
        navLinks.appendChild(profileLink);
    }
}

function renderUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    if (currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        const adminBadge = currentUser.isAdmin ? '<span class="admin-badge">Admin</span>' : '';
        
        let adminPanelButton = '';
        if (currentUser.isAdmin) {
            adminPanelButton = '<a href="admin.html" class="login-btn" style="margin-left: 0.5rem;">Admin Panel</a>';
        }
        
        userInfo.innerHTML = `
            <span class="username">${displayName}${adminBadge}</span>
            ${adminPanelButton}
            <span class="logout-link" onclick="handleLogout()">Logout</span>
        `;
    } else {
        userInfo.innerHTML = `
            <div class="auth-buttons">
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="signup-btn">Sign Up</a>
            </div>
        `;
    }
}

function renderLoginPrompt() {
    const container = document.getElementById('depositContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="login-prompt">
            <h3>🔒 Login Required</h3>
            <p>Please login or create an account to deposit funds</p>
            <div class="login-buttons">
                <a href="login.html" class="btn-login" style="background: transparent; color: var(--primary); padding: 10px 28px; border: 1px solid var(--primary); border-radius: 10px; text-decoration: none; font-weight: 500;">Login</a>
                <a href="register.html" class="btn-signup" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; padding: 10px 28px; border: none; border-radius: 10px; text-decoration: none; font-weight: 500;">Sign Up</a>
            </div>
        </div>
    `;
}

async function loadWalletAddresses() {
    try {
        const settings = await supabaseDB.getWalletSettings();
        if (settings) {
            walletAddresses = {
                ETH: settings.eth_address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0',
                BTC: settings.btc_address || 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
                USDT: settings.usdt_address || '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb0'
            };
        }
    } catch (error) {
        console.error('Error loading wallet addresses:', error);
    }
}

function renderDepositInterface() {
    const container = document.getElementById('depositContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="deposit-container">
            <div class="deposit-header">
                <h1>Deposit Funds</h1>
                <p>Add funds to your trading account securely</p>
            </div>

            <!-- Crypto Cards -->
            <div class="crypto-cards" id="cryptoCards">
                <div class="crypto-card active" data-crypto="ETH">
                    <div class="crypto-icon">⟠</div>
                    <div class="crypto-name">Ethereum</div>
                    <div class="crypto-address" id="ethAddress">${walletAddresses.ETH.substring(0, 20)}...</div>
                    <button class="copy-btn" onclick="copyAddress('eth')">Copy Address</button>
                </div>
                <div class="crypto-card" data-crypto="BTC">
                    <div class="crypto-icon">₿</div>
                    <div class="crypto-name">Bitcoin</div>
                    <div class="crypto-address" id="btcAddress">${walletAddresses.BTC.substring(0, 20)}...</div>
                    <button class="copy-btn" onclick="copyAddress('btc')">Copy Address</button>
                </div>
                <div class="crypto-card" data-crypto="USDT">
                    <div class="crypto-icon">₮</div>
                    <div class="crypto-name">Tether (ERC-20)</div>
                    <div class="crypto-address" id="usdtAddress">${walletAddresses.USDT.substring(0, 20)}...</div>
                    <button class="copy-btn" onclick="copyAddress('usdt')">Copy Address</button>
                </div>
            </div>

            <!-- Deposit Form -->
            <div class="deposit-form">
                <form id="depositFormElement">
                    <div class="form-group">
                        <label>Amount (USDT)</label>
                        <input type="number" id="depositAmount" placeholder="Enter amount in USDT" min="10" step="10" required>
                    </div>

                    <div class="form-group">
                        <label>Currency</label>
                        <select id="currencySelect">
                            <option value="ETH">Ethereum (ETH) - ERC-20</option>
                            <option value="BTC">Bitcoin (BTC)</option>
                            <option value="USDT">Tether (USDT) - ERC-20</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label>Upload Proof of Payment (Screenshot)</label>
                        <div class="file-upload" onclick="document.getElementById('proofFile').click()">
                            <div class="upload-icon">📸</div>
                            <div class="upload-text">Click to upload screenshot of your payment</div>
                            <div class="upload-text" style="font-size: 0.7rem; margin-top: 0.5rem;">Supported: JPG, PNG (Max 5MB)</div>
                        </div>
                        <input type="file" id="proofFile" accept="image/jpeg,image/png" style="display: none;">
                        <div id="fileName" class="file-name"></div>
                    </div>

                    <button type="submit" class="btn-submit" id="submitBtn">Submit Deposit Request</button>

                    <div class="warning-note">
                        <p>⚠️ Your deposit will be approved after reviewing. Please upload valid proof of payment.</p>
                    </div>
                </form>
            </div>
        </div>
    `;
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

async function submitDepositRequest(event) {
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
    
    // Get wallet address for selected currency
    let walletAddress = '';
    switch(currency) {
        case 'ETH':
            walletAddress = walletAddresses.ETH;
            break;
        case 'BTC':
            walletAddress = walletAddresses.BTC;
            break;
        case 'USDT':
            walletAddress = walletAddresses.USDT;
            break;
    }
    
    // Create deposit request in Supabase
    const depositRequest = {
        id: Date.now(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        user_name: currentUser.name,
        amount: amount,
        currency: currency,
        wallet_address: walletAddress,
        screenshot: selectedFile.name,
        status: 'pending',
        date: new Date().toISOString()
    };
    
    try {
        await supabaseDB.insert('deposit_requests', depositRequest);
        
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
        
    } catch (error) {
        console.error('Error submitting deposit request:', error);
        alert('Failed to submit deposit request. Please try again.');
    }
}

function updateAddressDisplay() {
    const ethElem = document.getElementById('ethAddress');
    const btcElem = document.getElementById('btcAddress');
    const usdtElem = document.getElementById('usdtAddress');
    
    if (ethElem) ethElem.textContent = walletAddresses.ETH.substring(0, 20) + '...';
    if (btcElem) btcElem.textContent = walletAddresses.BTC.substring(0, 20) + '...';
    if (usdtElem) usdtElem.textContent = walletAddresses.USDT.substring(0, 20) + '...';
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

function saveUserData() {
    // Update in localStorage for session consistency
    if (localStorage.getItem('pocket_user')) {
        localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
    if (sessionStorage.getItem('pocket_user')) {
        sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.copyAddress = copyAddress;
window.handleLogout = handleLogout;
