// Profile page functionality - Optimized for Guest, Registered, and Admin Users
// File: js/profile.js

let currentUser = null;

// Admin email
const ADMIN_EMAIL = 'ephremgojo@gmail.com';

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Profile page loaded');
    
    if (typeof supabaseDB === 'undefined') {
        setTimeout(() => initProfilePage(), 500);
        return;
    }
    
    await initProfilePage();
});

async function initProfilePage() {
    await loadUser();
    renderNavLinks();
    renderUserInfo();
    
    if (!currentUser) {
        renderLoginPrompt();
    } else {
        renderProfileInterface();
        await loadUserProfile();
        await loadTradingStats();
        await loadTradeHistory();
        setupMenuNavigation();
        setupForms();
    }
}

async function loadUser() {
    try {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            
            // Verify user still exists in cloud
            const cloudUser = await supabaseDB.getUserByEmail(currentUser.email);
            if (cloudUser) {
                currentUser = cloudUser;
                currentUser.isAdmin = (currentUser.email === ADMIN_EMAIL);
                
                // Update session
                if (localStorage.getItem('pocket_user')) {
                    localStorage.setItem('pocket_user', JSON.stringify(currentUser));
                }
                if (sessionStorage.getItem('pocket_user')) {
                    sessionStorage.setItem('pocket_user', JSON.stringify(currentUser));
                }
            } else {
                currentUser = null;
            }
            console.log('User loaded:', currentUser?.email, 'Is Admin:', currentUser?.isAdmin);
        } else {
            console.log('Guest mode - no user logged in');
            currentUser = null;
        }
    } catch(e) {
        console.log('Error loading user:', e);
        currentUser = null;
    }
}

function renderNavLinks() {
    const navLinks = document.getElementById('navLinks');
    if (!navLinks) return;
    
    // Profile page already has My Profile link active
}

function renderUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    if (currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        const adminBadge = currentUser.isAdmin ? '<span class="admin-badge">Admin</span>' : '';
        
        userInfo.innerHTML = `
            <span class="username">${displayName}${adminBadge}</span>
            ${currentUser.isAdmin ? '<a href="admin.html" class="login-btn" style="margin-left: 0.5rem;">Admin Panel</a>' : ''}
            <span class="logout-link" onclick="handleLogout()">Logout</span>
        `;
    } else {
        userInfo.innerHTML = `
            <div class="auth-buttons">
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="signup-btn">Sign Up</a>
            </div>
        `;
    }
}

function renderLoginPrompt() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="login-prompt">
            <h3>🔒 Login Required</h3>
            <p>Please login or create an account to view your profile</p>
            <div class="login-buttons">
                <a href="login.html" class="btn-login" style="background: transparent; color: var(--primary); padding: 10px 28px; border: 1px solid var(--primary); border-radius: 10px; text-decoration: none; font-weight: 500;">Login</a>
                <a href="register.html" class="btn-signup" style="background: linear-gradient(135deg, var(--primary), var(--primary-dark)); color: white; padding: 10px 28px; border: none; border-radius: 10px; text-decoration: none; font-weight: 500;">Sign Up</a>
            </div>
        </div>
    `;
}

function renderProfileInterface() {
    const container = document.getElementById('profileContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="profile-layout">
            <!-- Left Sidebar - Menu Only -->
            <div class="profile-sidebar">
                <div class="sidebar-title">User Profile</div>
                <div class="menu-items">
                    <div class="menu-item active" data-page="profile">
                        <span class="menu-icon">👤</span>
                        <span>Profile</span>
                    </div>
                    <div class="menu-item" data-page="history">
                        <span class="menu-icon">📊</span>
                        <span>Trade History</span>
                    </div>
                    <div class="menu-item" data-page="kyc">
                        <span class="menu-icon">✓</span>
                        <span>KYC Verification</span>
                    </div>
                    <div class="menu-item" data-page="update">
                        <span class="menu-icon">✎</span>
                        <span>Update Profile</span>
                    </div>
                    <div class="menu-item" data-page="support">
                        <span class="menu-icon">💬</span>
                        <span>Customer Support</span>
                    </div>
                </div>
            </div>

            <!-- Main Content Area -->
            <div class="profile-content">
                <!-- Profile Page (Default) -->
                <div id="profilePage" class="page-content">
                    <h2 class="content-title">Profile</h2>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 1.5rem;">View your personal information and account status</p>

                    <!-- Personal Information Card -->
                    <div class="info-card">
                        <div class="info-row">
                            <span class="info-label">Full Name</span>
                            <span class="info-value" id="profileFullName">-</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Email</span>
                            <span class="info-value" id="profileEmail">-</span>
                        </div>
                        <div class="info-row">
                            <span class="info-label">Member Since</span>
                            <span class="info-value" id="memberSince">-</span>
                        </div>
                    </div>

                    <!-- Balance and KYC Section -->
                    <div class="balance-section">
                        <div class="balance-item">
                            <div class="balance-label">Account Balance</div>
                            <div class="balance-value" id="accountBalance">$0.00</div>
                        </div>
                        <div class="balance-item">
                            <div class="balance-label">KYC Status</div>
                            <div>
                                <span class="kyc-badge kyc-pending" id="kycStatus">pending</span>
                            </div>
                        </div>
                    </div>

                    <!-- Action Buttons -->
                    <div class="action-buttons">
                        <a href="deposit.html" class="btn-deposit">Deposit</a>
                        <a href="withdraw.html" class="btn-withdraw">Withdraw Funds</a>
                    </div>

                    <!-- Trading Statistics -->
                    <div class="stats-title">Trading Statistics</div>
                    <div class="stats-grid">
                        <div class="stat-item">
                            <div class="stat-label">Total Trades</div>
                            <div class="stat-value" id="totalTrades">0</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Win Rate</div>
                            <div class="stat-value" id="winRate">0%</div>
                        </div>
                        <div class="stat-item">
                            <div class="stat-label">Total Volume</div>
                            <div class="stat-value" id="totalVolume">$0.00</div>
                        </div>
                    </div>
                </div>

                <!-- Trade History Page -->
                <div id="historyPage" class="page-content" style="display: none;">
                    <h2 class="content-title">Trade History</h2>
                    <div class="trade-history-table">
                        <table>
                            <thead>
                                <tr>
                                    <th>Date</th>
                                    <th>Type</th>
                                    <th>Crypto</th>
                                    <th>Amount</th>
                                    <th>Price</th>
                                    <th>Total</th>
                                </tr>
                            </thead>
                            <tbody id="tradeHistoryBody">
                                <tr>
                                    <td colspan="6" style="text-align: center; padding: 2rem;">No trades yet</td--</td>
                            </tbody>
                        </td>
                    </div>
                </div>

                <!-- KYC Verification Page -->
                <div id="kycPage" class="page-content" style="display: none;">
                    <h2 class="content-title">KYC Verification</h2>
                    <p style="margin-bottom: 1rem; font-size: 0.8rem; color: var(--text-secondary);">Please verify your identity to unlock full trading limits and withdrawal features.</p>
                    
                    <form id="kycForm">
                        <div class="form-group">
                            <label>Full Name (as on ID)</label>
                            <input type="text" id="kycFullName" placeholder="Enter your full name" required>
                        </div>
                        <div class="form-group">
                            <label>Date of Birth</label>
                            <input type="date" id="kycDob" required>
                        </div>
                        <div class="form-group">
                            <label>ID Type</label>
                            <select id="kycIdType">
                                <option value="passport">Passport</option>
                                <option value="drivers_license">Driver's License</option>
                                <option value="national_id">National ID Card</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Upload ID (Front)</label>
                            <div class="file-upload" onclick="document.getElementById('idFront').click()">
                                <div>📄 Click to upload front side of ID</div>
                                <div style="font-size: 0.6rem; margin-top: 0.5rem;">JPG, PNG (Max 5MB)</div>
                            </div>
                            <input type="file" id="idFront" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div class="form-group">
                            <label>Upload ID (Back)</label>
                            <div class="file-upload" onclick="document.getElementById('idBack').click()">
                                <div>📄 Click to upload back side of ID</div>
                                <div style="font-size: 0.6rem; margin-top: 0.5rem;">JPG, PNG (Max 5MB)</div>
                            </div>
                            <input type="file" id="idBack" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <div class="form-group">
                            <label>Selfie with ID</label>
                            <div class="file-upload" onclick="document.getElementById('selfie').click()">
                                <div>📸 Click to upload selfie holding ID</div>
                                <div style="font-size: 0.6rem; margin-top: 0.5rem;">JPG, PNG (Max 5MB)</div>
                            </div>
                            <input type="file" id="selfie" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <button type="submit" class="btn-submit">Submit KYC</button>
                    </form>
                </div>

                <!-- Update Profile Page -->
                <div id="updatePage" class="page-content" style="display: none;">
                    <h2 class="content-title">Update Profile</h2>
                    <form id="updateProfileForm">
                        <div class="form-group">
                            <label>Full Name</label>
                            <input type="text" id="updateFullName" placeholder="Enter your full name">
                        </div>
                        <div class="form-group">
                            <label>Email Address</label>
                            <input type="email" id="updateEmail" placeholder="Enter your email">
                        </div>
                        <div class="form-group">
                            <label>Phone Number</label>
                            <input type="tel" id="updatePhone" placeholder="Enter your phone number">
                        </div>
                        <div class="form-group">
                            <label>Country</label>
                            <select id="updateCountry">
                                <option value="">Select Country</option>
                                <option value="USA">United States</option>
                                <option value="UK">United Kingdom</option>
                                <option value="Canada">Canada</option>
                                <option value="Australia">Australia</option>
                                <option value="Germany">Germany</option>
                                <option value="France">France</option>
                                <option value="Japan">Japan</option>
                                <option value="Singapore">Singapore</option>
                                <option value="UAE">United Arab Emirates</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Change Password</label>
                            <input type="password" id="newPassword" placeholder="New password (leave blank to keep current)">
                        </div>
                        <div class="form-group">
                            <label>Confirm Password</label>
                            <input type="password" id="confirmPassword" placeholder="Confirm new password">
                        </div>
                        <button type="submit" class="btn-submit">Save Changes</button>
                    </form>
                </div>

                <!-- Customer Support Page -->
                <div id="supportPage" class="page-content" style="display: none;">
                    <h2 class="content-title">Customer Support</h2>
                    
                    <div class="support-contact">
                        <div class="contact-card">
                            <div class="contact-label">📧 Email</div>
                            <div class="contact-value">support@pockettrading.com</div>
                        </div>
                        <div class="contact-card">
                            <div class="contact-label">💬 Live Chat</div>
                            <div class="contact-value">24/7 Available</div>
                        </div>
                        <div class="contact-card">
                            <div class="contact-label">📞 Phone</div>
                            <div class="contact-value">+1 (800) 123-4567</div>
                        </div>
                        <div class="contact-card">
                            <div class="contact-label">⏰ Response Time</div>
                            <div class="contact-value">Within 24 hours</div>
                        </div>
                    </div>

                    <form id="supportForm">
                        <div class="form-group">
                            <label>Subject</label>
                            <input type="text" id="supportSubject" placeholder="Enter subject" required>
                        </div>
                        <div class="form-group">
                            <label>Message</label>
                            <textarea id="supportMessage" rows="4" placeholder="Describe your issue..." required></textarea>
                        </div>
                        <div class="form-group">
                            <label>Attach Screenshot (Optional)</label>
                            <div class="file-upload" onclick="document.getElementById('supportAttachment').click()">
                                <div>📎 Click to attach file</div>
                            </div>
                            <input type="file" id="supportAttachment" accept="image/jpeg,image/png" style="display: none;">
                        </div>
                        <button type="submit" class="btn-submit">Send Message</button>
                    </form>

                    <div class="faq-item">
                        <div class="faq-question">How to deposit?</div>
                        <div class="faq-answer">Go to Deposit page or click Deposit button in your profile.</div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question">How long do withdrawals take?</div>
                        <div class="faq-answer">Withdrawals are processed within 24-48 hours after admin approval.</div>
                    </div>
                    <div class="faq-item">
                        <div class="faq-question">What are the trading fees?</div>
                        <div class="faq-answer">Trading fee is 0.1% per transaction. No deposit fees.</div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function loadUserProfile() {
    if (!currentUser) return;
    
    const fullName = currentUser.name || currentUser.email.split('@')[0];
    const email = currentUser.email;
    const memberSince = currentUser.created_at ? new Date(currentUser.created_at).toLocaleDateString() : new Date().toLocaleDateString();
    const currentBalance = currentUser.balance || 0;
    const kycStatus = currentUser.kyc_status || 'pending';
    
    document.getElementById('profileFullName').textContent = fullName;
    document.getElementById('profileEmail').textContent = email;
    document.getElementById('memberSince').textContent = memberSince;
    document.getElementById('accountBalance').textContent = `$${currentBalance.toFixed(2)}`;
    
    const kycBadge = document.getElementById('kycStatus');
    kycBadge.textContent = kycStatus;
    kycBadge.className = `kyc-badge kyc-${kycStatus}`;
    
    // Update form fields
    const updateFullName = document.getElementById('updateFullName');
    const updateEmail = document.getElementById('updateEmail');
    const updateCountry = document.getElementById('updateCountry');
    const kycFullName = document.getElementById('kycFullName');
    
    if (updateFullName) updateFullName.value = fullName;
    if (updateEmail) updateEmail.value = email;
    if (updateCountry && currentUser.country) updateCountry.value = currentUser.country;
    if (kycFullName) kycFullName.value = fullName;
}

async function loadTradingStats() {
    if (!currentUser) return;
    
    try {
        const transactions = await supabaseDB.getUserTransactions(currentUser.id);
        const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
        
        const totalTrades = trades.length;
        
        let winningTrades = 0;
        let totalVolume = 0;
        let totalProfit = 0;
        
        trades.forEach(trade => {
            totalVolume += trade.amount || 0;
            if (trade.pnl && trade.pnl > 0) winningTrades++;
            if (trade.pnl) totalProfit += trade.pnl;
        });
        
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
        
        document.getElementById('totalTrades').textContent = totalTrades;
        document.getElementById('winRate').textContent = `${winRate}%`;
        document.getElementById('totalVolume').textContent = `$${totalVolume.toFixed(2)}`;
        
        const profitElem = document.getElementById('totalProfit');
        if (profitElem) {
            const sign = totalProfit >= 0 ? '+' : '';
            profitElem.textContent = `${sign}$${Math.abs(totalProfit).toFixed(2)}`;
            profitElem.className = `stat-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
        }
    } catch (error) {
        console.error('Error loading trading stats:', error);
    }
}

async function loadTradeHistory() {
    const tbody = document.getElementById('tradeHistoryBody');
    if (!tbody) return;
    
    try {
        const transactions = await supabaseDB.getUserTransactions(currentUser.id);
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
    } catch (error) {
        console.error('Error loading trade history:', error);
    }
}

function setupMenuNavigation() {
    const menuItems = document.querySelectorAll('.menu-item');
    const pages = ['profilePage', 'historyPage', 'kycPage', 'updatePage', 'supportPage'];
    
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

async function updateProfile() {
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
        const existingUsers = await supabaseDB.get('users', { email: newEmail });
        if (existingUsers && existingUsers.length > 0) {
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
    
    await supabaseDB.update('users', currentUser.id, {
        name: currentUser.name,
        email: currentUser.email,
        phone: currentUser.phone,
        country: currentUser.country,
        password: currentUser.password
    });
    
    saveUserData();
    showNotification('Profile updated successfully!', 'success');
    await loadUserProfile();
}

async function submitKYC() {
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
    
    const kycRequest = {
        id: Date.now(),
        user_id: currentUser.id,
        user_email: currentUser.email,
        full_name: fullName,
        dob: dob,
        id_type: idType,
        status: 'pending',
        date: new Date().toISOString()
    };
    
    await supabaseDB.insert('kyc_requests', kycRequest);
    await supabaseDB.updateUserKYCStatus(currentUser.id, 'pending');
    
    currentUser.kyc_status = 'pending';
    saveUserData();
    
    showNotification('KYC documents submitted successfully! We will verify within 24-48 hours.', 'success');
    
    const kycBadge = document.getElementById('kycStatus');
    kycBadge.textContent = 'pending';
    kycBadge.className = 'kyc-badge kyc-pending';
    
    document.getElementById('kycForm').reset();
}

async function sendSupportMessage() {
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
