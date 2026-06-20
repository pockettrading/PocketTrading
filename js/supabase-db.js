// Supabase Database Wrapper - PocketTrading
// File: js/supabase-db.js
// Complete version with error handling and all required methods

const SUPABASE_URL = 'https://nzjgknwwenrczxzrnhjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56amdrbnd3ZW5yY3p4enJuaGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzY5NjksImV4cCI6MjA5MzE1Mjk2OX0.3Fb_VO5kYYBQF0T_2G19fcvnk91l-DOQZA_SKG8Xuao';

class SupabaseDB {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        if (typeof window.supabase !== 'undefined' && window.supabase.createClient) {
            this.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
            this.isConnected = true;
            console.log('✅ Supabase connected successfully');
        } else {
            console.error('❌ Supabase client not loaded. Please check script order.');
            this.isConnected = false;
        }
    }

    // ============ USERS ============
    
    async getAllUsers() {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in getAllUsers:', err);
            throw err;
        }
    }

    async getUserByEmail(email) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .select('*')
                .eq('email', email)
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (err) {
            console.error(`Error in getUserByEmail for ${email}:`, err);
            throw err;
        }
    }

    async getUserById(id) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .select('*')
                .eq('id', id)
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            return data;
        } catch (err) {
            console.error(`Error in getUserById for ${id}:`, err);
            throw err;
        }
    }

    async createUser(userData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .insert([userData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in createUser:', err);
            throw err;
        }
    }

    async updateUser(userId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .update(updates)
                .eq('id', userId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updateUser for ${userId}:`, err);
            throw err;
        }
    }

    async updateUserBalance(userId, newBalance) {
        return this.updateUser(userId, { balance: newBalance });
    }

    async updateUserKYCStatus(userId, status) {
        return this.updateUser(userId, { kyc_status: status });
    }

    async deleteUser(userId) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { error } = await this.supabase
                .from('custom_users')
                .delete()
                .eq('id', userId);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error(`Error in deleteUser for ${userId}:`, err);
            throw err;
        }
    }

    // ============ PASSWORD RESET ============
    
    async setPasswordResetToken(email, token, expiresAt) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .update({ reset_token: token, reset_expires: expiresAt })
                .eq('email', email)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in setPasswordResetToken for ${email}:`, err);
            throw err;
        }
    }

    async getUserByResetToken(token) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .select('*')
                .eq('reset_token', token)
                .maybeSingle();
            if (error && error.code !== 'PGRST116') throw error;
            if (data && data.reset_expires && new Date(data.reset_expires) < new Date()) return null;
            return data;
        } catch (err) {
            console.error(`Error in getUserByResetToken for token ${token}:`, err);
            throw err;
        }
    }

    async updatePasswordWithResetToken(token, newPassword) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('custom_users')
                .update({ password: newPassword, reset_token: null, reset_expires: null })
                .eq('reset_token', token)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updatePasswordWithResetToken for token ${token}:`, err);
            throw err;
        }
    }

    // ============ TRADES ============

    async getUserTrades(userId) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('trades')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in getUserTrades for ${userId}:`, err);
            throw err;
        }
    }

    async getAllTrades() {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('trades')
                .select('*')
                .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in getAllTrades:', err);
            throw err;
        }
    }

    async createTrade(tradeData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('trades')
                .insert([tradeData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in createTrade:', err);
            throw err;
        }
    }

    async updateTrade(tradeId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('trades')
                .update(updates)
                .eq('id', tradeId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updateTrade for ${tradeId}:`, err);
            throw err;
        }
    }

    // ============ DEPOSITS (requests submitted by user, seen by admin) ============

    async getDepositRequests(userId = null) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            let query = this.supabase.from('deposit_requests').select('*');
            if (userId) query = query.eq('user_id', userId);
            const { data, error } = await query.order('date', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in getDepositRequests:', err);
            throw err;
        }
    }

    async createDepositRequest(depositData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            // Ensure required fields are present
            if (!depositData.id) depositData.id = Date.now();
            if (!depositData.date) depositData.date = new Date().toISOString();
            if (!depositData.status) depositData.status = 'pending';

            const { data, error } = await this.supabase
                .from('deposit_requests')
                .insert([depositData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in createDepositRequest:', err);
            throw err;
        }
    }

    async updateDepositRequest(requestId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('deposit_requests')
                .update(updates)
                .eq('id', requestId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updateDepositRequest for ${requestId}:`, err);
            throw err;
        }
    }

    // ============ WITHDRAWALS ============

    async getWithdrawalRequests(userId = null) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            let query = this.supabase.from('withdrawal_requests').select('*');
            if (userId) query = query.eq('user_id', userId);
            const { data, error } = await query.order('date', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in getWithdrawalRequests:', err);
            throw err;
        }
    }

    async createWithdrawalRequest(withdrawalData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            if (!withdrawalData.id) withdrawalData.id = Date.now();
            if (!withdrawalData.date) withdrawalData.date = new Date().toISOString();
            if (!withdrawalData.status) withdrawalData.status = 'pending';

            const { data, error } = await this.supabase
                .from('withdrawal_requests')
                .insert([withdrawalData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in createWithdrawalRequest:', err);
            throw err;
        }
    }

    async updateWithdrawalRequest(requestId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('withdrawal_requests')
                .update(updates)
                .eq('id', requestId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updateWithdrawalRequest for ${requestId}:`, err);
            throw err;
        }
    }

    // ============ KYC REQUESTS ============

    async getKYCRequests(userId = null) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            let query = this.supabase.from('kyc_requests').select('*');
            if (userId) query = query.eq('user_id', userId);
            const { data, error } = await query.order('date', { ascending: false });
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in getKYCRequests:', err);
            throw err;
        }
    }

    async createKYCRequest(kycData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            if (!kycData.id) kycData.id = Date.now();
            if (!kycData.date) kycData.date = new Date().toISOString();
            if (!kycData.status) kycData.status = 'pending';

            const { data, error } = await this.supabase
                .from('kyc_requests')
                .insert([kycData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in createKYCRequest:', err);
            throw err;
        }
    }

    async updateKYCRequest(requestId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('kyc_requests')
                .update(updates)
                .eq('id', requestId)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updateKYCRequest for ${requestId}:`, err);
            throw err;
        }
    }

    // ============ MARKET PRICES ============

    async getAllMarkets() {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('market_prices')
                .select('*')
                .order('id');
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in getAllMarkets:', err);
            throw err;
        }
    }

    async updateMarketPrice(symbol, priceData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('market_prices')
                .update({ ...priceData, updated_at: new Date().toISOString() })
                .eq('symbol', symbol)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updateMarketPrice for ${symbol}:`, err);
            throw err;
        }
    }

    // ============ WATCHLIST ============

    async getUserWatchlist(userId) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('watchlist')
                .select('*')
                .eq('user_id', userId);
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in getUserWatchlist for ${userId}:`, err);
            throw err;
        }
    }

    async addToWatchlist(userId, symbol) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('watchlist')
                .insert([{ user_id: userId, symbol }])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in addToWatchlist for ${userId}, ${symbol}:`, err);
            throw err;
        }
    }

    async removeFromWatchlist(userId, symbol) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { error } = await this.supabase
                .from('watchlist')
                .delete()
                .eq('user_id', userId)
                .eq('symbol', symbol);
            if (error) throw error;
            return true;
        } catch (err) {
            console.error(`Error in removeFromWatchlist for ${userId}, ${symbol}:`, err);
            throw err;
        }
    }

    // ============ PLATFORM SETTINGS ============

    async getPlatformSettings() {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('platform_settings')
                .select('*');
            if (error) throw error;
            const settings = {};
            data.forEach(item => {
                try {
                    settings[item.key] = JSON.parse(item.value);
                } catch (e) {
                    settings[item.key] = item.value;
                }
            });
            return settings;
        } catch (err) {
            console.error('Error in getPlatformSettings:', err);
            throw err;
        }
    }

    async updatePlatformSetting(key, value) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
            const { data, error } = await this.supabase
                .from('platform_settings')
                .update({ value: stringValue, updated_at: new Date().toISOString() })
                .eq('key', key)
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in updatePlatformSetting for ${key}:`, err);
            throw err;
        }
    }

    // ============ USER ACTIVITIES ============

    async getUserActivities(userId, limit = 20) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('user_activities')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in getUserActivities for ${userId}:`, err);
            throw err;
        }
    }

    async createUserActivity(activityData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            if (!activityData.id) activityData.id = Date.now();
            if (!activityData.created_at) activityData.created_at = new Date().toISOString();

            const { data, error } = await this.supabase
                .from('user_activities')
                .insert([activityData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in createUserActivity:', err);
            throw err;
        }
    }

    // ============ TRANSACTIONS ============

    async getUserTransactions(userId, limit = 50) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            const { data, error } = await this.supabase
                .from('transactions')
                .select('*')
                .eq('user_id', userId)
                .order('date', { ascending: false })
                .limit(limit);
            if (error) throw error;
            return data;
        } catch (err) {
            console.error(`Error in getUserTransactions for ${userId}:`, err);
            throw err;
        }
    }

    async createTransaction(transactionData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        try {
            if (!transactionData.id) transactionData.id = Date.now();
            if (!transactionData.date) transactionData.date = new Date().toISOString();

            const { data, error } = await this.supabase
                .from('transactions')
                .insert([transactionData])
                .select()
                .single();
            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Error in createTransaction:', err);
            throw err;
        }
    }
}

// Initialize the database wrapper
const supabaseDB = new SupabaseDB();
window.supabaseDB = supabaseDB;
