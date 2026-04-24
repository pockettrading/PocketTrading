// Markets page functionality - Complete working version

let currentUser = null;
let currentFilter = 'all';
let searchQuery = '';
let priceUpdateInterval = null;

// Cryptocurrency data
let cryptoData = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿', price: 75730.97, change: -3.0, marketCap: 1520000000000, volume: 32500000000, category: 'large' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 2357.44, change: 1.4, marketCap: 284440000000, volume: 15200000000, category: 'large' },
    { symbol: 'BNB', name: 'Binance Coin', icon: 'B', price: 305.60, change: -0.5, marketCap: 52000000000, volume: 2100000000, category: 'large' },
    { symbol: 'SOL', name: 'Solana', icon: 'S', price: 98.40, change: 5.2, marketCap: 45000000000, volume: 1800000000, category: 'large' },
    { symbol: 'XRP', name: 'Ripple', icon: 'X', price: 0.62, change: 0.3, marketCap: 34000000000, volume: 1200000000, category: 'mid' },
    { symbol: 'ADA', name: 'Cardano', icon: 'A', price: 0.48, change: -1.2, marketCap: 17000000000, volume: 800000000, category: 'mid' },
    { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', price: 0.12, change: 3.2, marketCap: 17500000000, volume: 900000000, category: 'meme' },
    { symbol: 'DOT', name: 'Polkadot', icon: '●', price: 6.85, change: -0.8, marketCap: 9800000000, volume: 500000000, category: 'mid' },
    { symbol: 'LINK', name: 'Chainlink', icon: 'L', price: 14.32, change: 2.1, marketCap: 8500000000, volume: 450000000, category: 'mid' },
    { symbol: 'UNI', name: 'Uniswap', icon: 'U', price: 7.85, change: -1.5, marketCap: 5900000000, volume: 250000000, category: 'defi' },
    { symbol: 'AAVE', name: 'Aave', icon: 'A', price: 98.50, change: 3.8, marketCap: 1450000000, volume: 150000000, category: 'defi' },
    { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', price: 0.000021, change: -2.3, marketCap: 12400000000, volume: 600000000, category: 'meme' },
    { symbol: 'AVAX', name: 'Avalanche', icon: 'A', price: 35.20, change: 4.5, marketCap: 13200000000, volume: 550000000, category: 'mid' },
    { symbol: 'MATIC', name: 'Polygon', icon: 'M', price: 0.72, change: 1.2, marketCap: 7200000000, volume: 350000000, category: 'mid' },
    { symbol: 'PEPE', name: 'Pepe', icon: '🐸', price: 0.000012, change: 8.5, marketCap: 5100000000, volume: 420000000, category: 'meme' }
];

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Markets page loaded');
    loadUser();
    updateUserDisplay();
    loadMarketStats();
    loadMarketTable();
    setupEventListeners();
    startPriceUpdates();
});

function loadUser() {
    try {
        const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
        if (storedUser) {
            currentUser = JSON.parse(storedUser);
            console.log('User logged in:', currentUser.email);
        } else {
            currentUser = null;
        }
    } catch(e) {
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
            if (authButtonSpan) {
                authButtonSpan.innerHTML = '<span class="logout-link" onclick="handleLogout()">Logout</span>';
            }
        } else {
            userNameSpan.textContent = 'Guest';
            if (authButtonSpan) {
                authButtonSpan.innerHTML = '<a href="register.html" class="auth-link">Sign Up</a>';
            }
        }
    }
}

function loadMarketStats() {
    const totalMarketCap = cryptoData.reduce((sum, crypto) => sum + crypto.marketCap, 0);
    const totalVolume = cryptoData.reduce((sum, crypto) => sum + crypto.volume, 0);
    const btcMarketCap = cryptoData.find(c => c.symbol === 'BTC')?.marketCap || 0;
    const btcDominance = (btcMarketCap / totalMarketCap * 100).toFixed(1);
    
    document.getElementById('totalMarketCap').textContent = formatMarketCap(totalMarketCap);
    document.getElementById('totalVolume').textContent = formatVolume(totalVolume);
    document.getElementById('btcDominance').textContent = `${btcDominance}%`;
    document.getElementById('activeCoins').textContent = cryptoData.length;
}

function loadMarketTable() {
    const tbody = document.getElementById('marketTableBody');
    if (!tbody) return;
    
    let filteredData = [...cryptoData];
    
    if (currentFilter !== 'all') {
        filteredData = filteredData.filter(crypto => crypto.category === currentFilter);
    }
    
    if (searchQuery) {
        const query = searchQuery.toLowerCase();
        filteredData = filteredData.filter(crypto => 
            crypto.name.toLowerCase().includes(query) || 
            crypto.symbol.toLowerCase().includes(query)
        );
    }
    
    if (filteredData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="loading-state">No cryptocurrencies found</td></tr>';
        return;
    }
    
    tbody.innerHTML = filteredData.map(crypto => {
        const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
        const changeSign = crypto.change >= 0 ? '+' : '';
        
        return `
            <tr onclick="goToTrade('${crypto.symbol}')">
                <td>
                    <div class="crypto-info">
                        <div class="crypto-icon">${crypto.icon}</div>
                        <div>
                            <div class="crypto-name">${crypto.name}</div>
                            <div class="crypto-symbol">${crypto.symbol}</div>
                        </div>
                    </div>
                </td>
                <td>$${formatPrice(crypto.price, crypto.symbol)}</td>
                <td><span class="price-change ${changeClass}">${changeSign}${crypto.change.toFixed(2)}%</span></td>
                <td>${formatMarketCap(crypto.marketCap)}</td>
                <td><button class="btn-details" onclick="event.stopPropagation(); goToTrade('${crypto.symbol}')">Trade ${crypto.symbol}</button></td>
            </tr>
        `;
    }).join('');
}

function formatPrice(price, symbol) {
    if (symbol === 'SHIB' || symbol === 'PEPE') return price.toFixed(8);
    if (price < 1) return price.toFixed(4);
    return price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toFixed(0)}`;
}

function formatVolume(volume) {
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toFixed(0)}`;
}

function setupEventListeners() {
    document.querySelectorAll('.filter-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            loadMarketTable();
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchQuery = this.value;
            loadMarketTable();
        });
    }
}

function startPriceUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    
    priceUpdateInterval = setInterval(function() {
        cryptoData = cryptoData.map(crypto => {
            const volatility = (crypto.symbol === 'SHIB' || crypto.symbol === 'PEPE') ? 0.03 : 0.005;
            const change = (Math.random() - 0.5) * 100 * volatility;
            const newPrice = Math.max(0.000001, crypto.price * (1 + change / 100));
            const percentChange = ((newPrice - crypto.price) / crypto.price) * 100;
            const newMarketCap = crypto.marketCap * (newPrice / crypto.price);
            
            return { ...crypto, price: newPrice, change: percentChange, marketCap: newMarketCap };
        });
        
        loadMarketStats();
        loadMarketTable();
    }, 10000);
}

function goToTrade(symbol) {
    window.location.href = `trade.html?crypto=${symbol}`;
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.goToTrade = goToTrade;
window.handleLogout = handleLogout;
