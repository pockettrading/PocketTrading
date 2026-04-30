// Supabase Cloud Database Connection
// File: js/supabase.js
// Using custom_users table (not the auth users table)

const SUPABASE_URL = 'https://nzjgknwwenrczxzrnhjr.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im56amdrbnd3ZW5yY3p4enJuaGpyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1NzY5NjksImV4cCI6MjA5MzE1Mjk2OX0.3Fb_VO5kYYBQF0T_2G19fcvnk91l-DOQZA_SKG8Xuao';

class SupabaseClient {
    constructor() {
        this.url = SUPABASE_URL;
        this.headers = {
            'apikey': SUPABASE_ANON_KEY,
            'Content-Type': 'application/json',
            'Prefer': 'return=representation'
        };
    }

    // GET data from table
    async get(table, filters = {}) {
        let queryString = '';
        if (Object.keys(filters).length > 0) {
            queryString = '?' + Object.entries(filters)
                .map(([key, value]) => `${key}=eq.${encodeURIComponent(value)}`)
                .join('&');
        }
        
        const response = await fetch(`${this.url}/rest/v1/${table}${queryString}`, {
            method: 'GET',
            headers: this.headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // INSERT data into table
    async insert(table, data) {
        const response = await fetch(`${this.url}/rest/v1/${table}`, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // UPDATE data in table
    async update(table, id, data) {
        const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'PATCH',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return await response.json();
    }

    // DELETE data from table
    async delete(table, id) {
        const response = await fetch(`${this.url}/rest/v1/${table}?id=eq.${id}`, {
            method: 'DELETE',
            headers: this.headers
        });
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        return true;
    }

    // ============ CUSTOM_USERS Table Methods ============
    
    // Get user by email from custom_users table
    async getUserByEmail(email) {
        const users = await this.get('custom_users', { email: email });
        return users.length > 0 ? users[0] : null;
    }

    // Get all users from custom_users table
    async getAllUsers() {
        return await this.get('custom_users');
    }

    // Update user KYC status
    async updateUserKYCStatus(userId, status) {
        return await this.update('custom_users', userId, { kyc_status: status });
    }

    // Update user balance
    async updateUserBalance(userId, newBalance) {
        return await this.update('custom_users', userId, { balance: newBalance });
    }

    // Update user last login
    async updateUserLastLogin(userId) {
        return await this.update('custom_users', userId, { last_login: new Date().toISOString() });
    }

    // ============ TRANSACTIONS Table Methods ============
    
    // Get user transactions
    async getUserTransactions(userId) {
        return await this.get('transactions', { user_id: userId });
    }

    // Get all transactions
    async getAllTransactions() {
        return await this.get('transactions');
    }

    // Add transaction
    async addTransaction(transaction) {
        return await this.insert('transactions', transaction);
    }

    // ============ DEPOSIT REQUESTS Methods ============
    
    // Get deposit requests
    async getDepositRequests(status = null) {
        if (status) {
            return await this.get('deposit_requests', { status: status });
        }
        return await this.get('deposit_requests');
    }

    // Add deposit request
    async addDepositRequest(request) {
        return await this.insert('deposit_requests', request);
    }

    // Update deposit request status
    async updateDepositRequestStatus(requestId, status) {
        return await this.update('deposit_requests', requestId, { status: status });
    }

    // ============ WITHDRAWAL REQUESTS Methods ============
    
    // Get withdrawal requests
    async getWithdrawalRequests(status = null) {
        if (status) {
            return await this.get('withdrawal_requests', { status: status });
        }
        return await this.get('withdrawal_requests');
    }

    // Add withdrawal request
    async addWithdrawalRequest(request) {
        return await this.insert('withdrawal_requests', request);
    }

    // Update withdrawal request status
    async updateWithdrawalRequestStatus(requestId, status) {
        return await this.update('withdrawal_requests', requestId, { status: status });
    }

    // ============ KYC REQUESTS Methods ============
    
    // Get KYC requests
    async getKYCRequests(status = null) {
        if (status) {
            return await this.get('kyc_requests', { status: status });
        }
        return await this.get('kyc_requests');
    }

    // Add KYC request
    async addKYCRequest(request) {
        return await this.insert('kyc_requests', request);
    }

    // Update KYC request status
    async updateKYCRequestStatus(requestId, status) {
        return await this.update('kyc_requests', requestId, { status: status });
    }

    // ============ WALLET SETTINGS Methods ============
    
    // Get wallet settings
    async getWalletSettings() {
        const settings = await this.get('wallet_settings');
        return settings.length > 0 ? settings[0] : null;
    }

    // Update wallet settings
    async updateWalletSettings(settings) {
        const existing = await this.getWalletSettings();
        if (existing && existing.id) {
            return await this.update('wallet_settings', existing.id, settings);
        } else {
            return await this.insert('wallet_settings', settings);
        }
    }

    // ============ GLOBAL SETTINGS Methods ============
    
    // Get global settings
    async getGlobalSettings() {
        const settings = await this.get('global_settings');
        return settings.length > 0 ? settings[0] : null;
    }

    // Update global settings
    async updateGlobalSettings(settings) {
        const existing = await this.getGlobalSettings();
        if (existing && existing.id) {
            return await this.update('global_settings', existing.id, settings);
        } else {
            return await this.insert('global_settings', settings);
        }
    }

    // ============ Helper Methods ============
    
    // Check if table exists (for debugging)
    async checkTable(tableName) {
        try {
            const result = await this.get(tableName, { limit: 1 });
            console.log(`Table ${tableName} exists, has ${result.length} records`);
            return true;
        } catch (error) {
            console.error(`Table ${tableName} error:`, error);
            return false;
        }
    }

    // Test all connections
    async testConnection() {
        console.log('Testing Supabase connection...');
        try {
            const users = await this.getAllUsers();
            console.log(`✅ Connected! Found ${users.length} users.`);
            return true;
        } catch (error) {
            console.error('❌ Connection failed:', error);
            return false;
        }
    }
}

// Create global supabase instance
const supabaseDB = new SupabaseClient();

// Make available globally
window.supabaseDB = supabaseDB;

console.log('Supabase client initialized with URL:', SUPABASE_URL);
console.log('Using custom_users table for authentication');
