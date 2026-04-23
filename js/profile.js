// Profile functionality - Complete working version

let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    initProfilePage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
    }
}

function initProfilePage() {
    setupTabs();
    loadUserProfile();
    loadTradingStats();
    loadTradeHistory();
    setupForms();
    
    // Update avatar
    updateAvatar();
}

function setupTabs() {
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            const tabId = this.dataset.tab;
            
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Hide all tab contents
            tabContents.forEach(content => content.style.display = 'none');
            
            // Show selected tab content
            const selectedTab = document.getElementById(`${tabId}Tab`);
            if (selectedTab) {
                selectedTab.style.display = 'block';
            }
        });
    });
}

function switchTab(tabName) {
    const tabs = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');
    
    tabs.forEach(tab => {
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        } else {
            tab.classList.remove('active');
        }
    });
    
    tabContents.forEach(content => content.style.display = 'none');
    
    const selectedTab = document.getElementById(`${tabName}Tab`);
    if (selectedTab) {
        selectedTab.style.display = 'block';
    }
}

function loadUserProfile() {
    if (!currentUser) return;
    
    const fullName = currentUser.name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    const memberSince = new Date(currentUser.created).toLocaleDateString();
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    
    // Update profile elements
    document.getElementById('profileFullName').textContent = fullName;
    document.getElementById('profileEmail').textContent = email;
    document.getElementById('infoFullName').textContent = fullName;
    document.getElementById('infoEmail').textContent = email;
    document.getElementById('memberSince').textContent = memberSince;
    document.getElementById('accountBalance').textContent = `$${currentBalance.toFixed(2)}`;
    
    // Update KYC status
    const kycStatus = currentUser.kycStatus || 'pending';
    const kycStatusSpan = document.getElementById('kycStatus');
    kycStatusSpan.textContent = kycStatus;
    kycStatusSpan.className = `kyc-status kyc-${kycStatus}`;
    
    // Calculate daily profit/loss
    calculateDailyProfitLoss();
    
    // Update form fields
    const updateFullName = document.getElementById('updateFullName');
    const updateEmail = document.getElementById('updateEmail');
    if (updateFullName) updateFullName.value = fullName;
    if (updateEmail) updateEmail.value = email;
    
    const kycFullName = document.getElementById('kycFullName');
    if (kycFullName) kycFullName.value = fullName;
}

function calculateDailyProfitLoss() {
    const today = new Date().toDateString();
    const todayTrades = (currentUser.transactions || []).filter(t => 
        t.type === 'trade' && new Date(t.date).toDateString() === today
    );
    
    let dailyProfit = 0;
    todayTrades.forEach(trade => {
        if (trade.pnl) {
            dailyProfit += trade.pnl;
        }
    });
    
    const profitLossElem = document.getElementById('dailyProfitLoss');
    if (profitLossElem) {
        const profitClass = dailyProfit >= 0 ? 'positive' : 'negative';
        profitLossElem.innerHTML = `${dailyProfit >= 0 ? '+' : ''}$${dailyProfit.toFixed(2)} USDT`;
        profitLossElem.style.color = dailyProfit >= 0 ? 'var(--success)' : 'var(--danger)';
    }
}

function loadTradingStats() {
    if (!currentUser) return;
    
    const transactions = currentUser.transactions || [];
    const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    
    const totalTrades = trades.length;
    let winningTrades = 0;
    let totalVolume = 0;
    let totalProfit = 0;
    
    trades.forEach(trade => {
        totalVolume += trade.total || 0;
        
        if (trade.pnl) {
            totalProfit += trade.pnl;
            if (trade.pnl > 0) winningTrades++;
        }
    });
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
    
    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('totalVolume').textContent = `$${totalVolume.toFixed(2)}`;
    
    const profitElem = document.getElementById('totalProfit');
    profitElem.textContent = `${totalProfit >= 0 ? '+' : ''}$${totalProfit.toFixed(2)}`;
    profitElem.className = `stat-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
}

function loadTradeHistory() {
    const tbody = document.getElementById('tradeHistoryBody');
    if (!tbody) return;
    
    const transactions = currentUser.transactions || [];
    const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell').slice(0, 20);
    
    if (trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center;">No trades yet</td></tr>';
        return;
    }
    
    tbody.innerHTML = trades.map(trade => `
        <tr>
            <td>${new Date(trade.date).toLocaleDateString()}</td>
            <td class="trade-type-${trade.type}">${trade.type.toUpperCase()}</td>
            <td>${trade.crypto || 'BTC'}</td>
            <td>${trade.amount?.toFixed(6) || '0'}</td>
            <td>$${trade.price?.toFixed(2) || '0'}</td>
            <td>$${trade.total?.toFixed(2) || '0'}</td>
        </tr>
    `).join('');
}

function setupForms() {
    // Update Profile Form
    const updateForm = document.getElementById('updateProfileForm');
    if (updateForm) {
        updateForm.addEventListener('submit', function(e) {
            e.preventDefault();
            updateProfile();
        });
    }
    
    // KYC Form
    const kycForm = document.getElementById('kycForm');
    if (kycForm) {
        kycForm.addEventListener('submit', function(e) {
            e.preventDefault();
            submitKYC();
        });
    }
    
    // Support Form
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', function(e) {
            e.preventDefault();
            sendSupportMessage();
        });
    }
    
    // File upload handlers
    const idFront = document.getElementById('idFront');
    if (idFront) {
        idFront.addEventListener('change', function(e) {
            handleFileUpload(e.target.files[0], 'ID Front');
        });
    }
    
    const idBack = document.getElementById('idBack');
    if (idBack) {
        idBack.addEventListener('change', function(e) {
            handleFileUpload(e.target.files[0], 'ID Back');
        });
    }
    
    const selfie = document.getElementById('selfie');
    if (selfie) {
        selfie.addEventListener('change', function(e) {
            handleFileUpload(e.target.files[0], 'Selfie');
        });
    }
}

function updateProfile() {
    const newName = document.getElementById('updateFullName').value;
    const newEmail = document.getElementById('updateEmail').value;
    const newPhone = document.getElementById('updatePhone').value;
    const newCountry = document.getElementById('updateCountry').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    
    if (newName) {
        currentUser.name = newName;
    }
    
    if (newEmail && newEmail !== currentUser.email) {
        // Check if email already exists
        const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
        if (users.find(u => u.email === newEmail)) {
            showNotification('Email already exists', 'error');
            return;
        }
        currentUser.email = newEmail;
    }
    
    if (newPhone) {
        currentUser.phone = newPhone;
    }
    
    if (newCountry) {
        currentUser.country = newCountry;
    }
    
    if (newPassword) {
        if (newPassword.length < 8) {
            showNotification('Password must be at least 8 characters', 'error');
            return;
        }
        if (newPassword !== confirmPassword) {
            showNotification('Passwords do not match', 'error');
            return;
        }
        currentUser.password = newPassword;
    }
    
    saveUserData();
    showNotification('Profile updated successfully!', 'success');
    
    // Reload profile
    loadUserProfile();
}

function submitKYC() {
    const fullName = document.getElementById('kycFullName').value;
    const dob = document.getElementById('kycDob').value;
    const idType = document.getElementById('kycIdType').value;
    
    if (!fullName || !dob || !idType) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    // Check if files were uploaded (simulated)
    const hasIdFront = document.getElementById('idFront').files.length > 0;
    const hasIdBack = document.getElementById('idBack').files.length > 0;
    const hasSelfie = document.getElementById('selfie').files.length > 0;
    
    if (!hasIdFront || !hasIdBack || !hasSelfie) {
        showNotification('Please upload all required documents', 'error');
        return;
    }
    
    // Submit KYC request
    currentUser.kycStatus = 'pending';
    currentUser.kycSubmitted = new Date().toISOString();
    currentUser.kycDetails = {
        fullName: fullName,
        dob: dob,
        idType: idType,
        submitted: new Date().toISOString()
    };
    
    saveUserData();
    showNotification('KYC documents submitted successfully! We will verify within 24-48 hours.', 'success');
    
    // Update KYC status display
    const kycStatusSpan = document.getElementById('kycStatus');
    kycStatusSpan.textContent = 'pending';
    kycStatusSpan.className = 'kyc-status kyc-pending';
    
    // Reset form
    document.getElementById('kycForm').reset();
}

function sendSupportMessage() {
    const subject = document.getElementById('supportSubject').value;
    const message = document.getElementById('supportMessage').value;
    
    if (!subject || !message) {
        showNotification('Please enter subject and message', 'error');
        return;
    }
    
    const supportTicket = {
        id: Date.now(),
        userId: currentUser.id,
        userEmail: currentUser.email,
        subject: subject,
        message: message,
        status: 'open',
        date: new Date().toISOString()
    };
    
    let tickets = JSON.parse(localStorage.getItem('support_tickets') || '[]');
    tickets.push(supportTicket);
    localStorage.setItem('support_tickets', JSON.stringify(tickets));
    
    showNotification('Support message sent! We will respond within 24 hours.', 'success');
    
    // Reset form
    document.getElementById('supportSubject').value = '';
    document.getElementById('supportMessage').value = '';
    document.getElementById('supportAttachment').value = '';
}

function handleFileUpload(file, type) {
    if (file) {
        if (!file.type.match('image/jpeg') && !file.type.match('image/png')) {
            showNotification(`${type} must be JPG or PNG`, 'error');
            return false;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showNotification(`${type} must be less than 5MB`, 'error');
            return false;
        }
        
        showNotification(`${type} uploaded successfully!`, 'success');
        return true;
    }
    return false;
}

function updateAvatar() {
    const avatarDiv = document.getElementById('userAvatar');
    if (avatarDiv && currentUser) {
        const name = currentUser.name || currentUser.email.split('@')[0];
        const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
        avatarDiv.textContent = initials;
    }
}

function saveUserData() {
    // Update in users array
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pocket_users', JSON.stringify(users));
    }
    
    // Update current session
    if (localStorage.getItem('pocket_user')) {
        localStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
    if (sessionStorage.getItem('pocket_user')) {
        sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
    }
}

function showNotification(message, type) {
    const existing = document.querySelector('.profile-notification');
    if (existing) existing.remove();
    
    const notification = document.createElement('div');
    notification.className = 'profile-notification';
    notification.textContent = message;
    notification.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${type === 'error' ? '#FF4757' : '#00D897'};
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-size: 14px;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        max-width: 350px;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(function() {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(function() { notification.remove(); }, 300);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'login.html';
}

// Make functions global
window.switchTab = switchTab;
window.handleLogout = handleLogout;
