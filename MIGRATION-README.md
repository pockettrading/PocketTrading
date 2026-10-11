# PocketTrading Updated — Migration Foundation

This package preserves the original PocketTrading HTML, CSS, and JavaScript files and adds the initial PHP/MySQL foundation. It is a staging package, not a completed production migration.

## Included
- Original pages, CSS, and JavaScript preserved.
- `api/index.php`: initial PHP API endpoints for health, register/login/logout/session, profile name update, trade placement/listing, and admin user listing.
- `railway-schema.sql`: initial schema for a NEW/EMPTY target database only.
- `vercel.json`: route configuration for the PHP community runtime.
- `profile.html` and `admin.html` aliases for existing `profiles.html` and `Admin.html` pages.
- HTML references corrected from `js/profile.js` to the actual `js/profiles.js` filename.

## Critical limitations
The existing browser JavaScript still primarily calls Supabase. This package does NOT yet switch all frontend workflows to the PHP API. Deposit/withdrawal approval, KYC, password reset, settings, full admin actions, and authoritative trade settlement are not implemented in the PHP API foundation. Do not use for real-money transactions or claim migration complete until these are implemented and tested.

## Before deploying
1. Back up the GitHub repository and Supabase data.
2. Do not delete or disable Supabase during staging.
3. Review `railway-schema.sql` against the live Supabase schema. Never run it against a populated database without a migration plan and backup.
4. Configure `MYSQLHOST`, `MYSQLPORT`, `MYSQLDATABASE`, `MYSQLUSER`, and `MYSQLPASSWORD` in Vercel project Environment Variables. Keep credentials out of Git and frontend code.
5. Verify that the configured PHP runtime is supported by your current Vercel project. The configuration uses the community runtime `vercel-php@0.9.0`; runtime compatibility must be verified with a preview deployment.
6. After deployment, test `/api/health` and inspect Vercel Function Logs if it fails.
7. Test the frontend/backend integration in Preview before promoting to Production.

## Initial API endpoints
- `GET /api/health`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/profile/update`
- `POST /api/trade/create`
- `GET /api/trade/list`
- `GET /api/admin/users`

## Important financial safety note
The initial trade endpoint records a trade and debits the stake plus a 2% fee transactionally, but no authoritative settlement engine exists yet. Do not rely on browser-side random results. Settlement needs server-side expiry checks, idempotency, locked rows/transactions, and an audit trail before use.
