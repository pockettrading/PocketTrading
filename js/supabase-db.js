// Supabase Database Wrapper for PocketTrading
// File: js/supabase-db.js

// Supabase configuration
// IMPORTANT: Replace these with your actual Supabase credentials
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';

class SupabaseDB {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.init();
    }

    async init() {
        // Check if Supabase is available
        if (typeof supabase !== 'undefined') {
            this.supabase = supabase;
            this.isConnected = true;
            console.log('Supabase connected');
        } else {
            console.warn('Supabase client not loaded, using localStorage fallback');
            this.isConnected = false;
        }
    }

    // Get all users
    async getAllUsers() {
        if (this.isConnected && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('custom_users')
                    .select('*');
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        // Fallback to localStorage
        return this.getLocalUsers();
    }

    // Get user by email
    async getUserByEmail(email) {
        if (this.isConnected && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('custom_users')
                    .select('*')
                    .eq('email', email)
                    .single();
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        // Fallback to localStorage
        return this.getLocalUserByEmail(email);
    }

    // Get user trades
    async getUserTrades(userId) {
        if (this.isConnected && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('trades')
                    .select('*')
                    .eq('user_id', userId);
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        // Fallback to localStorage
        return this.getLocalTrades(userId);
    }

    // Get all trades
    async getAllTrades() {
        if (this.isConnected && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('trades')
                    .select('*');
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        return this.getLocalAllTrades();
    }

    // Get all from table
    async getAll(tableName) {
        if (this.isConnected && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from(tableName)
                    .select('*');
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        return this.getLocalData(tableName);
    }

    // Insert data
    async insert(tableName, data) {
        if (this.isConnected && this.supabase) {
            try {
                const { error } = await this.supabase
                    .from(tableName)
                    .insert(data);
                if (!error) return true;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        // Fallback to localStorage
        return this.insertLocal(tableName, data);
    }

    // Update data
    async update(tableName, id, updates) {
        if (this.isConnected && this.supabase) {
            try {
                const { error } = await this.supabase
                    .from(tableName)
                    .update(updates)
                    .eq('id', id);
                if (!error) return true;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        return this.updateLocal(tableName, id, updates);
    }

    // Delete data
    async delete(tableName, id) {
        if (this.isConnected && this.supabase) {
            try {
                const { error } = await this.supabase
                    .from(tableName)
                    .delete()
                    .eq('id', id);
                if (!error) return true;
            } catch (e) {
                console.warn('Supabase error, using localStorage');
            }
        }
        return this.deleteLocal(tableName, id);
    }

    // Update user balance
    async updateUserBalance(userId, newBalance) {
        if (this.isConnected && this.supabase) {
            try {
                const { error } = await this.supabase
                    .from('custom_users')
                    .update({ balance: newBalance })
                    .eq('id', userId);
                if (!error) return true;
            } catch (e) {
                console.warn('Supabase error');
            }
        }
        return this.updateLocalBalance(userId, newBalance);
    }

    // Update user KYC status
    async updateUserKYCStatus(userId, status) {
        if (this.isConnected && this.supabase) {
            try {
                const { error } = await this.supabase
                    .from('custom_users')
                    .update({ kyc_status: status })
                    .eq('id', userId);
                if (!error) return true;
            } catch (e) {
                console.warn('Supabase error');
            }
        }
        return this.updateLocalKYC(userId, status);
    }

    // Get user watchlist
    async getUserWatchlist(userId) {
        if (this.isConnected && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('watchlist')
                    .select('*')
                    .eq('user_id', userId);
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase error');
            }
        }
        return this.getLocalWatchlist(userId);
    }

    // Get user activities
    async getUserActivities(userId) {
        if (this.isConnected && this.supabase) {
            try {
                const { data, error } = await this.supabase
                    .from('user_activities')
                    .select('*')
                    .eq('user_id', userId)
                    .order('created_at', { ascending: false });
                if (!error && data) return data;
            } catch (e) {
                console.warn('Supabase error');
            }
        }
        return this.getLocalActivities(userId);
    }

    // ============ LOCAL STORAGE FALLBACK METHODS ============

    getLocalUsers() {
        const users = localStorage.getItem('pockettrading_users');
        return users ? JSON.parse(users) : [];
    }

    getLocalUserByEmail(email) {
        const users = this.getLocalUsers();
        return users.find(u => u.email === email) || null;
    }

    getLocalTrades(userId) {
        const trades = localStorage.getItem(`trades_${userId}`);
        return trades ? JSON.parse(trades) : [];
    }

    getLocalAllTrades() {
        const allTrades = [];
        const users = this.getLocalUsers();
        users.forEach(user => {
            const userTrades = this.getLocalTrades(user.id);
            allTrades.push(...userTrades);
        });
        return allTrades;
    }

    getLocalData(tableName) {
        const data = localStorage.getItem(`pockettrading_${tableName}`);
        return data ? JSON.parse(data) : [];
    }

    insertLocal(tableName, data) {
        const existing = this.getLocalData(tableName);
        existing.push(data);
        localStorage.setItem(`pockettrading_${tableName}`, JSON.stringify(existing));
        return true;
    }

    updateLocal(tableName, id, updates) {
        const items = this.getLocalData(tableName);
        const index = items.findIndex(i => i.id === id);
        if (index !== -1) {
            items[index] = { ...items[index], ...updates };
            localStorage.setItem(`pockettrading_${tableName}`, JSON.stringify(items));
            return true;
        }
        return false;
    }

    deleteLocal(tableName, id) {
        const items = this.getLocalData(tableName);
        const filtered = items.filter(i => i.id !== id);
        localStorage.setItem(`pockettrading_${tableName}`, JSON.stringify(filtered));
        return true;
    }

    updateLocalBalance(userId, newBalance) {
        const users = this.getLocalUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].balance = newBalance;
            localStorage.setItem('pockettrading_users', JSON.stringify(users));
            
            // Update session
            const sessionUser = JSON.parse(localStorage.getItem('pocket_user') || sessionStorage.getItem('pocket_user') || '{}');
            if (sessionUser.id === userId) {
                sessionUser.balance = newBalance;
                if (localStorage.getItem('pocket_user')) {
                    localStorage.setItem('pocket_user', JSON.stringify(sessionUser));
                }
                if (sessionStorage.getItem('pocket_user')) {
                    sessionStorage.setItem('pocket_user', JSON.stringify(sessionUser));
                }
            }
            return true;
        }
        return false;
    }

    updateLocalKYC(userId, status) {
        const users = this.getLocalUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex].kyc_status = status;
            localStorage.setItem('pockettrading_users', JSON.stringify(users));
            return true;
        }
        return false;
    }

    getLocalWatchlist(userId) {
        const watchlist = localStorage.getItem(`watchlist_${userId}`);
        return watchlist ? JSON.parse(watchlist) : [];
    }

    getLocalActivities(userId) {
        const activities = localStorage.getItem(`activities_${userId}`);
        return activities ? JSON.parse(activities) : [];
    }
}

// Initialize the database wrapper
const supabaseDB = new SupabaseDB();

// Export for use in other files
window.supabaseDB = supabaseDB;
