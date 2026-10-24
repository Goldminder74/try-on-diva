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
- [ ] Publish updated app: awaiting explicit publish request; callers retain the public compatibility header for the old deployment while the new handlers require the private credential.
