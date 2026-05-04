// Supabase Database Wrapper - PocketTrading
// File: js/supabase-db.js
// Pure Supabase - No localStorage fallback

const SUPABASE_URL = 'https://nzjgknwwenrczxzrnhjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56amdrbnd3ZW5yY3p4enJuaGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzY5NjksImV4cCI6MjA5MzE1Mjk2OX0.3Fb_VO5kYYBQF0T_2G19fcvnk91l-DOQZA_SKG8Xuao';

class SupabaseDB {
    constructor() {
        this.supabase = null;
        this.isConnected = false;
        this.init();
    }

    async init() {
        // Check if Supabase client is available
        if (typeof supabase !== 'undefined') {
            this.supabase = supabase;
            this.isConnected = true;
            console.log('✅ Supabase connected');
        } else {
            console.error('❌ Supabase client not loaded. Please include Supabase JS library.');
            this.isConnected = false;
        }
    }

    // ============ USERS ============
    
    async getAllUsers() {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('custom_users')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getUserByEmail(email) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('custom_users')
            .select('*')
            .eq('email', email)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async getUserById(id) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('custom_users')
            .select('*')
            .eq('id', id)
            .single();
        if (error && error.code !== 'PGRST116') throw error;
        return data;
    }

    async createUser(userData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('custom_users')
            .insert([userData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateUser(userId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('custom_users')
            .update(updates)
            .eq('id', userId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateUserBalance(userId, newBalance) {
        return this.updateUser(userId, { balance: newBalance });
    }

    async updateUserKYCStatus(userId, status) {
        return this.updateUser(userId, { kyc_status: status });
    }

    async deleteUser(userId) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { error } = await this.supabase
            .from('custom_users')
            .delete()
            .eq('id', userId);
        if (error) throw error;
        return true;
    }

    // ============ TRADES ============

    async getUserTrades(userId) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('trades')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async getAllTrades() {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('trades')
            .select('*')
            .order('created_at', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createTrade(tradeData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('trades')
            .insert([tradeData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateTrade(tradeId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('trades')
            .update(updates)
            .eq('id', tradeId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============ DEPOSITS ============

    async getDepositRequests(userId = null) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        let query = this.supabase.from('deposit_requests').select('*');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createDepositRequest(depositData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('deposit_requests')
            .insert([depositData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateDepositRequest(requestId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('deposit_requests')
            .update(updates)
            .eq('id', requestId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============ WITHDRAWALS ============

    async getWithdrawalRequests(userId = null) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        let query = this.supabase.from('withdrawal_requests').select('*');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createWithdrawalRequest(withdrawalData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('withdrawal_requests')
            .insert([withdrawalData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateWithdrawalRequest(requestId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('withdrawal_requests')
            .update(updates)
            .eq('id', requestId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============ KYC REQUESTS ============

    async getKYCRequests(userId = null) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        let query = this.supabase.from('kyc_requests').select('*');
        if (userId) query = query.eq('user_id', userId);
        const { data, error } = await query.order('date', { ascending: false });
        if (error) throw error;
        return data;
    }

    async createKYCRequest(kycData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('kyc_requests')
            .insert([kycData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async updateKYCRequest(requestId, updates) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('kyc_requests')
            .update(updates)
            .eq('id', requestId)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============ MARKET PRICES ============

    async getAllMarkets() {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('market_prices')
            .select('*')
            .order('id');
        if (error) throw error;
        return data;
    }

    async updateMarketPrice(symbol, priceData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('market_prices')
            .update({ ...priceData, updated_at: new Date().toISOString() })
            .eq('symbol', symbol)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============ WATCHLIST ============

    async getUserWatchlist(userId) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('watchlist')
            .select('*')
            .eq('user_id', userId);
        if (error) throw error;
        return data;
    }

    async addToWatchlist(userId, symbol) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('watchlist')
            .insert([{ user_id: userId, symbol }])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    async removeFromWatchlist(userId, symbol) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { error } = await this.supabase
            .from('watchlist')
            .delete()
            .eq('user_id', userId)
            .eq('symbol', symbol);
        if (error) throw error;
        return true;
    }

    // ============ PLATFORM SETTINGS ============

    async getPlatformSettings() {
        if (!this.isConnected) throw new Error('Supabase not connected');
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
    }

    async updatePlatformSetting(key, value) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
        const { data, error } = await this.supabase
            .from('platform_settings')
            .update({ value: stringValue, updated_at: new Date().toISOString() })
            .eq('key', key)
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============ USER ACTIVITIES ============

    async getUserActivities(userId, limit = 20) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('user_activities')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    async createUserActivity(activityData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('user_activities')
            .insert([activityData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }

    // ============ TRANSACTIONS ============

    async getUserTransactions(userId, limit = 50) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('transactions')
            .select('*')
            .eq('user_id', userId)
            .order('date', { ascending: false })
            .limit(limit);
        if (error) throw error;
        return data;
    }

    async createTransaction(transactionData) {
        if (!this.isConnected) throw new Error('Supabase not connected');
        const { data, error } = await this.supabase
            .from('transactions')
            .insert([transactionData])
            .select()
            .single();
        if (error) throw error;
        return data;
    }
}

// Initialize the database wrapper
const supabaseDB = new SupabaseDB();

// Export for use in other files
window.supabaseDB = supabaseDB;
