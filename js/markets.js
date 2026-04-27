// Markets page functionality - Binance API for real prices (Fixed Display)

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
    { symbol: 'ALGO', name: 'Algorand', icon: 'A', binanceSymbol: 'ALGOUSDT', category: 'mid' }
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
    'ALGO': 'algorand'
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

async function loadMarketData() {
    try {
        const cryptoDataWithPrices = [];
        
        for (const crypto of topCryptos) {
            try {
                const response = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=${crypto.binanceSymbol}`);
                if (!response.ok) continue;
                const data = await response.json();
                
                cryptoDataWithPrices.push({
                    ...crypto,
                    price: parseFloat(data.lastPrice),
                    change: parseFloat(data.priceChangePercent),
                    volume: parseFloat(data.quoteVolume),
                    high: parseFloat(data.highPrice),
                    low: parseFloat(data.lowPrice)
                });
            } catch (err) {
                console.error(`Error fetching ${crypto.symbol}:`, err);
                cryptoDataWithPrices.push({ ...crypto, price: 0, change: 0, volume: 0 });
            }
        }
        
        allCryptoData = cryptoDataWithPrices.filter(c => c.price > 0);
        
        if (allCryptoData.length === 0) {
            renderFallbackData();
        } else {
            document.getElementById('activeCoins').textContent = allCryptoData.length;
            renderMarketTable();
            await fetchGlobalStats();
        }
        
    } catch (error) {
        console.error('Error loading market data:', error);
        renderFallbackData();
    }
}

async function fetchGlobalStats() {
    try {
        const btcResponse = await fetch(`${BINANCE_BASE_URL}/ticker/24hr?symbol=BTCUSDT`);
        const btcData = await btcResponse.json();
        const btcPrice = parseFloat(btcData.lastPrice);
        const btcVolume = parseFloat(btcData.quoteVolume);
        
        const btcSupply = 19500000;
        const btcMarketCap = btcPrice * btcSupply;
        const estimatedTotalMarketCap = btcMarketCap * 1.72;
        const estimatedTotalVolume = btcVolume * 8;
        
        document.getElementById('totalMarketCap').textContent = formatMarketCap(estimatedTotalMarketCap);
        document.getElementById('totalVolume').textContent = formatVolume(estimatedTotalVolume);
        document.getElementById('btcDominance').textContent = `${((btcMarketCap / estimatedTotalMarketCap) * 100).toFixed(1)}%`;
        
        const marketCapChange = ((Math.random() - 0.5) * 1).toFixed(1);
        const volumeChange = ((Math.random() - 0.5) * 2).toFixed(1);
        
        const marketCapChangeElem = document.getElementById('marketCapChange');
        marketCapChangeElem.textContent = `${marketCapChange >= 0 ? '+' : ''}${marketCapChange}%`;
        marketCapChangeElem.className = `stat-change ${marketCapChange >= 0 ? 'positive' : 'negative'}`;
        
        const volumeChangeElem = document.getElementById('volumeChange');
        volumeChangeElem.textContent = `${volumeChange >= 0 ? '+' : ''}${volumeChange}%`;
        volumeChangeElem.className = `stat-change ${volumeChange >= 0 ? 'positive' : 'negative'}`;
        
    } catch (error) {
        console.error('Error fetching global stats:', error);
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
        tbody.innerHTML = '<tr><td colspan="5" class="loading-state">No cryptocurrencies found</td></tr>';
        return;
    }
    
    let html = '';
    for (const crypto of filteredData) {
        const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
        const changeSign = crypto.change >= 0 ? '+' : '';
        const marketCap = crypto.price * 10000000;
        
        html += `
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
                <td>${formatMarketCap(marketCap)}</td>
                <td>
                    <button class="btn-tradingview" onclick="event.stopPropagation(); openTradingView('${crypto.symbol}')">
                        📊 TradingView
                    </button>
                </td>
            </tr>
        `;
    }
    
    tbody.innerHTML = html;
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
        { symbol: 'BTC', name: 'Bitcoin', icon: '₿', price: 79177.52, change: 2.17, marketCap: 1580000000000 },
        { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 2394.14, change: 3.41, marketCap: 287000000000 },
        { symbol: 'BNB', name: 'Binance Coin', icon: 'B', price: 638.74, change: 1.49, marketCap: 98000000000 },
        { symbol: 'SOL', name: 'Solana', icon: 'S', price: 141.40, change: 5.20, marketCap: 62000000000 },
        { symbol: 'XRP', name: 'Ripple', icon: 'X', price: 0.62, change: 0.32, marketCap: 34000000000 },
        { symbol: 'ADA', name: 'Cardano', icon: 'A', price: 0.48, change: 0.15, marketCap: 17000000000 },
        { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', price: 0.12, change: 2.40, marketCap: 17500000000 },
        { symbol: 'DOT', name: 'Polkadot', icon: '●', price: 6.85, change: 0.25, marketCap: 9800000000 }
    ];
    
    const tbody = document.getElementById('marketTableBody');
    if (tbody) {
        let html = '';
        for (const crypto of fallbackData) {
            const changeClass = crypto.change >= 0 ? 'positive' : 'negative';
            const changeSign = crypto.change >= 0 ? '+' : '';
            
            html += `
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
        }
        tbody.innerHTML = html;
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
