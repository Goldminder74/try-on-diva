# Authentication

- Existing protected shopper, retailer and admin layouts are client-only (`ssr: false`), because their sign-in session lives in browser storage; retain server-side authorization on every private server function.
- Sign-up metadata is browser-written, so the new-user trigger only accepts consumer or retailer; admin is never granted at sign-up.
- Rules about plans, quotas, counters and commission live in database guard triggers (drizzle/migrations/0010) as well as server functions, because signed-in users can call the data API directly; a new protected column needs adding to its guard.
- Retailer login uses router navigation with `href` for the shared safe return-destination URL, so query strings and checkout selections are parsed without a full-page reload.

# Billing

- Shared billing rules define plan-family validation, published catalogue caps and payment-settlement recovery so previews, switches and webhook recovery agree.
- Retailer VAT details live in owner-only retailer_billing_details, never public retailer rows, because catalogue visitors must not read billing information.
- Scheduled HTTP hooks require CRON_SECRET; pg_cron job commands currently still send a compatibility apikey header literal, to be replaced by a private service-role-only credential row.
- Keep existing cron cadences: daily trial handling and monthly quota reset; new polling jobs are unnecessary.
- Stripe tax codes are assigned upfront per offering and environment, never patched during checkout; eligible consumer AI service and retailer SaaS remain distinct classifications.
- The payment mode comes from the build's publishable key (deploymentStripeEnv), never from the browser; subscriptions and try-on packs only count in the mode they were bought in.
- Try-ons are spent and refunded by the server through service-role database functions (consume_try_on_as, refund_try_on_as); never grant these to browser roles.
# SEO

- Public single-wig lookups enforce published and undeleted status, like catalogue lists, so archived stock cannot reappear through deep links.

- Keep page-specific metadata and canonical URLs on leaf routes; the root supplies sitewide defaults only to prevent duplicate titles and shared previews.
- Every route declares staticData.sitemap; private layouts exclude their subtrees, and published, undeleted products are read with public credentials and full pagination, never admin access or generation-time lastmod.
- Guides are markdown files in src/content/guides (frontmatter: title, metaTitle, metaDescription, slug, datePublished, faq), loaded by src/lib/guides.ts; adding a guide means adding one file, so pages and sitemap stay in sync.
- First-visit UTM tags live in the first-party `wigsmi_utm` cookie (src/lib/utm.ts) so server handlers can read them without client plumbing.
- Shopper self-service deletion runs only in server functions (src/lib/account.functions.ts); account deletion uses the service role after a typed confirmation and keeps payment records unlinked rather than deleted, because financial records must be retained by law.

# Try-on safety

- Product photos for generation are read from the catalogue by wig id; addresses supplied by the browser are never fetched.
- Anonymous try-ons are reserved before generation and capped per device, per network and per day across all visitors (ANON_TRYON_DAILY_CAP), because browser-issued identifiers can be invented.
- Anonymous try-on images and records are deleted after ANON_RETENTION_DAYS by the daily trials-tick hook (src/lib/retention.ts); keep the privacy page in step with that number.
- Buy links go through /go, which does not count automated visitors; keep rel="nofollow sponsored" on them and /go disallowed in robots.txt.
- Framing rules are set in src/lib/security-headers.ts: pages are frameable by Wigsmi and the Lovable editor only, and a widget with allowed domains only by those sites.
