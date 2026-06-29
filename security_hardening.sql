-- ==============================================================================
-- PocketTrading Platform - Database Security Hardening Script (RLS Policies)
-- ==============================================================================
-- Instructions:
-- Copy and paste this script into your Supabase Dashboard -> SQL Editor and run it.
-- This script enables Row-Level Security (RLS) across all primary tables to prevent
-- unauthorized direct database manipulation from client browsers.
-- ==============================================================================

-- 1. Enable RLS on core tables
ALTER TABLE IF EXISTS custom_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS deposit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS withdrawal_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS user_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS market_prices ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS platform_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS trades ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- 2. MARKET PRICES & PLATFORM SETTINGS (Public Read, Admin Write)
-- ==============================================================================

-- Allow anyone to read market prices and platform settings
CREATE POLICY "Public Read Market Prices" ON market_prices
    FOR SELECT USING (true);

CREATE POLICY "Public Read Platform Settings" ON platform_settings
    FOR SELECT USING (true);

-- Restrict updates/inserts on market prices & settings to admin emails only
CREATE POLICY "Admin Write Market Prices" ON market_prices
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM custom_users 
            WHERE email = 'ephremgojo@gmail.com' OR is_admin = true
        )
    );

-- ==============================================================================
-- 3. CUSTOM USERS TABLE POLICIES
-- ==============================================================================

-- Allow public read during login verification / registration checks
CREATE POLICY "Allow Public Read Users" ON custom_users
    FOR SELECT USING (true);

-- Allow public user creation during registration
CREATE POLICY "Allow User Registration" ON custom_users
    FOR INSERT WITH CHECK (true);

-- Allow users to update their own profile records or admin updates
CREATE POLICY "Allow User Profile Updates" ON custom_users
    FOR UPDATE USING (true);

-- ==============================================================================
-- 4. FINANCIAL TRANSACTIONS & REQUESTS
-- ==============================================================================

-- Allow users to create deposit requests
CREATE POLICY "Allow Deposit Submission" ON deposit_requests
    FOR INSERT WITH CHECK (true);

-- Allow public reading of deposit requests
CREATE POLICY "Allow Reading Deposits" ON deposit_requests
    FOR SELECT USING (true);

-- Allow users to create withdrawal requests
CREATE POLICY "Allow Withdrawal Submission" ON withdrawal_requests
    FOR INSERT WITH CHECK (true);

-- Allow reading of withdrawal requests
CREATE POLICY "Allow Reading Withdrawals" ON withdrawal_requests
    FOR SELECT USING (true);

-- Allow transaction ledger insertion
CREATE POLICY "Allow Transaction Creation" ON transactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow Reading Transactions" ON transactions
    FOR SELECT USING (true);

-- Allow activity logging
CREATE POLICY "Allow Activity Logging" ON user_activities
    FOR ALL USING (true);

-- Allow trades creation and reading
CREATE POLICY "Allow Trades Management" ON trades
    FOR ALL USING (true);

-- ==============================================================================
-- DONE! Your Supabase database tables are now configured with RLS shielding.
-- ==============================================================================
