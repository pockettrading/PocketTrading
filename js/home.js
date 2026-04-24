// Home page functionality - Dashboard style with no sidebar

let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded');
    loadUser();
    updateUserDisplay();
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

function updateUserDisplay() {
    const userNameSpan = document.getElementById('userNameDisplay');
    const authButtonSpan = document.getElementById('authButton');
    
    if (userNameSpan) {
        if (currentUser) {
            const displayName = currentUser.name || currentUser.email.split('@')[0];
            userNameSpan.textContent = displayName;
            
            // Show Logout button for logged-in users
            if (authButtonSpan) {
                authButtonSpan.innerHTML = '<span class="logout-link" onclick="handleLogout()">Logout</span>';
            }
        } else {
            userNameSpan.textContent = 'Guest';
            
            // Show Sign Up button for guest users
            if (authButtonSpan) {
                authButtonSpan.innerHTML = '<a href="register.html" class="auth-link">Sign Up</a>';
            }
        }
    }
}

function loadUserStats() {
    if (!currentUser) {
        // Guest mode - show placeholder stats with 0%
        const balanceElem = document.getElementById('userBalance');
        const balanceChangeElem = document.getElementById('balanceChange');
        const tradesElem = document.getElementById('totalTrades');
        const winRateElem = document.getElementById('winRate');
        const profitElem = document.getElementById('totalProfit');
        
        if (balanceElem) {
            balanceElem.textContent = '$0';
            balanceElem.className = 'stat-value';
        }
        if (balanceChangeElem) {
            balanceChangeElem.textContent = '0% from start';
            balanceChangeElem.className = 'stat-change';
        }
        if (tradesElem) tradesElem.textContent = '0';
        if (winRateElem) {
            winRateElem.textContent = '0%';
            winRateElem.className = 'stat-value';
        }
        if (profitElem) {
            profitElem.textContent = '$0';
            profitElem.className = 'stat-value';
        }
        return;
    }
    
    // Get current balance
    const currentBalance = currentUser.accountMode === 'demo' ? currentUser.demoBalance : currentUser.realBalance;
    const initialBalance = currentUser.accountMode === 'demo' ? 10000 : currentUser.realBalance;
    
    const balanceElem = document.getElementById('userBalance');
    const balanceChangeElem = document.getElementById('balanceChange');
    
    if (balanceElem) {
        balanceElem.textContent = `$${currentBalance.toFixed(2)}`;
        if (currentBalance >= 0) {
            balanceElem.className = 'stat-value positive';
        } else {
            balanceElem.className = 'stat-value negative';
        }
    }
    
    if (balanceChangeElem) {
        const changePercent = ((currentBalance - initialBalance) / initialBalance * 100).toFixed(1);
        if (changePercent >= 0) {
            balanceChangeElem.innerHTML = `+${changePercent}% from start`;
            balanceChangeElem.className = 'stat-change positive';
        } else {
            balanceChangeElem.innerHTML = `${changePercent}% from start`;
            balanceChangeElem.className = 'stat-change negative';
        }
    }
    
    // Calculate trading stats
    const transactions = currentUser.transactions || [];
    const trades = transactions.filter(t => t.type === 'trade' || t.type === 'buy' || t.type === 'sell');
    
    const totalTrades = trades.length;
    
    let winningTrades = 0;
    let totalProfit = 0;
    
    trades.forEach(trade => {
        if (trade.pnl) {
            totalProfit += trade.pnl;
            if (trade.pnl > 0) winningTrades++;
        }
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
        profitElem.textContent = `${sign}$${totalProfit.toFixed(2)}`;
        profitElem.className = `stat-value ${totalProfit >= 0 ? 'positive' : 'negative'}`;
    }
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.handleLogout = handleLogout;
