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
        this.userGrowthChart = null;
        this.volumeChart = null;
        this.init();
    }

    async init() {
        await this.waitForDependencies();
        await this.waitForSession();
        
        this.currentUser = auth.getUser();
        if (!this.currentUser && (sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id'))) {
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) {
                try {
                    const user = await supabaseDB.getUserById(parseInt(userId));
                    if (user && user.email === 'ephremgojo@gmail.com') {
                        this.currentUser = user;
                        if (typeof auth !== 'undefined') auth.currentUser = user;
                    }
                } catch (e) {}
            }
        }
        
        if (!this.currentUser || this.currentUser.email !== 'ephremgojo@gmail.com') {
            window.location.href = 'index.html';
            return;
        }
        
        await this.loadEmergencyStopStatus();
        await this.loadAllData();
        this.setupNavigation();
        this.setupSidebar();
        this.renderEmergencyStopSwitch();
        this.renderDashboard();
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

    async waitForSession() {
        return new Promise((resolve) => {
            if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                resolve();
                return;
            }
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) resolve();
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => { clearInterval(check); resolve(); }, 2000);
        });
    }

    setupNavigation() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
        navLinks.innerHTML = `<a href="index.html" class="nav-link">Home</a><a href="markets.html" class="nav-link">Markets</a><a href="trades.html" class="nav-link">Trades</a><a href="profile.html" class="nav-link">My Profile</a>`;
        rightNav.innerHTML = `<div class="user-section"><div class="user-info"><div class="user-avatar">${userName.charAt(0).toUpperCase()}</div><div class="user-name">${userName}<span class="admin-badge">Admin</span></div></div><button class="logout-btn" onclick="handleLogout()">Logout</button></div>`;
        mobileMenu.innerHTML = `<a href="index.html" class="mobile-nav-link">🏠 Home</a><a href="markets.html" class="mobile-nav-link">📊 Markets</a><a href="trades.html" class="mobile-nav-link">🔄 Trades</a><a href="profile.html" class="mobile-nav-link">👤 My Profile</a><button class="logout-btn" onclick="handleLogout()">Logout</button>`;
    }

    setupSidebar() {
        const sidebarItems = document.querySelectorAll('.sidebar-item');
        sidebarItems.forEach(item => {
            item.addEventListener('click', () => {
                const tab = item.dataset.tab;
                sidebarItems.forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                this.currentTab = tab;
                document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
                document.getElementById(`${tab}Tab`).style.display = 'block';
                if (tab === 'users') this.renderUsers();
                if (tab === 'deposits') this.renderDeposits();
                if (tab === 'withdrawals') this.renderWithdrawals();
                if (tab === 'kyc') this.renderKYC();
                if (tab === 'trades') this.renderTrades();
            });
        });
    }

    async loadEmergencyStopStatus() {
        try {
            const settings = await supabaseDB.getPlatformSettings();
            if (settings && settings.trading_enabled !== undefined) this.tradingEnabled = settings.trading_enabled;
        } catch (error) { this.tradingEnabled = true; }
    }

    async saveEmergencyStopStatus(enabled) {
        this.tradingEnabled = enabled;
        await supabaseDB.updatePlatformSetting('trading_enabled', enabled);
        if (!enabled) await this.closeAllOpenTrades();
        this.renderEmergencyStopSwitch();
    }

    async closeAllOpenTrades() {
        const openTrades = this.trades.filter(t => t.status === 'open');
        for (const trade of openTrades) {
            await supabaseDB.updateTrade(trade.id, { status: 'closed', result: 'emergency_stop', pnl: -trade.amount, closed_at: new Date().toISOString() });
            await supabaseDB.createUserActivity({ id: Date.now(), user_id: trade.user_id, type: 'emergency_stop', title: 'Trade Closed - Emergency Stop', description: `Trade on ${trade.symbol} closed. Loss: $${trade.amount}`, created_at: new Date().toISOString() });
        }
        await this.loadAllData();
        this.renderTrades();
        if (openTrades.length > 0) this.showNotification(`⚠️ Emergency Stop: ${openTrades.length} trades closed`, 'error');
    }

    renderEmergencyStopSwitch() {
        const container = document.getElementById('emergencyStopContainer');
        if (!container) return;
        container.innerHTML = `
            <div class="emergency-stop ${this.tradingEnabled ? 'enabled' : ''}">
                <span class="emergency-status ${this.tradingEnabled ? 'enabled' : 'disabled'}">${this.tradingEnabled ? '● ENABLED' : '○ DISABLED'}</span>
                <label class="switch"><input type="checkbox" id="emergencyStopToggle" ${this.tradingEnabled ? 'checked' : ''}><span class="slider"></span></label>
            </div>
        `;
        const toggle = document.getElementById('emergencyStopToggle');
        if (toggle) {
            toggle.addEventListener('change', async (e) => {
                const confirmed = confirm(`⚠️ WARNING: ${!e.target.checked ? 'Turning OFF will CLOSE ALL OPEN TRADES' : 'Turning ON will allow trading again'} Are you sure?`);
                if (confirmed) await this.saveEmergencyStopStatus(e.target.checked);
                else e.target.checked = this.tradingEnabled;
            });
        }
    }

    async loadAllData() { await Promise.all([this.loadUsers(), this.loadDeposits(), this.loadWithdrawals(), this.loadKYC(), this.loadTrades()]); }
    async refreshData() {
        await this.loadAllData();
        if (this.currentTab === 'dashboard') this.renderDashboard();
        if (this.currentTab === 'users') this.renderUsers();
        if (this.currentTab === 'deposits') this.renderDeposits();
        if (this.currentTab === 'withdrawals') this.renderWithdrawals();
        if (this.currentTab === 'kyc') this.renderKYC();
        if (this.currentTab === 'trades') this.renderTrades();
    }
    async loadUsers() { try { this.users = await supabaseDB.getAllUsers(); } catch(e) { this.users = []; } }
    async loadDeposits() { try { this.deposits = await supabaseDB.getDepositRequests(); } catch(e) { this.deposits = []; } }
    async loadWithdrawals() { try { this.withdrawals = await supabaseDB.getWithdrawalRequests(); } catch(e) { this.withdrawals = []; } }
    async loadKYC() { try { this.kycRequests = await supabaseDB.getKYCRequests(); } catch(e) { this.kycRequests = []; } }
    async loadTrades() { try { this.trades = await supabaseDB.getAllTrades(); } catch(e) { this.trades = []; } }

    renderDashboard() {
        const totalVolume = this.trades.reduce((s, t) => s + (t.amount * (t.leverage || 1)), 0);
        const totalDeposits = this.deposits.filter(d => d.status === 'approved').reduce((s, d) => s + d.amount, 0);
        const pendingRequests = [...this.deposits.filter(d => d.status === 'pending'), ...this.withdrawals.filter(w => w.status === 'pending'), ...this.kycRequests.filter(k => k.status === 'pending')].length;
        document.getElementById('totalUsers').textContent = this.users.length;
        document.getElementById('totalVolume').textContent = `$${(totalVolume / 1000).toFixed(1)}B`;
        document.getElementById('totalDeposits').textContent = `$${(totalDeposits / 1000).toFixed(1)}K`;
        document.getElementById('pendingRequests').textContent = pendingRequests;
        this.initCharts();
        this.renderRecentActivity();
    }

    initCharts() {
        const growthCtx = document.getElementById('userGrowthChart')?.getContext('2d');
        const volumeCtx = document.getElementById('volumeChart')?.getContext('2d');
        const last7Days = [];
        const userCounts = [];
        const volumeData = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(); date.setDate(date.getDate() - i);
            last7Days.push(date.toLocaleDateString());
            userCounts.push(this.users.filter(u => { const d = new Date(u.created_at); return d.toLocaleDateString() === date.toLocaleDateString(); }).length);
            volumeData.push(this.trades.filter(t => { const d = new Date(t.created_at); return d.toLocaleDateString() === date.toLocaleDateString(); }).reduce((s, t) => s + (t.amount || 0), 0) / 1000);
        }
        if (growthCtx) {
            if (this.userGrowthChart) this.userGrowthChart.destroy();
            this.userGrowthChart = new Chart(growthCtx, { type: 'line', data: { labels: last7Days, datasets: [{ label: 'New Users', data: userCounts, borderColor: '#00D897', backgroundColor: 'rgba(0,216,151,0.1)', borderWidth: 2, fill: true, tension: 0.4 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#FFFFFF' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } } } } });
        }
        if (volumeCtx) {
            if (this.volumeChart) this.volumeChart.destroy();
            this.volumeChart = new Chart(volumeCtx, { type: 'bar', data: { labels: last7Days, datasets: [{ label: 'Volume ($K)', data: volumeData, backgroundColor: '#00D897', borderRadius: 8 }] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#FFFFFF' } } }, scales: { x: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } }, y: { grid: { color: 'rgba(255,255,255,0.1)' }, ticks: { color: '#FFFFFF' } } } } });
        }
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivityBody');
        if (!container) return;
        const activities = [];
        this.deposits.slice(0, 5).forEach(d => { const u = this.users.find(u => u.id === d.user_id); activities.push({ user: u?.name || 'Unknown', action: 'Deposit Request', amount: d.amount, date: d.date }); });
        this.withdrawals.slice(0, 5).forEach(w => { const u = this.users.find(u => u.id === w.user_id); activities.push({ user: u?.name || 'Unknown', action: 'Withdrawal Request', amount: w.amount, date: w.date }); });
        activities.sort((a, b) => new Date(b.date) - new Date(a.date));
        if (activities.length === 0) { container.innerHTML = '<tr><td colspan="4"><div class="empty-state">No recent activity</div></td></tr>'; return; }
        container.innerHTML = activities.slice(0, 10).map(a => `<tr><td><strong>${a.user}</strong></td><td>${a.action}</td><td>$${a.amount.toLocaleString()}</td><td>${this.formatDate(a.date)}</td></tr>`).join('');
    }

    renderUsers() {
        const tbody = document.getElementById('usersTableBody');
        if (!tbody) return;
        const search = document.getElementById('userSearch')?.value.toLowerCase() || '';
        const role = document.getElementById('userRoleFilter')?.value || 'all';
        let filtered = this.users.filter(u => (u.name?.toLowerCase().includes(search) || u.email.toLowerCase().includes(search)) && (role === 'all' || (role === 'admin' ? u.email === 'ephremgojo@gmail.com' : u.email !== 'ephremgojo@gmail.com')));
        if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="7"><div class="empty-state">No users found</div></td></tr>'; return; }
        tbody.innerHTML = filtered.map(u => `<tr><td><strong>${u.name || 'N/A'}</strong><br><small>ID: ${u.id}</small></td><td>${u.email}</td><td style="color:#00D897;">$${(u.balance || 0).toLocaleString()}</td><td><span class="status-badge status-${u.kyc_status === 'verified' ? 'approved' : (u.kyc_status || 'pending')}">${u.kyc_status || 'pending'}</span></td><td><span class="${u.email === 'ephremgojo@gmail.com' ? 'role-admin' : 'role-user'}">${u.email === 'ephremgojo@gmail.com' ? 'Admin' : 'User'}</span></td><td>${u.created_at ? new Date(u.created_at).toLocaleDateString() : 'N/A'}</td><td><button class="action-btn btn-view" onclick="adminManager.viewUserDetails(${u.id})">View</button>${u.email !== 'ephremgojo@gmail.com' ? `<button class="action-btn btn-delete" onclick="adminManager.deleteUser(${u.id})">Delete</button>` : ''}</td></tr>`).join('');
    }

    renderDeposits() {
        const tbody = document.getElementById('depositsTableBody');
        if (!tbody) return;
        const status = document.getElementById('depositStatusFilter')?.value || 'all';
        let filtered = this.deposits.filter(d => status === 'all' || d.status === status);
        if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="6"><div class="empty-state">No deposits found</div></td></tr>'; return; }
        tbody.innerHTML = filtered.map(d => { const u = this.users.find(u => u.id === d.user_id); return `<tr><td><strong>${u?.name || u?.email || 'Unknown'}</strong></td><td style="color:#00D897;">$${d.amount.toLocaleString()}</td><td>${d.currency || 'USDT'}</td><td>${new Date(d.date).toLocaleDateString()}</td><td><span class="status-badge status-${d.status}">${d.status}</span><td>${d.status === 'pending' ? `<button class="action-btn btn-approve" onclick="adminManager.approveDeposit(${d.id})">Approve</button><button class="action-btn btn-reject" onclick="adminManager.rejectDeposit(${d.id})">Reject</button>` : ''}<button class="action-btn btn-view" onclick="adminManager.viewDepositDetails(${d.id})">View</button></td></tr>`; }).join('');
    }

    renderWithdrawals() {
        const tbody = document.getElementById('withdrawalsTableBody');
        if (!tbody) return;
        const status = document.getElementById('withdrawStatusFilter')?.value || 'all';
        let filtered = this.withdrawals.filter(w => status === 'all' || w.status === status);
        if (filtered.length === 0) { tbody.innerHTML = '<td><td colspan="6"><div class="empty-state">No withdrawals found</div></td></tr>'; return; }
        tbody.innerHTML = filtered.map(w => { const u = this.users.find(u => u.id === w.user_id); return `<tr><td><strong>${u?.name || u?.email || 'Unknown'}</strong></td><td style="color:#FF4757;">$${w.amount.toLocaleString()}</td><td>${w.crypto || 'USDT'}</td><td>${new Date(w.date).toLocaleDateString()}</td><td><span class="status-badge status-${w.status}">${w.status}</span><td>${w.status === 'pending' ? `<button class="action-btn btn-approve" onclick="adminManager.approveWithdrawal(${w.id})">Approve</button><button class="action-btn btn-reject" onclick="adminManager.rejectWithdrawal(${w.id})">Reject</button>` : ''}<button class="action-btn btn-view" onclick="adminManager.viewWithdrawalDetails(${w.id})">View</button></td></tr>`; }).join('');
    }

    renderKYC() {
        const tbody = document.getElementById('kycTableBody');
        if (!tbody) return;
        const status = document.getElementById('kycStatusFilter')?.value || 'all';
        let filtered = this.kycRequests.filter(k => status === 'all' || k.status === status);
        if (filtered.length === 0) { tbody.innerHTML = '<td><td colspan="6"><div class="empty-state">No KYC requests found</div></td></tr>'; return; }
        tbody.innerHTML = filtered.map(k => { const u = this.users.find(u => u.id === k.user_id); return `<tr><td><strong>${u?.name || u?.email || 'Unknown'}</strong></td><td>${k.full_name}</td><td>${k.id_type}</td><td>${new Date(k.date).toLocaleDateString()}</td><td><span class="status-badge status-${k.status}">${k.status}</span><td>${k.status === 'pending' ? `<button class="action-btn btn-approve" onclick="adminManager.approveKYC(${k.id})">Verify</button><button class="action-btn btn-reject" onclick="adminManager.rejectKYC(${k.id})">Reject</button>` : ''}<button class="action-btn btn-view" onclick="adminManager.viewKYCDetails(${k.id})">View</button></td></tr>`; }).join('');
    }

    renderTrades() {
        const tbody = document.getElementById('tradesTableBody');
        if (!tbody) return;
        const search = document.getElementById('tradeSearch')?.value.toLowerCase() || '';
        const status = document.getElementById('tradeStatusFilter')?.value || 'all';
        let filtered = this.trades.filter(t => (status === 'all' || t.status === status) && (!search || t.symbol?.toLowerCase().includes(search)));
        filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        if (filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="8"><div class="empty-state">No trades found</div></td></tr>'; return; }
        tbody.innerHTML = filtered.map(t => { const u = this.users.find(u => u.id === t.user_id); return `<tr><td><small>${u?.name || u?.email || 'Unknown'}</small></td><td><strong>${t.symbol}/USD</strong></td><td><span class="status-badge ${t.type === 'buy' ? 'status-approved' : 'status-rejected'}">${t.type}</span><td>$${(t.amount || 0).toLocaleString()}</td><td>${t.leverage || 1}x</td><td class="${(t.pnl || 0) >= 0 ? 'positive' : 'negative'}">${(t.pnl || 0) >= 0 ? '+' : ''}$${Math.abs(t.pnl || 0).toLocaleString()}</td><td><span class="status-badge status-${t.status === 'open' ? 'pending' : 'approved'}">${t.status}</span><td>${new Date(t.created_at).toLocaleDateString()}</td></tr>`; }).join('');
    }

    async approveDeposit(id) { const deposit = this.deposits.find(d => d.id === id); if (!deposit) return; await supabaseDB.updateDepositRequest(id, { status: 'approved' }); const user = this.users.find(u => u.id === deposit.user_id); if (user) { const newBalance = (user.balance || 0) + deposit.amount; await supabaseDB.updateUserBalance(user.id, newBalance); await supabaseDB.createTransaction({ id: Date.now(), user_id: user.id, amount: deposit.amount, type: 'deposit', description: `Deposit of $${deposit.amount} approved`, date: new Date().toISOString() }); } await this.refreshData(); this.showNotification(`Deposit of $${deposit.amount} approved!`, 'success'); }
    async rejectDeposit(id) { await supabaseDB.updateDepositRequest(id, { status: 'rejected' }); await this.refreshData(); this.showNotification('Deposit rejected', 'error'); }
    async approveWithdrawal(id) { const withdrawal = this.withdrawals.find(w => w.id === id); if (!withdrawal) return; const user = this.users.find(u => u.id === withdrawal.user_id); if (user && (user.balance || 0) >= withdrawal.amount) { const newBalance = (user.balance || 0) - withdrawal.amount; await supabaseDB.updateUserBalance(user.id, newBalance); await supabaseDB.updateWithdrawalRequest(id, { status: 'approved' }); await supabaseDB.createTransaction({ id: Date.now(), user_id: user.id, amount: -withdrawal.amount, type: 'withdrawal', description: `Withdrawal of $${withdrawal.amount} processed`, date: new Date().toISOString() }); await this.refreshData(); this.showNotification(`Withdrawal of $${withdrawal.amount} approved!`, 'success'); } else { this.showNotification('Insufficient balance', 'error'); } }
    async rejectWithdrawal(id) { await supabaseDB.updateWithdrawalRequest(id, { status: 'rejected' }); await this.refreshData(); this.showNotification('Withdrawal rejected', 'error'); }
    async approveKYC(id) { const kyc = this.kycRequests.find(k => k.id === id); if (!kyc) return; await supabaseDB.updateKYCRequest(id, { status: 'approved' }); await supabaseDB.updateUserKYCStatus(kyc.user_id, 'verified'); await this.refreshData(); this.showNotification(`KYC approved for ${kyc.full_name}`, 'success'); }
    async rejectKYC(id) { const kyc = this.kycRequests.find(k => k.id === id); if (!kyc) return; await supabaseDB.updateKYCRequest(id, { status: 'rejected' }); await this.refreshData(); this.showNotification(`KYC rejected for ${kyc.full_name}`, 'error'); }
    async viewUserDetails(id) { const user = this.users.find(u => u.id === id); if (!user) return; const userTrades = this.trades.filter(t => t.user_id === id); const totalPnL = userTrades.reduce((s, t) => s + (t.pnl || 0), 0); document.getElementById('modalTitle').textContent = `User: ${user.name || 'User'}`; document.getElementById('modalBody').innerHTML = `<div class="detail-row"><span class="detail-label">Name</span><span class="detail-value">${user.name || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user.email}</span></div><div class="detail-row"><span class="detail-label">Balance</span><span class="detail-value" style="color:#00D897;">$${(user.balance || 0).toLocaleString()}</span></div><div class="detail-row"><span class="detail-label">KYC</span><span class="detail-value">${user.kyc_status || 'pending'}</span></div><div class="detail-row"><span class="detail-label">Total Trades</span><span class="detail-value">${userTrades.length}</span></div><div class="detail-row"><span class="detail-label">Total P&L</span><span class="detail-value ${totalPnL >= 0 ? 'positive' : 'negative'}">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span></div><div class="detail-row"><span class="detail-label">Joined</span><span class="detail-value">${this.formatDate(user.created_at)}</span></div>`; document.getElementById('modalButtons').innerHTML = ''; document.getElementById('detailsModal').style.display = 'flex'; }
    async viewKYCDetails(id) { const kyc = this.kycRequests.find(k => k.id === id); const user = this.users.find(u => u.id === kyc?.user_id); document.getElementById('modalTitle').textContent = 'KYC Verification'; document.getElementById('modalBody').innerHTML = `<div class="detail-row"><span class="detail-label">User</span><span class="detail-value">${user?.name || 'Unknown'}</span></div><div class="detail-row"><span class="detail-label">Email</span><span class="detail-value">${user?.email || 'N/A'}</span></div><div class="detail-row"><span class="detail-label">Full Name</span><span class="detail-value">${kyc?.full_name}</span></div><div class="detail-row"><span class="detail-label">DOB</span><span class="detail-value">${kyc?.dob}</span></div><div class="detail-row"><span class="detail-label">ID Type</span><span class="detail-value">${kyc?.id_type}</span></div><div class="detail-row"><span class="detail-label">Submitted</span><span class="detail-value">${this.formatDate(kyc?.date)}</span></div><div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${kyc?.status}</span></div><div style="margin-top:16px; padding:12px; background:rgba(0,0,0,0.2); border-radius:12px; text-align:center;"><p>📄 ID Document Images (Front & Back uploaded)</p></div>`; document.getElementById('modalButtons').innerHTML = kyc?.status === 'pending' ? `<button class="modal-btn btn-approve" onclick="adminManager.approveKYC(${id}); adminManager.closeModal();">✅ Approve</button><button class="modal-btn btn-reject" onclick="adminManager.rejectKYC(${id}); adminManager.closeModal();">❌ Reject</button>` : ''; document.getElementById('detailsModal').style.display = 'flex'; }
    viewDepositDetails(id) { const d = this.deposits.find(d => d.id === id); const u = this.users.find(u => u.id === d?.user_id); document.getElementById('modalTitle').textContent = 'Deposit Details'; document.getElementById('modalBody').innerHTML = `<div class="detail-row"><span class="detail-label">User</span><span class="detail-value">${u?.name || 'Unknown'}</span></div><div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value" style="color:#00D897;">$${d?.amount.toLocaleString()}</span></div><div class="detail-row"><span class="detail-label">Currency</span><span class="detail-value">${d?.currency || 'USDT'}</span></div><div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${this.formatDate(d?.date)}</span></div><div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${d?.status}</span></div>`; document.getElementById('modalButtons').innerHTML = d?.status === 'pending' ? `<button class="modal-btn btn-approve" onclick="adminManager.approveDeposit(${id}); adminManager.closeModal();">✅ Approve</button><button class="modal-btn btn-reject" onclick="adminManager.rejectDeposit(${id}); adminManager.closeModal();">❌ Reject</button>` : ''; document.getElementById('detailsModal').style.display = 'flex'; }
    viewWithdrawalDetails(id) { const w = this.withdrawals.find(w => w.id === id); const u = this.users.find(u => u.id === w?.user_id); document.getElementById('modalTitle').textContent = 'Withdrawal Details'; document.getElementById('modalBody').innerHTML = `<div class="detail-row"><span class="detail-label">User</span><span class="detail-value">${u?.name || 'Unknown'}</span></div><div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value" style="color:#FF4757;">$${w?.amount.toLocaleString()}</span></div><div class="detail-row"><span class="detail-label">Crypto</span><span class="detail-value">${w?.crypto || 'USDT'}</span></div><div class="detail-row"><span class="detail-label">Wallet</span><span class="detail-value"><small>${w?.wallet_address}</small></span></div><div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${this.formatDate(w?.date)}</span></div><div class="detail-row"><span class="detail-label">Status</span><span class="detail-value">${w?.status}</span></div>`; document.getElementById('modalButtons').innerHTML = w?.status === 'pending' ? `<button class="modal-btn btn-approve" onclick="adminManager.approveWithdrawal(${id}); adminManager.closeModal();">✅ Approve</button><button class="modal-btn btn-reject" onclick="adminManager.rejectWithdrawal(${id}); adminManager.closeModal();">❌ Reject</button>` : ''; document.getElementById('detailsModal').style.display = 'flex'; }
    async deleteUser(id) { if (confirm('Delete this user?')) { await supabaseDB.deleteUser(id); await this.refreshData(); this.showNotification('User deleted', 'success'); } }
    async saveTradingSettings() { await supabaseDB.updatePlatformSetting('trading_settings', { minTradeAmount: document.getElementById('minTradeAmount')?.value, maxLeverage: document.getElementById('maxLeverage')?.value, withdrawalFee: document.getElementById('withdrawalFee')?.value }); this.showNotification('Settings saved!', 'success'); }
    async saveDepositAddresses() { await supabaseDB.updatePlatformSetting('crypto_deposit_addresses', { USDT: document.getElementById('adminUSDTAddress')?.value, BTC: document.getElementById('adminBTCAddress')?.value, ETH: document.getElementById('adminETHAddress')?.value }); this.showNotification('Addresses saved!', 'success'); }
    backupDatabase() { const data = { users: this.users, trades: this.trades, deposits: this.deposits, withdrawals: this.withdrawals, kycRequests: this.kycRequests, backupDate: new Date().toISOString() }; const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `backup_${Date.now()}.json`; a.click(); URL.revokeObjectURL(blob); this.showNotification('Backup downloaded!', 'success'); }
    exportUserData() { const data = this.users.map(u => ({ name: u.name, email: u.email, balance: u.balance, kyc_status: u.kyc_status, created_at: u.created_at })); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `users_${Date.now()}.json`; a.click(); URL.revokeObjectURL(blob); this.showNotification('Users exported!', 'success'); }
    exportTradeData() { const data = this.trades.map(t => ({ user_id: t.user_id, symbol: t.symbol, type: t.type, amount: t.amount, pnl: t.pnl, status: t.status, created_at: t.created_at })); const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }); const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `trades_${Date.now()}.json`; a.click(); URL.revokeObjectURL(blob); this.showNotification('Trades exported!', 'success'); }
    clearLogs() { if (confirm('Clear logs?')) this.showNotification('Logs cleared', 'info'); }

    setupEventListeners() {
        document.getElementById('userSearch')?.addEventListener('input', () => this.renderUsers());
        document.getElementById('userRoleFilter')?.addEventListener('change', () => this.renderUsers());
        document.getElementById('depositStatusFilter')?.addEventListener('change', () => this.renderDeposits());
        document.getElementById('withdrawStatusFilter')?.addEventListener('change', () => this.renderWithdrawals());
        document.getElementById('kycStatusFilter')?.addEventListener('change', () => this.renderKYC());
        document.getElementById('tradeSearch')?.addEventListener('input', () => this.renderTrades());
        document.getElementById('tradeStatusFilter')?.addEventListener('change', () => this.renderTrades());
        document.getElementById('mobileMenuBtn')?.addEventListener('click', () => document.getElementById('adminSidebar')?.classList.toggle('show'));
    }

    closeModal() { document.getElementById('detailsModal').style.display = 'none'; }
    formatDate(d) { return d ? new Date(d).toLocaleDateString() + ' ' + new Date(d).toLocaleTimeString() : 'N/A'; }
    showNotification(msg, type) { if (auth?.showNotification) auth.showNotification(msg, type); else alert(msg); }
}

let adminManager = null;
document.addEventListener('DOMContentLoaded', () => { adminManager = new AdminManager(); });
window.handleLogout = () => { if (auth?.logout) auth.logout(); else window.location.href = 'index.html'; };
