import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getPublicWidgetData } from "@/lib/widget-public.functions";

export const Route = createFileRoute("/embed/widget/$token")({
  head: () => ({
    meta: [
      { title: "Wigsmi try-on" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: EmbedWidget,
});

type Data = Awaited<ReturnType<typeof getPublicWidgetData>>;

function EmbedWidget() {
  const { token } = Route.useParams();
  const fetchData = useServerFn(getPublicWidgetData);
  const [data, setData] = useState<Data | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchData({ data: { token } })
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fetchData, token]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">
          Loading…
        </p>
      </div>
    );
  }

  if (!data || "notFound" in data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            Widget not found
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            This embed link is invalid or has been rotated.
          </p>
        </div>
      </div>
    );
  }

  if ("paused" in data) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white px-6 text-center">
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            Paused
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            This widget is currently paused.
          </p>
        </div>
      </div>
    );
  }

  const accent = data.widget.accent_color;
  const cta = data.retailer?.cta_text || "Try it on";

  return (
    <div className="min-h-screen bg-white">
      <header
        className="flex items-center justify-between px-5 py-4"
        style={{ backgroundColor: accent }}
      >
        <div className="flex items-center gap-3 text-white">
          {data.retailer?.logo_url && (
            <img
              src={data.retailer.logo_url}
              alt=""
              className="h-8 w-8 rounded-full bg-white/20 object-cover"
            />
          )}
          <span className="font-medium">{data.retailer?.display_name}</span>
        </div>
        <span className="rounded-full bg-white/15 px-3 py-1 text-xs text-white">
          {cta}
        </span>
      </header>

      {data.wigs.length === 0 ? (
        <div className="px-6 py-20 text-center">
          <p className="font-mono text-xs uppercase tracking-wider text-neutral-400">
            No wigs yet
          </p>
          <p className="mt-2 text-sm text-neutral-600">
            Add and publish wigs in your catalog to see them here.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3">
          {data.wigs.map((w) => (
            <a
              key={w.id}
              href={w.product_url || "#"}
              target="_top"
              rel="noopener noreferrer"
              className="group block overflow-hidden rounded-xl border border-neutral-200 bg-white transition-shadow hover:shadow-md"
            >
              <div className="aspect-square bg-neutral-100">
                {w.images?.[0] ? (
                  <img
                    src={w.images[0]}
                    alt={w.name}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : null}
              </div>
              <div className="p-3">
                <p className="line-clamp-1 text-sm font-medium text-neutral-900">
                  {w.name}
                </p>
                <div className="mt-1 flex items-center justify-between">
                  <span className="text-xs text-neutral-500">
                    {formatPrice(w.price, w.currency)}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-medium text-white"
                    style={{ backgroundColor: accent }}
                  >
                    {cta}
                  </span>
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      <footer className="border-t border-neutral-100 px-5 py-3 text-center">
        <span className="font-mono text-[10px] uppercase tracking-wider text-neutral-400">
          Powered by Wigsmi
        </span>
      </footer>
    </div>
  );
}

function formatPrice(price: number, currency: string) {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return `${currency} ${price}`;
  }
}
