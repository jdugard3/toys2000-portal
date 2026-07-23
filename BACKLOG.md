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
- [x] Vendor minimums from MarketTime — `minimumOrderAmount` on checkout/cart via live MT API
- [x] Promotions at checkout — `POST /manufacturers/promotions/get` shown on cart + checkout

> **Note:** Browse Catalog → PDF/Flipsnack is handled in Juan's version (upcoming switch) — not building here.

---

## P0 — High priority

| Status | Item | Notes |
|--------|------|-------|
| ⬜ | **Approval email** | Email customer when Jimmy approves them in MarketTime |
| ~~⬜~~ | ~~Browse Catalog → PDF / Flipsnack~~ | **Deferred** — in Juan's version |
| ~~⬜~~ | ~~**Vendor minimums from MarketTime**~~ | ✅ Done — live from `GET /manufacturers/{id}` |
| ⬜ | **Multi-vendor checkout tabs** | Checkout is per-manufacturer; improve multi-brand cart UX |
| ⬜ | **B2B order email notifications** | Email Jimmy (and/or customer) when orders are placed |
| ~~⬜~~ | ~~**Promotions at checkout**~~ | ✅ Done — `manufacturers/promotions/get` on cart + checkout |
| ⬜ | **MT ↔ portal bidirectional sync test** | Verify email/profile changes propagate correctly both ways |
| ⬜ | **Add ship-to / contact (profile)** | Profile v2 edits existing records only; need POST endpoints for new locations |
| ⬜ | **MarketTime API key stability** | Keys failing ~daily without regeneration — escalate to MT support if fingerprint unchanged |

---

## MarketTime API key — troubleshooting

**Symptom:** Checkout, profile, or `npm run verify:mt` fails with 401.

### Is it a timer or usage limit?

**Probably not.** MarketTime’s public docs do not describe:
- Daily or timed API key expiry
- Usage quotas that **revoke** your key

What they *do* document:
- Regenerating a key **immediately invalidates** the previous one ([Generating an API Key](https://support.markettime.com/hc/en-us/articles/43441619857947-Generating-an-API-Key-for-your-MarketTime-Account))
- Rate limits (if any) would typically return **HTTP 429**, not **401**

| HTTP status | Meaning |
|-------------|---------|
| **401** | Key missing, wrong, or revoked — auth failure |
| **429** | Too many requests — wait and retry; do **not** regenerate the key |
| **5xx** | MarketTime server error — retry later |

### Diagnose before regenerating

```bash
npm run verify:mt
```

Note the **Key fingerprint** line. Next time it fails:

| Fingerprint | 401? | Likely cause |
|-------------|------|----------------|
| **Same** as yesterday | Yes | MarketTime revoked key server-side → **open MT support ticket** |
| **Different** | Yes | `.env` was changed, reverted, or wrong machine — fix env, not MT |
| Same | No | Transient error — retry |

### Things that feel like “daily expiry” but aren’t

1. **Another user** clicks Generate Key in MarketTime (Jimmy, integrator, etc.)
2. **Two environments** — local `.env` updated but Vercel still has old key (or vice versa)
3. **`.env.local` returns** — Next.js prefers it over `.env`; keep only one file with `MT_*` vars
4. **iCloud / sync** reverting `.env` on another Mac
5. **Elite subscription / billing** — API access tied to plan; ask MT if account is on trial

### Escalation template for MarketTime support

> Our Sales Agency Elite API key for rep group R1359 stops working with HTTP 401 approximately every 24 hours without anyone clicking Generate Key. Is there a key TTL, trial limit, or automatic rotation on your side? Key fingerprint (SHA-256 prefix): `[paste from verify:mt]`

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
