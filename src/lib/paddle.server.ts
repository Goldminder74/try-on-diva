import { Environment, Paddle, EventName } from "@paddle/paddle-node-sdk";

const getEnv = (key: string): string => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is not configured`);
  return value;
};

export { EventName };
export type PaddleEnv = "sandbox" | "live";

const GATEWAY_BASE_URL = "https://connector-gateway.lovable.dev/paddle";

export function getConnectionApiKey(env: PaddleEnv): string {
  return env === "sandbox"
    ? getEnv("PADDLE_SANDBOX_API_KEY")
    : getEnv("PADDLE_LIVE_API_KEY");
}

export function getPaddleClient(env: PaddleEnv): Paddle {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return new Paddle(connectionApiKey, {
    environment: GATEWAY_BASE_URL as unknown as Environment,
    customHeaders: {
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
    },
  });
}

export async function gatewayFetch(
  env: PaddleEnv,
  path: string,
  init?: RequestInit,
): Promise<Response> {
  const connectionApiKey = getConnectionApiKey(env);
  const lovableApiKey = getEnv("LOVABLE_API_KEY");
  return fetch(`${GATEWAY_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "X-Connection-Api-Key": connectionApiKey,
      "Lovable-API-Key": lovableApiKey,
      ...init?.headers,
    },
  });
}

export function getWebhookSecret(env: PaddleEnv): string {
  return env === "sandbox"
    ? getEnv("PAYMENTS_SANDBOX_WEBHOOK_SECRET")
    : getEnv("PAYMENTS_LIVE_WEBHOOK_SECRET");
}

export async function verifyWebhook(req: Request, env: PaddleEnv) {
  const signature = req.headers.get("paddle-signature");
  const body = await req.text();
  const secret = getWebhookSecret(env);
  if (!signature || !body) throw new Error("Missing signature or body");
  const paddle = getPaddleClient(env);
  return await paddle.webhooks.unmarshal(body, secret, signature);
}

/**
 * Verify a Paddle webhook without trusting a caller-supplied env hint.
 * Tries sandbox first, then live. The winning env is returned alongside
 * the event so the handler writes to the correct rows.
 */
export async function verifyWebhookAutoEnv(
  signature: string | null,
  body: string,
): Promise<{ event: any; env: PaddleEnv }> {
  if (!signature || !body) throw new Error("Missing signature or body");
  const envs: PaddleEnv[] = ["sandbox", "live"];
  let lastErr: unknown = null;
  for (const env of envs) {
    try {
      const secret = getWebhookSecret(env);
      const paddle = getPaddleClient(env);
      const event = await paddle.webhooks.unmarshal(body, secret, signature);
      return { event, env };
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("Webhook signature did not match any environment");
}
