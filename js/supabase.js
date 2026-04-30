// Supabase Cloud Database Connection
// File: js/supabase.js

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

    // Get user by email
    async getUserByEmail(email) {
        const users = await this.get('users', { email: email });
        return users.length > 0 ? users[0] : null;
    }

    // Get all users
    async getAllUsers() {
        return await this.get('users');
    }

    // Get deposit requests
    async getDepositRequests(status = null) {
        if (status) {
            return await this.get('deposit_requests', { status: status });
        }
        return await this.get('deposit_requests');
    }

    // Get withdrawal requests
    async getWithdrawalRequests(status = null) {
        if (status) {
            return await this.get('withdrawal_requests', { status: status });
        }
        return await this.get('withdrawal_requests');
    }

    // Get KYC requests
    async getKYCRequests(status = null) {
        if (status) {
            return await this.get('kyc_requests', { status: status });
        }
        return await this.get('kyc_requests');
    }

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

    // Get user transactions
    async getUserTransactions(userId) {
        return await this.get('transactions', { user_id: userId });
    }

    // Get all transactions
    async getAllTransactions() {
        return await this.get('transactions');
    }

    // Update user KYC status
    async updateUserKYCStatus(userId, status) {
        return await this.update('users', userId, { kyc_status: status });
    }

    // Update user balance
    async updateUserBalance(userId, newBalance) {
        return await this.update('users', userId, { balance: newBalance });
    }

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
}

// Create global supabase instance
const supabaseDB = new SupabaseClient();

// Make available globally
window.supabaseDB = supabaseDB;

console.log('Supabase client initialized with URL:', SUPABASE_URL);
