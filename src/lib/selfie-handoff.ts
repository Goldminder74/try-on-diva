/**
 * In-memory handoff for a selfie chosen on the public try-on page when the
 * visitor turns out to be signed in and we send them to /app/try-on.
 * Kept in module scope (not storage) because it holds a File object and is
 * only needed for the duration of one client-side navigation.
 */
let pendingSelfie: File | null = null;

export function stashSelfie(file: File | null) {
  pendingSelfie = file;
}

export function takeSelfie(): File | null {
  const f = pendingSelfie;
  pendingSelfie = null;
  return f;
}
