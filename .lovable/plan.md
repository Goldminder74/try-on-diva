# Rebuild Paddle from scratch

## Goal

Get checkout working on `/portal/billing` by replacing the current orphaned Paddle sandbox account (which we can't log into) with a fresh one tied to `info@wigsmi.com`.

## Important caveats before we start

1. **The new sandbox account will still be auto-provisioned under your Lovable login email (`ayo.m.ayeni@gmail.com`)**, not `info@wigsmi.com`. Lovable derives the Paddle account owner from your Lovable account. To make `info@wigsmi.com` the actual login email on the Paddle account, you'd need to either:
   - Transfer your Lovable workspace to `info@wigsmi.com` first (Lovable docs: invite as admin → transfer project → delete old account), OR
   - After the rebuild, log into the new Paddle sandbox via password reset and add `info@wigsmi.com` as an additional team member inside Paddle.
2. **Existing test subscription rows in the DB will be orphaned** — they reference Paddle IDs from the old sandbox. No real customers affected (sandbox only). We can leave them or clean them up.
3. **Live environment is untouched** — this is sandbox-only. The published app's live Paddle account is separate and already verified-ready.

## Steps

### You do (manual, can't be automated)

1. Open the Payments dashboard → three-dots menu (top right) → **Disconnect Paddle**.
2. Tell me when done.

### I do (after you confirm disconnect)

3. Re-enable Paddle payments → provisions a fresh sandbox account.
4. Recreate the full product catalog using `create_product` / `create_price`. All 10 SKUs with their existing human-readable IDs so no frontend code needs to change:

| external_id | Amount | Interval |
|---|---|---|
| consumer_plus_monthly | £4.99 | month |
| consumer_plus_yearly | £38.92 | year |
| consumer_pro_monthly | £9.99 | month |
| consumer_pro_yearly | £77.92 | year |
| retailer_starter_monthly | £49.00 | month |
| retailer_starter_yearly | £382.20 | year |
| retailer_growth_monthly | £149.00 | month |
| retailer_growth_yearly | £1,162.20 | year |
| retailer_scale_monthly | £399.00 | month |
| retailer_scale_yearly | £3,112.20 | year |

5. Verify all 10 prices resolve via `gatewayFetch` and the new sandbox credentials are in place.
6. Optionally clean up orphaned `subscriptions` rows from the old sandbox (your call — happy to skip).

### You do (after rebuild)

7. Reset password at https://sandbox-login.paddle.com/forgot-password using `ayo.m.ayeni@gmail.com` (the new account is under your Lovable email).
8. Log in, go to **Checkout settings → Default payment link → Approved domains**, add:
   ```
   id-preview--1afe14c8-cf3c-462b-9216-e596233413f8.lovable.app
   ```
9. (Optional) In Paddle **Team settings**, invite `info@wigsmi.com` as a team member so you can manage Paddle from your business email going forward.

### We verify

10. You click Subscribe on `/portal/billing` → Paddle overlay opens → complete checkout with test card `4242 4242 4242 4242` → success page renders → subscription row appears in DB.

## Technical details

- No frontend code changes needed. `RETAILER_PLANS` in `src/lib/retailer-plans.ts` already uses human-readable IDs (`retailer_starter_monthly` etc.) which are stable across the rebuild.
- No webhook handler changes — `enable_paddle_payments` re-registers webhooks with new secrets, which auto-overwrite the existing `PAYMENTS_SANDBOX_WEBHOOK_SECRET` and `PADDLE_SANDBOX_API_KEY` secrets.
- `VITE_PAYMENTS_CLIENT_TOKEN` in `.env.development` is auto-rotated by the enable tool.
- The "Approved Domains" step in Paddle is still required after the rebuild — re-enabling doesn't auto-allowlist the preview URL.

## What this plan does NOT do

- Does not touch live products/prices (separate account, already configured).
- Does not migrate any existing test subscriptions to the new sandbox.
- Does not change your Lovable login email — that's a separate manual flow if you want it later.

Reply "go" once you've disconnected Paddle from the dashboard and I'll start the rebuild.