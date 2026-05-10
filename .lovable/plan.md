# Slice 3 — Consumer auth + protected `/app/*`

Slice 2 (backend foundation) is done: tables, RLS, storage, `has_role`, `handle_new_user` trigger, seed data, and live Supabase fetchers are wired up. Next per the agreed sequence is **consumer authentication and the protected consumer area**.

## Goals

1. Working email/password + Google OAuth signup & login for consumers.
2. A protected `/app/*` route subtree gated by an `_authenticated` layout.
3. Free-tier try-on quota enforced server-side (5/month for free users; 3 anonymous attempts via localStorage).
4. Core consumer screens behind auth: For You feed, Try-on, Catalog, Wishlist, Style Quiz, Profile.
5. Global `AuthContext` so headers/CTAs react to session state.

## Scope

### Auth flows (public)
- `/auth/login` — email/password + "Continue with Google" + forgot-password link.
- `/auth/signup` — email/password + Google, sets `display_name` metadata, role defaults to `consumer` via the existing trigger.
- `/auth/forgot-password` — `resetPasswordForEmail` with `redirectTo` = `/auth/reset-password`.
- `/auth/reset-password` — public route, handles `type=recovery`, calls `updateUser({ password })`.
- `/auth/callback` — handles OAuth return, redirects to `/app`.
- Enable Google via `configure_social_auth`. Email auto-confirm stays OFF (per project rules).
- `AuthContext` in `__root.tsx`: subscribes via `onAuthStateChange` first, then `getSession()`.

### Protected layout
- `src/routes/_authenticated.tsx` — `beforeLoad` checks `supabase.auth.getUser()`; redirects to `/auth/login?redirect=...` if missing. Renders `<Outlet />` with a consumer shell (header with avatar menu, mobile bottom-nav placeholder).

### Consumer screens under `_authenticated/app/`
- `app/index.tsx` — **For You** feed: featured wigs + personalised picks (uses `consumer_profiles.style_vibe` if quiz done, else featured).
- `app/try-on.tsx` — authenticated version of try-on; records `try_on_events` rows with `user_id`; increments `consumer_profiles.try_on_count_this_month` via server fn.
- `app/catalog.tsx` — same as public catalog but with "save to wishlist" working.
- `app/wishlist.tsx` — list of wishlisted wigs from `wishlist_items` join.
- `app/style-quiz.tsx` — 4-step quiz (face shape, skin tone, style vibe, budget, lifestyle); writes to `consumer_profiles`; sets `quiz_completed_at`.
- `app/profile.tsx` — display name, avatar upload (to `user-photos` bucket under `userId/avatar.*`), email, country; sign-out button.

### Try-on quota (server-side)
- `src/lib/try-on.functions.ts`:
  - `recordAnonymousTryOn()` — public server fn that inserts a `try_on_events` row with `user_id=null` + `anonymous_session` cookie. Client also tracks count in `localStorage` (3 attempts) for fast UI feedback.
  - `recordAuthedTryOn({ wigId })` — `requireSupabaseAuth`; before inserting, reads `consumer_profiles.try_on_count_this_month` + `try_on_month_reset`, resets the counter if the month rolled over, returns `{ allowed: false, reason: "quota" }` when ≥5 on the free plan. On allowed, inserts the event and increments.
  - Quota uses `subscriptions` table: anyone with an active `customer_type='consumer'` subscription on plan `plus`/`pro` gets unlimited; everyone else 5/month.
- UI shows a friendly upsell ("You've used your 5 free try-ons this month — upgrade to Plus") with a link to `/pricing`.

### Wishlist
- `toggleWishlist({ wigId })` server fn with `requireSupabaseAuth`: insert or delete on `wishlist_items`.
- Heart icon on `WigCard` and product page updates optimistically when authed; prompts login when anonymous.

### Header / Nav updates
- `Header` reads `AuthContext`: shows "Log in" + "Try free" when signed out, avatar dropdown ("For You", "Wishlist", "Profile", "Subscription", "Sign out") when signed in.

## Out of scope (deferred to later slices)
- Stripe checkout, plan upgrade flow, billing portal → **Slice 5**.
- Retailer auth and portal → **Slice 4**.
- Admin portal, widget, analytics dashboards → **Slice 6**.
- Transactional emails (welcome, password-reset branding, etc.) → **Slice 7**.

## Technical details

### File map (additions)
```
src/
  contexts/auth-context.tsx
  lib/
    try-on.functions.ts
    wishlist.functions.ts
    consumer-profile.functions.ts
  routes/
    auth.login.tsx
    auth.signup.tsx
    auth.forgot-password.tsx
    auth.reset-password.tsx
    auth.callback.tsx
    _authenticated.tsx
    _authenticated.app.index.tsx
    _authenticated.app.try-on.tsx
    _authenticated.app.catalog.tsx
    _authenticated.app.wishlist.tsx
    _authenticated.app.style-quiz.tsx
    _authenticated.app.profile.tsx
  components/
    auth/AuthForm.tsx            // shared email/password + Google button
    auth/PasswordResetForm.tsx
    consumer/ConsumerShell.tsx   // sidebar/topbar inside _authenticated
    consumer/QuotaBadge.tsx
```

### Auth patterns (per knowledge)
- `onAuthStateChange` listener set up **before** `getSession()` in `AuthContext`.
- Use `redirectTo = window.location.origin + '/auth/callback'` for OAuth and `/auth/reset-password` for recovery.
- `_authenticated.tsx` gates loader with `supabase.auth.getUser()` in `beforeLoad` to avoid the race documented in the TanStack/Supabase guide.

### Server functions (auth-protected)
- All consumer server fns use `requireSupabaseAuth` middleware. They are called via `useServerFn` + `useQuery` from components, or from loaders **only** under `_authenticated/` (safe because `beforeLoad` redirects unauthenticated users first).

### Quota check shape
```ts
// recordAuthedTryOn handler outline
const { data: prof } = await supabase
  .from("consumer_profiles")
  .select("try_on_count_this_month, try_on_month_reset")
  .eq("user_id", userId).single();

const monthStart = startOfMonth(new Date());
let count = prof.try_on_month_reset < monthStart ? 0 : prof.try_on_count_this_month;

const isPaid = await checkActiveConsumerPlan(supabase, userId); // plus/pro
if (!isPaid && count >= 5) return { allowed: false, reason: "quota" };

await supabase.from("try_on_events").insert({ user_id: userId, wig_id, source: "app" });
await supabase.from("consumer_profiles").update({
  try_on_count_this_month: count + 1,
  try_on_month_reset: monthStart,
}).eq("user_id", userId);
return { allowed: true, remaining: isPaid ? null : 4 - count };
```

### Auth config tool calls (during build)
1. `supabase--configure_auth` — `disable_signup:false`, `auto_confirm_email:false`, `external_anonymous_users_enabled:false`, `password_hibp_enabled:true`.
2. `supabase--configure_social_auth` — `providers: ["google"]` (managed credentials).

### Acceptance checks before closing the slice
- Sign up with email → land in `/app` → see For You feed.
- Sign in with Google → returns to `/app`.
- Forgot password → reset email → set new password → land in `/app`.
- Anonymous user gets blocked after 3 try-ons (`localStorage`) with login CTA.
- Signed-in free user gets blocked after 5 try-ons (server-enforced) with upgrade CTA.
- Wishlist toggle persists across reload.
- Style quiz writes to `consumer_profiles` and personalises the For You feed afterwards.
- Visiting `/app/*` while logged out redirects to `/auth/login` and bounces back after login.

## After this slice

Per the agreed sequence the next slice will be **Slice 4 — Retailer portal core** (email-only auth, 5-step onboarding, dashboard + catalog management). I will continue automatically without asking.
