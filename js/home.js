// Home page functionality - Shows Login + Sign Up buttons for guests

let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded');
    loadUser();
    renderUserSection();
    loadUserStats();
});

function loadUser() {
    try {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            console.log('User logged in:', currentUser.email);
        } else {
            console.log('No user logged in - guest mode');
            currentUser = null;
        }
    } catch(e) {
        console.log('Error loading user:', e);
        currentUser = null;
    }
}

function renderUserSection() {
    const userSection = document.getElementById('userSection');
    if (!userSection) return;
    
    if (currentUser) {
        // Show user dropdown for logged-in users
        const displayName = currentUser.name || currentUser.email.split('@')[0];
        
        userSection.innerHTML = `
            <div class="user-dropdown">
                <div class="user-name-display">
                    <span>👤</span>
                    <span>${displayName}</span>
                    <span>▼</span>
                </div>
                <div class="dropdown-menu">
                    <a href="profile.html" class="dropdown-item">📋 My Profile</a>
                    <a href="dashboard.html" class="dropdown-item">📊 Dashboard</a>
                    <a href="deposit.html" class="dropdown-item">💰 Deposit</a>
                    <a href="withdraw.html" class="dropdown-item">💸 Withdraw</a>
                    <div class="dropdown-divider"></div>
                    <span class="dropdown-item" onclick="handleLogout()" style="cursor: pointer; color: var(--danger);">🚪 Logout</span>
                </div>
            </div>
        `;
    } else {
        // Show Login + Sign Up buttons for guests
        userSection.innerHTML = `
            <div class="auth-buttons">
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="signup-btn">Sign Up</a>
            </div>
        `;
    }
}

function loadUserStats() {
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
    
    // Calculate trading stats from transactions
    const transactions = currentUser.transactions || [];
    const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    
    const totalTrades = trades.length;
    
    let winningTrades = 0;
    let totalProfit = currentUser.stats?.totalProfit || 0;
    
    trades.forEach(trade => {
        if (trade.pnl && trade.pnl > 0) winningTrades++;
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
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}
