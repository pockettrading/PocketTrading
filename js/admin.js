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
        this.tradingEnabled = true;
        this.currentTab = 'dashboard';
        this.init();
    }

    async init() {
        await this.waitForDependencies();
        
        this.currentUser = auth.getUser();
        
        if (!this.currentUser || this.currentUser.email !== 'ephremgojo@gmail.com') {
            window.location.href = 'index.html';
            return;
        }
        
        await this.loadEmergencyStopStatus();
        await this.loadAllData();
        this.setupNavigation();
        this.renderDashboard();
        this.renderEmergencyStopSwitch();
        this.setupEventListeners();
        
        setInterval(() => this.refreshData(), 30000);
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && typeof supabaseDB !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
        });
    }

    setupNavigation() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        
        const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
        
        navLinks.innerHTML = `
            <a href="index.html" class="nav-link">Home</a>
            <a href="markets.html" class="nav-link">Markets</a>
            <a href="trades.html" class="nav-link">Trades</a>
            <a href="profile.html" class="nav-link">My Profile</a>
        `;
        
        rightNav.innerHTML = `
            <div class="user-section">
                <div class="user-info">
                    <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                    <div class="user-name">${userName}<span class="admin-badge">Admin</span></div>
                </div>
                <button class="logout-btn" onclick="handleLogout()">Logout</button>
            </div>
        `;
        
        mobileMenu.innerHTML = `
            <a href="index.html" class="mobile-nav-link">🏠 Home</a>
            <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
            <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
            <a href="profile.html" class="mobile-nav-link">👤 My Profile</a>
            <button class="logout-btn" style="margin-top:12px;" onclick="handleLogout()">Logout</button>
        `;
    }

    async loadEmergencyStopStatus() {
        try {
            const settings = await supabaseDB.getPlatformSettings();
            if (settings && settings.trading_enabled !== undefined) {
                this.tradingEnabled = settings.trading_enabled;
            }
        } catch (error) {
            console.error('Error loading emergency stop status:', error);
        }
    }

    async saveEmergencyStopStatus(enabled) {
        this.tradingEnabled = enabled;
        await supabaseDB.updatePlatformSetting('trading_enabled', enabled);
        
        if (!enabled) {
            await this.closeAllOpenTrades();
        }
        
        this.renderEmergencyStopSwitch();
    }

    async closeAllOpenTrades() {
        const openTrades = this.trades.filter(t => t.status === 'open');
        
        for (const trade of openTrades) {
            await supabaseDB.updateTrade(trade.id, {
                status: 'closed',
                result: 'emergency_stop',
                pnl: -trade.amount,
                closed_at: new Date().toISOString()
            });
            
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: trade.user_id,
                type: 'emergency_stop',
                title: 'Trade Closed - Emergency Stop',
                description: `Trade on ${trade.symbol} closed due to admin emergency stop. Loss: $${trade.amount}`,
                created_at: new Date().toISOString()
            });
        }
        
        await this.loadAllData();
        this.renderTrades();
        
        if (openTrades.length > 0) {
            this.showNotification(`⚠️ Emergency Stop: ${openTrades.length} trades closed with total loss of $${openTrades.reduce((sum, t) => sum + t.amount, 0).toLocaleString()}`, 'error');
        }
    }

    renderEmergencyStopSwitch() {
        const dashboardTab = document.getElementById('dashboardTab');
        if (!dashboardTab) return;
        
        let switchContainer = document.getElementById('emergencyStopContainer');
        if (!switchContainer) return;
        
        switchContainer.innerHTML = `
            <div class="emergency-stop ${this.tradingEnabled ? 'enabled' : ''}">
                <div>
                    <div style="display: flex; align-items: center; gap: 12px;">
                        <span style="font-size: 24px;">⚠️</span>
                        <div>
                            <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">Emergency Trade Stop</h3>
                            <p style="font-size: 13px; color: #8B93A5; margin: 0;">
                                ${this.tradingEnabled ? 'Trading is currently ACTIVE' : 'Trading is STOPPED - All open trades will be closed with LOSS'}
                            </p>
                        </div>
                    </div>
                </div>
                <div style="display: flex; align-items: center; gap: 16px;">
                    <span style="font-size: 14px; font-weight: 600; ${this.tradingEnabled ? 'color: #00D897' : 'color: #FF4757'}">
                        ${this.tradingEnabled ? '● ENABLED' : '○ DISABLED'}
                    </span>
                    <label class="switch">
                        <input type="checkbox" id="emergencyStopToggle" ${this.tradingEnabled ? 'checked' : ''}>
                        <span class="slider"></span>
                    </label>
                </div>
            </div>
        `;
        
        const toggle = document.getElementById('emergencyStopToggle');
        if (toggle) {
            toggle.addEventListener('change', async (e) => {
                const confirmed = confirm(`⚠️ WARNING: ${!e.target.checked ? 'Turning OFF will IMMEDIATELY CLOSE ALL OPEN TRADES. Users will lose their invested amounts.' : 'Turning ON will allow trading again.'} Are you sure?`);
                if (confirmed) {
                    await this.saveEmergencyStopStatus(e.target.checked);
                } else {
                    e.target.checked = this.tradingEnabled;
                }
            });
        }
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
        if (this.currentTab === 'dashboard') this.renderDashboard();
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
            this.deposits = await supabaseDB.getDepositRequests();
        } catch (error) {
            console.error('Error loading deposits:', error);
            this.deposits = [];
        }
    }

    async loadWithdrawals() {
        try {
            this.withdrawals = await supabaseDB.getWithdrawalRequests();
        } catch (error) {
            console.error('Error loading withdrawals:', error);
            this.withdrawals = [];
        }
    }

    async loadKYC() {
        try {
            this.kycRequests = await supabaseDB.getKYCRequests();
        } catch (error) {
            console.error('Error loading KYC:', error);
            this.kycRequests = [];
        }
    }

    async loadTrades() {
        try {
            this.trades = await supabaseDB.getAllTrades();
        } catch (error) {
            console.error('Error loading trades:', error);
            this.trades = [];
        }
    }

    renderDashboard() {
        const totalVolume = this.trades.reduce((sum, t) => sum + (t.amount * (t.leverage || 1)), 0);
        const totalDeposits = this.deposits.filter(d => d.status === 'approved').reduce((sum, d) => sum + d.amount, 0);
        const pendingRequests = [
            ...this.deposits.filter(d => d.status === 'pending'),
            ...this.withdrawals.filter(w => w.status === 'pending'),
            ...this.kycRequests.filter(k => k.status === 'pending')
        ].length;
        
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('totalVolume').textContent = `$${(totalVolume / 1000).toFixed(1)}B`;
        document.getElementById('totalDeposits').textContent = `$${(totalDeposits / 1000).toFixed(1)}K`;
        document.getElementById('pendingRequests').textContent = pendingRequests;
        
        this.renderRecentActivity();
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivityBody');
        if (!container) return;
        
        const activities = [];
        this.deposits.slice(0, 5).forEach(d => {
            const user = this.users.find(u => u.id === d.user_id);
            activities.push({ user: user?.name || 'Unknown', action: 'Deposit Request', amount: d.amount, date: d.date });
        });
        this.withdrawals.slice(0, 5).forEach(w => {
            const user = this.users.find(u => u.id === w.user_id);
            activities.push({ user: user?.name || 'Unknown', action: 'Withdrawal Request', amount: w.amount, date: w.date });
        });
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        if (activities.length === 0) {
            container.innerHTML = '<tr><td colspan="4"><div class="empty-state">No recent activity</div></td></tr>';
            return;
        }
        
        container.innerHTML = activities.slice(0, 10).map(a => `
            <tr><td style="font-size: 14px;"><strong>${a.user}</strong></td><td style="font-size: 14px;">${a.action}</td><td style="font-size: 14px; font-weight: 600;">$${a.amount.toLocaleString()}</td><td style="font-size: 13px; color: #8B93A5;">${this.formatDate(a.date)}</td></tr>
        `).join('');
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        
        const searchTerm = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const roleFilter = document.getElementById('userRoleFilter')?.value || 'all';
        
        let filtered = this.users.filter(u => 
            (u.name?.toLowerCase().includes(searchTerm) || u.email.toLowerCase().includes(searchTerm)) &&
            (roleFilter === 'all' || (roleFilter === 'admin' ? u.email === 'ephremgojo@gmail.com' : u.email !== 'ephremgojo@gmail.com'))
        );
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No users found</div></td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(u => `
            <tr>
                <td style="font-size: 14px;"><strong>${u.name || 'N/A'}</strong><br><small style="color:#8B93A5; font-size: 11px;">ID: ${u.id}</small></td>
                <td style="font-size: 14px;">${u.email}</td>
                <td style="font-size: 14px; font-weight: 700; color: #00D897;">$${(u.balance || 0).toLocaleString()}</td>
                <td><span class="status-badge status-${u.kyc_status === 'verified' ? 'approved' : (u.kyc_status || 'pending')}" style="font-size: 12px;">${u.kyc_status || 'pending'}</span></td>
                <td><span class="${u.email === 'ephremgojo@gmail.com' ? 'role-admin' : 'role-user'}" style="font-size: 12px;">${u.email === 'ephremgojo@gmail.com' ? 'Admin' : 'User'}</span></td>
                <td style="font-size: 13px; color: #8B93A5;">${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td>
                <td>
                    <button class="action-btn btn-view" onclick="adminManager.viewUserDetails(${u.id})" style="font-size: 12px; padding: 6px 12px;">View</button>
                    ${u.email !== 'ephremgojo@gmail.com' ? `<button class="action-btn btn-delete" onclick="adminManager.deleteUser(${u.id})" style="font-size: 12px; padding: 6px 12px;">Delete</button>` : ''}
                </td>
            </tr>
        `).join('');
    }

    renderDeposits() {
        const tbody = document.getElementById('depositsTableBody');
        if (!tbody) return;
        
        const statusFilter = document.getElementById('depositStatusFilter')?.value || 'all';
        let filtered = this.deposits.filter(d => statusFilter === 'all' || d.status === statusFilter);
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<td><td colspan="6"><div class="empty-state">No deposits found</div></td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(d => {
            const user = this.users.find(u => u.id === d.user_id);
            return `
                <tr>
                    <td style="font-size: 14px;"><strong>${user?.name || user?.email || 'Unknown'}</strong></td>
                    <td style="font-size: 14px; font-weight: 700; color: #00D897;">$${d.amount.toLocaleString()}</td>
                    <td style="font-size: 14px;">${d.currency || 'USDT'}</td>
                    <td style="font-size: 13px; color: #8B93A5;">${new Date(d.date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${d.status}" style="font-size: 12px;">${d.status}</span></td>
                    <td>
                        ${d.status === 'pending' ? `
                            <button class="action-btn btn-approve" onclick="adminManager.approveDeposit(${d.id})" style="font-size: 12px; padding: 6px 12px;">Approve</button>
                            <button class="action-btn btn-reject" onclick="adminManager.rejectDeposit(${d.id})" style="font-size: 12px; padding: 6px 12px;">Reject</button>
                        ` : ''}
                        <button class="action-btn btn-view" onclick="adminManager.viewDepositDetails(${d.id})" style="font-size: 12px; padding: 6px 12px;">View</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderWithdrawals() {
        const tbody = document.getElementById('withdrawalsTableBody');
        if (!tbody) return;
        
        const statusFilter = document.getElementById('withdrawStatusFilter')?.value || 'all';
        let filtered = this.withdrawals.filter(w => statusFilter === 'all' || w.status === statusFilter);
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No withdrawals found</div></td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(w => {
            const user = this.users.find(u => u.id === w.user_id);
            return `
                <tr>
                    <td style="font-size: 14px;"><strong>${user?.name || user?.email || 'Unknown'}</strong></td>
                    <td style="font-size: 14px; font-weight: 700; color: #FF4757;">$${w.amount.toLocaleString()}</td>
                    <td style="font-size: 14px;">${w.crypto || 'USDT'}</td>
                    <td style="font-size: 13px; color: #8B93A5;">${new Date(w.date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${w.status}" style="font-size: 12px;">${w.status}</span></td>
                    <td>
                        ${w.status === 'pending' ? `
                            <button class="action-btn btn-approve" onclick="adminManager.approveWithdrawal(${w.id})" style="font-size: 12px; padding: 6px 12px;">Approve</button>
                            <button class="action-btn btn-reject" onclick="adminManager.rejectWithdrawal(${w.id})" style="font-size: 12px; padding: 6px 12px;">Reject</button>
                        ` : ''}
                        <button class="action-btn btn-view" onclick="adminManager.viewWithdrawalDetails(${w.id})" style="font-size: 12px; padding: 6px 12px;">View</button>
                    </td>
                </tr>
            `;
        }).join('');
    }

    renderKYC() {
        const tbody = document.getElementById('kycTableBody');
        if (!tbody) return;
        
        const statusFilter = document.getElementById('kycStatusFilter')?.value || 'all';
        let filtered = this.kycRequests.filter(k => statusFilter === 'all' || k.status === statusFilter);
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No KYC requests found</div></td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(k => {
            const user = this.users.find(u => u.id === k.user_id);
            return `
                <tr>
                    <td style="font-size: 14px;"><strong>${user?.name || user?.email || 'Unknown'}</strong></td>
                    <td style="font-size: 14px;">${k.full_name}</td>
                    <td style="font-size: 14px;">${k.id_type}</td>
                    <td style="font-size: 13px; color: #8B93A5;">${new Date(k.date).toLocaleDateString()}</td>
                    <td><span class="status-badge status-${k.status}" style="font-size: 12px;">${k.status}</span></td>
                    <td>
                        ${k.status === 'pending' ? `
                            <button class="action-btn btn-approve" onclick="adminManager.approveKYC(${k.id})" style="font-size: 12px; padding: 6px 12px;">Verify</button>
                            <button class="action-btn btn-reject" onclick="adminManager.rejectKYC(${k.id})" style="font-size: 12px; padding: 6px 12px;">Reject</button>
                        ` : ''}
                        <button class="action-btn btn-view" onclick="adminManager.viewKYCDetails(${k.id})" style="font-size: 12px; padding: 6px 12px;">View</button>
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
        
        let filtered = this.trades.filter(t => 
            (statusFilter === 'all' || t.status === statusFilter) &&
            (!searchTerm || t.symbol?.toLowerCase().includes(searchTerm))
        );
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No trades found</div></td></tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(t => {
            const user = this.users.find(u => u.id === t.user_id);
            return `
                <tr>
                    <td style="font-size: 13px;"><small>${user?.name || user?.email || 'Unknown'}</small></td>
                    <td style="font-size: 14px; font-weight: 600;"><strong>${t.symbol}/USD</strong></td>
                    <td><span class="status-badge ${t.type === 'buy' ? 'status-approved' : 'status-rejected'}" style="font-size: 12px;">${t.type}</span></td>
                    <td style="font-size: 14px;">$${(t.amount || 0).toLocaleString()}</td>
                    <td style="font-size: 14px;">${t.leverage || 1}x</td>
                    <td class="${(t.pnl || 0) >= 0 ? 'positive' : 'negative'}" style="font-size: 14px; font-weight: 600;">${(t.pnl || 0) >= 0 ? '+' : ''}$${Math.abs(t.pnl || 0).toLocaleString()}</td>
                    <td><span class="status-badge status-${t.status === 'open' ? 'pending' : 'approved'}" style="font-size: 12px;">${t.status}</span></td>
                    <td style="font-size: 12px; color: #8B93A5;">${new Date(t.created_at).toLocaleDateString()}</td>
                </tr>
            `;
        }).join('');
    }

    async approveDeposit(id) {
        const deposit = this.deposits.find(d => d.id === id);
        if (!deposit) return;
        
        await supabaseDB.updateDepositRequest(id, { status: 'approved' });
        
        const user = this.users.find(u => u.id === deposit.user_id);
        if (user) {
            const newBalance = (user.balance || 0) + deposit.amount;
            await supabaseDB.updateUserBalance(user.id, newBalance);
            
            await supabaseDB.createTransaction({
                id: Date.now(),
                user_id: user.id,
                amount: deposit.amount,
                type: 'deposit',
                description: `Deposit of $${deposit.amount} approved`,
                date: new Date().toISOString()
            });
        }
        
        await this.refreshData();
        this.showNotification(`Deposit of $${deposit.amount} approved!`, 'success');
    }

    async rejectDeposit(id) {
        await supabaseDB.updateDepositRequest(id, { status: 'rejected' });
        await this.refreshData();
        this.showNotification('Deposit rejected', 'error');
    }

    async approveWithdrawal(id) {
        const withdrawal = this.withdrawals.find(w => w.id === id);
        if (!withdrawal) return;
        
        const user = this.users.find(u => u.id === withdrawal.user_id);
        if (user && (user.balance || 0) >= withdrawal.amount) {
            const newBalance = (user.balance || 0) - withdrawal.amount;
            await supabaseDB.updateUserBalance(user.id, newBalance);
            await supabaseDB.updateWithdrawalRequest(id, { status: 'approved' });
            
            await supabaseDB.createTransaction({
                id: Date.now(),
                user_id: user.id,
                amount: -withdrawal.amount,
                type: 'withdrawal',
                description: `Withdrawal of $${withdrawal.amount} processed`,
                date: new Date().toISOString()
            });
            
            await this.refreshData();
            this.showNotification(`Withdrawal of $${withdrawal.amount} approved!`, 'success');
        } else {
            this.showNotification('Insufficient balance', 'error');
        }
    }

    async rejectWithdrawal(id) {
        await supabaseDB.updateWithdrawalRequest(id, { status: 'rejected' });
        await this.refreshData();
        this.showNotification('Withdrawal rejected', 'error');
    }

    async approveKYC(id) {
        const kyc = this.kycRequests.find(k => k.id === id);
        if (!kyc) return;
        
        await supabaseDB.updateKYCRequest(id, { status: 'approved' });
        await supabaseDB.updateUserKYCStatus(kyc.user_id, 'verified');
        
        await this.refreshData();
        this.showNotification(`KYC approved for ${kyc.full_name}`, 'success');
    }

    async rejectKYC(id) {
        const kyc = this.kycRequests.find(k => k.id === id);
        if (!kyc) return;
        
        await supabaseDB.updateKYCRequest(id, { status: 'rejected' });
        await this.refreshData();
        this.showNotification(`KYC rejected for ${kyc.full_name}`, 'error');
    }

    async viewUserDetails(userId) {
        const user = this.users.find(u => u.id === userId);
        if (!user) return;
        
        const userTrades = this.trades.filter(t => t.user_id === userId);
        const totalPnL = userTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        
        const modal = document.getElementById('detailsModal');
        document.getElementById('modalTitle').textContent = `User Details: ${user.name || 'User'}`;
        document.getElementById('modalBody').innerHTML = `
            <div class="detail-row"><span class="detail-label">Name</span><span class="detail-value" style="font-size: 16px; font-weight: 600;">${user.name || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value" style="font-size: 16px;">${user.email}</span></div>
            <div class="detail-row"><span class="detail-label">Balance</span><span class="detail-value" style="font-size: 16px; font-weight: 700; color: #00D897;">$${(user.balance || 0).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">KYC Status</span><span class="detail-value">${user.kyc_status || 'pending'}</span></div>
            <div class="detail-row"><span class="detail-label">Total Trades</span><span class="detail-value" style="font-size: 16px;">${userTrades.length}</span></div>
            <div class="detail-row"><span class="detail-label">Total P&L</span><span class="detail-value ${totalPnL >= 0 ? 'positive' : 'negative'}" style="font-size: 16px; font-weight: 600;">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Joined</span><span class="detail-value">${this.formatDate(user.created_at)}</span></div>
        `;
        document.getElementById('modalButtons').innerHTML = '';
        modal.style.display = 'flex';
    }

    async viewKYCDetails(kycId) {
        const kyc = this.kycRequests.find(k => k.id === kycId);
        const user = this.users.find(u => u.id === kyc?.user_id);
        
        const modal = document.getElementById('detailsModal');
        document.getElementById('modalTitle').textContent = 'KYC Verification Details';
        document.getElementById('modalBody').innerHTML = `
            <div class="detail-row"><span class="detail-label">User</span><span class="detail-value" style="font-size: 16px; font-weight: 600;">${user?.name || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Email</span><span class="detail-value" style="font-size: 16px;">${user?.email || 'N/A'}</span></div>
            <div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value" style="font-size: 16px;">${kyc?.full_name}</span></div>
            <div class="detail-row"><span class="detail-label">Date of Birth</span><span class="detail-value" style="font-size: 16px;">${kyc?.dob}</span></div>
            <div class="detail-row"><span class="detail-label">ID Type</span><span class="detail-value" style="font-size: 16px;">${kyc?.id_type}</span></div>
            <div class="detail-row"><span class="detail-label">Submitted Date</span><span class="detail-value">${this.formatDate(kyc?.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="font-size: 16px;">${kyc?.status}</span></div>
            <div style="margin-top: 16px; padding: 12px; background: rgba(0,0,0,0.2); border-radius: 12px; text-align: center;">
                <p style="color: #8B93A5; margin-bottom: 8px;">ID Document Images</p>
                <div style="display: flex; gap: 12px; justify-content: center;">
                    <div>📄 Front Side (Uploaded)</div>
                    <div>📄 Back Side (Uploaded)</div>
                </div>
            </div>
        `;
        document.getElementById('modalButtons').innerHTML = kyc?.status === 'pending' ? `
            <button class="modal-btn btn-approve" onclick="adminManager.approveKYC(${kycId}); adminManager.closeModal();" style="padding: 12px; font-size: 14px;">✅ Approve Verification</button>
            <button class="modal-btn btn-reject" onclick="adminManager.rejectKYC(${kycId}); adminManager.closeModal();" style="padding: 12px; font-size: 14px;">❌ Reject Verification</button>
        ` : '';
        modal.style.display = 'flex';
    }

    viewDepositDetails(id) {
        const deposit = this.deposits.find(d => d.id === id);
        const user = this.users.find(u => u.id === deposit?.user_id);
        
        const modal = document.getElementById('detailsModal');
        document.getElementById('modalTitle').textContent = 'Deposit Details';
        document.getElementById('modalBody').innerHTML = `
            <div class="detail-row"><span class="detail-label">User</span><span class="detail-value" style="font-size: 16px; font-weight: 600;">${user?.name || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value" style="font-size: 16px; font-weight: 700; color: #00D897;">$${deposit?.amount.toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Currency</span><span class="detail-value" style="font-size: 16px;">${deposit?.currency || 'USDT'}</span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${this.formatDate(deposit?.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="font-size: 16px;">${deposit?.status}</span></div>
        `;
        document.getElementById('modalButtons').innerHTML = deposit?.status === 'pending' ? `
            <button class="modal-btn btn-approve" onclick="adminManager.approveDeposit(${id}); adminManager.closeModal();" style="padding: 12px; font-size: 14px;">✅ Approve Deposit</button>
            <button class="modal-btn btn-reject" onclick="adminManager.rejectDeposit(${id}); adminManager.closeModal();" style="padding: 12px; font-size: 14px;">❌ Reject Deposit</button>
        ` : '';
        modal.style.display = 'flex';
    }

    viewWithdrawalDetails(id) {
        const withdrawal = this.withdrawals.find(w => w.id === id);
        const user = this.users.find(u => u.id === withdrawal?.user_id);
        
        const modal = document.getElementById('detailsModal');
        document.getElementById('modalTitle').textContent = 'Withdrawal Details';
        document.getElementById('modalBody').innerHTML = `
            <div class="detail-row"><span class="detail-label">User</span><span class="detail-value" style="font-size: 16px; font-weight: 600;">${user?.name || 'Unknown'}</span></div>
            <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value" style="font-size: 16px; font-weight: 700; color: #FF4757;">$${withdrawal?.amount.toLocaleString()}</span></div>
            <div class="detail-row"><span class="detail-label">Crypto</span><span class="detail-value" style="font-size: 16px;">${withdrawal?.crypto || 'USDT'}</span></div>
            <div class="detail-row"><span class="detail-label">Wallet Address</span><span class="detail-value"><small>${withdrawal?.wallet_address}</small></span></div>
            <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${this.formatDate(withdrawal?.date)}</span></div>
            <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="font-size: 16px;">${withdrawal?.status}</span></div>
        `;
        document.getElementById('modalButtons').innerHTML = withdrawal?.status === 'pending' ? `
            <button class="modal-btn btn-approve" onclick="adminManager.approveWithdrawal(${id}); adminManager.closeModal();" style="padding: 12px; font-size: 14px;">✅ Approve Withdrawal</button>
            <button class="modal-btn btn-reject" onclick="adminManager.rejectWithdrawal(${id}); adminManager.closeModal();" style="padding: 12px; font-size: 14px;">❌ Reject Withdrawal</button>
        ` : '';
        modal.style.display = 'flex';
    }

    async deleteUser(userId) {
        if (confirm('⚠️ Delete this user? ALL their data will be permanently removed.')) {
            await supabaseDB.deleteUser(userId);
            await this.refreshData();
            this.showNotification('User deleted', 'success');
        }
    }

    async saveTradingSettings() {
        const minTradeAmount = document.getElementById('minTradeAmount')?.value;
        const maxLeverage = document.getElementById('maxLeverage')?.value;
        const withdrawalFee = document.getElementById('withdrawalFee')?.value;
        
        const settings = { minTradeAmount, maxLeverage, withdrawalFee };
        await supabaseDB.updatePlatformSetting('trading_settings', settings);
        this.showNotification('Trading settings saved!', 'success');
    }

    async saveDepositAddresses() {
        const addresses = {
            USDT: document.getElementById('adminUSDTAddress')?.value || '',
            BTC: document.getElementById('adminBTCAddress')?.value || '',
            ETH: document.getElementById('adminETHAddress')?.value || ''
        };
        await supabaseDB.updatePlatformSetting('crypto_deposit_addresses', addresses);
        this.showNotification('Deposit addresses saved!', 'success');
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
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `pockettrading_backup_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Backup downloaded!', 'success');
    }

    async exportUserData() {
        const data = this.users.map(u => ({
            name: u.name,
            email: u.email,
            balance: u.balance,
            kyc_status: u.kyc_status,
            created_at: u.created_at
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `users_export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('User data exported!', 'success');
    }

    async exportTradeData() {
        const data = this.trades.map(t => ({
            user_id: t.user_id,
            symbol: t.symbol,
            type: t.type,
            amount: t.amount,
            pnl: t.pnl,
            status: t.status,
            created_at: t.created_at
        }));
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `trades_export_${Date.now()}.json`;
        a.click();
        URL.revokeObjectURL(url);
        this.showNotification('Trade data exported!', 'success');
    }

    clearLogs() {
        if (confirm('Clear all activity logs?')) {
            this.showNotification('Logs cleared (demo)', 'info');
        }
    }

    setupEventListeners() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                tabBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTab = btn.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(c => c.style.display = 'none');
                document.getElementById(`${this.currentTab}Tab`).style.display = 'block';
                if (this.currentTab === 'users') this.renderUsers();
                if (this.currentTab === 'deposits') this.renderDeposits();
                if (this.currentTab === 'withdrawals') this.renderWithdrawals();
                if (this.currentTab === 'kyc') this.renderKYC();
                if (this.currentTab === 'trades') this.renderTrades();
            });
        });
        
        const searchInput = document.getElementById('userSearch');
        if (searchInput) searchInput.addEventListener('input', () => this.renderUsers());
        
        const roleFilter = document.getElementById('userRoleFilter');
        if (roleFilter) roleFilter.addEventListener('change', () => this.renderUsers());
        
        const depositFilter = document.getElementById('depositStatusFilter');
        if (depositFilter) depositFilter.addEventListener('change', () => this.renderDeposits());
        
        const withdrawFilter = document.getElementById('withdrawStatusFilter');
        if (withdrawFilter) withdrawFilter.addEventListener('change', () => this.renderWithdrawals());
        
        const kycFilter = document.getElementById('kycStatusFilter');
        if (kycFilter) kycFilter.addEventListener('change', () => this.renderKYC());
        
        const tradeSearch = document.getElementById('tradeSearch');
        if (tradeSearch) tradeSearch.addEventListener('input', () => this.renderTrades());
        
        const tradeFilter = document.getElementById('tradeStatusFilter');
        if (tradeFilter) tradeFilter.addEventListener('change', () => this.renderTrades());
        
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    closeModal() {
        const modal = document.getElementById('detailsModal');
        modal.style.display = 'none';
    }

    formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    }

    showNotification(message, type) {
        if (typeof auth !== 'undefined' && auth.showNotification) {
            auth.showNotification(message, type);
        } else {
            const notification = document.createElement('div');
            notification.textContent = message;
            notification.style.cssText = `
                position: fixed;
                top: 20px;
                right: 20px;
                background: ${type === 'error' ? '#FF4757' : '#00D897'};
                color: white;
                padding: 12px 20px;
                border-radius: 12px;
                z-index: 10000;
            `;
            document.body.appendChild(notification);
            setTimeout(() => notification.remove(), 3000);
        }
    }
}

let adminManager = null;

document.addEventListener('DOMContentLoaded', () => {
    adminManager = new AdminManager();
});

window.handleLogout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        window.location.href = 'index.html';
    }
};
