// Markets Page Controller - PocketTrading
// File: js/markets.js
// Pure Supabase - No localStorage

class MarketsManager {
    constructor() {
        this.currentUser = null;
        this.allMarkets = [];
        this.filteredMarkets = [];
        this.currentCategory = 'all';
        this.searchTerm = '';
        this.priceUpdateInterval = null;
        this.init();
    }

    async init() {
        await this.waitForDependencies();
        
        this.currentUser = auth.getUser();
        console.log('Markets page - Current user:', this.currentUser);
        
        this.updateNavbar();
        await this.loadMarkets();
        this.setupEventListeners();
        this.startPriceUpdates();
        this.updateMarketStats();
        
        window.addEventListener('authStateChanged', (e) => {
            this.currentUser = e.detail.user;
            this.updateNavbar();
        });
    }

    async waitForDependencies() {
        return new Promise((resolve) => {
            const check = setInterval(() => {
                if (typeof auth !== 'undefined' && typeof supabaseDB !== 'undefined') {
                    clearInterval(check);
                    resolve();
                }
            }, 100);
            setTimeout(() => {
                clearInterval(check);
                resolve();
            }, 5000);
        });
    }

    updateNavbar() {
        const navLinks = document.getElementById('navLinks');
        const rightNav = document.getElementById('rightNav');
        const mobileMenu = document.getElementById('mobileMenu');
        
        if (!navLinks) return;
        
        if (this.currentUser) {
            const isAdmin = this.currentUser.email === 'ephremgojo@gmail.com';
            const userName = this.currentUser.name || this.currentUser.email.split('@')[0];
            
            navLinks.innerHTML = `
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link active">Markets</a>
                <a href="trades.html" class="nav-link">Trades</a>
                <a href="profile.html" class="nav-link">My Profile</a>
            `;
            
            rightNav.innerHTML = `
                <div class="user-section">
                    <div class="user-info">
                        <div class="user-avatar">${userName.charAt(0).toUpperCase()}</div>
                        <div class="user-name">${userName}${isAdmin ? '<span class="admin-badge">Admin</span>' : ''}</div>
                    </div>
                    ${isAdmin ? '<a href="admin.html" class="admin-link">⚙️ Admin Panel</a>' : ''}
                    <button class="logout-btn" onclick="logout()">Logout</button>
                </div>
            `;
            
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">🏠 Home</a>
                <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
                <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
                <a href="profile.html" class="mobile-nav-link">👤 My Profile</a>
                ${isAdmin ? '<a href="admin.html" class="mobile-nav-link">⚙️ Admin Panel</a>' : ''}
                <button class="logout-btn" style="margin-top:12px;" onclick="logout()">Logout</button>
            `;
        } else {
            navLinks.innerHTML = `
                <a href="index.html" class="nav-link">Home</a>
                <a href="markets.html" class="nav-link active">Markets</a>
                <a href="trades.html" class="nav-link">Trades</a>
            `;
            
            rightNav.innerHTML = `
                <div class="guest-buttons">
                    <a href="login.html" class="btn-login">Login</a>
                    <a href="login.html" class="btn-register">Register</a>
                </div>
            `;
            
            mobileMenu.innerHTML = `
                <a href="index.html" class="mobile-nav-link">🏠 Home</a>
                <a href="markets.html" class="mobile-nav-link">📊 Markets</a>
                <a href="trades.html" class="mobile-nav-link">🔄 Trades</a>
                <a href="login.html" class="mobile-nav-link">🔐 Login</a>
                <a href="login.html" class="mobile-nav-link">📝 Register</a>
            `;
        }
    }

    // Complete cryptocurrency list with real icons/logos
    getDefaultMarkets() {
        return [
            { symbol: 'BTC', name: 'Bitcoin', icon: '₿', price: 78312.00, change_24h: 2.34, volume: '32.5B', category: 'large', rank: 1 },
            { symbol: 'ETH', name: 'Ethereum', icon: 'Ξ', price: 2297.32, change_24h: 1.29, volume: '18.2B', category: 'large', rank: 2 },
            { symbol: 'BNB', name: 'Binance Coin', icon: 'B', price: 615.81, change_24h: 0.21, volume: '2.1B', category: 'large', rank: 3 },
            { symbol: 'SOL', name: 'Solana', icon: '◎', price: 168.42, change_24h: 5.23, volume: '4.8B', category: 'large', rank: 4 },
            { symbol: 'XRP', name: 'Ripple', icon: 'X', price: 0.624, change_24h: -0.45, volume: '1.2B', category: 'large', rank: 5 },
            { symbol: 'ADA', name: 'Cardano', icon: 'A', price: 0.483, change_24h: -1.23, volume: '456M', category: 'mid', rank: 6 },
            { symbol: 'DOGE', name: 'Dogecoin', icon: 'Ð', price: 0.162, change_24h: 8.91, volume: '892M', category: 'meme', rank: 7 },
            { symbol: 'AVAX', name: 'Avalanche', icon: 'A', price: 42.15, change_24h: 3.45, volume: '678M', category: 'mid', rank: 8 },
            { symbol: 'MATIC', name: 'Polygon', icon: 'M', price: 0.89, change_24h: -2.11, volume: '345M', category: 'mid', rank: 9 },
            { symbol: 'SHIB', name: 'Shiba Inu', icon: '🐕', price: 0.000023, change_24h: 4.56, volume: '234M', category: 'meme', rank: 10 },
            { symbol: 'UNI', name: 'Uniswap', icon: 'U', price: 11.23, change_24h: -0.89, volume: '167M', category: 'defi', rank: 11 },
            { symbol: 'LINK', name: 'Chainlink', icon: 'L', price: 18.34, change_24h: 1.56, volume: '234M', category: 'defi', rank: 12 },
            { symbol: 'ATOM', name: 'Cosmos', icon: '⨀', price: 9.87, change_24h: 2.34, volume: '123M', category: 'defi', rank: 13 },
            { symbol: 'ALGO', name: 'Algorand', icon: 'A', price: 0.18, change_24h: -0.89, volume: '78M', category: 'mid', rank: 14 },
            { symbol: 'VET', name: 'VeChain', icon: 'V', price: 0.032, change_24h: 1.23, volume: '56M', category: 'mid', rank: 15 },
            { symbol: 'EGLD', name: 'MultiversX', icon: 'E', price: 42.50, change_24h: 3.21, volume: '45M', category: 'mid', rank: 16 },
            { symbol: 'FLOW', name: 'Flow', icon: 'F', price: 0.75, change_24h: -1.45, volume: '34M', category: 'mid', rank: 17 },
            { symbol: 'THETA', name: 'Theta', icon: 'Θ', price: 1.23, change_24h: 0.56, volume: '28M', category: 'mid', rank: 18 },
            { symbol: 'SAND', name: 'The Sandbox', icon: '⛱️', price: 0.45, change_24h: 2.34, volume: '67M', category: 'defi', rank: 19 },
            { symbol: 'GALA', name: 'Gala', icon: 'G', price: 0.024, change_24h: 3.45, volume: '89M', category: 'defi', rank: 20 }
        ];
    }

    formatPrice(price) {
        if (!price && price !== 0) return '0.00';
        if (price < 0.01 && price > 0) return price.toFixed(6);
        if (price < 1) return price.toFixed(4);
        return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    renderMarkets() {
        let filtered = this.allMarkets.filter(m => this.currentCategory === 'all' || m.category === this.currentCategory);
        if (this.searchTerm) {
            filtered = filtered.filter(m => 
                m.name.toLowerCase().includes(this.searchTerm.toLowerCase()) || 
                m.symbol.toLowerCase().includes(this.searchTerm.toLowerCase())
            );
        }
        
        const tbody = document.getElementById('marketsTableBody');
        if (!tbody) return;
        
        if (filtered.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:40px;">No markets found<\/td><\/tr>';
            return;
        }
        
        tbody.innerHTML = filtered.map(m => `
            <tr>
                <td style="width: 180px;">
                    <div class="coin-info">
                        <span class="coin-icon">${m.icon || '📈'}</span>
                        <div>
                            <div class="coin-name">${m.name}</div>
                            <div class="coin-symbol">${m.symbol}/USD</div>
                        </div>
                    </div>
                </td>
                <td style="font-weight: 600;">$${this.formatPrice(m.price)}</td>
                <td class="${m.change_24h >= 0 ? 'positive' : 'negative'}" style="font-weight: 600;">
                    ${m.change_24h >= 0 ? '▲' : '▼'} ${Math.abs(m.change_24h)}%
                </td>
                <td>${m.volume || '—'}</td>
                <td>
                    <button class="tradingview-btn" onclick="window.openTradingView('${m.symbol}')">TradingView</button>
                </td>
            </tr>
        `).join('');
    }

    updateMarketStats() {
        if (this.allMarkets.length === 0) return;
        
        const totalChange = this.allMarkets.reduce((sum, m) => sum + (m.change_24h || 0), 0) / this.allMarkets.length;
        const totalVolume = this.allMarkets.reduce((sum, m) => {
            let vol = 0;
            if (typeof m.volume === 'string') {
                if (m.volume.includes('B')) vol = parseFloat(m.volume);
                else if (m.volume.includes('M')) vol = parseFloat(m.volume) / 1000;
            } else {
                vol = m.volume || 0;
            }
            return sum + vol;
        }, 0);
        
        const btcMarket = this.allMarkets.find(m => m.symbol === 'BTC');
        const btcPrice = btcMarket ? btcMarket.price : 78312;
        
        const marketCapEl = document.getElementById('totalMarketCap');
        const volumeEl = document.getElementById('totalVolume');
        const changeEl = document.getElementById('marketCapChange');
        
        if (marketCapEl) marketCapEl.innerHTML = `$${(btcPrice * 19.5 / 1e12).toFixed(2)}T`;
        if (volumeEl) volumeEl.innerHTML = `$${totalVolume.toFixed(1)}B`;
        if (changeEl) {
            changeEl.innerHTML = `${totalChange >= 0 ? '+' : ''}${totalChange.toFixed(1)}%`;
            changeEl.className = `stat-change ${totalChange >= 0 ? 'positive' : 'negative'}`;
        }
        
        const lastUpdated = document.getElementById('lastUpdated');
        if (lastUpdated) {
            lastUpdated.innerHTML = `Last updated: ${new Date().toLocaleTimeString()}`;
        }
    }

    async loadMarkets() {
        try {
            // First try to load from Supabase
            if (typeof supabaseDB !== 'undefined' && supabaseDB.supabase) {
                const dbMarkets = await supabaseDB.getAllMarkets();
                if (dbMarkets && dbMarkets.length > 0) {
                    this.allMarkets = dbMarkets;
                } else {
                    this.allMarkets = this.getDefaultMarkets();
                }
            } else {
                this.allMarkets = this.getDefaultMarkets();
            }
            this.filteredMarkets = [...this.allMarkets];
            this.renderMarkets();
            this.updateMarketStats();
        } catch (error) {
            console.error('Error loading markets:', error);
            this.allMarkets = this.getDefaultMarkets();
            this.renderMarkets();
            this.updateMarketStats();
        }
    }

    startPriceUpdates() {
        this.priceUpdateInterval = setInterval(() => {
            if (this.allMarkets.length > 0) {
                this.allMarkets = this.allMarkets.map(m => ({
                    ...m,
                    price: m.price * (1 + (Math.random() - 0.5) * 0.002),
                    change_24h: m.change_24h + (Math.random() - 0.5) * 0.2
                }));
                this.renderMarkets();
                this.updateMarketStats();
            }
        }, 30000);
    }

    setupEventListeners() {
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentCategory = btn.dataset.category;
                this.renderMarkets();
            });
        });
        
        const searchInput = document.getElementById('marketSearch');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => {
                this.searchTerm = e.target.value;
                this.renderMarkets();
            });
        }
        
        const mobileBtn = document.getElementById('mobileMenuBtn');
        const mobileMenu = document.getElementById('mobileMenu');
        if (mobileBtn && mobileMenu) {
            mobileBtn.addEventListener('click', () => mobileMenu.classList.toggle('show'));
        }
    }

    destroy() {
        if (this.priceUpdateInterval) {
            clearInterval(this.priceUpdateInterval);
        }
    }
}

// Initialize
let marketsManager = null;

document.addEventListener('DOMContentLoaded', () => {
    marketsManager = new MarketsManager();
});

window.openTradingView = function(symbol) {
    window.location.href = `trading-view.html?symbol=${symbol}`;
};

window.logout = function() {
    if (typeof auth !== 'undefined' && auth.logout) {
        auth.logout();
    } else {
        window.location.href = 'index.html';
    }
};
