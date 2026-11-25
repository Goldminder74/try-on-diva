import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  GMAIL_REDIRECT_URI,
  exchangeGoogleToken,
  gmailFetch,
  googleClient,
  outreachSender,
} from "@/lib/outreach-mail.server";

function back(result: string) {
  return new Response(null, {
    status: 302,
    headers: {
      Location: `/admin?gmail=${encodeURIComponent(result)}`,
      "Cache-Control": "no-store",
    },
  });
}

function sameText(a: string, b: string): boolean {
  const x = new TextEncoder().encode(a);
  const y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < x.length; i++) diff |= x[i] ^ (y[i] ?? 0);
  return diff === 0;
}

// Google sends the owner back here after he allows Wigsmi to send from
// info@wigsmi.com. The one-time state was created by the admin-only
// startGmailConnect server function.
export const Route = createFileRoute("/api/public/gmail-oauth/callback")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const code = url.searchParams.get("code");
        const state = url.searchParams.get("state");
        if (!code || !state) return back("cancelled");

        const db = supabaseAdmin as any;
        const { data: row } = await db
          .from("outreach_gmail_auth")
          .select("oauth_state, oauth_state_expires")
          .eq("id", 1)
          .maybeSingle();
        const expected = row?.oauth_state as string | null;
        const fresh = row?.oauth_state_expires && new Date(row.oauth_state_expires) > new Date();
        // The state is single use whatever happens next.
        await db
          .from("outreach_gmail_auth")
          .update({ oauth_state: null, oauth_state_expires: null })
          .eq("id", 1);
        if (!expected || !fresh || !sameText(expected, state)) return back("expired");

        const client = googleClient();
        if (!client) return back("not-configured");
        try {
          const token = await exchangeGoogleToken({
            code,
            client_id: client.id,
            client_secret: client.secret,
            redirect_uri: GMAIL_REDIRECT_URI,
            grant_type: "authorization_code",
          });
          const profile = await gmailFetch(token.access_token, "profile");
          const email = String(profile.emailAddress ?? "").toLowerCase();
          if (email !== outreachSender()) return back("wrong-account");
          if (!token.refresh_token) return back("no-refresh-token");
          await db
            .from("outreach_gmail_auth")
            .update({
              email,
              refresh_token: token.refresh_token,
              updated_at: new Date().toISOString(),
            })
            .eq("id", 1);
          return back("connected");
        } catch (err) {
          console.error("[gmail-oauth] callback failed", err instanceof Error ? err.message : err);
          return back("error");
        }
      },
    },
  },
});
