type WigSitemapRow = { id: string; updated_at: string; created_at: string };
type PageResult = { data: WigSitemapRow[] | null; error: unknown };

function productLastmod(row: WigSitemapRow): string {
  const timestamp = row.updated_at || row.created_at;
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error(`Invalid sitemap timestamp for wig ${row.id}`);
  return date.toISOString().slice(0, 10);
}

// Fail the whole response if any page fails: never report a partial sitemap as complete.
export async function collectPublishedWigEntries(
  fetchPage: (offset: number, pageSize: number) => PromiseLike<PageResult>,
  pageSize = 1000,
) {
  const entries: Array<{ id: string; lastmod: string }> = [];
  for (let offset = 0; ; ) {
    const { data, error } = await fetchPage(offset, pageSize);
    if (error) throw error;
    if (!data) throw new Error("Sitemap source returned no data");
    if (data.length === 0) return entries;
    entries.push(...data.map((row) => ({ id: row.id, lastmod: productLastmod(row) })));
    offset += data.length;
  }
}
