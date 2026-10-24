export function cronAuthorized(request: Request, secret: string | undefined): boolean {
  const provided = request.headers.get("x-cron-key");
  if (!secret || !provided) return false;
  const a = new TextEncoder().encode(secret);
  const b = new TextEncoder().encode(provided);
  let difference = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) difference |= a[i] ^ (b[i] ?? 0);
  return difference === 0;
}