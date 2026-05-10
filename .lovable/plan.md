
# Lifecycle plumbing: trials, emails, and quota reset

This finishes the last piece of core business logic. Three things ship together because they share infrastructure (pg_cron, Lovable Emails, the retailer/consumer lifecycle).

I'm making three opinionated calls so we can move:

1. **Emails** → Lovable Emails (built-in, no DNS friction, uses `wigsmi.com` automatically). Resend stays available as a separate connector if we ever need marketing later.
2. **Trial-end behaviour** → **Hard lock**. When a retailer's trial expires without payment, their wigs are auto-unpublished (hidden from `/catalog` and widgets) and the portal shows a paywall. Republished on subscribe. Cleaner than soft-lock — consumers never see a broken "Try on" button that links to a dead retailer.
3. **Quota reset** → Calendar-month boundary (matches the existing `try_on_month_reset` column default).

If either #2 or #3 is wrong, say which one and I'll revise.

---

## Part 1 — Trial lifecycle enforcement

**Daily cron at 02:00 UTC** (`/api/public/hooks/trials-tick`):
- Find retailers where `trial_ends_at < now()`, no active subscription, `is_active = true`.
  - Set `is_active = false` → existing RLS already hides them from public reads.
  - Set `is_published = false` on all their wigs.
  - Insert an analytics event `trial_expired`.
  - Enqueue **"Trial ended"** email.
- Find retailers where `trial_ends_at` is **3 days away** and no email yet sent for this milestone.
  - Enqueue **"Trial ending in 3 days"** email.
  - Track sent-state on a new `retailer_lifecycle_events` table (retailer_id + event_type + sent_at, unique) so we don't double-send.

**Portal paywall** (`/retailer/*`):
- New helper `useRetailerStatus()` → returns `{ trialDaysLeft, isPaywalled, hasSubscription }`.
- When `isPaywalled`, the portal layout swaps the main content for a paywall card: "Your trial has ended" + CTA → `/retailer/pricing`. Settings page stays accessible (so they can still log out / contact support).
- Trial banner already exists; extend it to show "Trial ends in 3 days" in amber when ≤3 days left.

**On successful subscription** (handled in the existing Paddle webhook):
- Republish wigs that were auto-unpublished by the cron (track this via a new `auto_unpublished_at` column on `wigs` — only republish wigs that were auto-unpublished, not ones the retailer manually hid).
- Set `is_active = true` on the retailer.
- Enqueue **"Welcome — you're live"** email.

## Part 2 — App emails (via Lovable Emails)

Six React Email templates registered in `src/lib/email-templates/`:

| Template | Trigger |
|---|---|
| `retailer-welcome` | Retailer completes signup (existing signup flow) |
| `retailer-trial-ending` | Cron, 3 days before `trial_ends_at` |
| `retailer-trial-ended` | Cron, on the day `trial_ends_at < now()` |
| `retailer-subscribed` | Paddle `subscription.created` webhook |
| `retailer-payment-failed` | Paddle `transaction.payment_failed` webhook |
| `consumer-welcome` | First sign-in of a new consumer |

All templates use the Wigsmi mahogany/cream palette and the same `Inter`/serif heading stack as the app. Sender: `notify@wigsmi.com` (Lovable Emails will provision this subdomain).

No marketing emails. No bulk loops. Each send is 1:1, triggered by a specific event, with `idempotencyKey = ${event_type}-${retailer_id_or_event_id}`.

## Part 3 — Monthly try-on quota reset

**Monthly cron, 1st of month at 00:05 UTC** (`/api/public/hooks/quota-reset`):
- `UPDATE consumer_profiles SET try_on_count_this_month = 0, try_on_month_reset = date_trunc('month', now())::date WHERE try_on_month_reset < date_trunc('month', now())::date;`

Pure SQL job — no email, no webhook.

---

## Files & migrations

**Migration:**
- `retailer_lifecycle_events` table (retailer_id, event_type, sent_at; unique on retailer_id+event_type).
- `wigs.auto_unpublished_at timestamptz` column.
- Two pg_cron schedules (trials-tick daily, quota-reset monthly).

**New server routes:**
- `src/routes/api/public/hooks/trials-tick.ts`
- `src/routes/api/public/hooks/quota-reset.ts`

**New email templates** (six files in `src/lib/email-templates/` + `registry.ts` update).

**New client lib:** `src/lib/email/send.ts` (thin helper around `/lovable/email/transactional/send`).

**Edits:**
- `src/routes/retailer.tsx` — paywall layout when `isPaywalled`.
- Existing Paddle webhook (`src/routes/api/public/payments/webhook.ts`) — enqueue `retailer-subscribed` / `retailer-payment-failed`, republish auto-unpublished wigs on subscription created.
- Existing signup flow — enqueue welcome emails.

**Prerequisite tool calls** (no user action needed beyond approving the plan):
1. `email_domain--check_email_domain_status` — confirm wigsmi.com status.
2. If no domain: open setup dialog for `wigsmi.com`.
3. `email_domain--setup_email_infra` → `email_domain--scaffold_transactional_email`.

## Out of scope (next chunk)
- `/app/subscription`, `/retailer/api-keys`, `/retailer/pricing` polish routes.
- Admin audit log, retailer impersonation.
- CSV analytics export.

## Acceptance
- A retailer with `trial_ends_at` set to yesterday is, after the next cron tick, `is_active=false`, their wigs are unpublished, and they receive one "trial ended" email. Their `/retailer` shows the paywall.
- Subscribing republishes the wigs and sends the "welcome — you're live" email.
- A consumer with `try_on_count_this_month = 50` on Jan 31 sees `0` after the Feb 1 cron.
- All six templates render in the Lovable email preview with brand styling.
- No marketing emails, no bulk sends, all sends idempotent.
