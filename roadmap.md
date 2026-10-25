# Monitoring billing findings

- [x] Verify Stripe upsert conflict target against the current database: the non-partial unique index already exists; finding is stale.
- [x] Preserve selected-plan and protected-page query strings after retailer login; six retailer redirect tests and eleven callback tests passed. Signed-in preview opened the selected Growth yearly checkout; preview validation passed.

# Billing audit fixes

- [x] Recover subscription state from checkout and paid-invoice webhooks; surface database failures for retry.
- [x] Enforce retailer plan caps on downgrades and publication.
- [x] Configure and verify product tax codes in test and live Stripe.
- [x] Correct payment/legal wording and add private optional retailer VAT number.
- [x] Secure scheduled hooks and update their callers.
- [x] Tighten paid-subscription checks in trial expiry handling.
- [x] Deprecate unused Paddle columns safely without breaking the published app.
- [x] Run 22 focused tests; verify authenticated settings, billing and Stripe checkout opening.
- [x] Complete a payment and confirm recovery sync, tax calculation and invoice: sandbox Starter purchase completed; found and fixed a silent upsert failure (partial unique index broke ON CONFLICT); subscription row written, billing page shows active plan, paid invoice £59.29 with tax. Webhook delivery itself is untestable from localhost (Stripe delivers to the preview/published URL).
- [ ] Confirm publication: requested during Google Search Console setup; the single live check still served the previous deployment.

# SEO corrections

- [x] Remove duplicate titles and add self-referencing page metadata.
- [x] Label catalogue/FAQ search, gallery buttons and the Instagram link.
- [x] Add Organization/WebSite and product structured data; stale composite finding remains unresolved because FAQPage is not an appropriate SEO addition.
- [x] Install a public router-derived sitemap and crawler rules.
- [ ] Verify Google Search Console and submit sitemap: account connected and verification tag added; awaiting deployment because live HTML still lacks the tag and sitemap returns 404.
- [x] Verify 56 rendered pages, sitemap exclusions and 22 tests; record six completed findings. Structured-data composite remains failing because its FAQPage recommendation was intentionally not implemented.
