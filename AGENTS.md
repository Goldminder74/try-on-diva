# Authentication

- Existing protected shopper, retailer and admin layouts are client-only (`ssr: false`), because their sign-in session lives in browser storage; retain server-side authorization on every private server function.
- Retailer login uses router navigation and a shared safe return-destination helper, so requested pages and checkout selections survive sign-in without a full-page reload.

# Billing

- Shared billing rules define plan-family validation, published catalogue caps and payment-settlement recovery so previews, switches and webhook recovery agree.
- Retailer VAT details live in owner-only retailer_billing_details, never public retailer rows, because catalogue visitors must not read billing information.
- Scheduled HTTP hooks require CRON_SECRET; pg_cron reads its private service-role-only credential row rather than storing a literal in job commands.
- Keep existing cron cadences: daily trial handling and monthly quota reset; new polling jobs are unnecessary.
- Stripe tax codes are assigned upfront per offering and environment, never patched during checkout; eligible consumer AI service and retailer SaaS remain distinct classifications.