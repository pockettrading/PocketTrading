// PocketTrading - Complete Admin Panel Script

// Mock Database
let users = [
    { id: 1, username: "cryptomaster", email: "alex.thompson@pockettrading.com", fullName: "Alex Thompson", balance: 12450.75, status: "active", kycStatus: "verified", memberSince: "2024-03-15" },
    { id: 2, username: "traderjoe", email: "joe@example.com", fullName: "Joe Martinez", balance: 5420.30, status: "active", kycStatus: "verified", memberSince: "2024-04-01" },
    { id: 3, username: "cryptoqueen", email: "queen@example.com", fullName: "Sarah Chen", balance: 18750.00, status: "active", kycStatus: "pending", memberSince: "2024-04-10" },
    { id: 4, username: "newbie83", email: "newbie@example.com", fullName: "Mike Johnson", balance: 1250.00, status: "suspended", kycStatus: "rejected", memberSince: "2024-04-20" },
    { id: 5, username: "whale420", email: "whale@example.com", fullName: "David Kim", balance: 125000.00, status: "active", kycStatus: "verified", memberSince: "2024-03-01" }
];

let kycSubmissions = [
    { id: 1, userId: 3, username: "cryptoqueen", fullName: "Sarah Chen", documentType: "Passport", submitted: "2024-04-12", status: "pending" },
    { id: 2, userId: 4, username: "newbie83", fullName: "Mike Johnson", documentType: "Driver's License", submitted: "2024-04-21", status: "rejected" }
];

let trades = [
    { id: 1, userId: 1, username: "cryptomaster", pair: "BTC/USD", type: "BUY", amount: 0.25, price: 42500, total: 10625, date: "2025-04-28 10:30:00" },
    { id: 2, userId: 1, username: "cryptomaster", pair: "ETH/USD", type: "SELL", amount: 2.5, price: 2850, total: 7125, date: "2025-04-27 14:15:00" },
    { id: 3, userId: 2, username: "traderjoe", pair: "SOL/USD", type: "BUY", amount: 50, price: 142.50, total: 7125, date: "2025-04-26 09:45:00" },
    { id: 4, userId: 5, username: "whale420", pair: "BTC/USD", type: "BUY", amount: 2, price: 43000, total: 86000, date: "2025-04-29 16:20:00" },
    { id: 5, userId: 2, username: "traderjoe", pair: "DOGE/USD", type: "BUY", amount: 10000, price: 0.15, total: 1500, date: "2025-04-29 11:00:00" }
];

let announcements = [
    { id: 1, title: "System Upgrade", content: "Scheduled maintenance on May 1st, 02:00-04:00 UTC", priority: "warning", date: "2025-04-25", postedBy: "admin" },
    { id: 2, title: "New Trading Pairs", content: "SOL and ADA now available for trading!", priority: "info", date: "2025-04-20", postedBy: "admin" }
];

let systemLogs = [
    { time: "2025-04-30 08:15:23", action: "Admin logged in", user: "cryptomaster" },
    { time: "2025-04-30 08:20:45", action: "Updated user status", user: "traderjoe" },
    { time: "2025-04-30 09:00:12", action: "KYC review completed", user: "newbie83" },
    { time: "2025-04-29 22:30:00", action: "System backup completed", user: "system" },
    { time: "2025-04-29 16:25:33", action: "High-value trade executed", user: "whale420" }
];

let nextUserId = 6;
let nextKYCId = 3;
let nextTradeId = 6;
let nextAnnouncementId = 3;

// Helper Functions
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(amount);
}

function addSystemLog(action, user = "admin") {
    const log = { time: new Date().toISOString().replace('T', ' ').slice(0, 19), action, user };
    systemLogs.unshift(log);
    if (systemLogs.length > 100) systemLogs.pop();
    updateLogsDisplay();
}

function updateLogsDisplay() {
    const logsContainer = document.getElementById('logsContainer');
    if (logsContainer) {
        logsContainer.innerHTML = systemLogs.map(log => `
            <div class="log-entry">
                <span class="log-time">[${log.time}]</span>
                <span style="color: #7c3aed;">${log.user}</span>: ${log.action}
            </div>
        `).join('');
    }
}

// Update Stats
function updateStats() {
    document.getElementById('totalUsers').textContent = users.length;
    const totalVolume = trades.reduce((sum, trade) => sum + trade.total, 0);
    document.getElementById('totalVolume').textContent = formatCurrency(totalVolume);
    const pendingKYC = kycSubmissions.filter(k => k.status === 'pending').length;
    document.getElementById('pendingKYC').textContent = pendingKYC;
    const activeTraders = users.filter(u => u.status === 'active').length;
    document.getElementById('activeTraders').textContent = activeTraders;
}

// Render Users Table
function renderUsers() {
    const tbody = document.getElementById('usersTableBody');
    tbody.innerHTML = users.map(user => `
        <tr>
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.fullName}</td>
            <td>${formatCurrency(user.balance)}</td>
            <td><span class="status-badge status-${user.status}">${user.status}</span></td>
            <td>
                <button class="action-btn" onclick="editUser(${user.id})">✏️ Edit</button>
                <button class="action-btn ${user.status === 'active' ? 'danger' : 'success'}" onclick="toggleUserStatus(${user.id})">
                    ${user.status === 'active' ? '🔒 Suspend' : '✅ Activate'}
                </button>
                <button class="action-btn danger" onclick="deleteUser(${user.id})">🗑️ Delete</button>
            </td>
        </tr>
    `).join('');
}

// Render KYC Table
function renderKYC() {
    const tbody = document.getElementById('kycTableBody');
    tbody.innerHTML = kycSubmissions.map(kyc => {
        const user = users.find(u => u.id === kyc.userId);
        return `
            <tr>
                <td>${kyc.username}</td>
                <td>${kyc.fullName}</td>
                <td>${kyc.documentType}</td>
                <td>${kyc.submitted}</td>
                <td><span class="status-badge status-${kyc.status}">${kyc.status}</span></td>
                <td>
                    ${kyc.status === 'pending' ? `
                        <button class="action-btn success" onclick="approveKYC(${kyc.id})">✅ Approve</button>
                        <button class="action-btn danger" onclick="rejectKYC(${kyc.id})">❌ Reject</button>
                    ` : '✓ Reviewed'}
                </td>
            </tr>
        `;
    }).join('');
}

// Render Trades Table
function renderTrades() {
    const tbody = document.getElementById('tradesTableBody');
    tbody.innerHTML = trades.map(trade => `
        <tr>
            <td>${trade.id}</td>
            <td>${trade.username}</td>
            <td>${trade.pair}</td>
            <td style="color: ${trade.type === 'BUY' ? '#4ade80' : '#f87171'}">${trade.type}</td>
            <td>${trade.amount}</td>
            <td>${formatCurrency(trade.price)}</td>
            <td>${formatCurrency(trade.total)}</td>
            <td>${trade.date}</td>
        </tr>
    `).join('');
}

// Render Announcements
function renderAnnouncements() {
    const container = document.getElementById('announcementsList');
    const priorityColors = { info: '#3b82f6', warning: '#f59e0b', urgent: '#ef4444' };
    container.innerHTML = announcements.map(a => `
        <div style="background: rgba(20,25,55,0.5); border-radius: 16px; padding: 1rem; margin-bottom: 1rem; border-left: 4px solid ${priorityColors[a.priority]}">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <strong style="font-size: 1.1rem;">${a.title}</strong>
                <span style="font-size: 0.75rem; color: #8a8aa0;">${a.date} by ${a.postedBy}</span>
            </div>
            <p style="color: #c0c0c0;">${a.content}</p>
            <button class="action-btn danger" style="margin-top: 0.5rem;" onclick="deleteAnnouncement(${a.id})">Delete</button>
        </div>
    `).join('');
}

// User Actions
window.editUser = function(userId) {
    const user = users.find(u => u.id === userId);
    if (!user) return;
    
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content">
            <div class="modal-header">
                <h2>✏️ Edit User</h2>
                <button class="close-modal" onclick="this.closest('.modal').remove()">✕</button>
            </div>
            <div class="form-group">
                <label>Username</label>
                <input type="text" id="editUsername" value="${user.username}">
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="editEmail" value="${user.email}">
            </div>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="editFullName" value="${user.fullName}">
            </div>
            <div class="form-group">
                <label>Balance</label>
                <input type="number" id="editBalance" value="${user.balance}">
            </div>
            <button class="submit-btn" onclick="saveUserEdit(${userId})">Save Changes</button>
        </div>
    `;
    document.body.appendChild(modal);
};

window.saveUserEdit = function(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.username = document.getElementById('editUsername').value;
        user.email = document.getElementById('editEmail').value;
        user.fullName = document.getElementById('editFullName').value;
        user.balance = parseFloat(document.getElementById('editBalance').value);
        addSystemLog(`Edited user ${user.username}`);
        renderUsers();
        updateStats();
        document.querySelector('.modal').remove();
    }
};

window.toggleUserStatus = function(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        user.status = user.status === 'active' ? 'suspended' : 'active';
        addSystemLog(`${user.status === 'active' ? 'Activated' : 'Suspended'} user ${user.username}`);
        renderUsers();
        updateStats();
    }
};

window.deleteUser = function(userId) {
    if (confirm('Are you sure you want to delete this user?')) {
        const user = users.find(u => u.id === userId);
        users = users.filter(u => u.id !== userId);
        addSystemLog(`Deleted user ${user.username}`);
        renderUsers();
        updateStats();
    }
};

// Add User
document.getElementById('addUserBtn')?.addEventListener('click', () => {
    const username = document.getElementById('newUsername').value;
    const email = document.getElementById('newEmail').value;
    const fullName = document.getElementById('newFullName').value;
    
    if (!username || !email || !fullName) {
        alert('Please fill all fields');
        return;
    }
    
    const newUser = {
        id: nextUserId++,
        username,
        email,
        fullName,
        balance: 0,
        status: 'active',
        kycStatus: 'pending',
        memberSince: new Date().toISOString().slice(0, 10)
    };
    users.push(newUser);
    addSystemLog(`Added new user ${username}`);
    renderUsers();
    updateStats();
    
    document.getElementById('newUsername').value = '';
    document.getElementById('newEmail').value = '';
    document.getElementById('newFullName').value = '';
});

// KYC Actions
window.approveKYC = function(kycId) {
    const kyc = kycSubmissions.find(k => k.id === kycId);
    if (kyc) {
        kyc.status = 'verified';
        const user = users.find(u => u.id === kyc.userId);
        if (user) user.kycStatus = 'verified';
        addSystemLog(`Approved KYC for ${kyc.username}`);
        renderKYC();
        updateStats();
    }
};

window.rejectKYC = function(kycId) {
    const kyc = kycSubmissions.find(k => k.id === kycId);
    if (kyc) {
        kyc.status = 'rejected';
        const user = users.find(u => u.id === kyc.userId);
        if (user) user.kycStatus = 'rejected';
        addSystemLog(`Rejected KYC for ${kyc.username}`);
        renderKYC();
        updateStats();
    }
};

// Announcements
document.getElementById('postAnnouncementBtn')?.addEventListener('click', () => {
    const title = document.getElementById('announcementTitle').value;
    const content = document.getElementById('announcementContent').value;
    const priority = document.getElementById('announcementPriority').value;
    
    if (!title || !content) {
        alert('Please enter title and content');
        return;
    }
    
    const newAnnouncement = {
        id: nextAnnouncementId++,
        title,
        content,
        priority,
        date: new Date().toISOString().slice(0, 10),
        postedBy: 'admin'
    };
    announcements.unshift(newAnnouncement);
    addSystemLog(`Posted announcement: ${title}`);
    renderAnnouncements();
    
    document.getElementById('announcementTitle').value = '';
    document.getElementById('announcementContent').value = '';
});

window.deleteAnnouncement = function(id) {
    if (confirm('Delete this announcement?')) {
        announcements = announcements.filter(a => a.id !== id);
        addSystemLog(`Deleted announcement ID ${id}`);
        renderAnnouncements();
    }
};

// Tab Switching
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const tabId = btn.getAttribute('data-tab');
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabId).classList.add('active');
        
        // Refresh current tab data
        if (tabId === 'users') renderUsers();
        else if (tabId === 'kyc') renderKYC();
        else if (tabId === 'trades') renderTrades();
        else if (tabId === 'announcements') renderAnnouncements();
        else if (tabId === 'logs') updateLogsDisplay();
    });
});

// Initial Render
renderUsers();
renderKYC();
renderTrades();
renderAnnouncements();
updateLogsDisplay();
updateStats();
addSystemLog("Admin panel loaded", "system");
