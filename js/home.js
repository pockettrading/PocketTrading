// Home page functionality - Shows user balance after auto-login

let currentUser = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Home page loaded');
    loadUser();
    loadUserStats();
});

function loadUser() {
    try {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            console.log('User logged in:', currentUser.email);
            console.log('User balance:', currentUser.balance);
        } else {
            console.log('No user logged in - guest mode');
            currentUser = null;
        }
    } catch(e) {
        console.log('Error loading user:', e);
        currentUser = null;
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
    
    // If stats not available, calculate from trades
    if (totalProfit === 0 && trades.length > 0) {
        trades.forEach(trade => {
            if (trade.pnl) {
                totalProfit += trade.pnl;
                if (trade.pnl > 0) winningTrades++;
            }
        });
    } else {
        winningTrades = currentUser.stats?.winningTrades || 0;
    }
    
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
