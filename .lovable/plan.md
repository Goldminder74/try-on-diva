# Try-on failure on wigsmi.com: findings (no changes made)

## 1. Server log lines
The log tool only returns the last hour of published logs, so I could not read the full 48 hours. Two failures appear in that hour:

```text
[2026-11-15T17:10:28.270Z] [error] [try-on:anonymous] generation failed Error: Invalid redirect value, must be one of "follow" or "manual" ("error" won't be implemented since it does not make sense at the edge; use "manual" and check the response status code).
[2026-11-15T17:09:53.821Z] [error] [try-on:anonymous] generation failed Error: Invalid redirect value, must be one of "follow" or "manual" ...
```

Cause: src/lib/try-on.functions.ts line 202, `fetch(url, { redirect: "error" })`, used when fetching the wig's product photo. The live server does not support "error", so every try-on fails before the image model is called. This line was added in commit 9cb4efa. No Gemini, allowance, storage or missing-variable errors appear.

That explains failures since this change went live. It does not explain failures from 25 Oct to 14 Nov; older logs are not available to me.

## 2. Secrets (names only)
- GEMINI_API_KEY: present
- SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY: not in the user secrets list; these are supplied automatically by Lovable Cloud, and no "Missing Supabase environment variable" error was logged
- ANON_IP_SECRET: not present
- ANON_TRYON_DAILY_CAP: not present (code uses the default of 60)

## 3. Is 9cb4efa live?
Yes. The live error comes from code added in 9cb4efa (14 Nov 16:56 UTC), so the published site was published after that change.

## Suggested fix (only if you approve)
Change that one fetch to `redirect: "manual"` and reject any non-200 response, which keeps the same protection against redirects. Then publish.
