# Roadmap

## In progress — build both money suggestions (user approved 2026-11-01)

### A. One-off try-on top-up pack (10 try-ons for £2.99)
- [ ] Database: `try_on_credits` table + RLS/grants; `consume_try_on` falls back to credits; `refund_try_on` credits-aware
- [ ] Stripe: one-time product/price `tryon_pack_10` (299 pence GBP)
- [ ] Checkout: allow the pack price id, webhook grants credits (idempotent), success-page recovery
- [ ] UI: pricing page pack card, account page balance + top-up button, try-on limit CTA, quota shows credits
- [ ] Copy: pricing/FAQ/brochure mention the pack
- [ ] Tests: pack price validation + credit math

### B. Commission on tracked wig sales (retailer pays Wigsmi a % )
- [ ] Database: retailer commission columns, `affiliate_clicks`, `affiliate_sales` + RLS/grants
- [ ] Tracked outbound link route `/go/$wigId` (records click, safe redirect)
- [ ] Product page buy button routes through `/go` when the retailer runs commission
- [ ] Server functions: settings, log sale, list sales/clicks, settle (admin)
- [ ] Portal page `/portal/commission` + sidebar link
- [ ] Admin settlement view
- [ ] Legal copy on /terms and /privacy
- [ ] Tests: commission math + rate bounds + click token rule

### Shared
- [ ] Typecheck/build clean, tests pass
- [ ] Browser check: pack checkout opens, commission page loads
- [ ] Publish reminder to user
