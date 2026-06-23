import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { listConsumers } from "@/lib/admin.functions";

export const Route = createFileRoute("/admin/consumers")({
  component: ConsumersPage,
});

function ConsumersPage() {
  const listFn = useServerFn(listConsumers);
  const [rows, setRows] = useState<any[] | null>(null);
  const [search, setSearch] = useState("");

  const reload = () => listFn({ data: { search: search || undefined } }).then(setRows).catch(() => setRows([]));
  useEffect(() => { reload(); /* eslint-disable-next-line */ }, []);

  return (
    <div>
      <div className="mb-8 flex items-end justify-between gap-4">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Users</p>
          <h1 className="mt-1 font-display text-3xl text-mahogany">Consumers</h1>
        </div>
        <div className="flex gap-2">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && reload()}
            placeholder="Search email…"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-sm"
          />
          <button onClick={reload} className="rounded-md bg-mahogany px-3 py-1.5 text-xs text-cream">Search</button>
        </div>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-2 font-medium">Name</th>
              <th className="px-4 py-2 font-medium">Email</th>
              <th className="px-4 py-2 font-medium">Country</th>
              <th className="px-4 py-2 font-medium">Try-ons / mo</th>
              <th className="px-4 py-2 font-medium">Wishlist</th>
              <th className="px-4 py-2 font-medium">Quiz</th>
              <th className="px-4 py-2 font-medium">Joined</th>
            </tr>
          </thead>
          <tbody>
            {rows === null && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">Loading…</td></tr>}
            {rows?.length === 0 && <tr><td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">No consumers.</td></tr>}
            {rows?.map((p) => (
              <tr key={p.id} className="border-t border-border">
                <td className="px-4 py-2">{p.display_name || "-"}</td>
                <td className="px-4 py-2 font-mono text-xs">{p.email ?? "-"}</td>
                <td className="px-4 py-2 text-muted-foreground">{p.country ?? "-"}</td>
                <td className="px-4 py-2 font-mono">{p.try_ons_month}</td>
                <td className="px-4 py-2 font-mono">{p.wishlist_count}</td>
                <td className="px-4 py-2">{p.quiz_completed ? "✓" : "-"}</td>
                <td className="px-4 py-2 font-mono text-xs">{new Date(p.created_at).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
