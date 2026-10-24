# Billing audit fixes

- [x] Recover subscription state from checkout and paid-invoice webhooks; surface database failures for retry.
- [x] Enforce retailer plan caps on downgrades and publication.
- [x] Configure and verify product tax codes in test and live Stripe.
- [x] Correct payment/legal wording and add private optional retailer VAT number.
- [x] Secure scheduled hooks and update their callers.
- [x] Tighten paid-subscription checks in trial expiry handling.
- [x] Deprecate unused Paddle columns safely without breaking the published app.
- [x] Run 22 focused tests; verify authenticated settings, billing and Stripe checkout opening.
- [ ] Complete a payment and confirm provider-delivered recovery events, tax calculation and invoice contents: requires a completed checkout; no purchase was made.
- [ ] Publish updated app: awaiting explicit publish request. Scheduled callers now require the updated handlers.