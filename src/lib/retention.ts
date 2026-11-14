// Clean-up of anonymous try-on data, run once a day by the scheduled trial
// check. A visitor with no account cannot ask for their images back or delete
// them, so they are removed automatically.
//
// ANON_RETENTION_DAYS is how long a free try-on without an account is kept. The
// shopper's link to the image lasts 7 days; the record is kept a little longer
// so the monthly free allowance still counts it.

export const ANON_RETENTION_DAYS = 30;
const BUCKET = "tryons";
const ANON_FOLDER = "anon";
const PENDING = "pending";

export interface RetentionResult {
  images_removed: number;
  records_removed: number;
  stale_reservations_removed: number;
  error?: string;
}

/** True when a stored object is older than the retention window. */
export function isExpired(createdAt: string | null | undefined, now: Date, days: number): boolean {
  if (!createdAt) return false;
  const created = new Date(createdAt).getTime();
  return Number.isFinite(created) && now.getTime() - created > days * 86400000;
}

export async function purgeAnonymousTryOns(sb: any, now = new Date()): Promise<RetentionResult> {
  const result: RetentionResult = {
    images_removed: 0,
    records_removed: 0,
    stale_reservations_removed: 0,
  };
  try {
    // 1. Images in the anonymous folder past the window, whether or not a
    //    record still points at them.
    for (let page = 0; page < 20; page++) {
      const { data: objects, error } = await sb.storage
        .from(BUCKET)
        .list(ANON_FOLDER, { limit: 1000, sortBy: { column: "created_at", order: "asc" } });
      if (error) throw error;
      const expired = (objects ?? [])
        .filter((o: any) => o?.name && isExpired(o.created_at, now, ANON_RETENTION_DAYS))
        .map((o: any) => `${ANON_FOLDER}/${o.name}`);
      if (expired.length === 0) break;
      const { error: removeError } = await sb.storage.from(BUCKET).remove(expired);
      if (removeError) throw removeError;
      result.images_removed += expired.length;
      if ((objects ?? []).length < 1000) break;
    }

    // 2. Their records (device, fingerprint, hashed address, browser details).
    const cutoff = new Date(now.getTime() - ANON_RETENTION_DAYS * 86400000).toISOString();
    const { data: removed, error: recordError } = await sb
      .from("anonymous_tryons")
      .delete()
      .lt("created_at", cutoff)
      .select("id");
    if (recordError) throw recordError;
    result.records_removed = removed?.length ?? 0;

    // 3. Reservations whose generation never finished.
    const stale = new Date(now.getTime() - 60 * 60 * 1000).toISOString();
    const { data: pending, error: pendingError } = await sb
      .from("anonymous_tryons")
      .delete()
      .eq("result_path", PENDING)
      .lt("created_at", stale)
      .select("id");
    if (pendingError) throw pendingError;
    result.stale_reservations_removed = pending?.length ?? 0;
  } catch (err) {
    console.error("[retention] anonymous try-on clean-up failed:", err);
    result.error = "clean-up failed";
  }
  return result;
}
