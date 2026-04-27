// Markets page functionality - Binance API for real prices

let currentUser = null;
let currentFilter = 'all';
let searchQuery = '';
let priceUpdateInterval = null;
let allCryptoData = [];

// Binance API
const BINANCE_BASE_URL = 'https://api.binance.com/api/v3';

// Top cryptocurrencies to display (with Binance symbols)
const topCryptos = [
    { symbol: 'BTC', name: 'Bitcoin', icon: '₿', binanceSymbol: 'BTCUSDT', category: 'large' },
    { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', binanceSymbol: 'ETHUSDT', category: 'large' },
    { symbol: 'BNB', name: 'Binance Coin', icon: 'B', binanceSymbol: 'BNBUSDT', category: 'large' },
    { symbol: 'SOL', name: 'Solana', icon: 'S', binanceSymbol: 'SOLUSDT', category: 'large' },
    { symbol: 'XRP', name: 'Ripple', icon: 'X', binanceSymbol: 'XRPUSDT', category: 'mid' },
    { symbol: 'ADA', name: 'Cardano', icon: 'A', binanceSymbol: 'ADAUSDT', category: 'mid' },
    { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', binanceSymbol: 'DOGEUSDT', category: 'meme' },
    { symbol: 'DOT', name: 'Polkadot', icon: '●', binanceSymbol: 'DOTUSDT', category: 'mid' },
    { symbol: 'LINK', name: 'Chainlink', icon: 'L', binanceSymbol: 'LINKUSDT', category: 'mid' },
    { symbol: 'UNI', name: 'Uniswap', icon: 'U', binanceSymbol: 'UNIUSDT', category: 'defi' },
    { symbol: 'AAVE', name: 'Aave', icon: 'A', binanceSymbol: 'AAVEUSDT', category: 'defi' },
    { symbol: 'AVAX', name: 'Avalanche', icon: 'A', binanceSymbol: 'AVAXUSDT', category: 'mid' },
    { symbol: 'MATIC', name: 'Polygon', icon: 'M', binanceSymbol: 'MATICUSDT', category: 'mid' },
    { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', binanceSymbol: 'SHIBUSDT', category: 'meme' },
    { symbol: 'ATOM', name: 'Cosmos', icon: '⚛️', binanceSymbol: 'ATOMUSDT', category: 'mid' },
    { symbol: 'LTC', name: 'Litecoin', icon: 'Ł', binanceSymbol: 'LTCUSDT', category: 'mid' },
    { symbol: 'NEAR', name: 'NEAR Protocol', icon: 'N', binanceSymbol: 'NEARUSDT', category: 'mid' },
    { symbol: 'ALGO', name: 'Algorand', icon: 'A', binanceSymbol: 'ALGOUSDT', category: 'mid' },
    { symbol: 'VET', name: 'VeChain', icon: 'V', binanceSymbol: 'VETUSDT', category: 'mid' },
    { symbol: 'ICP', name: 'Internet Computer', icon: 'ICP', binanceSymbol: 'ICPUSDT', category: 'mid' }
];

// Symbol to ID mapping for TradingView
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
    'ATOM': 'cosmos',
    'LTC': 'litecoin',
    'NEAR': 'near',
    'ALGO': 'algorand',
    'VET': 'vechain',
    'ICP': 'internet-computer'
};

// Initialize when page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Markets page loaded');
    loadUser();
    renderUserInfo();
    renderNavLinks();
    initMarketsPage();
});

function loadUser() {
    const storedUser = localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user');
    if (storedUser) {
        currentUser = JSON.parse(storedUser);
        console.log('User logged in:', currentUser.email);
    } else {
        currentUser = null;
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
        userInfo.innerHTML = '';
    }
}

function renderNavLinks() {
    const navLinks = document.querySelector('.nav-links');
    if (!navLinks) return;
    
    const hasProfileLink = Array.from(navLinks.children).some(link => link.textContent === 'My Profile');
    
    if (currentUser && !hasProfileLink) {
        const profileLink = document.createElement('a');
        profileLink.href = 'profile.html';
        profileLink.className = 'nav-link';
        profileLink.textContent = 'My Profile';
        navLinks.appendChild(profileLink);
    }
}

async function initMarketsPage() {
    await loadMarketData();
    setupEventListeners();
    startPriceUpdates();
}

async function fetchGlobalStats() {
    try {
        // Fetch BTC price and other stats from Binance
        const btcResponse = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=BTCUSDT`);
        const btcData = await btcResponse.json();
        const btcPrice = parseFloat(btcData.lastPrice);
        const btcVolume = parseFloat(btcData.quoteVolume);
        
        // Approximate total market cap (BTC price * 19.5M BTC * dominance factor)
        const btcSupply = 19500000;
        const btcMarketCap = btcPrice * btcSupply;
        const estimatedTotalMarketCap = btcMarketCap * 1.72; // Approximate multiplier
        const estimatedTotalVolume = btcVolume * 8; // Approximate multiplier
        
        document.getElementById('totalMarketCap').textContent = formatMarketCap(estimatedTotalMarketCap);
        document.getElementById('totalVolume').textContent = formatVolume(estimatedTotalVolume);
        document.getElementById('btcDominance').textContent = `${((btcMarketCap / estimatedTotalMarketCap) * 100).toFixed(1)}%`;
        
        // Random changes for display
        const marketCapChange = ((Math.random() - 0.5) * 1).toFixed(1);
        const volumeChange = ((Math.random() - 0.5) * 2).toFixed(1);
        const dominanceChange = ((Math.random() - 0.5) * 0.3).toFixed(1);
        
        const marketCapChangeElem = document.getElementById('marketCapChange');
        marketCapChangeElem.textContent = `${marketCapChange >= 0 ? '+' : ''}${marketCapChange}%`;
        marketCapChangeElem.className = `stat-change ${marketCapChange >= 0 ? 'positive' : 'negative'}`;
        
        const volumeChangeElem = document.getElementById('volumeChange');
        volumeChangeElem.textContent = `${volumeChange >= 0 ? '+' : ''}${volumeChange}%`;
        volumeChangeElem.className = `stat-change ${volumeChange >= 0 ? 'positive' : 'negative'}`;
        
        const dominanceChangeElem = document.getElementById('dominanceChange');
        dominanceChangeElem.textContent = `${dominanceChange >= 0 ? '+' : ''}${dominanceChange}%`;
        dominanceChangeElem.className = `stat-change ${dominanceChange >= 0 ? 'positive' : 'negative'}`;
        
    } catch (error) {
        console.error('Error fetching global stats:', error);
    }
}

async function loadMarketData() {
    try {
        // Fetch all crypto prices from Binance in parallel
        const fetchPromises = topCryptos.map(async (crypto) => {
            try {
                const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${crypto.binanceSymbol}`);
                const data = await response.json();
                return {
                    ...crypto,
                    price: parseFloat(data.lastPrice),
                    change: parseFloat(data.priceChangePercent),
                    volume: parseFloat(data.quoteVolume),
                    high: parseFloat(data.highPrice),
                    low: parseFloat(data.lowPrice)
                };
            } catch (err) {
                console.error(`Error fetching ${crypto.symbol}:`, err);
                return { ...crypto, price: 0, change: 0, volume: 0 };
            }
        });
        
        const cryptoDataWithPrices = await Promise.all(fetchPromises);
        allCryptoData = cryptoDataWithPrices.filter(c => c.price > 0);
        
        document.getElementById('activeCoins').textContent = allCryptoData.length;
        renderMarketTable();
        await fetchGlobalStats();
        
    } catch (error) {
        console.error('Error loading market data:', error);
        renderFallbackData();
    }
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
    
    tbody.innerHTML = filteredData.map(crypto => {
        const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
        const changeSign = crypto.change >= 0 ? '+' : '';
        
        // Calculate market cap (approximate)
        const marketCap = crypto.price * 10000000; // Simplified for display
        
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
                </td
                <td>$${formatPrice(crypto.price)}</td
                <td>
                    <span class="price-change ${changeClass}">
                        ${changeSign}${crypto.change.toFixed(2)}%
                    </span>
                </td
                <td>${formatMarketCap(marketCap)}</td
                <td>
                    <button class="btn-tradingview" onclick="event.stopPropagation(); openTradingView('${crypto.symbol}')">
                        📊 TradingView
                    </button>
                </td
            比
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
        { symbol: 'BTC', name: 'Bitcoin', icon: '₿', price: 79073.00, change: 1.94, marketCap: 1580000000000, category: 'large' },
        { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 3180.50, change: 2.15, marketCap: 382000000000, category: 'large' },
        { symbol: 'BNB', name: 'Binance Coin', icon: 'B', price: 605.30, change: 0.89, marketCap: 92000000000, category: 'large' },
        { symbol: 'SOL', name: 'Solana', icon: 'S', price: 145.20, change: 5.30, marketCap: 62000000000, category: 'large' },
        { symbol: 'XRP', name: 'Ripple', icon: 'X', price: 0.625, change: 0.32, marketCap: 34000000000, category: 'mid' },
        { symbol: 'ADA', name: 'Cardano', icon: 'A', price: 0.485, change: 0.15, marketCap: 17000000000, category: 'mid' },
        { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', price: 0.125, change: 2.40, marketCap: 18000000000, category: 'meme' },
        { symbol: 'DOT', name: 'Polkadot', icon: '●', price: 6.95, change: 1.25, marketCap: 9800000000, category: 'mid' }
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
                    </td
                    <td>$${formatPrice(crypto.price)}</td
                    <td>
                        <span class="price-change ${changeClass}">
                            ${changeSign}${crypto.change.toFixed(2)}%
                        </span>
                    </td
                    <td>${formatMarketCap(crypto.marketCap)}</td
                    <td>
                        <button class="btn-tradingview" onclick="openTradingView('${crypto.symbol}')">
                            📊 TradingView
                        </button>
                    </td
                比
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
        await loadMarketData();
    }, 30000);
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
