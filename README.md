# Toys2000 Wholesale Portal

Next.js B2B wholesale portal backed by Supabase (catalog/cart) and MarketTime (orders, customers, shipping).

## Prerequisites

- Node.js 20+
- Supabase project with schema from `supabase/schema.sql`
- MarketTime API credentials (rep group + salesperson)

## Local setup

```bash
cp .env.example .env
cp .env.example .env.local   # Next.js dev reads .env.local first — keep MT_* keys in sync
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

**Important:** If checkout or live MarketTime calls return 401, your `MT_API_KEY` is invalid or expired — not a code bug. Regenerate it in MarketTime (Billing & Payment → API Key), update `.env` and `.env.local`, then run `npm run verify:mt` and restart the dev server.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `MT_API_KEY` | MarketTime API key (server-only) |
| `MT_REP_GROUP_ID` | Rep group ID for orders and catalog |
| `MT_SALESPERSON_ID` | Salesperson ID attached to orders |
| `MT_B2B_SIGNUP_URL` | External signup link for new retailers |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (browser) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role for sync and admin writes |
| `CRON_SECRET` | Bearer token for `/api/sync` |

## Catalog sync

Products and manufacturers are cached in Supabase. The live catalog is never fetched from MarketTime on page load.

```bash
# Full catalog pull (~85k products, ~10–15 min)
npm run sync:mt

# Delta sync (items modified since a date)
node --env-file=.env scripts/sync-markettime.js --modifiedStartDate=2026-06-01
```

**Scheduled sync:** Vercel cron hits `GET /api/sync` daily at 4:00 UTC (catalog) and `GET /api/sync/customers` at 4:30 UTC (customer linking). Admins can also trigger either sync from `/admin`.

**Customer sync** (links Supabase profiles to MT retailer IDs by email):

```bash
npm run sync:customers
```

Runs automatically via cron when deployed. Also available from the admin dashboard.

**Bulk customer upload** (admin `/admin`): Excel → MarketTime `POST /customers`. Columns in any order; only name, email, state, and country required per row. See `lib/customer-upload.js` for recognized header aliases.

## User access model

| Role | Catalog | Prices | Cart | Orders |
|------|---------|--------|------|--------|
| Guest | Browse | Hidden | No | No |
| Signed up, unapproved | Browse | Hidden | No | No |
| Approved retailer | Full | Yes | Yes | Yes |
| Admin | Full | Yes | Yes | Yes + `/admin` |

Approval is set manually on the `profiles` row (`approved = true`, `retailer_id` set).

## Security notes

- Server routes use `getUser()` — never trust client-submitted prices. Order line items are re-priced from the `products` table at submission.
- Ship-to addresses must belong to the authenticated retailer (no fallback to first address).
- Order tracking (`/api/markettime/orders/[id]/tracking`) verifies order ownership before returning data.
- Sync endpoints require `CRON_SECRET` only (not the service role key).
- Checkout sends an `Idempotency-Key` header to prevent duplicate orders on double-submit. Requires the `order_idempotency` table in Supabase (included in `schema.sql`).

## Vendor minimums

Per-vendor minimum order amounts are configured in `lib/vendor-minimums.js` until MarketTime exposes them via API. Update the `VENDOR_MINIMUMS` map as needed.

## Active manufacturers

Only manufacturers listed in `data/active-manufacturers.csv` (mirrored in `lib/active-manufacturers.js`) appear in the catalog, brands page, and checkout. Update that file when Toys2000 adds or removes a rep line.

## Database migrations

After pulling schema changes, run new SQL in the Supabase SQL editor. Recent additions:

- `order_idempotency` — checkout idempotency keys
- `products_catalog_idx` — partial index for catalog queries

## Project structure

```
app/                  # Next.js App Router pages and API routes
components/           # React UI components
lib/                  # Shared logic (catalog, cart, MarketTime client)
scripts/              # CLI sync scripts
supabase/schema.sql   # Full database schema + RLS policies
proxy.js              # Auth gate and guest browse rules
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server |
| `npm run build` | Production build |
| `npm run sync:mt` | Full MarketTime catalog sync |
| `npm run sync:customers` | Sync customer/retailer links |

## Troubleshooting

| Symptom | Likely cause |
|---------|--------------|
| Checkout 401 on shipping | Invalid/expired `MT_API_KEY` — run `npm run verify:mt` and regenerate key in MarketTime |
| Empty home categories | MT `rep_group_category_path` is null — home uses manufacturer keyword mapping |
| Slow catalog load | Ensure `products_catalog_idx` exists; count uses estimated not exact |
| Sync 401 | Missing or wrong `CRON_SECRET` in env |
| Order duplicate on double-click | Ensure `order_idempotency` table exists |
