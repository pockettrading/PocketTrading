// Markets page functionality - Luno Style with Working TradingView Button

let currentUser = null;
let currentFilter = 'all';
let searchQuery = '';
let priceUpdateInterval = null;
let allCryptoData = [];

// CoinGecko API
const COINGECKO_BASE_URL = 'https://api.coingecko.com/api/v3';

// Symbol mapping for TradingView
const symbolToIdMap = {
    'BTC': 'bitcoin',
    'ETH': 'ethereum',
    'BNB': 'binancecoin',
    'SOL': 'solana',
    'XRP': 'ripple',
    'ADA': 'cardano',
    'DOGE': 'dogecoin',
    'DOT': 'polkadot',
    'LINK': 'chainlink',
    'UNI': 'uniswap',
    'AAVE': 'aave',
    'SHIB': 'shiba-inu',
    'AVAX': 'avalanche-2',
    'MATIC': 'matic-network',
    'PEPE': 'pepe',
    'USDC': 'usd-coin',
    'TRX': 'tron',
    'WBTC': 'wrapped-bitcoin',
    'USDT': 'tether'
};

// Icon mapping
const iconMap = {
    'BTC': '₿',
    'ETH': 'Ξ',
    'BNB': 'B',
    'SOL': 'S',
    'XRP': 'X',
    'ADA': 'A',
    'DOGE': 'Ð',
    'DOT': '●',
    'LINK': 'L',
    'UNI': 'U',
    'AAVE': 'A',
    'SHIB': '🐕',
    'AVAX': 'A',
    'MATIC': 'M',
    'PEPE': '🐸',
    'USDC': '💵',
    'TRX': 'T',
    'WBTC': '₿',
    'USDT': '₮'
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Markets page loaded');
    loadUser();
    renderUserSection();
    initMarketsPage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User loaded:', currentUser.email);
    } else {
        currentUser = null;
    }
}

function renderUserSection() {
    const userSection = document.getElementById('userSection');
    if (!userSection) return;
    
    if (currentUser) {
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
        userSection.innerHTML = `
            <div class="auth-buttons">
                <a href="login.html" class="login-btn">Login</a>
                <a href="register.html" class="signup-btn">Sign Up</a>
            </div>
        `;
    }
}

async function initMarketsPage() {
    await loadMarketStats();
    await loadMarketData();
    setupEventListeners();
    startPriceUpdates();
}

async function loadMarketStats() {
    try {
        const response = await fetch(`${COINGECKO_BASE_URL}/global`);
        const data = await response.json();
        
        if (data && data.data) {
            const totalMarketCap = data.data.total_market_cap?.usd || 0;
            const totalVolume = data.data.total_volume?.usd || 0;
            const btcDominance = data.data.market_cap_percentage?.btc || 0;
            
            document.getElementById('totalMarketCap').textContent = formatMarketCap(totalMarketCap);
            document.getElementById('totalVolume').textContent = formatVolume(totalVolume);
            document.getElementById('btcDominance').textContent = `${btcDominance.toFixed(1)}%`;
            
            // Simulate changes
            const marketCapChange = ((Math.random() - 0.5) * 2).toFixed(1);
            const volumeChange = ((Math.random() - 0.5) * 3).toFixed(1);
            const dominanceChange = ((Math.random() - 0.5) * 0.5).toFixed(1);
            
            const marketCapChangeElem = document.getElementById('marketCapChange');
            marketCapChangeElem.textContent = `${marketCapChange >= 0 ? '+' : ''}${marketCapChange}%`;
            marketCapChangeElem.className = `stat-change ${marketCapChange >= 0 ? 'positive' : 'negative'}`;
            
            const volumeChangeElem = document.getElementById('volumeChange');
            volumeChangeElem.textContent = `${volumeChange >= 0 ? '+' : ''}${volumeChange}%`;
            volumeChangeElem.className = `stat-change ${volumeChange >= 0 ? 'positive' : 'negative'}`;
            
            const dominanceChangeElem = document.getElementById('dominanceChange');
            dominanceChangeElem.textContent = `${dominanceChange >= 0 ? '+' : ''}${dominanceChange}%`;
            dominanceChangeElem.className = `stat-change ${dominanceChange >= 0 ? 'positive' : 'negative'}`;
        }
    } catch (error) {
        console.error('Error loading market stats:', error);
    }
}

async function loadMarketData() {
    try {
        const response = await fetch(`${COINGECKO_BASE_URL}/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`);
        const data = await response.json();
        
        if (data && data.length > 0) {
            allCryptoData = data.map(coin => ({
                id: coin.id,
                symbol: coin.symbol.toUpperCase(),
                name: coin.name,
                image: coin.image,
                current_price: coin.current_price,
                price_change_percentage_24h: coin.price_change_percentage_24h || 0,
                market_cap: coin.market_cap,
                total_volume: coin.total_volume,
                category: getCategoryByMarketCap(coin.market_cap)
            }));
            
            document.getElementById('activeCoins').textContent = allCryptoData.length;
            renderMarketTable();
        }
    } catch (error) {
        console.error('Error loading market data:', error);
        renderFallbackData();
    }
}

function getCategoryByMarketCap(marketCap) {
    if (marketCap >= 10000000000) return 'large';
    if (marketCap >= 1000000000) return 'mid';
    return 'small';
}

function renderMarketTable() {
    const tbody = document.getElementById('marketTableBody');
    if (!tbody) return;
    
    let filteredData = [...allCryptoData];
    
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
        tbody.innerHTML = '<tr><td colspan="5" class="loading-state">No cryptocurrencies found</td--</tr>';
        return;
    }
    
    tbody.innerHTML = filteredData.slice(0, 50).map(crypto => {
        const changeClass = crypto.price_change_percentage_24h >= 0 ? 'positive' : 'negative';
        const changeSign = crypto.price_change_percentage_24h >= 0 ? '+' : '';
        const icon = iconMap[crypto.symbol] || '📈';
        
        return `
            <tr>
                <td>
                    <div class="crypto-info">
                        <div class="crypto-icon">${icon}</div>
                        <div>
                            <div class="crypto-name">${crypto.name}</div>
                            <div class="crypto-symbol">${crypto.symbol}</div>
                        </div>
                    </div>
                </td>
                <td>$${formatPrice(crypto.current_price)}</td>
                <td>
                    <span class="price-change ${changeClass}">
                        ${changeSign}${crypto.price_change_percentage_24h?.toFixed(2) || '0'}%
                    </span>
                </td>
                <td>${formatMarketCap(crypto.market_cap)}</td>
                <td>
                    <button class="btn-tradingview" onclick="openTradingView('${crypto.symbol}')">
                        📊 TradingView
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function formatPrice(price) {
    if (!price) return '0.00';
    if (price < 0.01) return price.toFixed(6);
    if (price < 1) return price.toFixed(4);
    return price.toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2});
}

function formatMarketCap(marketCap) {
    if (!marketCap) return '$0';
    if (marketCap >= 1e12) return `$${(marketCap / 1e12).toFixed(2)}T`;
    if (marketCap >= 1e9) return `$${(marketCap / 1e9).toFixed(2)}B`;
    if (marketCap >= 1e6) return `$${(marketCap / 1e6).toFixed(2)}M`;
    return `$${marketCap.toFixed(0)}`;
}

function formatVolume(volume) {
    if (volume >= 1e12) return `$${(volume / 1e12).toFixed(2)}T`;
    if (volume >= 1e9) return `$${(volume / 1e9).toFixed(2)}B`;
    if (volume >= 1e6) return `$${(volume / 1e6).toFixed(2)}M`;
    return `$${volume.toFixed(0)}`;
}

function renderFallbackData() {
    const fallbackData = [
        { symbol: 'BTC', name: 'Bitcoin', icon: '₿', price: 78200.00, change: 0.80, marketCap: 1570000000000 },
        { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 2368.71, change: 2.25, marketCap: 285620000000 },
        { symbol: 'USDT', name: 'Tether', icon: '₮', price: 1.00, change: 0.01, marketCap: 112000000000 },
        { symbol: 'XRP', name: 'XRP', icon: 'X', price: 0.6153, change: 0.03, marketCap: 33740000000 },
        { symbol: 'BNB', name: 'BNB', icon: 'B', price: 580.20, change: 0.89, marketCap: 89000000000 },
        { symbol: 'USDC', name: 'USDC', icon: '💵', price: 1.00, change: 0.00, marketCap: 32000000000 },
        { symbol: 'SOL', name: 'Solana', icon: 'S', price: 141.40, change: 43.70, marketCap: 44690000000 },
        { symbol: 'TRX', name: 'TRON', icon: 'T', price: 0.12, change: 1.20, marketCap: 10500000000 },
        { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', price: 0.1198, change: 0.24, marketCap: 17470000000 },
        { symbol: 'ADA', name: 'Cardano', icon: 'A', price: 0.4815, change: 0.15, marketCap: 17050000000 }
    ];
    
    const tbody = document.getElementById('marketTableBody');
    if (tbody) {
        tbody.innerHTML = fallbackData.map(crypto => {
            const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
            const changeSign = crypto.change >= 0 ? '+' : '';
            
            return `
                <tr>
                    <td>
                        <div class="crypto-info">
                            <div class="crypto-icon">${crypto.icon}</div>
                            <div>
                                <div class="crypto-name">${crypto.name}</div>
                                <div class="crypto-symbol">${crypto.symbol}</div>
                            </div>
                        </div>
                    </td>
                    <td>$${formatPrice(crypto.price)}</td>
                    <td>
                        <span class="price-change ${changeClass}">
                            ${changeSign}${crypto.change.toFixed(2)}%
                        </span>
                    </td>
                    <td>${formatMarketCap(crypto.marketCap)}</td>
                    <td>
                        <button class="btn-tradingview" onclick="openTradingView('${crypto.symbol}')">
                            📊 TradingView
                        </button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

function setupEventListeners() {
    const filterTabs = document.querySelectorAll('.filter-tab');
    filterTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            filterTabs.forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            currentFilter = this.dataset.filter;
            renderMarketTable();
        });
    });
    
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchQuery = this.value;
            renderMarketTable();
        });
    }
}

function startPriceUpdates() {
    if (priceUpdateInterval) clearInterval(priceUpdateInterval);
    
    priceUpdateInterval = setInterval(async () => {
        await loadMarketStats();
        await loadMarketData();
    }, 60000);
}

function openTradingView(symbol) {
    console.log('Opening TradingView for symbol:', symbol);
    const coinId = symbolToIdMap[symbol];
    
    if (coinId) {
        window.location.href = `trading-view.html?symbol=${coinId}`;
    } else {
        window.location.href = `trading-view.html?symbol=${symbol.toLowerCase()}`;
    }
}

function handleLogout() {
    localStorage.removeItem('pocket_user');
    sessionStorage.removeItem('pocket_user');
    window.location.href = 'home.html';
}

// Make functions global
window.openTradingView = openTradingView;
window.handleLogout = handleLogout;
