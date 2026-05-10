
## Goal

Make the retailer portal self-serve from sign-up to live widget on their site. Two threads, shipped together:

1. **Activation flow** — turn the dashboard's static "Get up and running" list into a real, progress-tracking checklist that drives new retailers to the moment of value (widget live on store).
2. **Widget embed UI** — give retailers a Widgets page where they can configure, preview, copy the embed snippet, and restrict it to their domain.

---

## 1. Activation checklist (on `/portal`)

Replace the current 3-line static list with a 5-step checklist driven by real data. Each step has a status (done / current / locked) and a CTA. The first incomplete step is highlighted.

Steps:
1. **Finish profile** — `retailers.onboarding_completed` true. (Already gated upstream; shows as done for anyone past onboarding.)
2. **Add your first wig** — `metrics.wigs > 0`. CTA → `/portal/catalog/new`.
3. **Publish a wig** — `metrics.published > 0`. CTA → `/portal/catalog`.
4. **Create your widget** — `widget_embeds` row exists for this retailer. CTA → `/portal/widget`.
5. **Embed on your store** — at least one `try_on_events` row with this `retailer_id` exists (proves the widget loaded on a real domain). CTA → `/portal/widget` (with "copy snippet" pulse).

When all 5 are done, collapse the card into a single "You're live — view your widget" link.

Visual: keep the same `rounded-2xl border ... bg-card` block, but each row gets a numbered circle (filled gold when done), title, one-line helper text, and a small action button on the right. The active step gets a `bg-sand/40` background.

A new server function `getActivationStatus` returns `{ profileDone, hasWig, hasPublished, hasWidget, hasFirstTryOn }` in one round-trip so the dashboard doesn't fire 5 queries. It uses `count: 'exact', head: true` like `getRetailerMetrics`.

Trial banner stays where it is. Past-due banner stays where it is.

---

## 2. Widgets page (`/portal/widget`)

New route file `src/routes/portal.widget.tsx`. Add a "Widget" sidebar item in `src/routes/portal.tsx` between Catalog and Settings, icon `Code2`.

### Layout

Two columns on desktop, stacked on mobile:

**Left — Configuration card**
- **Widget type** (radio): `full` (gallery + try-on) or `button` (single CTA button overlay). Stored in `widget_embeds.widget_type`.
- **CTA text** (input, max 60) — pulled from / writes to `retailers.widget_cta_text` so it stays in sync with what we already capture.
- **Accent color** (color picker) — defaults to `retailers.brand_primary`. Stored in `widget_embeds.config.accent_color`.
- **Allowed domains** (tag input) — chips like `yourshop.com`, `www.yourshop.com`. Stored in `widget_embeds.allowed_domains` (text[]). Empty array = allow any domain (with a warning chip).
- **Active** toggle — `widget_embeds.is_active`.
- "Save changes" button (sticky at bottom of card).

**Right — Install card**
- **Embed snippet** (read-only, monospace, with copy button):
  ```html
  <script async
    src="https://wigsmi.lovable.app/embed/widget.js"
    data-wigsmi-token="<embed_token>"></script>
  <div data-wigsmi-widget></div>
  ```
- "Copy snippet" button (uses `navigator.clipboard`, shows "Copied" for 2s).
- Helper text: paste in store theme or product page. Mention Shopify / WooCommerce by name without giving step-by-step (link to a placeholder docs anchor `#`).
- **Embed token** field with a "Rotate token" button (regenerates `embed_token` via `gen_random_uuid()`; warns this invalidates the current snippet).
- **Live preview** below — an `<iframe src="/embed/widget/$token" style="height:600px;width:100%;border-radius:12px">` rendered in-page so the retailer sees what shoppers will see.

If there's no `widget_embeds` row yet, show a single full-width "Create my widget" button that POSTs `createMyWidget` and reloads.

### Server functions (new, in `src/lib/retailer.functions.ts`)

- `getMyWidget()` — returns the retailer's `widget_embeds` row + retailer brand color/CTA defaults.
- `createMyWidget()` — inserts a `widget_embeds` row with sensible defaults (`widget_type='full'`, `is_active=true`, `config={accent_color: retailer.brand_primary}`, `allowed_domains=[]`). One per retailer (RLS already scopes by retailer_id).
- `updateMyWidget({ widget_type, allowed_domains, config, is_active, cta_text })` — updates `widget_embeds` and writes `cta_text` back to `retailers.widget_cta_text`.
- `rotateMyWidgetToken()` — sets `embed_token = gen_random_uuid()` server-side via a small RPC or `update` + `select`.

All four use `requireSupabaseAuth` and rely on existing RLS (`widget_embeds: retailer own`).

### Public embed endpoint

The actual loader script and rendered widget are out of scope for this plan (they'd ship as a second milestone — see "Out of scope" below). For now, the **preview iframe** in the Widgets page renders a placeholder `/embed/widget/$token` route that shows: brand-colored header with CTA text, grid of the retailer's first 6 published wigs (pulled by token via a public server function, no auth needed), and a footer "Powered by Wigsmi". This is enough to validate the snippet copy/paste loop end-to-end.

New route file: `src/routes/embed.widget.$token.tsx` (path `/embed/widget/$token`). Renders a minimal standalone shell (no portal chrome). Calls a new server function `getPublicWidgetData({ token })` that:
- Looks up `widget_embeds` by `embed_token`, joins `retailers` (name, brand_primary, logo_url) and `wigs` (first 12 published).
- Uses `supabaseAdmin` (server-only, in a `.functions.ts` file — see `tanstack-supabase-integration` for the import-graph constraint) because the caller is unauthenticated.
- Returns 404 if token unknown or `is_active=false`.
- Logs nothing to `try_on_events` yet — that fires on actual try-on, not page load.

The `<iframe>` works inside the portal page and would work inside any retailer site that pastes it directly. The full `widget.js` loader (auto-injects iframe + handles postMessage resize + verifies `allowed_domains`) is the follow-on milestone.

---

## Files touched

- `src/lib/retailer.functions.ts` — add `getActivationStatus`, `getMyWidget`, `createMyWidget`, `updateMyWidget`, `rotateMyWidgetToken`, `getPublicWidgetData`.
- `src/routes/portal.tsx` — add Widget sidebar link.
- `src/routes/portal.index.tsx` — replace static checklist with data-driven one calling `getActivationStatus`.
- `src/routes/portal.widget.tsx` — new page (config + install).
- `src/routes/embed.widget.$token.tsx` — new public preview page.
- No DB migration needed — `widget_embeds` table already has every column we need.

## Test plan

1. As a new retailer just past onboarding, dashboard shows only "Finish profile" ticked; "Add your first wig" is the active step.
2. Add a wig → step 2 ticks. Publish it → step 3 ticks.
3. Navigate to `/portal/widget`, click "Create my widget" → row appears, preview iframe loads with brand color + first wigs.
4. Edit CTA to "Try this wig on", add `example.com` to allowed domains, change accent color, save → page reloads with new values; `retailers.widget_cta_text` updated.
5. Copy snippet → clipboard contains the script tag with the correct token.
6. Rotate token → confirm dialog → snippet and preview iframe both update to new token; old token now 404s.
7. Toggle `is_active` off → preview iframe shows "Widget paused" empty state.
8. Activation step 4 ticks once a widget row exists.

## Out of scope (next milestone)

- The actual `widget.js` loader script and the production widget bundle (with try-on, postMessage resize, `allowed_domains` enforcement).
- Step 5's "first real try-on event" detection beyond just checking `try_on_events` exists — works as-is once the real widget ships.
- Per-domain analytics on the Widgets page.
