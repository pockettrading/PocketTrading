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
        await this.waitForSession();
        
        this.currentUser = auth.getUser();
        
        // Double check with sessionStorage if auth returns null
        if (!this.currentUser) {
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

    async waitForSession() {
        return new Promise((resolve) => {
            // Check if already have user
            if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                resolve();
                return;
            }
            
            // Check sessionStorage directly
            const userId = sessionStorage.getItem('pocket_user_id') || localStorage.getItem('pocket_user_id');
            if (userId) {
                resolve();
                return;
            }
            
            // Wait for auth to restore session
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && auth.getUser() !== null) {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 2000);
        });
    }

    // Rest of the admin.js code remains the same...
    // (keep all the other methods like setupNavigation, loadAllData, renderDashboard, etc.)
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
