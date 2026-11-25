import { createFileRoute } from "@tanstack/react-router";
import { cronAuthorized } from "@/lib/cron-auth";
import { processOutbox } from "@/lib/outreach-mail.server";

// Called by the database (pg_net, with the vault cron key) whenever the Mail
// desk queues rows in public.outreach_outbox.
export const Route = createFileRoute("/api/public/hooks/outreach-send")({
  staticData: { sitemap: false },
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!cronAuthorized(request, process.env.CRON_SECRET)) {
          return new Response("Unauthorized", { status: 401 });
        }
        return Response.json(await processOutbox());
      },
    },
  },
});
