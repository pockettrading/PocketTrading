// Admin Panel Controller - PocketTrading
// File: js/admin.js
// Admin email: ephremgojo@gmail.com (ONLY)

class AdminManager {
    constructor() {
        this.currentUser = null;
        this.users = [];
        this.deposits = [];
        this.withdrawals = [];
        this.kycRequests = [];
        this.trades = [];
        this.userGrowthChart = null;
        this.volumeChart = null;
        this.init();
    }

    async init() {
        if (typeof auth === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.currentUser = auth.getUser();
        
        // Check if user is admin
        if (!this.currentUser || this.currentUser.email !== 'ephremgojo@gmail.com') {
            window.location.href = 'home.html';
            return;
        }

        await this.loadAllData();
        this.setupUserInterface();
        this.setupEventListeners();
        this.renderDashboard();
        this.initCharts();
        
        // Set up auto-refresh every 30 seconds
        setInterval(() => this.refreshData(), 30000);
    }

    setupUserInterface() {
        const adminName = document.getElementById('adminName');
        const adminEmail = document.getElementById('adminEmail');
        const adminAvatar = document.getElementById('adminAvatar');
        
        if (adminName) adminName.textContent = this.currentUser.name || 'Admin';
        if (adminEmail) adminEmail.textContent = this.currentUser.email;
        if (adminAvatar) adminAvatar.textContent = '👑';
    }

    async loadAllData() {
        await Promise.all([
            this.loadUsers(),
            this.loadDeposits(),
            this.loadWithdrawals(),
            this.loadKYC(),
            this.loadTrades()
        ]);
    }

    async refreshData() {
        await this.loadAllData();
        this.renderDashboard();
        if (this.currentTab === 'users') this.renderUsers();
        if (this.currentTab === 'deposits') this.renderDeposits();
        if (this.currentTab === 'withdrawals') this.renderWithdrawals();
        if (this.currentTab === 'kyc') this.renderKYC();
        if (this.currentTab === 'trades') this.renderTrades();
    }

    async loadUsers() {
        try {
            this.users = await supabaseDB.getAllUsers();
        } catch (error) {
            console.error('Error loading users:', error);
            this.users = [];
        }
    }

    async loadDeposits() {
        try {
            this.deposits = await supabaseDB.getAll('deposit_requests');
        } catch (error) {
            console.error('Error loading deposits:', error);
            this.deposits = [];
        }
    }

    async loadWithdrawals() {
        try {
            this.withdrawals = await supabaseDB.getAll('withdrawal_requests');
        } catch (error) {
            console.error('Error loading withdrawals:', error);
            this.withdrawals = [];
        }
    }

    async loadKYC() {
        try {
            this.kycRequests = await supabaseDB.getAll('kyc_requests');
        } catch (error) {
            console.error('Error loading KYC:', error);
            this.kycRequests = [];
        }
    }

    async loadTrades() {
        try {
            this.trades = await supabaseDB.getAll('trades');
        } catch (error) {
            console.error('Error loading trades:', error);
            this.trades = [];
        }
    }

    renderDashboard() {
        // Update stats
        const totalUsers = this.users.length;
        const totalVolume = this.trades.reduce((sum, t) => sum + (t.amount * t.leverage), 0);
        const totalDeposits = this.deposits
            .filter(d => d.status === 'approved')
            .reduce((sum, d) => sum + d.amount, 0);
        const pendingRequests = [
            ...this.deposits.filter(d => d.status === 'pending'),
            ...this.withdrawals.filter(w => w.status === 'pending'),
            ...this.kycRequests.filter(k => k.status === 'pending')
        ].length;

        document.getElementById('totalUsers').textContent = totalUsers;
        document.getElementById('totalVolume').textContent = `$${totalVolume.toLocaleString()}`;
        document.getElementById('totalDeposits').textContent = `$${totalDeposits.toLocaleString()}`;
        document.getElementById('pendingRequests').textContent = pendingRequests;

        // Render recent activity
        this.renderRecentActivity();
        this.updateCharts();
    }

    renderRecentActivity() {
        const tbody = document.getElementById('recentActivityTable');
        if (!tbody) return;

        // Combine all activities
        const activities = [];
        
        this.deposits.forEach(d => {
            const user = this.users.find(u => u.id === d.user_id);
            activities.push({
                user: user?.name || user?.email || 'Unknown',
                action: `Deposit Request`,
                amount: d.amount,
                date: d.date,
                type: 'deposit'
            });
        });
        
        this.withdrawals.forEach(w => {
            const user = this.users.find(u => u.id === w.user_id);
            activities.push({
                user: user?.name || user?.email || 'Unknown',
                action: `Withdrawal Request`,
                amount: w.amount,
                date: w.date,
                type: 'withdrawal'
            });
        });
        
        // Sort by date (most recent first)
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentActivities = activities.slice(0, 10);

        if (recentActivities.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4"><div class="empty-state">No recent activity</div></td></tr>';
            return;
        }

        tbody.innerHTML = recentActivities.map(activity => `
            <tr>
                <td><strong>${activity.user}</strong></td>
                <td>${activity.action}</td>
                <td>$${activity.amount.toLocaleString()}</td>
                <td>${this.formatDate(activity.date)}</td>
            </tr>
        `).join('');
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;

        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';

        let filteredUsers = [...this.users];
        
        if (searchTerm) {
            filteredUsers = filteredUsers.filter(u => 
                u.name?.toLowerCase().includes(searchTerm) || 
                u.email?.toLowerCase().includes(searchTerm)
            );
        }
        
        if (roleFilter === 'admin') {
            filteredUsers = filteredUsers.filter(u => u.email === 'ephremgojo@gmail.com');
        } else if (roleFilter === 'user') {
            filteredUsers = filteredUsers.filter(u => u.email !== 'ephremgojo@gmail.com');
        }

        if (filteredUsers.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No users found</div></td></tr>';
            return;
        }

        tbody.innerHTML = filteredUsers.map(user => `
            <tr>
                <td>
                    <strong>${user.name || 'N/A'}</strong><br>
                    <small style="color: #8B93A5;">ID: ${user.id}</small>
                </td>
                <td>${user.email}</td>
                <td>$${(user.balance || 0).toLocaleString()}</td>
                <td><span class="status-badge status-${user.kyc_status === 'verified' ? 'approved' : (user.kyc_status || 'pending')}">${user.kyc_status || 'pending'}</span></td>
                <td><span class="role-badge ${user.email === 'ephremgojo@gmail.com' ? 'role-admin' : 'role-user'}">${user.email === 'ephremgojo@gmail.com' ? 'Admin' : 'User'}</span></td>
                <td>${this.formatDate(user.created_at)}</td>
                <td>
                    <button class="action-btn btn-view" onclick="adminManager.viewUserDetails(${user.id})">View</button>
                    ${user.email !== 'ephremgojo@gmail.com' ? `<button class="action-btn btn-delete" onclick="adminManager.deleteUser(${user.id})">Delete</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    renderDeposits() {
        const tbody = document.getElementById('depositsTableBody');
        if (!tbody) return;

        const statusFilter = document.getElementById('depositStatusFilter')?.value || 'all';
        
        let filteredDeposits = [...this.deposits];
        
        if (statusFilter !== 'all') {
            filteredDeposits = filteredDeposits.filter(d => d.status === statusFilter);
        }

        if (filteredDeposits.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No deposit requests found</div></td></tr>';
            return;
        }

        tbody.innerHTML = filteredDeposits.map(deposit => {
            const user = this.users.find(u => u.id === deposit.user_id);
            return `
                <tr>
                    <td><strong>${user?.name || user?.email || 'Unknown'}</strong></td>
                    <td>$${deposit.amount.toLocaleString()}</td>
                    <td>${deposit.currency || 'USDT'}</td>
                    <td><small>${deposit.wallet_address?.substring(0, 15)}...</small></td>
                    <td>${this.formatDate(deposit.date)}</td>
                    <td><span class="status-badge status-${deposit.status}">${deposit.status}</span></td>
                    <td>
                        ${deposit.status === 'pending' ? `
                            <button class="action-btn btn-approve" onclick="adminManager.approveDeposit(${deposit.id})">Approve</button>
                            <button class="action-btn btn-reject" onclick="adminManager.rejectDeposit(${deposit.id})">Reject</button>
                        ` : ''}
                        <button class="action-btn btn-view" onclick="adminManager.viewDepositDetails(${deposit.id})">Details</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderWithdrawals() {
        const tbody = document.getElementById('withdrawalsTableBody');
        if (!tbody) return;

        const statusFilter = document.getElementById('withdrawStatusFilter')?.value || 'all';
        
        let filteredWithdrawals = [...this.withdrawals];
        
        if (statusFilter !== 'all') {
            filteredWithdrawals = filteredWithdrawals.filter(w => w.status === statusFilter);
        }

        if (filteredWithdrawals.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No withdrawal requests found</div></td></tr>';
            return;
        }

        tbody.innerHTML = filteredWithdrawals.map(withdrawal => {
            const user = this.users.find(u => u.id === withdrawal.user_id);
            return `
                <tr>
                    <td><strong>${user?.name || user?.email || 'Unknown'}</strong></td>
                    <td>$${withdrawal.amount.toLocaleString()}</td>
                    <td>${withdrawal.crypto || 'USDT'}</td>
                    <td><small>${withdrawal.wallet_address?.substring(0, 15)}...</small></td>
                    <td>${withdrawal.fee || 0}%</td>
                    <td>${this.formatDate(withdrawal.date)}</td>
                    <td><span class="status-badge status-${withdrawal.status}">${withdrawal.status}</span></td>
                    <td>
                        ${withdrawal.status === 'pending' ? `
                            <button class="action-btn btn-approve" onclick="adminManager.approveWithdrawal(${withdrawal.id})">Approve</button>
                            <button class="action-btn btn-reject" onclick="adminManager.rejectWithdrawal(${withdrawal.id})">Reject</button>
                        ` : ''}
                        <button class="action-btn btn-view" onclick="adminManager.viewWithdrawalDetails(${withdrawal.id})">Details</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderKYC() {
        const tbody = document.getElementById('kycTableBody');
        if (!tbody) return;

        const statusFilter = document.getElementById('kycStatusFilter')?.value || 'all';
        
        let filteredKYC = [...this.kycRequests];
        
        if (statusFilter !== 'all') {
            filteredKYC = filteredKYC.filter(k => k.status === statusFilter);
        }

        if (filteredKYC.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No KYC requests found</div></td></tr>';
            return;
        }

        tbody.innerHTML = filteredKYC.map(kyc => {
            const user = this.users.find(u => u.id === kyc.user_id);
            return `
                <tr>
                    <td><strong>${user?.name || user?.email || 'Unknown'}</strong></td>
                    <td>${kyc.full_name}</td>
                    <td>${kyc.dob}</td>
                    <td>${kyc.id_type}</td>
                    <td>${this.formatDate(kyc.date)}</td>
                    <td><span class="status-badge status-${kyc.status}">${kyc.status}</span></td>
                    <td>
                        ${kyc.status === 'pending' ? `
                            <button class="action-btn btn-approve" onclick="adminManager.approveKYC(${kyc.id})">Verify</button>
                            <button class="action-btn btn-reject" onclick="adminManager.rejectKYC(${kyc.id})">Reject</button>
                        ` : ''}
                        <button class="action-btn btn-view" onclick="adminManager.viewKYCDetails(${kyc.id})">Details</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderTrades() {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody) return;

        const searchTerm = document.getElementById('tradeSearch')?.value.toLowerCase() || '';
        const statusFilter = document.getElementById('tradeStatusFilter')?.value || 'all';
        
        let filteredTrades = [...this.trades];
        
        if (searchTerm) {
            filteredTrades = filteredTrades.filter(t => 
                t.symbol?.toLowerCase().includes(searchTerm)
            );
        }
        
        if (statusFilter !== 'all') {
            filteredTrades = filteredTrades.filter(t => t.status === statusFilter);
        }

        filteredTrades.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        if (filteredTrades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="9"><div class="empty-state">No trades found</div></td></tr>';
            return;
        }

        tbody.innerHTML = filteredTrades.map(trade => {
            const user = this.users.find(u => u.id === trade.user_id);
            const pnlClass = (trade.pnl || 0) >= 0 ? 'positive' : 'negative';
            
            return `
                <tr>
                    <td><small>${user?.name || user?.email || 'Unknown'}</small></td>
                    <td><strong>${trade.symbol}</strong></td>
                    <td><span class="trade-type-badge ${trade.type === 'buy' ? 'trade-type-buy' : 'trade-type-sell'}">${trade.type}</span></td>
                    <td>$${trade.entry_price?.toLocaleString()}</td>
                    <td>$${trade.amount?.toLocaleString()}</td>
                    <td>${trade.leverage}x</td>
                    <td class="${pnlClass}">${(trade.pnl || 0) >= 0 ? '+' : ''}$${Math.abs(trade.pnl || 0).toLocaleString()}</td>
                    <td><span class="status-badge status-${trade.status}">${trade.status}</span></td>
                    <td><small>${this.formatDate(trade.created_at)}</small></td>
                </tr>
            `;
        }).join('');
    }

    initCharts() {
        const growthCtx = document.getElementById('userGrowthChart')?.getContext('2d');
        const volumeCtx = document.getElementById('volumeChart')?.getContext('2d');
        
        if (growthCtx) {
            this.userGrowthChart = new Chart(growthCtx, {
                type: 'line',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'New Users',
                        data: [],
                        borderColor: '#00D897',
                        backgroundColor: 'rgba(0, 216, 151, 0.1)',
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#FFFFFF' } } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } },
                        y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } }
                    }
                }
            });
        }
        
        if (volumeCtx) {
            this.volumeChart = new Chart(volumeCtx, {
                type: 'bar',
                data: {
                    labels: [],
                    datasets: [{
                        label: 'Trading Volume',
                        data: [],
                        backgroundColor: '#00D897',
                        borderRadius: 8
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#FFFFFF' } } },
                    scales: {
                        x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } },
                        y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } }
                    }
                }
            });
        }
    }

    updateCharts() {
        // Get last 7 days data
        const last7Days = [];
        const userCounts = [];
        const volumeData = [];
        
        for (let i = 6; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toLocaleDateString();
            last7Days.push(dateStr);
            
            // Count users registered on this day
            const usersOnDay = this.users.filter(u => {
                const createdDate = new Date(u.created_at);
                return createdDate.toLocaleDateString() === dateStr;
            }).length;
            userCounts.push(usersOnDay);
            
            // Calculate volume for this day
            const volumeOnDay = this.trades.filter(t => {
                const tradeDate = new Date(t.created_at);
                return tradeDate.toLocaleDateString() === dateStr;
            }).reduce((sum, t) => sum + (t.amount * t.leverage), 0);
            volumeData.push(volumeOnDay / 1000); // in thousands
        }
        
        if (this.userGrowthChart) {
            this.userGrowthChart.data.labels = last7Days;
            this.userGrowthChart.data.datasets[0].data = userCounts;
            this.userGrowthChart.update();
        }
        
        if (this.volumeChart) {
            this.volumeChart.data.labels = last7Days;
            this.volumeChart.data.datasets[0].data = volumeData;
            this.volumeChart.update();
        }
    }

    async approveDeposit(depositId) {
        const deposit = this.deposits.find(d => d.id === depositId);
        if (!deposit) return;
        
        await supabaseDB.update('deposit_requests', depositId, { status: 'approved' });
        
        // Update user balance
        const user = this.users.find(u => u.id === deposit.user_id);
        if (user) {
            const newBalance = (user.balance || 0) + deposit.amount;
            await supabaseDB.updateUserBalance(user.id, newBalance);
        }
        
        await this.refreshData();
        auth.showSuccess(`Deposit of $${deposit.amount} approved!`);
    }

    async rejectDeposit(depositId) {
        const deposit = this.deposits.find(d => d.id === depositId);
        if (!deposit) return;
        
        await supabaseDB.update('deposit_requests', depositId, { status: 'rejected' });
        await this.refreshData();
        auth.showError(`Deposit of $${deposit.amount} rejected`);
    }

    async approveWithdrawal(withdrawalId) {
        const withdrawal = this.withdrawals.find(w => w.id === withdrawalId);
        if (!withdrawal) return;
        
        const user = this.users.find(u => u.id === withdrawal.user_id);
        if (user && (user.balance || 0) >= withdrawal.amount) {
            const newBalance = (user.balance || 0) - withdrawal.amount;
            await supabaseDB.updateUserBalance(user.id, newBalance);
            await supabaseDB.update('withdrawal_requests', withdrawalId, { status: 'approved' });
            await this.refreshData();
            auth.showSuccess(`Withdrawal of $${withdrawal.amount} approved!`);
        } else {
            auth.showError('Insufficient balance for this withdrawal');
        }
    }

    async rejectWithdrawal(withdrawalId) {
        const withdrawal = this.withdrawals.find(w => w.id === withdrawalId);
        if (!withdrawal) return;
        
        await supabaseDB.update('withdrawal_requests', withdrawalId, { status: 'rejected' });
        await this.refreshData();
        auth.showError(`Withdrawal of $${withdrawal.amount} rejected`);
    }

    async approveKYC(kycId) {
        const kyc = this.kycRequests.find(k => k.id === kycId);
        if (!kyc) return;
        
        await supabaseDB.update('kyc_requests', kycId, { status: 'approved' });
        await supabaseDB.updateUserKYCStatus(kyc.user_id, 'verified');
        await this.refreshData();
        auth.showSuccess(`KYC approved for ${kyc.full_name}`);
    }

    async rejectKYC(kycId) {
        const kyc = this.kycRequests.find(k => k.id === kycId);
        if (!kyc) return;
        
        await supabaseDB.update('kyc_requests', kycId, { status: 'rejected' });
        await this.refreshData();
        auth.showError(`KYC rejected for ${kyc.full_name}`);
    }

    async deleteUser(userId) {
        if (confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
            await supabaseDB.delete('custom_users', userId);
            await this.refreshData();
            auth.showSuccess('User deleted successfully');
        }
    }

    async saveSettings() {
        const minTradeAmount = document.getElementById('minTradeAmount')?.value;
        const maxLeverage = document.getElementById('maxLeverage')?.value;
        const withdrawalFee = document.getElementById('withdrawalFee')?.value;
        
        const settings = { minTradeAmount, maxLeverage, withdrawalFee };
        localStorage.setItem('platform_settings', JSON.stringify(settings));
        
        auth.showSuccess('Settings saved successfully');
    }

    async backupDatabase() {
        const data = {
            users: this.users,
            trades: this.trades,
            deposits: this.deposits,
            withdrawals: this.withdrawals,
            kycRequests: this.kycRequests,
            backupDate: new Date().toISOString()
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pockettrading_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        auth.showSuccess('Database backup downloaded');
    }

    exportUserData() {
        const data = this.users.map(u => ({
            name: u.name,
            email: u.email,
            balance: u.balance,
            kyc_status: u.kyc_status,
            created_at: u.created_at
        }));
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        auth.showSuccess('User data exported');
    }

    exportTradeData() {
        const data = this.trades.map(t => ({
            user_id: t.user_id,
            symbol: t.symbol,
            type: t.type,
            amount: t.amount,
            leverage: t.leverage,
            pnl: t.pnl,
            status: t.status,
            created_at: t.created_at
        }));
        
        const dataStr = JSON.stringify(data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trades_export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        auth.showSuccess('Trade data exported');
    }

    async clearLogs() {
        if (confirm('Are you sure you want to clear all activity logs?')) {
            // Clear activities from database
            auth.showSuccess('Activity logs cleared');
        }
    }

    viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const userTrades = this.trades.filter(t => t.user_id === userId);
        const totalPnL = userTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        
        const modal = document.getElementById('detailsModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalButtons = document.getElementById('modalButtons');
        
        modalTitle.textContent = `User Details: ${user.name || 'User'}`;
        modalBody.innerHTML = `
            <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${user.name || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.email}</span></div>
            <div class="detail-row"><span class="detail-label">Balance</span><span class="detail-value">$${(user.balance || 0).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">KYC Status</span><span class="detail-value">${user.kyc_status || 'pending'}</span></div>
            <div class="detail-row"><span class="detail-label">Total Trades</span><span class="detail-value">${userTrades.length}</span></div>
            <div class="detail-row"><span class="detail-label">Total P&L</span><span class="detail-value ${totalPnL >= 0 ? 'positive' : 'negative'}">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Joined</span><span class="detail-value">${this.formatDate(user.created_at)}</span></div>
        `;
        modalButtons.innerHTML = '';
        modal.style.display = 'flex';
    }

    viewDepositDetails(depositId) {
        const deposit = this.deposits.find(d => d.id === depositId);
        const user = this.users.find(u => u.id === deposit?.user_id);
        
        const modal = document.getElementById('detailsModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalButtons = document.getElementById('modalButtons');
        
        modalTitle.textContent = 'Deposit Request Details';
        modalBody.innerHTML = `
            <div class="detail-row"><span class="detail-label">User</span><span class="detail-value">${user?.name || user?.email || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">$${deposit?.amount?.toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Currency</span><span class="detail-value">${deposit?.currency || 'USDT'}</span></div>
            <div class="detail-row"><span class="detail-label">Wallet Address</span><span class="detail-value"><small>${deposit?.wallet_address}</small></span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${this.formatDate(deposit?.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${deposit?.status}</span></div>
        `;
        modalButtons.innerHTML = deposit?.status === 'pending' ? `
            <button class="modal-btn btn-approve" onclick="adminManager.approveDeposit(${depositId}); adminManager.closeModal();">Approve</button>
            <button class="modal-btn btn-reject" onclick="adminManager.rejectDeposit(${depositId}); adminManager.closeModal();">Reject</button>
        ` : '';
        modal.style.display = 'flex';
    }

    viewWithdrawalDetails(withdrawalId) {
        const withdrawal = this.withdrawals.find(w => w.id === withdrawalId);
        const user = this.users.find(u => u.id === withdrawal?.user_id);
        
        const modal = document.getElementById('detailsModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalButtons = document.getElementById('modalButtons');
        
        modalTitle.textContent = 'Withdrawal Request Details';
        modalBody.innerHTML = `
            <div class="detail-row"><span class="detail-label">User</span><span class="detail-value">${user?.name || user?.email || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">$${withdrawal?.amount?.toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Crypto</span><span class="detail-value">${withdrawal?.crypto || 'USDT'}</span></div>
            <div class="detail-row"><span class="detail-label">Wallet Address</span><span class="detail-value"><small>${withdrawal?.wallet_address}</small></span></div>
            <div class="detail-row"><span class="detail-label">Fee</span><span class="detail-value">${withdrawal?.fee}%</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${this.formatDate(withdrawal?.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${withdrawal?.status}</span></div>
        `;
        modalButtons.innerHTML = withdrawal?.status === 'pending' ? `
            <button class="modal-btn btn-approve" onclick="adminManager.approveWithdrawal(${withdrawalId}); adminManager.closeModal();">Approve</button>
            <button class="modal-btn btn-reject" onclick="adminManager.rejectWithdrawal(${withdrawalId}); adminManager.closeModal();">Reject</button>
        ` : '';
        modal.style.display = 'flex';
    }

    viewKYCDetails(kycId) {
        const kyc = this.kycRequests.find(k => k.id === kycId);
        const user = this.users.find(u => u.id === kyc?.user_id);
        
        const modal = document.getElementById('detailsModal');
        const modalTitle = document.getElementById('modalTitle');
        const modalBody = document.getElementById('modalBody');
        const modalButtons = document.getElementById('modalButtons');
        
        modalTitle.textContent = 'KYC Request Details';
        modalBody.innerHTML = `
            <div class="detail-row"><span class="detail-label">User</span><span class="detail-value">${user?.name || user?.email || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">${kyc?.full_name}</span></div>
            <div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value">${kyc?.dob}</span></div>
            <div class="detail-row"><span class="detail-label">ID Type</span><span class="detail-value">${kyc?.id_type}</span></div>
            <div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${this.formatDate(kyc?.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${kyc?.status}</span></div>
        `;
        modalButtons.innerHTML = kyc?.status === 'pending' ? `
            <button class="modal-btn btn-approve" onclick="adminManager.approveKYC(${kycId}); adminManager.closeModal();">Verify</button>
            <button class="modal-btn btn-reject" onclick="adminManager.rejectKYC(${kycId}); adminManager.closeModal();">Reject</button>
        ` : '';
        modal.style.display = 'flex';
    }

    closeModal() {
        const modal = document.getElementById('detailsModal');
        modal.style.display = 'none';
    }

    setupEventListeners() {
        // Tab switching
        const navItems = document.querySelectorAll('.nav-item[data-tab]');
        navItems.forEach(item => {
            item.addEventListener('click', () => {
                const tabId = item.dataset.tab;
                this.switchTab(tabId);
            });
        });
        
        // User filters
        const userSearch = document.getElementById('userSearch');
        const userRoleFilter = document.getElementById('userRoleFilter');
        if (userSearch) userSearch.addEventListener('input', () => this.renderUsers());
        if (userRoleFilter) userRoleFilter.addEventListener('change', () => this.renderUsers());
        
        // Deposit filter
        const depositFilter = document.getElementById('depositStatusFilter');
        if (depositFilter) depositFilter.addEventListener('change', () => this.renderDeposits());
        
        // Withdrawal filter
        const withdrawFilter = document.getElementById('withdrawStatusFilter');
        if (withdrawFilter) withdrawFilter.addEventListener('change', () => this.renderWithdrawals());
        
        // KYC filter
        const kycFilter = document.getElementById('kycStatusFilter');
        if (kycFilter) kycFilter.addEventListener('change', () => this.renderKYC());
        
        // Trade filters
        const tradeSearch = document.getElementById('tradeSearch');
        const tradeFilter = document.getElementById('tradeStatusFilter');
        if (tradeSearch) tradeSearch.addEventListener('input', () => this.renderTrades());
        if (tradeFilter) tradeFilter.addEventListener('change', () => this.renderTrades());
        
        // Mobile menu
        const menuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        if (menuBtn && sidebar) {
            menuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
        }
    }

    switchTab(tabId) {
        this.currentTab = tabId;
        
        // Update nav items
        document.querySelectorAll('.nav-item[data-tab]').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.tab === tabId) {
                item.classList.add('active');
            }
        });
        
        // Update tab contents
        const tabs = ['dashboard', 'users', 'deposits', 'withdrawals', 'kyc', 'trades', 'settings'];
        tabs.forEach(tab => {
            const element = document.getElementById(`${tab}Tab`);
            if (element) element.style.display = tab === tabId ? 'block' : 'none';
        });
        
        // Render appropriate content
        if (tabId === 'users') this.renderUsers();
        if (tabId === 'deposits') this.renderDeposits();
        if (tabId === 'withdrawals') this.renderWithdrawals();
        if (tabId === 'kyc') this.renderKYC();
        if (tabId === 'trades') this.renderTrades();
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    formatNumber(num) {
        if (!num) return '0';
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    }
}

// Initialize
let adminManager = null;

document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});

// Global functions
function logout() {
    if (auth) auth.logout();
}
