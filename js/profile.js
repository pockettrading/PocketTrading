// Profile Page Controller - PocketTrading
// File: js/profile.js
// Pure Supabase - No localStorage

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userTrades = [];
        this.userActivities = [];
        this.pnlChart = null;
        this.distributionChart = null;
        this.authReady = false;
        this.init();
    }

    async init() {
        // First, wait for auth to be available
        await this.waitForAuth();
        
        // Then wait for session to be restored (or timeout)
        const user = await this.waitForUserSession();
        
        if (!user) {
            // Only redirect if we're sure no user is logged in
            window.location.href = 'login.html';
            return;
        }
        
        this.currentUser = user;
        
        await this.loadUserData();
        await this.loadUserTrades();
        await this.loadUserActivities();
        this.setupNavigation();
        this.updateUI();
        this.renderDashboard();
        this.renderTradeHistory();
        this.initCharts();
        this.setupEventListeners();
    }

    async waitForAuth() {
        return new Promise((resolve) => {
            if (typeof auth !== 'undefined') {
                resolve();
                return;
            }
            const check = setInterval(() => {
                if (typeof auth !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 50);
            // Timeout after 5 seconds
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 5000);
        });
    }

    async waitForUserSession() {
        return new Promise((resolve) => {
            // Check if user already exists in auth
            if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                resolve(auth.getUser());
                return;
            }
            
            // Check sessionStorage directly
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) {
                // Fetch user from Supabase
                supabaseDB.getUserById(parseInt(userId)).then(user => {
                    if (user) {
                        // Also update auth if possible
                        if (typeof auth !== 'undefined') {
                            auth.currentUser = user;
                        }
                        resolve(user);
                    } else {
                        resolve(null);
                    }
                }).catch(() => resolve(null));
                return;
            }
            
            // Wait for auth to restore session
            let attempts = 0;
            const maxAttempts = 50; // 5 seconds max (50 * 100ms = 5s)
            const check = setInterval(() => {
                attempts++;
                if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                    clearInterval(check);
                    resolve(auth.getUser());
                } else if (attempts >= maxAttempts) {
                    clearInterval(check);
                    // Final check of sessionStorage
                    const storedId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
                    if (storedId) {
                        supabaseDB.getUserById(parseInt(storedId)).then(user => {
                            resolve(user || null);
                        }).catch(() => resolve(null));
                    } else {
                        resolve(null);
                    }
                }
            }, 100);
        });
    }

    async loadUserData() {
        try {
            const userData = await supabaseDB.getUserById(this.currentUser.id);
            if (userData) {
                this.currentUser = { ...this.currentUser, ...userData };
                this.currentUser.isAdmin = (this.currentUser.email === 'ephremgojo@gmail.com');
                sessionStorage.setItem('pocket_user_id', this.currentUser.id);
            }
        } catch (error) {
            console.error('Error loading user data:', error);
        }
    }

    async loadUserTrades() {
        try {
            this.userTrades = await supabaseDB.getUserTrades(this.currentUser.id);
        } catch (error) {
            console.error('Error loading trades:', error);
            this.userTrades = [];
        }
    }

    async loadUserActivities() {
        try {
            this.userActivities = await supabaseDB.getUserActivities(this.currentUser.id, 10);
        } catch (error) {
            console.error('Error loading activities:', error);
            this.userActivities = [];
        }
    }

    setupNavigation() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        
        const isAdmin = this.currentUser.email === 'ephremgojo@gmail.com';
        const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
        
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link">Markets</a>
                <a href="trades.html" class="nav-link">Trades</a>
                <a href="profile.html" class="nav-link active">My Profile</a>
            `;
        }
        
        if (rightNav) {
            rightNav.innerHTML = `
                <div class="user-section">
                    <div class="user-info">
                        <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                        <div class="user-name">${userName}${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</div>
                    </div>
                    ${isAdmin ? '<a href="admin.html" class="admin-link">⚙️ Admin Panel</a>' : ''}
                    <button class="logout-btn" onclick="handleLogout()">Logout</button>
                </div>
            `;
        }
        
        if (mobileMenu) {
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">🏠 Home</a>
                <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
                <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
                <a href="profile.html" class="mobile-nav-link">👤 My Profile</a>
                ${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}
                <button class="logout-btn" style="margin-top:12px;" onclick="handleLogout()">Logout</button>
            `;
        }
        
        const welcomeMsg = document.getElementById('welcomeMessage');
        if (welcomeMsg) {
            welcomeMsg.innerHTML = `Welcome back, ${userName}! 👋`;
        }
    }

    updateUI() {
        const displayName = document.getElementById('displayName');
        const displayEmail = document.getElementById('displayEmail');
        const displayMemberSince = document.getElementById('displayMemberSince');
        const profileBalance = document.getElementById('profileBalance');
        const displayKyc = document.getElementById('displayKyc');
        
        if (displayName) displayName.textContent = this.currentUser.name || 'N/A';
        if (displayEmail) displayEmail.textContent = this.currentUser.email;
        if (displayMemberSince) {
            displayMemberSince.textContent = this.currentUser.created_at 
                ? new Date(this.currentUser.created_at).toLocaleDateString() 
                : 'N/A';
        }
        if (profileBalance) profileBalance.textContent = `$${(this.currentUser.balance || 0).toLocaleString()}`;
        
        if (displayKyc) {
            const kycStatus = this.currentUser.kyc_status || 'pending';
            displayKyc.textContent = kycStatus === 'verified' ? 'Verified ✓' : (kycStatus === 'pending' ? 'Pending Review' : 'Not Verified');
            displayKyc.className = `kyc-badge kyc-${kycStatus === 'verified' ? 'verified' : (kycStatus === 'pending' ? 'pending' : 'none')}`;
        }
        
        const updateFullName = document.getElementById('updateFullName');
        const updatePhone = document.getElementById('updatePhone');
        const updateCountry = document.getElementById('updateCountry');
        const kycFullName = document.getElementById('kycFullName');
        
        if (updateFullName) updateFullName.value = this.currentUser.name || '';
        if (updatePhone) updatePhone.value = this.currentUser.phone || '';
        if (updateCountry) updateCountry.value = this.currentUser.country || '';
        if (kycFullName) kycFullName.value = this.currentUser.name || '';
    }

    renderDashboard() {
        const dashBalance = document.getElementById('dashBalance');
        const dashTotalTrades = document.getElementById('dashTotalTrades');
        const dashWinRate = document.getElementById('dashWinRate');
        const dashPnL = document.getElementById('dashPnL');
        
        const totalTrades = this.userTrades.length;
        const closedTrades = this.userTrades.filter(t => t.status === 'closed');
        const winningTrades = closedTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = closedTrades.length > 0 ? (winningTrades / closedTrades.length * 100).toFixed(1) : 0;
        const totalPnL = this.userTrades.reduce((sum, t) => sum + (t.pnl || 0), 0);
        
        if (dashBalance) dashBalance.innerHTML = `$${(this.currentUser.balance || 0).toLocaleString()}`;
        if (dashTotalTrades) dashTotalTrades.textContent = totalTrades;
        if (dashWinRate) dashWinRate.textContent = `${winRate}%`;
        if (dashPnL) {
            dashPnL.innerHTML = `<span class="${totalPnL >= 0 ? 'positive' : 'negative'}">${totalPnL >= 0 ? '+' : ''}$${Math.abs(totalPnL).toLocaleString()}</span>`;
        }
        
        const statTotalTrades = document.getElementById('statTotalTrades');
        const statWinRate = document.getElementById('statWinRate');
        const statTotalVolume = document.getElementById('statTotalVolume');
        const totalVolume = this.userTrades.reduce((sum, t) => sum + (t.amount || 0), 0);
        
        if (statTotalTrades) statTotalTrades.textContent = totalTrades;
        if (statWinRate) statWinRate.textContent = `${winRate}%`;
        if (statTotalVolume) statTotalVolume.textContent = `$${totalVolume.toLocaleString()}`;
        
        this.renderRecentActivity();
    }

    renderRecentActivity() {
        const container = document.getElementById('recentActivityList');
        if (!container) return;
        
        if (this.userActivities.length === 0) {
            container.innerHTML = '<div style="text-align: center; padding: 20px; color: #8B93A5;">No recent activity. Start trading!</div>';
            return;
        }
        
        container.innerHTML = this.userActivities.slice(0, 5).map(activity => `
            <div class="activity-item">
                <div><strong>${activity.title || activity.type}</strong><br><small style="color:#8B93A5">${activity.description || ''}</small></div>
                <div><small>${this.formatDate(activity.created_at)}</small></div>
            </div>
        `).join('');
    }

    renderTradeHistory() {
        const tbody = document.getElementById('tradeHistoryBody');
        if (!tbody) return;
        
        if (this.userTrades.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">No trades yet</td></tr>';
            return;
        }
        
        tbody.innerHTML = this.userTrades.slice().reverse().map(trade => `
            <tr>
                <td>${new Date(trade.created_at).toLocaleDateString()}</td>
                <td>${trade.symbol}/USD</td>
                <td class="${trade.type === 'buy' ? 'positive' : 'negative'}">${trade.type?.toUpperCase() || 'N/A'}</td>
                <td>$${(trade.amount || 0).toLocaleString()}</td>
                <td class="${(trade.pnl || 0) >= 0 ? 'positive' : 'negative'}">${(trade.pnl || 0) >= 0 ? '+' : ''}$${Math.abs(trade.pnl || 0).toLocaleString()}</td>
                <td><span class="kyc-badge ${trade.status === 'open' ? 'kyc-pending' : 'kyc-verified'}">${trade.status || 'N/A'}</span></td>
            </tr>
        `).join('');
    }

    initCharts() {
        const pnlCtx = document.getElementById('pnlChart')?.getContext('2d');
        const distCtx = document.getElementById('distributionChart')?.getContext('2d');
        
        if (pnlCtx) {
            const last7Days = [];
            const dailyPnL = [];
            for (let i = 6; i >= 0; i--) {
                const date = new Date();
                date.setDate(date.getDate() - i);
                last7Days.push(date.toLocaleDateString());
                const dayPnL = this.userTrades.filter(t => {
                    const tradeDate = new Date(t.created_at);
                    return tradeDate.toLocaleDateString() === date.toLocaleDateString() && t.status === 'closed';
                }).reduce((sum, t) => sum + (t.pnl || 0), 0);
                dailyPnL.push(dayPnL);
            }
            
            if (this.pnlChart) this.pnlChart.destroy();
            this.pnlChart = new Chart(pnlCtx, {
                type: 'line',
                data: {
                    labels: last7Days,
                    datasets: [{
                        label: 'Daily P&L',
                        data: dailyPnL,
                        borderColor: '#00D897',
                        backgroundColor: 'rgba(0,216,151,0.1)',
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
        
        if (distCtx) {
            const closedTrades = this.userTrades.filter(t => t.status === 'closed');
            const wins = closedTrades.filter(t => (t.pnl || 0) > 0).length;
            const losses = closedTrades.filter(t => (t.pnl || 0) <= 0).length;
            
            if (this.distributionChart) this.distributionChart.destroy();
            this.distributionChart = new Chart(distCtx, {
                type: 'doughnut',
                data: {
                    labels: ['Winning Trades', 'Losing Trades'],
                    datasets: [{
                        data: [wins, losses],
                        backgroundColor: ['#00D897', '#FF4757'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { labels: { color: '#FFFFFF' } } }
                }
            });
        }
    }

    async updateProfile(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('updateFullName').value;
        const phone = document.getElementById('updatePhone').value;
        const country = document.getElementById('updateCountry').value;
        const currentPass = document.getElementById('currentPassword').value;
        const newPass = document.getElementById('newPassword').value;
        const confirmPass = document.getElementById('confirmNewPassword').value;
        
        if (newPass && newPass !== confirmPass) {
            this.showNotification('New passwords do not match', 'error');
            return;
        }
        if (newPass && newPass.length < 8) {
            this.showNotification('Password must be at least 8 characters', 'error');
            return;
        }
        if (currentPass && currentPass !== this.currentUser.password) {
            this.showNotification('Current password is incorrect', 'error');
            return;
        }
        
        const updates = {
            name: fullName,
            phone: phone,
            country: country,
            updated_at: new Date().toISOString()
        };
        if (newPass) updates.password = newPass;
        
        try {
            await supabaseDB.updateUser(this.currentUser.id, updates);
            this.currentUser = { ...this.currentUser, ...updates };
            sessionStorage.setItem('pocket_user_id', this.currentUser.id);
            
            this.showNotification('Profile updated successfully!', 'success');
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmNewPassword').value = '';
            
            this.updateUI();
            this.setupNavigation();
        } catch (error) {
            console.error('Error updating profile:', error);
            this.showNotification('Failed to update profile', 'error');
        }
    }

    async submitKYC() {
        const fullName = document.getElementById('kycFullName').value;
        const dob = document.getElementById('kycDob').value;
        const idType = document.getElementById('kycIdType').value;
        
        if (!fullName || !dob || !idType) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }
        
        try {
            await supabaseDB.updateUserKYCStatus(this.currentUser.id, 'pending');
            await supabaseDB.createKYCRequest({
                id: Date.now(),
                user_id: this.currentUser.id,
                user_email: this.currentUser.email,
                full_name: fullName,
                dob: dob,
                id_type: idType,
                status: 'pending',
                date: new Date().toISOString()
            });
            await supabaseDB.createUserActivity({
                id: Date.now(),
                user_id: this.currentUser.id,
                type: 'kyc',
                title: 'KYC Submitted',
                description: 'Identity verification documents submitted',
                created_at: new Date().toISOString()
            });
            
            this.currentUser.kyc_status = 'pending';
            this.updateUI();
            
            const kycForm = document.getElementById('kycForm');
            const kycPendingMessage = document.getElementById('kycPendingMessage');
            if (kycForm) kycForm.style.display = 'none';
            if (kycPendingMessage) kycPendingMessage.style.display = 'block';
            
            this.showNotification('KYC documents submitted for review!', 'success');
        } catch (error) {
            console.error('Error submitting KYC:', error);
            this.showNotification('Failed to submit KYC', 'error');
        }
    }

    async sendSupport() {
        const subject = document.getElementById('supportSubject').value;
        const message = document.getElementById('supportMessage').value;
        
        if (!subject || !message) {
            this.showNotification('Please fill all fields', 'error');
            return;
        }
        
        await supabaseDB.createUserActivity({
            id: Date.now(),
            user_id: this.currentUser.id,
            type: 'support',
            title: 'Support Ticket',
            description: `Subject: ${subject}`,
            created_at: new Date().toISOString()
        });
        
        this.showNotification(`Support ticket submitted!\nSubject: ${subject}\n\nWe will respond within 24 hours.`, 'success');
        document.getElementById('supportSubject').value = '';
        document.getElementById('supportMessage').value = '';
    }

    async deleteAccount() {
        if (!confirm('Are you sure you want to delete your account? This cannot be undone!')) return;
        
        try {
            for (const trade of this.userTrades) {
                await supabaseDB.delete('trades', trade.id);
            }
            for (const activity of this.userActivities) {
                await supabaseDB.delete('user_activities', activity.id);
            }
            await supabaseDB.deleteUser(this.currentUser.id);
            
            sessionStorage.removeItem('pocket_user_id');
            localStorage.removeItem('pocket_user_id');
            
            this.showNotification('Account deleted successfully', 'success');
            setTimeout(() => window.location.href = 'index.html', 2000);
        } catch (error) {
            console.error('Error deleting account:', error);
            this.showNotification('Failed to delete account', 'error');
        }
    }

    setupEventListeners() {
        document.querySelectorAll('.sidebar-item').forEach(item => {
            item.addEventListener('click', () => {
                document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                item.classList.add('active');
                const tab = item.dataset.tab;
                document.querySelectorAll('.tab-content').forEach(content => content.style.display = 'none');
                if (tab === 'dashboard') document.getElementById('dashboardTab').style.display = 'block';
                if (tab === 'profile') document.getElementById('profileTab').style.display = 'block';
                if (tab === 'history') document.getElementById('historyTab').style.display = 'block';
                if (tab === 'kyc') document.getElementById('kycTab').style.display = 'block';
                if (tab === 'update') document.getElementById('updateTab').style.display = 'block';
                if (tab === 'support') document.getElementById('supportTab').style.display = 'block';
            });
        });
        
        const updateForm = document.getElementById('updateProfileForm');
        if (updateForm) updateForm.addEventListener('submit', (e) => this.updateProfile(e));
        
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);
        
        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins} minutes ago`;
        if (diffHours < 24) return `${diffHours} hours ago`;
        if (diffDays < 7) return `${diffDays} days ago`;
        return date.toLocaleDateString();
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

let profileManager = null;

document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
});

window.submitKYC = () => profileManager?.submitKYC();
window.sendSupport = () => profileManager?.sendSupport();
window.deleteAccount = () => profileManager?.deleteAccount();
window.handleLogout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        window.location.href = 'index.html';
    }
};
