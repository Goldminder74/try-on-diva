# Free try-ons without an account: how it works and what to fix

## How it works today (verified in the code and database)

1. When someone opens /try-on, the page quietly creates a permanent ID for that browser (saved in the browser) and calculates a "device signature" from things like screen size, language, time zone and browser version.
2. Every completed try-on set by a visitor with no account is saved in an `anonymous_tryons` record with that browser ID, the signature and a scrambled copy of their network address.
3. Before each try-on, the server counts existing records matching **either** the browser ID **or** the signature. At 5 or more it refuses and the signup wall appears.
4. Signing up gives 5 more try-ons per calendar month, counted separately.

So today: **5 free try-ons with no account (one-time, never resets), then 5 per month after signing up** — a new visitor can get 10 in their first month.

## Problems found

- **Too generous before signup** — 5 is the same as a whole month of the free account tier, so there is little reason to register.
- **Easy reset** — the count is tied to the browser only. A private window, a different browser, or a phone all look like a brand-new person and get another 5. The network address is stored but never actually used in the check.
- **Wording clash** — the site says "5 free try-ons every month", but the no-account allowance never resets, so a returning visitor is blocked forever with no explanation of when it comes back.
- **Small race gap** — two try-ons fired at the same moment can both slip past the check, because nothing in the database enforces the cap.

## What will change (based on your answers)

- **2 free try-ons without an account, resetting each calendar month.**
- **A network-level cap as a safety net:** a maximum of **8** no-account try-ons per month from the same network address. This stops someone cycling browsers and private windows, while still leaving room for genuine households, offices and shared WiFi.
- Once either cap is hit, the same friendly signup wall appears, with wording that names the real limit and says it refreshes next month.
- After signing up, the free account keeps its 5 per month, unchanged.

## Copy updates

Everywhere the free allowance is described, it will distinguish the two clearly:

- /try-on prompts and the signup wall: "2 free try-ons, no account needed" and "Create a free account for 5 try-ons every month".
- Home page, pricing page and FAQ: keep "5 free try-ons every month" for the free account, and add the 2-without-an-account taster where the visitor-facing copy needs it.
- The network-cap message stays generic ("you've used the free try-ons available here this month") rather than mentioning networks.

## Technical notes

- `src/lib/try-on.functions.ts`: `ANON_FREE_QUOTA` 5 → 2; add `ANON_IP_MONTHLY_CAP = 8`; `countAnonymousTryOns` gains a `created_at >= date_trunc('month', now())` filter so the allowance resets monthly, and a second count keyed on `ip_hash` for the same window. The IP hash must be computed before the check, not only at insert time. `getAnonymousTryOnStatus` returns which cap was hit so the wall can show the right wording.
- Add a database uniqueness/limit guard so concurrent requests cannot exceed the cap (partial unique index on `(device_id, month)` sequence number, or a small counter table) — closes the race the current comment wrongly claims is already handled.
- `src/routes/try-on.tsx`: no logic change beyond reading the new remaining/limit values and the new wall copy.
- Signed-in quota (`consume_try_on`, `FREE_QUOTA = 5`) is untouched.
