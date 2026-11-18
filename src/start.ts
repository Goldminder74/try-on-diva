import { createStart, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { trailingSlashTarget } from "./lib/trailing-slash";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";

const errorMiddleware = createMiddleware().server(async ({ next, request }) => {
  // Internal email routes must bypass any app-level handling/redirects.
  const p = new URL(request.url).pathname;
  // Permanent (301) redirect for page URLs with a trailing slash.
  const slashTarget = trailingSlashTarget(request.url, request.method);
  if (slashTarget) {
    return new Response(null, { status: 301, headers: { location: slashTarget } });
  }
  if (p.startsWith("/lovable/") || p === "/email/unsubscribe") {
    return next();
  }
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware],
}));
