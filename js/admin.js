// Admin Panel - Supabase Cloud Database (FIXED)
// File: js/admin.js
// Admin email: ephremgojo@gmail.com (ONLY)

let adminUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Admin page loaded - Initializing...');
    
    // Wait for supabaseDB
    if (typeof supabaseDB === 'undefined') {
        console.log('Waiting for Supabase...');
        setTimeout(() => checkAdminAccess(), 500);
        return;
    }
    
    await checkAdminAccess();
});

async function checkAdminAccess() {
    console.log('Checking admin access...');
    
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    console.log('Stored user:', storedUser);
    
    if (storedUser) {
        adminUser = JSON.parse(storedUser);
        console.log('Admin user:', adminUser.email);
        
        // ONLY ephremgojo@gmail.com can access admin panel
        if (adminUser.email !== 'ephremgojo@gmail.com') {
            alert('Access denied. Admin only. Only ephremgojo@gmail.com has access.');
            window.location.href = 'home.html';
            return;
        }
    } else {
        window.location.href = 'login.html';
        return;
    }
    
    renderAdminUserInfo();
    await loadDashboardData();
    setupAdminMenu();
    await loadWalletSettings();
    
    // Show dashboard section by default
    showSection('dashboard');
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
    console.log('Setting up admin menu...');
    
    const menuItems = document.querySelectorAll('.admin-menu-item');
    console.log('Found menu items:', menuItems.length);
    
    menuItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Menu clicked:', this.dataset.section);
            
            // Remove active class from all
            menuItems.forEach(mi => mi.classList.remove('active'));
            // Add active class to clicked
            this.classList.add('active');
            
            const section = this.dataset.section;
            showSection(section);
        });
    });
}

function showSection(section) {
    console.log('Showing section:', section);
    
    const sections = ['dashboard', 'kyc', 'deposits', 'withdrawals', 'trades', 'users', 'settings'];
    sections.forEach(s => {
        const elem = document.getElementById(`${s}Section`);
        if (elem) {
            elem.style.display = 'none';
        }
    });
    
    const activeSection = document.getElementById(`${section}Section`);
    if (activeSection) {
        activeSection.style.display = 'block';
        console.log('Displayed section:', section);
    } else {
        console.error('Section not found:', section);
    }
    
    // Load data for the section
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

async function loadDashboardData() {
    console.log('Loading dashboard data...');
    
    try {
        const users = await supabaseDB.getAllUsers();
        console.log('Users loaded:', users.length);
        
        const kycRequests = await supabaseDB.getKYCRequests();
        const depositRequests = await supabaseDB.getDepositRequests();
        const withdrawalRequests = await supabaseDB.getWithdrawalRequests();
        
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
                user: d.user_name || d.user_email,
                type: 'Deposit',
                amount: d.amount,
                status: d.status
            });
        });
        
        withdrawalRequests.forEach(w => {
            allActivities.push({
                date: w.date,
                user: w.user_name || w.user_email,
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
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading dashboard:', error);
        document.getElementById('totalUsers').textContent = 'Error';
    }
}

async function loadKYCRequests() {
    console.log('Loading KYC requests...');
    
    try {
        const kycRequests = await supabaseDB.getKYCRequests();
        const pending = kycRequests.filter(r => r.status === 'pending');
        document.getElementById('kycCount').textContent = `${pending.length} Pending`;
        
        const tbody = document.getElementById('kycTableBody');
        if (kycRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No KYC requests</td--</tr>';
            return;
        }
        
        tbody.innerHTML = kycRequests.map(request => `
            <tr>
                <td>${new Date(request.date).toLocaleString()}</td
                <td>${request.user_id}</td
                <td>${request.full_name}</td
                <td>${request.user_email}</td
                <td>${request.id_type}</td
                <td><span class="status-${request.status}">${request.status}</span></td
                <td>
                    ${request.status === 'pending' ? `
                        <button class="btn-approve" onclick="approveKYC(${request.id}, ${request.user_id})">Approve</button>
                        <button class="btn-reject" onclick="rejectKYC(${request.id}, ${request.user_id})">Reject</button>
                    ` : '-'}
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading KYC:', error);
    }
}

async function loadDepositRequests() {
    console.log('Loading deposit requests...');
    
    try {
        const depositRequests = await supabaseDB.getDepositRequests();
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
                <td>${request.user_name || request.user_email}</td
                <td>$${request.amount.toLocaleString()}</td
                <td>${request.currency}</td
                <td>${request.wallet_address?.substring(0, 20) || 'N/A'}...</td
                <td>
                    <button class="btn-view" onclick="viewProof('${request.screenshot}')">View Proof</button>
                </td
                <td><span class="status-${request.status}">${request.status}</span></td
                <td>
                    ${request.status === 'pending' ? `
                        <button class="btn-approve" onclick="approveDeposit(${request.id}, ${request.user_id}, ${request.amount})">Approve</button>
                        <button class="btn-reject" onclick="rejectDeposit(${request.id})">Reject</button>
                    ` : '-'}
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading deposits:', error);
    }
}

async function loadWithdrawalRequests() {
    console.log('Loading withdrawal requests...');
    
    try {
        const withdrawalRequests = await supabaseDB.getWithdrawalRequests();
        const pending = withdrawalRequests.filter(r => r.status === 'pending');
        document.getElementById('withdrawalCount').textContent = `${pending.length} Pending`;
        
        const tbody = document.getElementById('withdrawalsTableBody');
        if (withdrawalRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">No withdrawal requests</td--<tr>';
            return;
        }
        
        tbody.innerHTML = withdrawalRequests.map(request => `
            <tr>
                <td>${new Date(request.date).toLocaleString()}</td
                <td>${request.user_name || request.user_email}</td
                <td>$${request.amount.toLocaleString()}</td
                <td>${request.crypto}</td
                <td>${request.wallet_address?.substring(0, 20) || 'N/A'}...</td
                <td><span class="status-${request.status}">${request.status}</span></td
                <td>
                    ${request.status === 'pending' ? `
                        <button class="btn-approve" onclick="approveWithdrawal(${request.id}, ${request.user_id}, ${request.amount})">Approve</button>
                        <button class="btn-reject" onclick="rejectWithdrawal(${request.id}, ${request.user_id}, ${request.amount})">Reject</button>
                    ` : '-'}
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading withdrawals:', error);
    }
}

async function loadAllTrades() {
    console.log('Loading trades...');
    
    try {
        const allTrades = await supabaseDB.getAllTransactions();
        allTrades.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        const tbody = document.getElementById('tradesTableBody');
        if (allTrades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center;">No trades found</td--</tr>';
            return;
        }
        
        const users = await supabaseDB.getAllUsers();
        const userMap = {};
        users.forEach(u => { userMap[u.id] = u.name || u.email; });
        
        tbody.innerHTML = allTrades.map(trade => `
            <tr>
                <td>${new Date(trade.date).toLocaleString()}</td
                <td>${userMap[trade.user_id] || trade.user_id}</td
                <td>${trade.type}</td
                <td>${trade.crypto || 'BTC'}</td
                <td>${trade.amount?.toFixed(2) || '0'}</td
                <td>$${trade.price?.toFixed(2) || '0'}</td
                <td>$${trade.total?.toFixed(2) || '0'}</td
                <td><span class="status-completed">completed</span></td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading trades:', error);
    }
}

async function loadAllUsers() {
    console.log('Loading users...');
    
    try {
        const users = await supabaseDB.getAllUsers();
        
        const tbody = document.getElementById('usersTableBody');
        if (users.length === 0) {
            tbody.innerHTML = '<td><td colspan="7" style="text-align: center;">No users found</td--</tr>';
            return;
        }
        
        tbody.innerHTML = users.map(user => `
            <tr>
                <td>${user.id}</td
                <td>${user.name || '-'}</td
                <td>${user.email}</td
                <td>$${user.balance?.toFixed(2) || '0'}</td
                <td><span class="status-${user.kyc_status || 'pending'}">${user.kyc_status || 'pending'}</span></td
                <td>${new Date(user.created_at).toLocaleDateString()}</td
                <td>
                    <button class="btn-view" onclick="viewUserDetails(${user.id})">View</button>
                </td
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadWalletSettings() {
    console.log('Loading wallet settings...');
    
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
        alert('Wallet addresses saved successfully!');
    } catch (error) {
        console.error('Error saving wallet settings:', error);
        alert('Error saving wallet settings');
    }
}

async function approveKYC(requestId, userId) {
    try {
        await supabaseDB.update('kyc_requests', requestId, { status: 'approved' });
        await supabaseDB.updateUserKYCStatus(userId, 'verified');
        
        alert('KYC approved successfully!');
        await loadKYCRequests();
        await loadDashboardData();
    } catch (error) {
        console.error('Error approving KYC:', error);
        alert('Error approving KYC');
    }
}

async function rejectKYC(requestId, userId) {
    try {
        await supabaseDB.update('kyc_requests', requestId, { status: 'rejected' });
        await supabaseDB.updateUserKYCStatus(userId, 'rejected');
        
        alert('KYC rejected!');
        await loadKYCRequests();
        await loadDashboardData();
    } catch (error) {
        console.error('Error rejecting KYC:', error);
        alert('Error rejecting KYC');
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
            
            await supabaseDB.insert('transactions', {
                id: Date.now(),
                user_id: userId,
                type: 'deposit',
                amount: amount,
                status: 'completed',
                date: new Date().toISOString()
            });
        }
        
        alert(`Deposit of $${amount} approved and credited!`);
        await loadDepositRequests();
        await loadDashboardData();
    } catch (error) {
        console.error('Error approving deposit:', error);
        alert('Error approving deposit');
    }
}

async function rejectDeposit(requestId) {
    try {
        await supabaseDB.update('deposit_requests', requestId, { status: 'rejected' });
        alert('Deposit rejected!');
        await loadDepositRequests();
        await loadDashboardData();
    } catch (error) {
        console.error('Error rejecting deposit:', error);
        alert('Error rejecting deposit');
    }
}

async function approveWithdrawal(requestId, userId, amount) {
    try {
        await supabaseDB.update('withdrawal_requests', requestId, { status: 'approved' });
        alert(`Withdrawal of $${amount} approved!`);
        await loadWithdrawalRequests();
        await loadDashboardData();
    } catch (error) {
        console.error('Error approving withdrawal:', error);
        alert('Error approving withdrawal');
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
        
        alert('Withdrawal rejected. Amount refunded to user.');
        await loadWithdrawalRequests();
        await loadDashboardData();
    } catch (error) {
        console.error('Error rejecting withdrawal:', error);
        alert('Error rejecting withdrawal');
    }
}

function viewProof(screenshot) {
    alert(`Proof of payment: ${screenshot}\n\n(Image would be displayed here in production)`);
}

async function viewUserDetails(userId) {
    try {
        const users = await supabaseDB.getAllUsers();
        const user = users.find(u => u.id === userId);
        
        if (user) {
            alert(`
User Details:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
ID: ${user.id}
Name: ${user.name}
Email: ${user.email}
Balance: $${user.balance?.toFixed(2) || 0}
KYC Status: ${user.kyc_status || 'pending'}
Phone: ${user.phone || 'Not set'}
Country: ${user.country || 'Not set'}
Admin: ${user.is_admin ? 'Yes' : 'No'}
Member Since: ${new Date(user.created_at).toLocaleDateString()}
Last Login: ${user.last_login ? new Date(user.last_login).toLocaleString() : 'Never'}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            `);
        }
    } catch (error) {
        console.error('Error viewing user:', error);
    }
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
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
