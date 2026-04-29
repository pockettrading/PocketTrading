// Home page functionality - Supabase Cloud Database
// File: js/home.js

let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Home page loaded');
    
    // Wait for supabaseDB
    if (typeof supabaseDB === 'undefined') {
        setTimeout(() => initHomePage(), 500);
        return;
    }
    
    await initHomePage();
});

async function initHomePage() {
    await loadUser();
    renderNavLinks();
    renderUserInfo();
    await loadUserStats();
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
            console.log('User loaded:', currentUser?.email);
        } else {
            console.log('No user logged in - guest mode');
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
    
    // Remove existing My Profile link if it exists
    const existingProfileLink = Array.from(navLinks.children).find(link => link.textContent === 'My Profile');
    if (existingProfileLink) {
        existingProfileLink.remove();
    }
    
    // Add My Profile link only if user is logged in
    if (currentUser) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'nav-link';
        profileLink.textContent = 'My Profile';
        navLinks.appendChild(profileLink);
    }
}

function renderUserInfo() {
    const userInfo = document.getElementById('userInfo');
    if (!userInfo) return;
    
    if (currentUser) {
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        userInfo.innerHTML = `
            <span class="username">${displayName}</span>
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

async function loadUserStats() {
    if (!currentUser) {
        // Guest mode - show placeholder stats
        const balanceElem = document.getElementById('userBalance');
        const balanceChangeElem = document.getElementById('balanceChange');
        const tradesElem = document.getElementById('totalTrades');
        const winRateElem = document.getElementById('winRate');
        const profitElem = document.getElementById('totalProfit');
        
        if (balanceElem) {
            balanceElem.textContent = '$0.00';
            balanceElem.className = 'stat-value';
        }
        if (balanceChangeElem) {
            balanceChangeElem.textContent = 'Make a deposit to start';
            balanceChangeElem.className = 'stat-change';
        }
        if (tradesElem) tradesElem.textContent = '0';
        if (winRateElem) {
            winRateElem.textContent = '0%';
            winRateElem.className = 'stat-value';
        }
        if (profitElem) {
            profitElem.textContent = '$0.00';
            profitElem.className = 'stat-value';
        }
        return;
    }
    
    // Logged in user - show real stats
    const currentBalance = currentUser.balance || 0;
    
    const balanceElem = document.getElementById('userBalance');
    const balanceChangeElem = document.getElementById('balanceChange');
    
    if (balanceElem) {
        balanceElem.textContent = `$${currentBalance.toFixed(2)}`;
        if (currentBalance > 0) {
            balanceElem.className = 'stat-value positive';
        } else {
            balanceElem.className = 'stat-value';
        }
    }
    
    if (balanceChangeElem) {
        if (currentBalance > 0) {
            balanceChangeElem.innerHTML = 'Active balance';
            balanceChangeElem.className = 'stat-change positive';
        } else {
            balanceChangeElem.innerHTML = 'Make a deposit to start';
            balanceChangeElem.className = 'stat-change';
        }
    }
    
    // Get user's transactions from Supabase
    try {
        const transactions = await supabaseDB.getUserTransactions(currentUser.id);
        const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
        
        const totalTrades = trades.length;
        
        let winningTrades = 0;
        let totalProfit = 0;
        
        trades.forEach(trade => {
            if (trade.pnl && trade.pnl > 0) winningTrades++;
            if (trade.pnl) totalProfit += trade.pnl;
        });
        
        const winRate = totalTrades > 0 ? (winningTrades / totalTrades * 100).toFixed(1) : 0;
        
        const tradesElem = document.getElementById('totalTrades');
        const winRateElem = document.getElementById('winRate');
        const profitElem = document.getElementById('totalProfit');
        
        if (tradesElem) tradesElem.textContent = totalTrades;
        if (winRateElem) {
            winRateElem.textContent = `${winRate}%`;
            winRateElem.className = 'stat-value';
        }
        if (profitElem) {
            const sign = totalProfit >= 0 ? '+' : '';
            profitElem.textContent = `${sign}$${Math.abs(totalProfit).toFixed(2)}`;
            profitElem.className = `stat-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
        }
    } catch (error) {
        console.error('Error loading user stats:', error);
    }
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.handleLogout = handleLogout;
