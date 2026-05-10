import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Plus, Pencil, Eye, EyeOff } from "lucide-react";
import { listMyWigs, getMyRetailerContext } from "@/lib/retailer.functions";

type Wig = Awaited<ReturnType<typeof listMyWigs>>["wigs"][number];

export const Route = createFileRoute("/portal/catalog/")({
  head: () => ({ meta: [{ title: "Catalog — Wigsmi Retailer" }] }),
  component: CatalogList,
});

function CatalogList() {
  const list = useServerFn(listMyWigs);
  const getCtx = useServerFn(getMyRetailerContext);
  const navigate = useNavigate();
  const [wigs, setWigs] = useState<Wig[] | null>(null);

  useEffect(() => {
    (async () => {
      const ctx = await getCtx();
      if (!ctx.retailer || !ctx.retailer.onboarding_completed) {
        navigate({ to: "/portal/onboarding" });
        return;
      }
      const r = await list();
      setWigs(r.wigs);
    })();
  }, [list, getCtx, navigate]);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">
            Catalog
          </p>
          <h1 className="mt-1 font-display text-4xl text-mahogany">Your wigs.</h1>
        </div>
        <Link
          to="/portal/catalog/new"
          className="inline-flex items-center gap-1.5 rounded-md bg-mahogany px-4 py-2 text-sm text-cream hover:bg-mahogany-soft"
        >
          <Plus className="h-4 w-4" /> Add wig
        </Link>
      </div>

      {wigs === null ? (
        <p className="mt-12 text-center font-mono text-xs uppercase tracking-wider text-muted-foreground">
          Loading…
        </p>
      ) : wigs.length === 0 ? (
        <div className="mt-12 rounded-2xl border border-dashed border-border bg-card p-12 text-center">
          <h3 className="font-display text-2xl text-mahogany">No wigs yet.</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Add your first wig and we'll help shoppers try it on.
          </p>
          <Link
            to="/portal/catalog/new"
            className="mt-6 inline-flex items-center gap-1.5 rounded-md bg-mahogany px-5 py-2.5 text-sm text-cream hover:bg-mahogany-soft"
          >
            <Plus className="h-4 w-4" /> Add your first wig
          </Link>
        </div>
      ) : (
        <div className="mt-8 overflow-hidden rounded-xl border border-border bg-card">
          <table className="w-full text-sm">
            <thead className="bg-sand/50 text-left font-mono text-[11px] uppercase tracking-wider text-foreground/70">
              <tr>
                <th className="px-5 py-3">Wig</th>
                <th className="px-5 py-3">Price</th>
                <th className="px-5 py-3">Style</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Try-ons</th>
                <th className="px-5 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {wigs.map((w) => (
                <tr key={w.id} className="border-t border-border">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 overflow-hidden rounded-md bg-sand">
                        {w.images?.[0] && (
                          <img
                            src={w.images[0]}
                            alt=""
                            className="h-full w-full object-cover"
                          />
                        )}
                      </div>
                      <span className="font-medium">{w.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 font-mono">
                    {w.currency} {Number(w.price).toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{w.style_type}</td>
                  <td className="px-5 py-3">
                    {w.is_published ? (
                      <span className="inline-flex items-center gap-1 text-success">
                        <Eye className="h-3.5 w-3.5" /> Published
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-muted-foreground">
                        <EyeOff className="h-3.5 w-3.5" /> Draft
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3 font-mono">{w.try_on_count}</td>
                  <td className="px-5 py-3 text-right">
                    <Link
                      to="/portal/catalog/$wigId"
                      params={{ wigId: w.id }}
                      className="inline-flex items-center gap-1 text-mahogany hover:underline"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
