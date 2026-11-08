# Roadmap

## Official social links (2026-11-08)
- [x] Add the supplied Facebook and Instagram pages to the website footer and verify both destinations; desktop and phone checked

## Catalogue cleanup and recruitment (2026-11-05)
- [x] Remove all 48 current unauthorised wigs; live catalogue/try-on empty, old product 404, sitemap zero wig URLs
- [x] Find two retailer pilots plus reserves with verified public websites/contact routes
- [x] Find ten publicly contactable wig-user/creator prospects; UK is creator-declared, exact age/current wig use/consent require confirmation
- [x] Prepare invitations, feedback questions and a gated paid-promotion test plan; no sending or spending
- [ ] Publish truthful empty-catalogue/offer copy — requires publication; stock removal is already live
- [ ] Retailer permission-cleared stock, tester consent and successful generation — await participating retailers/shoppers
- [ ] Confirm photo-provider retention/deletion claims before tester consent — provider terms/settings not verified in recruitment research
- [ ] Paid promotion — waits for the preceding checks and approved budget/platform

## Luxury-beauty acquisition and onboarding kit (2026-11-05)
- [x] Revise invitation take for human micro-expressions and explicit “wigs-me” pronunciation; versioned clip, revised film and ZIP checked
- [ ] Human watch-with-sound approval for revised invitation pronunciation and realism — awaits user review; cannot establish from stills alone
- [x] Confirm generated creator format; center adult Black women
- [x] Approve first shopper film script/start frames
- [x] Produce shopper creator film (14s); inspect frames, caption placement and audio levels
- [ ] Approve retailer creator film script/start frame — waits on user's approval before generation
- [x] Produce shopper 26s and retailer 42s instructional onboarding overviews; agents completed visual/motion reviews, parent inspected key frames
- [x] Create eight social concepts in feed/story formats (16 images), sales/welcome/quick-start PDFs, intake CSV and outreach/follow-up guide
- [x] Inspect all nine PDF pages; organize initial Files collection
- [ ] Release authentic result/portal walkthrough footage — needs permission-cleared successful try-on and retailer session; orientation videos must not imply these were recorded

## Both money suggestions — built (user approved 2026-11-01)

### A. One-off try-on top-up pack (10 try-ons for £2.99)
- [x] Database: `try_on_credits` table + RLS/grants; `consume_try_on` falls back to credits; `refund_try_on` credits-aware
- [x] Stripe: one-time product/price `tryon_pack_10` (299 pence GBP) — verified in account: 299 gbp, one_time, lookup key set
- [x] Checkout: pack price id allowed, `packPriceId` metadata on session, webhook grants credits (idempotent), success-page recovery
- [x] UI: pricing page pack card, account page balance + top-up button, try-on limit CTA, quota includes credits
- [x] Copy: pricing + FAQ + terms + privacy mention the pack
- [x] Brochure PDF updated with pack + commission
- [x] Tests: pack config, price-id validation, expiry math, idempotent grant (11 tests)

### B. Commission on tracked wig sales (retailer pays Wigsmi a %)
- [x] Database: retailer commission columns, `affiliate_clicks`, `affiliate_sales` + RLS/grants
- [x] Tracked outbound link route `/go/$wigId` — verified: 302 to the shop's product page, reference code attached only when the shop runs commission and the address is on its own site
- [x] Product page buy button routes through `/go`
- [x] Server functions: settings, log sale, list sales/clicks, settle (admin only)
- [x] Portal page `/portal/commission` + sidebar link — verified rendering in preview
- [x] Admin settlement view `/admin/commission` + sidebar link
- [x] Legal copy on /terms and /privacy
- [x] Tests: commission math, rate bounds, click token rule, safe redirect domain rule

### Shared
- [x] Build clean (`build OK`), 59 tests pass
- [x] Browser: pricing pack card shows; commission page loads; `/go` redirect verified both branches
- [ ] Pay the pack with a real test card — Stripe form fills correctly but stalls on "Processing"; needs a manual card entry in the preview
- [ ] Consumer account page credits row not seen (the preview session is a retailer account)
- [ ] Publish so the pack and commission go live
- [x] Company name written as "Sherwood Consulting Services Ltd" (not all caps) everywhere
- [x] Brochure PDF: add £2.99 pack + retailer commission
