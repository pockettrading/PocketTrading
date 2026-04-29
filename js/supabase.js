// Supabase Cloud Database Connection
// File: js/supabase.js

const SUPABASE_URL = 'https://vfgrehgegnjzfjzwxrkw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmZ3JlaGdlZ25qemZqend4cmt3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc0ODkzMTEsImV4cCI6MjA5MzA2NTMxMX0.iQSRDrcyhz6hNQSMoDRdLVtpfBM1gqF5epbq_yf1Fsc';

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
        if (existing) {
            return await this.update('wallet_settings', existing.id, settings);
        } else {
            return await this.insert('wallet_settings', settings);
        }
    }
}

// Create global supabase instance
const supabaseDB = new SupabaseClient();

// Make available globally
window.supabaseDB = supabaseDB;

console.log('Supabase client initialized');
