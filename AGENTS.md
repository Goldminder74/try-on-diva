# Authentication

- Existing protected shopper, retailer and admin layouts are client-only (`ssr: false`), because their sign-in session lives in browser storage; retain server-side authorization on every private server function.
- Retailer login uses router navigation with `href` for the shared safe return-destination URL, so query strings and checkout selections are parsed without a full-page reload.

# Billing

- Shared billing rules define plan-family validation, published catalogue caps and payment-settlement recovery so previews, switches and webhook recovery agree.
- Retailer VAT details live in owner-only retailer_billing_details, never public retailer rows, because catalogue visitors must not read billing information.
- Scheduled HTTP hooks require CRON_SECRET; pg_cron reads its private service-role-only credential row rather than storing a literal in job commands.
- Keep existing cron cadences: daily trial handling and monthly quota reset; new polling jobs are unnecessary.
- Stripe tax codes are assigned upfront per offering and environment, never patched during checkout; eligible consumer AI service and retailer SaaS remain distinct classifications.
# SEO

- Public single-wig lookups enforce published and undeleted status, like catalogue lists, so archived stock cannot reappear through deep links.

- Keep page-specific metadata and canonical URLs on leaf routes; the root supplies sitewide defaults only to prevent duplicate titles and shared previews.
- Every route declares staticData.sitemap; private layouts exclude their subtrees, and published, undeleted products are read with public credentials and full pagination, never admin access or generation-time lastmod.
- Guides are markdown files in src/content/guides (frontmatter: title, metaTitle, metaDescription, slug, datePublished, faq), loaded by src/lib/guides.ts; adding a guide means adding one file, so pages and sitemap stay in sync.
- First-visit UTM tags live in the first-party `wigsmi_utm` cookie (src/lib/utm.ts) so server handlers can read them without client plumbing.
