
# Gate "Apply wig" on the public /try-on page

## Problem

`/try-on` is the public preview. Today it renders the AR preview engine but has no "Apply wig" action, so visitors can't try generation at all — they only see a static overlay. The protected version (`/app/try-on`) is gated by `_authenticated`, so an unauthenticated visitor who reaches it just gets bounced to `/auth`.

Goal: on the public `/try-on` page, add an "Apply wig" button that, for signed-out visitors, opens a friendly sign-up prompt instead of generating. Signed-in visitors get sent through to the real generator at `/app/try-on` with their wig selection preserved.

## Changes (single file: `src/routes/try-on.tsx`)

1. Read auth state with `useAuth()` from `@/contexts/auth-context`.
2. Add an **Apply wig** button next to "Upload selfie" / "Reset", styled with the existing gold token (same classes as the `/app/try-on` button) so it sits naturally in the toolbar. Always visible to everyone.
3. Click handler:
   - If `user` is null → open an `<AlertDialog>` (already in the UI kit, used elsewhere in the app) with:
     - Title: "Create a free account to try this wig on."
     - Body: "You get 5 free try-ons every month, no card needed."
     - Two actions:
       - **Create account** → `navigate({ to: "/auth/signup", search: { redirect: `/try-on?wig=${wig.id}` } })`
       - **Log in** → `navigate({ to: "/auth/login", search: { redirect: `/try-on?wig=${wig.id}` } })`
     - Cancel option to close the dialog.
   - If `user` is present → `navigate({ to: "/app/try-on", search: { wig: wig.id } })` so they land on the real generator with the same wig pre-selected.
4. Disable the button only when no wig is chosen (never gate on auth — the prompt is the whole point of the button for guests).
5. Replace the existing "AR engine is in preview mode" gold note with a softer one-liner since the button now drives the real action.

## Auth flow round-trip

`AuthForm` currently hard-codes `navigate({ to: "/app" })` after login. To honor the `redirect` search param we:

- Extend `auth.login` and `auth.signup` route `validateSearch` to accept `redirect?: string`.
- In `AuthForm`, read the redirect via `useSearch({ strict: false })` and, on successful login (and on the post-confirm path after signup), `navigate({ to: redirect ?? "/app" })`. Only allow same-origin relative paths starting with `/` to avoid open-redirects.
- Google OAuth: pass the `redirect` along by appending it to the `redirect_uri` already pointing at `/auth/callback`, or store it in `sessionStorage` keyed `wigsmi:postAuthRedirect` and consume it in `auth.callback.tsx`. SessionStorage is simpler and avoids changing the OAuth URL contract.

This makes the round-trip generic — useful for any future "sign in to continue" prompts.

## What is preserved across the round-trip

- **Wig selection**: yes, via the `?wig=<id>` search param that `/try-on` and `/app/try-on` both already accept.
- **Uploaded selfie**: no. Browser `File` objects don't survive a full-page redirect / OAuth round-trip, and stashing the image bytes in storage is overkill for v1. Acceptable per the brief ("preserved if possible, or at minimum returned to the try-on page"). The user lands on `/app/try-on` with the wig ready and the upload button highlighted.

## Out of scope

- No changes to `/app/try-on` itself, the apply hook, the gating in `recordTryOn`, or the design system.
- No new components beyond local JSX in `try-on.tsx` (reusing `AlertDialog` from `@/components/ui/alert-dialog`).

## Files touched

- `src/routes/try-on.tsx` — add button + dialog + auth check + navigate.
- `src/components/auth/AuthForm.tsx` — honor `redirect` search param after login / Google OAuth.
- `src/routes/auth.login.tsx`, `src/routes/auth.signup.tsx` — add `validateSearch` for `redirect`.
- `src/routes/auth.callback.tsx` — consume `sessionStorage` redirect after OAuth.

Approve and I'll ship it.
