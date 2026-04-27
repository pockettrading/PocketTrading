// Profile functionality - Luno Style with Sidebar

let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Profile page loaded');
    loadUser();
    if (!currentUser) {
        window.location.href = 'login.html';
        return;
    }
    renderUserInfo();
    initProfilePage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
    }
}

function renderUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    const displayName = currentUser.name || currentUser.email.split('@')[0];
    
    userInfo.innerHTML = `
        <span class="username">${displayName}</span>
        <span class="logout-link" onclick="handleLogout()">Logout</span>
    `;
}

function initProfilePage() {
    updateUserProfile();
    loadTradingStats();
    loadTradeHistory();
    setupMenuNavigation();
    setupForms();
}

function updateUserProfile() {
    if (!currentUser) return;
    
    const fullName = currentUser.name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    const memberSince = currentUser.created ? new Date(currentUser.created).toLocaleDateString() : new Date().toLocaleDateString();
    const currentBalance = currentUser.balance || 0;
    const kycStatus = currentUser.kycStatus || 'pending';
    
    // Avatar initials
    const initials = fullName.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
    document.getElementById('userAvatar').textContent = initials;
    document.getElementById('userFullName').textContent = fullName;
    document.getElementById('userEmail').textContent = email;
    document.getElementById('memberSince').textContent = memberSince;
    document.getElementById('accountBalance').textContent = `$${currentBalance.toFixed(2)}`;
    
    const kycBadge = document.getElementById('kycStatus');
    kycBadge.textContent = kycStatus;
    kycBadge.className = `kyc-status kyc-${kycStatus}`;
    
    // Update form fields
    const updateFullName = document.getElementById('updateFullName');
    const updateEmail = document.getElementById('updateEmail');
    const kycFullName = document.getElementById('kycFullName');
    
    if (updateFullName) updateFullName.value = fullName;
    if (updateEmail) updateEmail.value = email;
    if (kycFullName) kycFullName.value = fullName;
}

function loadTradingStats() {
    if (!currentUser) return;
    
    const transactions = currentUser.transactions || [];
    const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    
    const totalTrades = trades.length;
    
    let winningTrades = 0;
    let totalVolume = 0;
    let totalProfit = currentUser.stats?.totalProfit || 0;
    
    trades.forEach(trade => {
        totalVolume += trade.amount || 0;
        if (trade.pnl && trade.pnl > 0) winningTrades++;
    });
    
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
    
    document.getElementById('totalTrades').textContent = totalTrades;
    document.getElementById('winRate').textContent = `${winRate}%`;
    document.getElementById('totalVolume').textContent = `$${totalVolume.toFixed(2)}`;
    
    const profitElem = document.getElementById('totalProfit');
    const sign = totalProfit >= 0 ? '+' : '';
    profitElem.textContent = `${sign}$${Math.abs(totalProfit).toFixed(2)}`;
    profitElem.className = `stat-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
}

function loadTradeHistory() {
    const tbody = document.getElementById('tradeHistoryBody');
    if (!tbody) return;
    
    const transactions = currentUser.transactions || [];
    const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell').slice(0, 20);
    
    if (trades.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 2rem;">No trades yet</td--</tr>';
        return;
    }
    
    tbody.innerHTML = trades.map(trade => {
        const tradeType = trade.tradeType || trade.type;
        return `
            <tr>
                <td>${new Date(trade.date).toLocaleDateString()} ${new Date(trade.date).toLocaleTimeString()}</td
                <td class="trade-type-${tradeType}">${tradeType?.toUpperCase() || trade.type.toUpperCase()}</td
                <td>${trade.crypto || 'BTC'}</td
                <td>${trade.amount?.toFixed(2) || '0'}</td
                <td>$${trade.price?.toFixed(2) || '0'}</td
                <td>$${trade.expectedReturn?.toFixed(2) || trade.total?.toFixed(2) || '0'}</td
            比
        `;
    }).join('');
}

function setupMenuNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = ['historyPage', 'kycPage', 'updatePage', 'supportPage'];
    
    menuItems.forEach((item, index) => {
        item.addEventListener('click', () => {
            menuItems.forEach(mi => mi.classList.remove('active'));
            item.classList.add('active');
            
            pages.forEach(page => {
                const pageElem = document.getElementById(page);
                if (pageElem) pageElem.style.display = 'none';
            });
            
            const selectedPage = document.getElementById(pages[index]);
            if (selectedPage) selectedPage.style.display = 'block';
        });
    });
}

function setupForms() {
    // Update Profile Form
    const updateForm = document.getElementById('updateProfileForm');
    if (updateForm) {
        updateForm.addEventListener('submit', (e) => {
            e.preventDefault();
            updateProfile();
        });
    }
    
    // KYC Form
    const kycForm = document.getElementById('kycForm');
    if (kycForm) {
        kycForm.addEventListener('submit', (e) => {
            e.preventDefault();
            submitKYC();
        });
    }
    
    // Support Form
    const supportForm = document.getElementById('supportForm');
    if (supportForm) {
        supportForm.addEventListener('submit', (e) => {
            e.preventDefault();
            sendSupportMessage();
        });
    }
    
    // File upload handlers
    const idFront = document.getElementById('idFront');
    if (idFront) {
        idFront.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'ID Front'));
    }
    
    const idBack = document.getElementById('idBack');
    if (idBack) {
        idBack.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'ID Back'));
    }
    
    const selfie = document.getElementById('selfie');
    if (selfie) {
        selfie.addEventListener('change', (e) => handleFileUpload(e.target.files[0], 'Selfie'));
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
    updateUserProfile();
}

function submitKYC() {
    const fullName = document.getElementById('kycFullName').value;
    const dob = document.getElementById('kycDob').value;
    const idType = document.getElementById('kycIdType').value;
    
    if (!fullName || !dob || !idType) {
        showNotification('Please fill in all fields', 'error');
        return;
    }
    
    const hasIdFront = document.getElementById('idFront').files.length > 0;
    const hasIdBack = document.getElementById('idBack').files.length > 0;
    const hasSelfie = document.getElementById('selfie').files.length > 0;
    
    if (!hasIdFront || !hasIdBack || !hasSelfie) {
        showNotification('Please upload all required documents', 'error');
        return;
    }
    
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
    
    const kycBadge = document.getElementById('kycStatus');
    kycBadge.textContent = 'pending';
    kycBadge.className = 'kyc-status kyc-pending';
    
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

function saveUserData() {
    const users = JSON.parse(localStorage.getItem('pocket_users') || '[]');
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = currentUser;
        localStorage.setItem('pocket_users', JSON.stringify(users));
    }
    
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
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease-out';
        setTimeout(() => notification.remove(), 300);
    }, 3000);
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

window.handleLogout = handleLogout;
