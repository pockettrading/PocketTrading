// Admin Panel - Complete Control System

let adminUser = null;

// Admin email - change this to your admin email
const ADMIN_EMAIL = 'admin@pockettrading.com';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Admin page loaded');
    checkAdminAccess();
    loadAdminData();
    setupAdminMenu();
    loadWalletSettings();
});

function checkAdminAccess() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        adminUser = JSON.parse(storedUser);
        // Check if user email matches admin email
        if (adminUser.email !== ADMIN_EMAIL) {
            alert('Access denied. Admin only.');
            window.location.href = 'home.html';
            return;
        }
    } else {
        // Not logged in at all
        window.location.href = 'login.html';
        return;
    }
    
    renderAdminUserInfo();
}

function renderAdminUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    userInfo.innerHTML = `
        <span class="username">Admin: ${adminUser.name || adminUser.email}</span>
        <span class="logout-link" onclick="handleLogout()">Logout</span>
    `;
}

function setupAdminMenu() {
    const menuItems = document.querySelectorAll('.admin-menu-item');
    menuItems.forEach(item => {
        item.addEventListener('click', () => {
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            const section = item.dataset.section;
            showSection(section);
        });
    });
}

function showSection(section) {
    const sections = ['dashboard', 'kyc', 'deposits', 'withdrawals', 'trades', 'users', 'settings'];
    sections.forEach(s => {
        const elem = document.getElementById(`${s}Section`);
        if (elem) elem.style.display = 'none';
    });
    
    const activeSection = document.getElementById(`${section}Section`);
    if (activeSection) activeSection.style.display = 'block';
    
    switch(section) {
        case 'dashboard':
            loadDashboardData();
            break;
        case 'kyc':
            loadKYCRequests();
            break;
        case 'deposits':
            loadDepositRequests();
            break;
        case 'withdrawals':
            loadWithdrawalRequests();
            break;
        case 'trades':
            loadAllTrades();
            break;
        case 'users':
            loadAllUsers();
            break;
    }
}

function loadAdminData() {
    loadDashboardData();
}

function loadDashboardData() {
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const kycRequests = JSON.parse(localStorage.getItem('kyc_requests') || '[]');
    const depositRequests = JSON.parse(localStorage.getItem('deposit_requests') || '[]');
    const withdrawalRequests = JSON.parse(localStorage.getItem('withdrawal_requests') || '[]');
    
    const pendingKYC = kycRequests.filter(r => r.status === 'pending').length;
    const pendingDeposits = depositRequests.filter(r => r.status === 'pending').length;
    const pendingWithdrawals = withdrawalRequests.filter(r => r.status === 'pending').length;
    
    document.getElementById('totalUsers').textContent = users.length;
    document.getElementById('pendingKYC').textContent = pendingKYC;
    document.getElementById('pendingDeposits').textContent = pendingDeposits;
    document.getElementById('pendingWithdrawals').textContent = pendingWithdrawals;
    
    // Recent activity
    const allActivities = [];
    
    depositRequests.forEach(d => {
        allActivities.push({
            date: d.date,
            user: d.userName || d.userEmail,
            type: 'Deposit',
            amount: d.amount,
            status: d.status
        });
    });
    
    withdrawalRequests.forEach(w => {
        allActivities.push({
            date: w.date,
            user: w.userName || w.userEmail,
            type: 'Withdrawal',
            amount: w.amount,
            status: w.status
        });
    });
    
    allActivities.sort((a, b) => new Date(b.date) - new Date(a.date));
    const recent = allActivities.slice(0, 10);
    
    const tbody = document.getElementById('recentActivityBody');
    if (recent.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center;">No recent activity</td--</tr>';
    } else {
        tbody.innerHTML = recent.map(activity => `
            <tr>
                <td>${new Date(activity.date).toLocaleString()}</td
                <td>${activity.user}</td
                <td>${activity.type}</td
                <td>$${activity.amount.toLocaleString()}</td
                <td><span class="status-${activity.status}">${activity.status}</span></td
            比
        `).join('');
    }
}

function loadKYCRequests() {
    const kycRequests = JSON.parse(localStorage.getItem('kyc_requests') || '[]');
    const pending = kycRequests.filter(r => r.status === 'pending');
    document.getElementById('kycCount').textContent = `${pending.length} Pending`;
    
    const tbody = document.getElementById('kycTableBody');
    if (kycRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No KYC requests</td--</td>';
        return;
    }
    
    tbody.innerHTML = kycRequests.map(request => `
        <tr>
            <td>${new Date(request.date).toLocaleString()}</td
            <td>${request.userId}</td
            <td>${request.fullName}</td
            <td>${request.userEmail}</td
            <td>${request.idType}</td
            <td><span class="status-${request.status}">${request.status}</span></td
            <td>
                ${request.status === 'pending' ? `
                    <button class="btn-approve" onclick="approveKYC(${request.id})">Approve</button>
                    <button class="btn-reject" onclick="rejectKYC(${request.id})">Reject</button>
                ` : '-'}
            </td
        </tr>
    `).join('');
}

function loadDepositRequests() {
    const depositRequests = JSON.parse(localStorage.getItem('deposit_requests') || '[]');
    const pending = depositRequests.filter(r => r.status === 'pending');
    document.getElementById('depositCount').textContent = `${pending.length} Pending`;
    
    const tbody = document.getElementById('depositsTableBody');
    if (depositRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No deposit requests</td--</tr>';
        return;
    }
    
    tbody.innerHTML = depositRequests.map(request => `
        <tr>
            <td>${new Date(request.date).toLocaleString()}</td
            <td>${request.userName || request.userEmail}</td
            <td>$${request.amount.toLocaleString()}</td
            <td>${request.currency}</td
            <td>${request.walletAddress?.substring(0, 20)}...</td
            <td>
                <button class="btn-view" onclick="viewProof('${request.screenshot}')">View Proof</button>
            </td
            <td><span class="status-${request.status}">${request.status}</span></td
            <td>
                ${request.status === 'pending' ? `
                    <button class="btn-approve" onclick="approveDeposit(${request.id}, ${request.amount})">Approve</button>
                    <button class="btn-reject" onclick="rejectDeposit(${request.id})">Reject</button>
                ` : '-'}
            </td
        </tr>
    `).join('');
}

function loadWithdrawalRequests() {
    const withdrawalRequests = JSON.parse(localStorage.getItem('withdrawal_requests') || '[]');
    const pending = withdrawalRequests.filter(r => r.status === 'pending');
    document.getElementById('withdrawalCount').textContent = `${pending.length} Pending`;
    
    const tbody = document.getElementById('withdrawalsTableBody');
    if (withdrawalRequests.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No withdrawal requests</td--</tr>';
        return;
    }
    
    tbody.innerHTML = withdrawalRequests.map(request => `
        <tr>
            <td>${new Date(request.date).toLocaleString()}</td
            <td>${request.userName || request.userEmail}</td
            <td>$${request.amount.toLocaleString()}</td
            <td>${request.crypto || 'USDT'}</td
            <td>${request.walletAddress?.substring(0, 20)}...</td
            <td><span class="status-${request.status}">${request.status}</span></td
            <td>
                ${request.status === 'pending' ? `
                    <button class="btn-approve" onclick="approveWithdrawal(${request.id}, ${request.amount})">Approve</button>
                    <button class="btn-reject" onclick="rejectWithdrawal(${request.id})">Reject</button>
                ` : '-'}
            </td
        </tr>
    `).join('');
}

function loadAllTrades() {
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    let allTrades = [];
    
    users.forEach(user => {
        const trades = (user.transactions || []).filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
        trades.forEach(trade => {
            allTrades.push({
                ...trade,
                userName: user.name || user.email,
                userEmail: user.email,
                userId: user.id
            });
        });
    });
    
    allTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    const tbody = document.getElementById('tradesTableBody');
    if (allTrades.length === 0) {
        tbody.innerHTML = '</table><td colspan="8" style="text-align: center;">No trades found</td--</tr>';
        return;
    }
    
    tbody.innerHTML = allTrades.map(trade => `
        <tr>
            <td>${new Date(trade.date).toLocaleString()}</td
            <td>${trade.userName}</td
            <td>${trade.type}</td
            <td>${trade.crypto || 'BTC'}</td
            <td>${trade.amount?.toFixed(2) || '0'}</td
            <td>$${trade.price?.toFixed(2) || '0'}</td
            <td>$${trade.total?.toFixed(2) || trade.expectedReturn?.toFixed(2) || '0'}</td
            <td><span class="status-completed">completed</span></td
        </tr>
    `).join('');
}

function loadAllUsers() {
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    
    const tbody = document.getElementById('usersTableBody');
    if (users.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No users found</td--</tr>';
        return;
    }
    
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td
            <td>${user.name || '-'}</td
            <td>${user.email}</td
            <td>$${user.balance?.toFixed(2) || '0'}</td
            <td><span class="status-${user.kycStatus || 'pending'}">${user.kycStatus || 'pending'}</span></td
            <td>${new Date(user.created).toLocaleDateString()}</td
            <td>
                <button class="btn-view" onclick="viewUserDetails(${user.id})">View</button>
            </td
        </tr>
    `).join('');
}

function approveKYC(requestId) {
    let kycRequests = JSON.parse(localStorage.getItem('kyc_requests') || '[]');
    const request = kycRequests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'approved';
        localStorage.setItem('kyc_requests', JSON.stringify(kycRequests));
        
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const userIndex = users.findIndex(u => u.id === request.userId);
        if (userIndex !== -1) {
            users[userIndex].kycStatus = 'verified';
            localStorage.setItem('pocket_users', JSON.stringify(users));
        }
        
        alert(`KYC approved for ${request.fullName}`);
        loadKYCRequests();
        loadDashboardData();
    }
}

function rejectKYC(requestId) {
    let kycRequests = JSON.parse(localStorage.getItem('kyc_requests') || '[]');
    const request = kycRequests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'rejected';
        localStorage.setItem('kyc_requests', JSON.stringify(kycRequests));
        
        alert(`KYC rejected for ${request.fullName}`);
        loadKYCRequests();
        loadDashboardData();
    }
}

function approveDeposit(requestId, amount) {
    let depositRequests = JSON.parse(localStorage.getItem('deposit_requests') || '[]');
    const request = depositRequests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'approved';
        localStorage.setItem('deposit_requests', JSON.stringify(depositRequests));
        
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const userIndex = users.findIndex(u => u.id === request.userId);
        if (userIndex !== -1) {
            users[userIndex].balance = (users[userIndex].balance || 0) + amount;
            
            if (!users[userIndex].transactions) users[userIndex].transactions = [];
            users[userIndex].transactions.unshift({
                id: Date.now(),
                type: 'deposit',
                amount: amount,
                status: 'completed',
                date: new Date().toISOString(),
                description: `Deposit approved - $${amount}`
            });
            
            localStorage.setItem('pocket_users', JSON.stringify(users));
        }
        
        alert(`Deposit of $${amount} approved and credited to user!`);
        loadDepositRequests();
        loadDashboardData();
    }
}

function rejectDeposit(requestId) {
    let depositRequests = JSON.parse(localStorage.getItem('deposit_requests') || '[]');
    const request = depositRequests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'rejected';
        localStorage.setItem('deposit_requests', JSON.stringify(depositRequests));
        
        alert(`Deposit rejected for ${request.userName}`);
        loadDepositRequests();
        loadDashboardData();
    }
}

function approveWithdrawal(requestId, amount) {
    let withdrawalRequests = JSON.parse(localStorage.getItem('withdrawal_requests') || '[]');
    const request = withdrawalRequests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'approved';
        localStorage.setItem('withdrawal_requests', JSON.stringify(withdrawalRequests));
        
        alert(`Withdrawal of $${amount} approved!`);
        loadWithdrawalRequests();
        loadDashboardData();
    }
}

function rejectWithdrawal(requestId) {
    let withdrawalRequests = JSON.parse(localStorage.getItem('withdrawal_requests') || '[]');
    const request = withdrawalRequests.find(r => r.id === requestId);
    
    if (request) {
        request.status = 'rejected';
        localStorage.setItem('withdrawal_requests', JSON.stringify(withdrawalRequests));
        
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        const userIndex = users.findIndex(u => u.id === request.userId);
        if (userIndex !== -1) {
            users[userIndex].balance = (users[userIndex].balance || 0) + request.amount;
            localStorage.setItem('pocket_users', JSON.stringify(users));
        }
        
        alert(`Withdrawal rejected. Amount refunded to user.`);
        loadWithdrawalRequests();
        loadDashboardData();
    }
}

function viewProof(screenshot) {
    alert(`Proof of payment: ${screenshot}\n\n(Image would be displayed here in production)`);
}

function viewUserDetails(userId) {
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const user = users.find(u => u.id === userId);
    
    if (user) {
        alert(`
User Details:
Name: ${user.name}
Email: ${user.email}
Balance: $${user.balance?.toFixed(2) || 0}
KYC Status: ${user.kycStatus || 'pending'}
Total Trades: ${user.stats?.totalTrades || 0}
Member Since: ${new Date(user.created).toLocaleDateString()}
        `);
    }
}

function loadWalletSettings() {
    const addresses = JSON.parse(localStorage.getItem('wallet_addresses') || '{}');
    document.getElementById('adminEthAddress').value = addresses.ETH || '';
    document.getElementById('adminBtcAddress').value = addresses.BTC || '';
    document.getElementById('adminUsdtAddress').value = addresses.USDT || '';
}

function saveWalletSettings() {
    const addresses = {
        ETH: document.getElementById('adminEthAddress').value,
        BTC: document.getElementById('adminBtcAddress').value,
        USDT: document.getElementById('adminUsdtAddress').value
    };
    
    localStorage.setItem('wallet_addresses', JSON.stringify(addresses));
    alert('Wallet addresses saved successfully!');
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

window.approveKYC = approveKYC;
window.rejectKYC = rejectKYC;
window.approveDeposit = approveDeposit;
window.rejectDeposit = rejectDeposit;
window.approveWithdrawal = approveWithdrawal;
window.rejectWithdrawal = rejectWithdrawal;
window.viewProof = viewProof;
window.viewUserDetails = viewUserDetails;
window.saveWalletSettings = saveWalletSettings;
window.handleLogout = handleLogout;
