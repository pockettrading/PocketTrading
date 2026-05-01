// Profile Page Controller - PocketTrading
// File: js/profile.js

class ProfileManager {
    constructor() {
        this.currentUser = null;
        this.userTrades = [];
        this.activities = [];
        this.kycStatus = 'pending';
        this.selectedAvatar = '👤';
        this.init();
    }

    async init() {
        if (typeof auth === 'undefined') {
            setTimeout(() => this.init(), 100);
            return;
        }

        this.currentUser = auth.getUser();
        
        if (!this.currentUser) {
            window.location.href = 'login.html';
            return;
        }

        await this.loadUserData();
        await this.loadUserTrades();
        await this.loadActivities();
        this.setupUserInterface();
        this.setupEventListeners();
        this.loadSavedAvatar();
    }

    async loadUserData() {
        try {
            const userData = await supabaseDB.getUserByEmail(this.currentUser.email);
            if (userData) {
                this.currentUser = { ...this.currentUser, ...userData };
                this.kycStatus = this.currentUser.kyc_status || 'pending';
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

    async loadActivities() {
        try {
            // Load activities from Supabase
            const activities = await supabaseDB.getUserActivities(this.currentUser.id);
            if (activities && activities.length > 0) {
                this.activities = activities;
            } else {
                this.activities = this.getDemoActivities();
            }
            this.renderActivities();
        } catch (error) {
            console.error('Error loading activities:', error);
            this.activities = this.getDemoActivities();
            this.renderActivities();
        }
    }

    getDemoActivities() {
        const now = new Date();
        return [
            {
                id: 1,
                type: 'login',
                title: 'Account Login',
                description: 'You logged into your account',
                date: now.toISOString(),
                icon: '🔐'
            },
            {
                id: 2,
                type: 'trade',
                title: 'Trade Opened',
                description: 'Opened BTC/USD long position',
                date: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(),
                icon: '📈'
            },
            {
                id: 3,
                type: 'deposit',
                title: 'Deposit Request',
                description: 'Deposit request submitted - pending approval',
                date: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(),
                icon: '💰'
            }
        ];
    }

    setupUserInterface() {
        // Fill profile information
        const profileName = document.getElementById('profileName');
        const profileEmail = document.getElementById('profileEmail');
        const sidebarUserName = document.getElementById('sidebarUserName');
        const sidebarUserEmail = document.getElementById('sidebarUserEmail');
        const fullName = document.getElementById('fullName');
        const email = document.getElementById('email');
        const phone = document.getElementById('phone');
        const country = document.getElementById('country');
        const timezone = document.getElementById('timezone');
        
        if (profileName) profileName.textContent = this.currentUser.name || 'Trader';
        if (profileEmail) profileEmail.textContent = this.currentUser.email;
        if (sidebarUserName) sidebarUserName.textContent = this.currentUser.name || 'Trader';
        if (sidebarUserEmail) sidebarUserEmail.textContent = this.currentUser.email;
        if (fullName) fullName.value = this.currentUser.name || '';
        if (email) email.value = this.currentUser.email;
        if (phone) phone.value = this.currentUser.phone || '';
        if (country) country.value = this.currentUser.country || '';
        if (timezone) timezone.value = this.currentUser.timezone || 'UTC+0';
        
        // Update stats
        this.updateStats();
        
        // Update KYC section
        this.updateKYCSection();
        
        // Update avatar
        const avatarElement = document.getElementById('profileAvatar');
        if (avatarElement) {
            avatarElement.textContent = this.selectedAvatar;
        }
        
        // Admin elements
        if (this.currentUser.isAdmin) {
            const adminElements = document.querySelectorAll('.admin-only');
            adminElements.forEach(el => el.style.display = 'block');
        }
    }

    updateStats() {
        const totalTrades = this.userTrades.length;
        const winningTrades = this.userTrades.filter(t => (t.pnl || 0) > 0).length;
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
        
        const statBalance = document.getElementById('statBalance');
        const statTrades = document.getElementById('statTrades');
        const statWinRate = document.getElementById('statWinRate');
        
        if (statBalance) statBalance.textContent = `$${(this.currentUser.balance || 0).toFixed(2)}`;
        if (statTrades) statTrades.textContent = totalTrades;
        if (statWinRate) statWinRate.textContent = `${winRate}%`;
    }

    updateKYCSection() {
        const kycStatusSpan = document.getElementById('kycStatus');
        const kycForm = document.getElementById('kycForm');
        const kycStatusMessage = document.getElementById('kycStatusMessage');
        
        if (this.kycStatus === 'verified') {
            if (kycStatusSpan) {
                kycStatusSpan.textContent = 'Verified ✓';
                kycStatusSpan.className = 'kyc-status kyc-verified';
            }
            if (kycForm) kycForm.style.display = 'none';
            if (kycStatusMessage) {
                kycStatusMessage.style.display = 'block';
                kycStatusMessage.innerHTML = `
                    <div style="font-size: 48px; margin-bottom: 16px;">✅</div>
                    <h4>Identity Verified</h4>
                    <p style="color: #00D897; margin-top: 8px;">Your account is fully verified</p>
                `;
            }
        } else if (this.kycStatus === 'pending') {
            if (kycStatusSpan) {
                kycStatusSpan.textContent = 'Pending Review';
                kycStatusSpan.className = 'kyc-status kyc-pending';
            }
            if (kycForm) kycForm.style.display = 'block';
        } else {
            if (kycStatusSpan) {
                kycStatusSpan.textContent = 'Not Verified';
                kycStatusSpan.className = 'kyc-status kyc-none';
            }
            if (kycForm) kycForm.style.display = 'block';
        }
    }

    renderActivities() {
        const timeline = document.getElementById('activityTimeline');
        if (!timeline) return;
        
        if (this.activities.length === 0) {
            timeline.innerHTML = `
                <div class="timeline-item">
                    <div class="timeline-icon">📭</div>
                    <div class="timeline-content">
                        <div class="timeline-title">No recent activity</div>
                        <div class="timeline-desc">Start trading to see activity here</div>
                    </div>
                </div>
            `;
            return;
        }
        
        timeline.innerHTML = this.activities.slice(0, 10).map(activity => `
            <div class="timeline-item">
                <div class="timeline-icon">${activity.icon || this.getActivityIcon(activity.type)}</div>
                <div class="timeline-content">
                    <div class="timeline-title">${activity.title}</div>
                    <div class="timeline-desc">${activity.description}</div>
                    <div class="timeline-date">${this.formatDate(activity.date)}</div>
                </div>
            </div>
        `).join('');
    }

    getActivityIcon(type) {
        const icons = {
            'login': '🔐',
            'trade': '📈',
            'deposit': '💰',
            'withdraw': '💸',
            'kyc': '📋',
            'profile': '👤'
        };
        return icons[type] || '📌';
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

    async saveProfileChanges(e) {
        e.preventDefault();
        
        const fullName = document.getElementById('fullName').value;
        const phone = document.getElementById('phone').value;
        const country = document.getElementById('country').value;
        const timezone = document.getElementById('timezone').value;
        
        const updates = {
            name: fullName,
            phone: phone,
            country: country,
            timezone: timezone,
            updated_at: new Date().toISOString()
        };
        
        try {
            await supabaseDB.update('custom_users', this.currentUser.id, updates);
            
            // Update current user object
            this.currentUser = { ...this.currentUser, ...updates };
            
            // Update session storage
            if (localStorage.getItem('pocket_user')) {
                localStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
            }
            if (sessionStorage.getItem('pocket_user')) {
                sessionStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
            }
            
            // Update UI
            const profileName = document.getElementById('profileName');
            const sidebarUserName = document.getElementById('sidebarUserName');
            if (profileName) profileName.textContent = fullName;
            if (sidebarUserName) sidebarUserName.textContent = fullName;
            
            auth.showSuccess('Profile updated successfully!');
            this.addActivity('profile', 'Profile Updated', 'Your profile information was updated');
        } catch (error) {
            console.error('Error updating profile:', error);
            auth.showError('Failed to update profile');
        }
    }

    async changePassword() {
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            auth.showError('Please fill in all password fields');
            return;
        }
        
        if (newPassword !== confirmPassword) {
            auth.showError('New passwords do not match');
            return;
        }
        
        if (newPassword.length < 8) {
            auth.showError('Password must be at least 8 characters');
            return;
        }
        
        if (this.currentUser.password !== currentPassword) {
            auth.showError('Current password is incorrect');
            return;
        }
        
        try {
            await supabaseDB.update('custom_users', this.currentUser.id, {
                password: newPassword,
                updated_at: new Date().toISOString()
            });
            
            this.currentUser.password = newPassword;
            
            // Update session storage
            if (localStorage.getItem('pocket_user')) {
                localStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
            }
            if (sessionStorage.getItem('pocket_user')) {
                sessionStorage.setItem('pocket_user', JSON.stringify(this.currentUser));
            }
            
            document.getElementById('currentPassword').value = '';
            document.getElementById('newPassword').value = '';
            document.getElementById('confirmPassword').value = '';
            
            auth.showSuccess('Password changed successfully!');
            this.addActivity('profile', 'Password Changed', 'Your account password was updated');
        } catch (error) {
            console.error('Error changing password:', error);
            auth.showError('Failed to change password');
        }
    }

    async submitKYC() {
        const fullName = document.getElementById('kycFullName').value;
        const dob = document.getElementById('kycDob').value;
        const idType = document.getElementById('kycIdType').value;
        const idFront = document.getElementById('idFront').files[0];
        const idBack = document.getElementById('idBack').files[0];
        const selfie = document.getElementById('selfie').files[0];
        
        if (!fullName || !dob || !idType) {
            auth.showError('Please fill in all KYC fields');
            return;
        }
        
        if (!idFront || !idBack || !selfie) {
            auth.showError('Please upload all required documents');
            return;
        }
        
        // Simulate file upload (in production, upload to cloud storage)
        auth.showSuccess('KYC documents submitted for review!');
        
        try {
            await supabaseDB.update('custom_users', this.currentUser.id, {
                kyc_status: 'pending',
                kyc_submitted_at: new Date().toISOString(),
                kyc_full_name: fullName,
                kyc_dob: dob,
                kyc_id_type: idType
            });
            
            await supabaseDB.insert('kyc_requests', {
                id: Date.now(),
                user_id: this.currentUser.id,
                user_email: this.currentUser.email,
                full_name: fullName,
                dob: dob,
                id_type: idType,
                status: 'pending',
                date: new Date().toISOString()
            });
            
            this.kycStatus = 'pending';
            this.updateKYCSection();
            this.addActivity('kyc', 'KYC Submitted', 'Identity verification documents submitted');
            
            // Clear form
            document.getElementById('kycFullName').value = '';
            document.getElementById('kycDob').value = '';
            document.getElementById('kycIdType').value = '';
            document.getElementById('idFront').value = '';
            document.getElementById('idBack').value = '';
            document.getElementById('selfie').value = '';
            
        } catch (error) {
            console.error('Error submitting KYC:', error);
            auth.showError('Failed to submit KYC');
        }
    }

    async addActivity(type, title, description) {
        const activity = {
            id: Date.now(),
            user_id: this.currentUser.id,
            type: type,
            title: title,
            description: description,
            date: new Date().toISOString(),
            icon: this.getActivityIcon(type)
        };
        
        await supabaseDB.insert('user_activities', activity);
        this.activities.unshift(activity);
        this.renderActivities();
    }

    changeAvatar() {
        const modal = document.getElementById('avatarModal');
        modal.style.display = 'flex';
    }

    setAvatar(avatar) {
        this.selectedAvatar = avatar;
        const avatarElement = document.getElementById('profileAvatar');
        if (avatarElement) avatarElement.textContent = avatar;
        
        localStorage.setItem(`avatar_${this.currentUser.id}`, avatar);
        
        this.closeAvatarModal();
        auth.showSuccess('Avatar updated!');
    }

    loadSavedAvatar() {
        const savedAvatar = localStorage.getItem(`avatar_${this.currentUser?.id}`);
        if (savedAvatar) {
            this.selectedAvatar = savedAvatar;
            const avatarElement = document.getElementById('profileAvatar');
            if (avatarElement) avatarElement.textContent = savedAvatar;
        }
    }

    closeAvatarModal() {
        const modal = document.getElementById('avatarModal');
        modal.style.display = 'none';
    }

    showDeleteAccountModal() {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'flex';
    }

    closeDeleteModal() {
        const modal = document.getElementById('deleteModal');
        modal.style.display = 'none';
        document.getElementById('deleteConfirm').value = '';
    }

    async deleteAccount() {
        const confirmText = document.getElementById('deleteConfirm').value;
        
        if (confirmText !== 'DELETE') {
            auth.showError('Please type DELETE to confirm');
            return;
        }
        
        if (confirm('Are you absolutely sure? This will delete all your data permanently.')) {
            try {
                // Delete user trades
                const userTrades = await supabaseDB.getUserTrades(this.currentUser.id);
                for (const trade of userTrades) {
                    await supabaseDB.delete('trades', trade.id);
                }
                
                // Delete user activities
                const userActivities = await supabaseDB.getUserActivities(this.currentUser.id);
                for (const activity of userActivities) {
                    await supabaseDB.delete('user_activities', activity.id);
                }
                
                // Delete user
                await supabaseDB.delete('custom_users', this.currentUser.id);
                
                // Clear storage and logout
                localStorage.removeItem('pocket_user');
                sessionStorage.removeItem('pocket_user');
                localStorage.removeItem(`avatar_${this.currentUser.id}`);
                localStorage.removeItem(`watchlist_${this.currentUser.id}`);
                
                auth.showSuccess('Account deleted successfully');
                setTimeout(() => {
                    window.location.href = 'home.html';
                }, 2000);
            } catch (error) {
                console.error('Error deleting account:', error);
                auth.showError('Failed to delete account');
            }
        }
    }

    setupEventListeners() {
        const profileForm = document.getElementById('profileForm');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.saveProfileChanges(e));
        }
        
        const mobileMenuBtn = document.querySelector('.mobile-menu-btn');
        const sidebar = document.querySelector('.sidebar');
        if (mobileMenuBtn && sidebar) {
            mobileMenuBtn.addEventListener('click', () => {
                sidebar.classList.toggle('show');
            });
        }
        
        // Close modals when clicking outside
        window.onclick = (e) => {
            const avatarModal = document.getElementById('avatarModal');
            const deleteModal = document.getElementById('deleteModal');
            if (e.target === avatarModal) this.closeAvatarModal();
            if (e.target === deleteModal) this.closeDeleteModal();
        };
    }
}

// Initialize
let profileManager = null;

document.addEventListener('DOMContentLoaded', () => {
    profileManager = new ProfileManager();
});

// Global functions
function changeAvatar() { profileManager?.changeAvatar(); }
function setAvatar(avatar) { profileManager?.setAvatar(avatar); }
function closeAvatarModal() { profileManager?.closeAvatarModal(); }
function changePassword() { profileManager?.changePassword(); }
function submitKYC() { profileManager?.submitKYC(); }
function showDeleteAccountModal() { profileManager?.showDeleteAccountModal(); }
function closeDeleteModal() { profileManager?.closeDeleteModal(); }
function deleteAccount() { profileManager?.deleteAccount(); }
function logout() { if (auth) auth.logout(); }
