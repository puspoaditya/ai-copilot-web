# Affiliate IntervAI

## Features and policy

- `/affiliate`: email OTP registration/login, personal referral link, unique daily visitors, sales, commission balances, withdrawal requests, and payout history.
- `/r/{code}`: validates an active affiliate, records a visitor once per affiliate per Jakarta calendar day, and sets a signed HttpOnly referral cookie. Last valid referral wins for 30 days in the same browser.
- Commission: 30% of the server-side paid order amount (Rp53,700 monthly / Rp449,700 yearly). The percentage is snapshotted on each order.
- Maturity: 14 days from the first verified successful payment. Minimum withdrawal Rp100,000.
- Self-purchases using the affiliate email and payments for blocked affiliates do not earn commission.
- `/admin/affiliate`: uses the existing admin password to list affiliates, disable/enable accounts, inspect bank details, reject requests, and record manual bank transfers. It does not send money. Marking a request paid requires a transfer reference; the UI also requires confirmation that the transfer was performed.
- Refund/partial refund, chargeback/partial chargeback, cancellation, or denial voids the entire related commission. Pending payouts containing that transaction are rejected and other eligible commissions released. Commissions already paid create an idempotent debit offset against future withdrawals.

## Activation

1. In the **Supabase project already used by IntervAI**, run the entire `supabase/migrations/202610130001_affiliates.sql` file through SQL Editor or your normal migration process. It runs in a transaction, creates new tables/functions, and does not alter the existing `licenses` table. It assumes the existing license columns used by the current app. Apply it once; do not run an already-applied migration again.
2. Set `AFFILIATE_ENABLED=true` in the intended Vercel environment and redeploy. The default is disabled, so existing checkout continues without relying on the new schema before activation. Tracked orders continue to be processed if the flag is later disabled.
3. Existing environment variables are reused: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `MIDTRANS_SERVER_KEY`, `ADMIN_PASSWORD`. Emails use the existing verified `hello@intervai.my.id` sender. No anonymous Supabase key or separate Supabase Auth setup is needed.
4. Optional: set a random `AFFILIATE_AUTH_SECRET` (at least 32 random bytes) for OTP/referral signing. Otherwise, the server uses the existing service-role secret. Keep it stable; rotation invalidates outstanding OTP/referral signatures. Never use a `NEXT_PUBLIC_` variable for this secret.
5. Confirm that Midtrans notifications still point to `https://www.intervai.my.id/api/notification`.

The production migration and environment activation are separate from merging the PR. They were not applied by Codex: available Vercel access returned 403 for the project's team scope, and no direct Supabase SQL connection was available. Preview and production should use isolated databases/provider credentials when testing financial flows. Do not point the isolated integration harness at production.

## Payment integrity

Enabled checkout persists order ID, normalized buyer email, exact price, plan, affiliate, and commission rate **before** requesting a Snap token. Attribution is accepted only from a signed, unexpired cookie that resolves to an active affiliate. Browser-supplied amounts or affiliate IDs are ignored.

For tracked orders, notifications require the existing Midtrans signature, exact order amount, and an authenticated GET Status API response. The current provider status determines payment state, not the unsigned status/email in the webhook payload. A unique commission row per order prevents duplicate commission on webhook replay. Refund states cannot be overwritten by stale paid notifications. Financial operations lock the affiliate account so payout and reversal operations are serialized.

License preparation is atomic and reuses an existing active key. Failed license email delivery returns 503 so Midtrans can retry; the paid order and commission remain recorded without duplication. `license_delivered` is marked only after Resend succeeds. Concurrent successful notification deliveries may resend the same license email (at-least-once delivery); they do not create another commission or active license through the tracked path. Orders started before activation retain the legacy fulfillment path and have no retroactive affiliate credit.

## Data access

All new tables have RLS enabled, no client policies, and access revoked from `anon` and `authenticated`. RPC execution is restricted to `service_role`. Server APIs resolve a random, hashed, expiring session before accessing an affiliate dashboard. Affiliates receive no buyer emails and only masked bank-account suffixes in their own payout history; full payment destinations are returned only to the authenticated admin.

OTP: 10-minute expiry, at most five verification attempts, one-time consumption, a 60-second email cooldown, five requests per email/hour, and ten per hashed IP/hour. Rate limits are in PostgreSQL, not process memory. Cross-origin state changes are rejected; session/referral cookies use HttpOnly, SameSite=Lax, and Secure on HTTPS.

## Verification

```bash
npm ci
npm run lint
npm run test:affiliate
# Build with your normal local environment (or disposable placeholders for build only).
npm run build
npm run test:affiliate:integration
```

`test:affiliate` applies the real migration to an isolated PGlite PostgreSQL instance and tests OTP, privacy/permissions, amount verification, duplicate callbacks, holds, withdrawals, refunds, and license idempotency. PGlite serializes local connections; production row-lock behavior should also be checked on staging PostgreSQL when available.

`test:affiliate:integration` starts the production Next.js server plus an isolated PostgreSQL-backed REST fixture. Midtrans and Resend requests are redirected to localhost; external provider calls are blocked. It exercises actual HTTP routes through OTP, referral, checkout, provider-state verification, webhook retries, payout approval/rejection, refund adjustments, and logout. It requires a successful local build first and uses port 3451.

## Changing policy

Display/checkout policy lives in `lib/affiliate-policy.ts`. The SQL migration enforces the 14-day hold and Rp100,000 minimum. Change these together through a new migration; do not edit a migration already applied to production. Existing orders retain their snapshotted percentage.
