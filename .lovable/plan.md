# Seed Data + Admin Section

Two tightly coupled pieces shipped together: a deterministic seed script that fills the database with realistic demo content, and the full `/admin/*` surface so Ayo (the admin) can actually moderate that content. No schema changes — the existing tables and RLS policies (admin role has wide read/write via `has_role(auth.uid(), 'admin')`) already cover everything.

## Part 1 — Seed script

A one-shot Node script (`scripts/seed.ts`) committed to the repo, run locally with `bun run seed`. Idempotent: re-running upserts on stable slugs/emails, never duplicates. Uses the service-role key from `.env` (already set as a server secret, mirrored locally) and the admin Supabase client.

**Creates:**
- **Admin user** — `ayo@wigsmi.com` (password: `Wigsmi!Admin2026`), display name "Ayo", role `admin`.
- **2 retailer owners** — `owner@crownandcoils.com` ("Crown & Coils"), `owner@silkscalp.co` ("Silk & Scalp"). Each gets:
  - Auth user (password printed once at end of script run for the operator)
  - `profiles` row (auto-created by `handle_new_user` trigger)
  - `user_roles` row promoted to `retailer`
  - `retailers` row with business name, slug, country (UK / US), brand_primary, currency, contact_name, website, logo placeholder, `onboarding_completed = true`, `trial_ends_at = now() + 60d`
  - One `widget_embeds` row each (default config, `allowed_domains: []`)
- **2 demo consumers** — `maya@example.com`, `zola@example.com` (password printed). Empty wishlists/quiz so the operator can test those flows.
- **20 wigs** spread 12/8 across the two retailers. Mix of style_type (`bob`, `lace-front`, `closure`, `pixie`, `braided`, `loose-wave`, `kinky-straight`), hair_texture (`4a`, `4b`, `4c`, `straight`, `wavy`, `curly`), hair_length (`short`, `medium`, `long`, `bust`), hair_origin (`brazilian`, `peruvian`, `synthetic`), prices £45–£420, realistic names ("Lagos Honey 22\"", "Brooklyn Bob 12\"", "Goddess Kinky 26\"", etc.) and 1–2 sentence descriptions. Images use `https://picsum.photos/seed/<wig-slug>/800/1000` (seeded so they stay stable across runs). **Comment at top of file flags every image URL as demo content.**
- **5 featured wigs** — `is_featured = true`, `featured_rank` 1–5, distributed across both retailers.
- **Synthetic analytics data** (optional, controlled by `--with-analytics` flag) — ~400 `try_on_events` and ~120 `wig_clicks` spread over the last 30 days across all 20 wigs, so the analytics dashboard isn't empty in demos. Devices/sources/countries varied. Skipped by default to keep the seed fast.

**Output:** Prints a summary table with all created credentials so the operator can sign in immediately.

## Part 2 — Admin section (`/admin/*`)

New layout route + 5 child pages. Mirrors the visual language of `/portal` (mahogany sidebar, cream main, gold accents) but with a distinct "Admin" label so it can never be confused with a retailer view. Built entirely on existing tables and RLS — admins already have read access everywhere via the `has_role` policy clauses.

### Route structure
```text
src/routes/
  admin.tsx                   layout: gates on admin role, renders sidebar + Outlet
  admin.index.tsx             /admin                  platform overview
  admin.retailers.tsx         /admin/retailers        retailers list + detail drawer
  admin.consumers.tsx         /admin/consumers        consumers list
  admin.catalog.tsx           /admin/catalog          all wigs, moderation actions
  admin.featured.tsx          /admin/featured         featured-wig editor
```

### Access gating
`admin.tsx` runs `beforeLoad`:
1. Require auth (redirect to `/auth/login` if not signed in).
2. Query `user_roles` for `role = 'admin'` for the current user; redirect to `/app` if not an admin.

A server function `getAdminContext` (in `src/lib/admin.functions.ts`) double-checks the role server-side and is called by every admin page loader — defense in depth, since RLS already enforces it but UX should hide 403s.

### Pages

**`/admin` — Platform overview**
KPI strip: total retailers, active retailers (trial not expired OR paid sub), total consumers, total wigs, total try-ons (30d), total clicks (30d), MRR estimate (sum of active paid subs converted to monthly). Below: 30-day try-ons line chart (reuses the analytics chart component) and a "Recent signups" list (latest 10 retailers + latest 10 consumers, tabbed).

**`/admin/retailers` — Retailers**
Sortable table: business name, slug, country, plan, trial_ends_at, wig count, try-ons (30d), status (active/suspended), created_at. Row click opens a side drawer with full profile, the retailer's wigs (link to `/admin/catalog?retailer=<id>`), subscription row (if any), and three actions:
- **Suspend / Reactivate** — toggle `retailers.is_active` (suspended retailers' wigs disappear from public catalog via existing RLS on the `is_active` retailer policy).
- **Extend trial** — `+30d` button that updates `trial_ends_at`.
- **Impersonate** (optional, marked `// TODO: requires service-role flow`, left as a no-op button with a tooltip for now to avoid a security hole).

Search box filters by business name / slug / contact email.

**`/admin/consumers` — Consumers**
Sortable table: display name, email, country, try-ons this month, wishlist count, signup date. Row click opens drawer with profile, quiz answers, last 10 try-on events. Single action: **Disable account** — sets a flag on `user_roles` (covered by existing admin policy on that table) and signs them out. Since there's no `disabled` column today, this action is rendered but flagged behind a `// TODO: needs schema column` — listed as a known gap in the closing summary rather than added in this chunk (avoids unplanned schema change).

**`/admin/catalog` — Catalog moderation**
All wigs across all retailers in a grid (same `WigCard` look but with retailer badge in the corner). Filters: retailer, style, texture, is_published, is_featured, in_stock. Actions per wig: **Unpublish** (`is_published = false`), **Republish**, **Feature** (links to `/admin/featured` with that wig preselected), **Delete** (hard delete via service-role server fn — confirm dialog). Pagination at 60 per page.

**`/admin/featured` — Featured wig editor**
Up to 5 slots, drag-to-reorder. Each slot shows the current wig (image, name, retailer) and an "Edit" button that opens a wig picker (searchable list of all published wigs). Save persists `is_featured` and `featured_rank` 1..5 on the chosen wigs and clears the flag on any wig that was previously featured but is no longer in the list. The consumer home (`_authenticated.app.index.tsx`) and the marketing landing already query `is_featured order by featured_rank` so changes appear instantly.

### Server functions

A single new file `src/lib/admin.functions.ts` exposes:
- `getAdminOverview()` — KPIs for the index page
- `listRetailers(filters)` / `getRetailerDetail(id)` / `setRetailerActive(id, active)` / `extendTrial(id, days)`
- `listConsumers(filters)` / `getConsumerDetail(userId)`
- `listAdminCatalog(filters, page)` / `setWigPublished(id, published)` / `deleteWig(id)`
- `getFeaturedWigs()` / `setFeaturedWigs(orderedWigIds[])`
- `searchPublishedWigs(query)` (for the featured picker)

All use `requireSupabaseAuth` middleware plus an inline `has_role(userId, 'admin')` check. Destructive ops (`deleteWig`, `setRetailerActive(false)`) use `supabaseAdmin` (service role) so the action succeeds regardless of RLS edge cases; the admin role check on the user is the security boundary.

### Navigation entry point
The existing portal sidebar (`src/routes/portal.tsx`) gets a conditional "Admin" link rendered only when the signed-in user has the admin role (queried once by the layout). Clicking it goes to `/admin`. The admin layout has its own sidebar — it does not nest inside `/portal`.

### Out of scope (deferred)
- Consumer disable (needs schema column)
- Retailer impersonation (needs service-role session handoff)
- Platform-level analytics export
- Audit log of admin actions

## Acceptance criteria

- `bun run seed` from a fresh DB produces: 1 admin, 2 retailers (each with widget embed + 8–12 wigs), 2 consumers, 20 wigs total, 5 featured. Idempotent on re-run.
- Signing in as Ayo lands on `/app`; the "Admin" link is visible in the user menu and goes to `/admin`.
- `/admin/*` redirects non-admins away. All five pages render with seeded data.
- Suspending a retailer hides their wigs from `/catalog` immediately.
- Unpublishing a wig removes it from consumer-facing surfaces but keeps it visible to the owning retailer in `/portal/catalog`.
- Reordering featured wigs is reflected on the consumer home on next load.
- No new tables, no new RLS policies — verified by re-running the migration list.
