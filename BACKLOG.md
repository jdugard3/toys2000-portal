# Toys2000 Portal — Backlog

Tracked work items for the B2B wholesale portal (`toys2000-portal`).  
Update this file when items are started, shipped, or reprioritized.

**Stack:** Next.js 16 · Supabase (catalog/cart/auth) · MarketTime API (orders/customers)

**Repo:** https://github.com/jdugard3/toys2000-portal

---

## Recently completed

- [x] Bulk customer upload (admin `/admin`) — US Divers & Allen Gerber Excel formats
- [x] Auto-assign salesperson on bulk customer import (`MT_SALESPERSON_ID`)
- [x] Active manufacturer allowlist (16 brands) — catalog, checkout, orders filtered
- [x] MarketTime API key troubleshooting — `.env` only, `npm run verify:mt`
- [x] Profile page v1 — read-only MarketTime data
- [x] Profile page v2 — editable company, billing, contacts, ship-tos (MarketTime PUT sync)
- [x] Profile navbar button — initials emblem when signed in
- [x] MarketTime-first signup flow — `/register` guide, login copy, pending-approval links
- [x] Default salesperson on account link — `ensureDefaultSalesperson()` on `link-markettime`

---

## P0 — High priority

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | **Approval email** | Email customer when Jimmy approves them in MarketTime |
| ⬜ | **Browse Catalog → PDF / Flipsnack** | Wire catalog browse to `CatalogViewer.js` instead of product grid where appropriate |
| ⬜ | **Vendor minimums from MarketTime** | `lib/vendor-minimums.js` is a static map today; pull from MT when available |
| ⬜ | **Multi-vendor checkout tabs** | Checkout is per-manufacturer; improve multi-brand cart UX |
| ⬜ | **B2B order email notifications** | Email Jimmy (and/or customer) when orders are placed |
| ⬜ | **Promotions at checkout** | Show promos before submit — blocked on MT data source (`promotions={[]}` today) |
| ⬜ | **MT ↔ portal bidirectional sync test** | Verify email/profile changes propagate correctly both ways |
| ⬜ | **Add ship-to / contact (profile)** | Profile v2 edits existing records only; need POST endpoints for new locations |

---

## P1 — Medium priority

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | Tag bulk-imported customers as "new" | Flag for rep assignment review |
| ⬜ | CRM sync on import | Paused per meeting transcripts |
| ⬜ | Orders → CRM pipeline | Push order events to CRM |
| ⬜ | Rep-scoped CRM access | Limit CRM data by salesperson |
| ⬜ | Bulk upload resume / error export | Download failed rows from admin upload |
| ⬜ | Guest PDF catalog + "Register for pricing" | Unauthenticated catalog preview |
| ⬜ | Design pass (Miro / Wanki) | UI polish from design review |

---

## P2 — Later

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | Migrate backend to [Innovat3Solutions/toys2000](https://github.com/Innovat3Solutions/toys2000) | Marketing Vite site vs portal split |
| ⬜ | Production deploy | Vercel promotion, domains, env vars |
| ⬜ | Portal login email change flow | Company email editable in MT; Supabase auth email is separate |

---

## Key env vars

| Variable | Purpose |
|----------|---------|
| `MT_API_KEY` | MarketTime API auth |
| `MT_REP_GROUP_ID` | Rep group (e.g. `R1359`) |
| `MT_SALESPERSON_ID` | Default rep on orders & imports (e.g. `S148431`) |
| `MT_B2B_SIGNUP_URL` | External MarketTime retailer signup link |

---

## Useful commands

```bash
npm run dev          # local dev server
npm run verify:mt    # test MarketTime API key
```

| Route | Purpose |
|-------|---------|
| `/admin` | Bulk customer upload |
| `/profile` | Retailer profile (MarketTime sync) |
| `/register` | New retailer signup guide |
| `/pending-approval` | Holding page for unapproved users |

---

## How to update this file

1. Change `⬜` → `🔄` when in progress, `✅` when done (or move to **Recently completed**).
2. Add new items with a one-line **Notes** column so context isn't lost across machines.
3. Commit and push so the list stays in sync everywhere.

*Last updated: 2026-06-22*
