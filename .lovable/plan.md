# Testing the dunning flow

The card `4000 0027 6000 3184` succeeds on the **first** charge and then declines on the **next** charge. To see your past-due UI and the payment-failed email, you need to (1) subscribe with it, then (2) force Paddle to attempt a renewal early.

## Step 1 — Subscribe with the dunning card

In the preview (test mode), at `/portal/billing` (retailer) or `/pricing` (consumer):

- Pick any plan and check out
- Card: `4000 0027 6000 3184`
- Expiry: any future date (e.g. `12/30`)
- CVC: `123`
- Name / ZIP: anything

Checkout completes, `subscription.created` fires, the row lands in `subscriptions` with `status = 'active'` (or `trialing` if you used the retailer trial flow). No dunning yet — the first charge succeeded.

## Step 2 — Fast-forward the next billing date

Paddle won't let me move `next_billed_at` for a trialing subscription, so:

- **Retailer trial:** in the Payments dashboard, cancel the trial and resubscribe with the dunning card on a monthly plan so it starts as `active` immediately, OR just use the consumer flow which has no trial.
- **Consumer (Plus/Pro):** subscribes as `active` straight away — easiest path.

Once the subscription is `active`, I'll move the next billing date ~31 minutes into the future via the Paddle API (must be >30 min out). Tell me to "fast-forward dunning for &lt;email&gt;" and I'll:

1. Look up the subscription ID for that user
2. Call `PATCH /subscriptions/{id}` with `next_billed_at` = now + 31 min and `proration_billing_mode = 'do_not_bill'`
3. Wait ~30 min for Paddle to attempt the renewal

When the renewal attempt declines, Paddle fires:
- `transaction.payment_failed`
- `subscription.updated` with `status = 'past_due'`

The webhook handler writes `past_due` to the row.

## Step 3 — Verify the UI

- The `PastDueBanner` should appear at the top of the app/portal with "Your last payment failed. Update your card."
- The link goes to `/portal/billing` (retailer) or `/pricing` (consumer)
- The consumer or retailer payment-failed email should be queued (check the email log / inbox you used at signup)
- Access is **not** revoked yet — Paddle keeps retrying for a few days; revocation only happens when Paddle finally marks it `canceled`

## Step 4 — Recover (optional)

Open the Manage Billing portal from `/portal/billing` or `/app/subscription`, swap the card to `4242 4242 4242 4242`, and trigger another renewal (same fast-forward trick). Status flips back to `active` and the banner disappears.

## Shortcut if you don't want to wait

Instead of fast-forwarding, I can fire a simulated `subscription.updated` event with `status: past_due` straight at the webhook via Paddle's Simulations API. That exercises the handler + banner + email immediately but doesn't exercise a real declined charge. Useful for a quick UI check; use the fast-forward path for a true end-to-end test.

---

Tell me which path you want (real fast-forward vs simulated event) and the email of the account to use, and I'll run it in build mode.
