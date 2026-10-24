type PageResult = { data: { id: string }[] | null; error: unknown };

// Fail the whole response if any page fails: never report a partial sitemap as complete.
export async function collectPublishedWigIds(
  fetchPage: (offset: number, pageSize: number) => PromiseLike<PageResult>,
  pageSize = 1000,
) {
  const ids: string[] = [];
  for (let offset = 0; ; ) {
    const { data, error } = await fetchPage(offset, pageSize);
    if (error) throw error;
    if (!data) throw new Error("Sitemap source returned no data");
    if (data.length === 0) return ids;
    ids.push(...data.map((row) => row.id));
    offset += data.length;
  }
}