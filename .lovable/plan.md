# Next chunk — Polish routes

The big systems are in place (auth, catalog, widget, payments, lifecycle, admin). What's left is the **connective tissue** retailers and consumers expect from a real SaaS but that we've been deferring. I recommend doing all three of these together because they share patterns (read subscription, render state, link to Paddle portal) and individually they're each too small to justify a round trip.

## What we'll build

### 1. `/retailer/pricing` — public pricing page
A marketing-facing page anyone can hit (logged-out included) showing the two plans (Starter / Growth) with feature lists, the 3-month free trial CTA, FAQ, and a "Talk to us" footer. Links to `/retailer/signup` for new users, `/portal/billing` for logged-in retailers. SEO-tuned (unique title/description/og). This is what we'd link from the homepage and from cold outreach.

### 2. `/app/subscription` — consumer subscription/usage page
For logged-in consumers. Shows:
- Current plan (Free vs. Pro if/when we add one — for now: Free)
- Try-ons used this month vs. quota (`try_on_count_this_month` / limit)
- Reset date (1st of next month)
- Upgrade CTA (placeholder — wired but disabled until we add a consumer paid tier)
- Account actions: change email, delete account

This closes the loop on the quota system we just shipped — right now consumers can hit the limit with no UI to see why.

### 3. `/retailer/api-keys` — programmatic widget access
Inside the portal (gated). Lets a retailer:
- View their widget embed token (already exists on `retailers.widget_token`)
- Regenerate the token (invalidates the old embed — confirm modal)
- Copy embed snippet for their site
- View API key for headless use (new column: `retailers.api_key`, hashed)
- Regenerate API key

This unlocks Shopify / custom-storefront integrations without us building a full OAuth app.

## Out of scope (next chunks after this)

- Admin audit log table + viewer
- Retailer impersonation from admin
- CSV analytics export
- Consumer paid tier (just the UI shell now; pricing decision later)
- Email domain DNS — still pending user action, doesn't block this

## Technical details

**Database migration:**
- `retailers.api_key_hash text` (nullable, indexed)
- `retailers.api_key_last_four text` (display only)
- No raw key stored — we show the full key once on generation, then only the last 4

**New files:**
- `src/routes/pricing.tsx` already exists — audit it, expand if thin, otherwise rename plan to "polish existing"
- `src/routes/_authenticated.app.subscription.tsx`
- `src/routes/portal.api-keys.tsx`
- `src/lib/api-keys.functions.ts` — `generateApiKey`, `revokeApiKey` server fns (auth-protected via `requireSupabaseAuth`)
- `src/components/portal/ApiKeyCard.tsx`, `EmbedSnippetCard.tsx`
- `src/components/app/QuotaCard.tsx`

**Edits:**
- `src/routes/portal.tsx` — add "API keys" nav item
- `src/routes/_authenticated.app.index.tsx` or app nav — link to `/app/subscription`
- `src/routes/index.tsx` — ensure homepage links to `/retailer/pricing`

**Patterns reused:** `useSubscription`, `useRetailerStatus`, Paddle customer-portal flow already wired in `/portal/billing`.

## Why this order

These are the three "where do I go to do X" gaps real users will hit in the first week post-launch. Everything bigger left on the list (audit log, impersonation, CSV export) is admin-side and can wait until we have actual retailers using the product.

Approve and I'll ship all three in one pass.
