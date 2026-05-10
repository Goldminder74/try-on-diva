import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Key, Copy, Check, Loader2, Trash2, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  listMyApiKeys,
  createMyApiKey,
  revokeMyApiKey,
} from "@/lib/api-keys.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export const Route = createFileRoute("/portal/api-keys")({
  head: () => ({
    meta: [
      { title: "API keys — Wigsmi" },
      { name: "description", content: "Manage API keys for headless Wigsmi access." },
    ],
  }),
  component: ApiKeysPage,
});

interface KeyRow {
  id: string;
  name: string;
  last4: string;
  created_at: string;
  last_used_at: string | null;
  revoked_at: string | null;
}

function ApiKeysPage() {
  const list = useServerFn(listMyApiKeys);
  const create = useServerFn(createMyApiKey);
  const revoke = useServerFn(revokeMyApiKey);

  const [keys, setKeys] = useState<KeyRow[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState("Default");
  const [reveal, setReveal] = useState<{ plain: string; last4: string } | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    const r = await list();
    setKeys(r.keys as KeyRow[]);
  };

  useEffect(() => {
    refresh().catch((e) => toast.error(e instanceof Error ? e.message : "Failed to load keys"));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onCreate = async () => {
    setBusy(true);
    try {
      const r = await create({ data: { name: newName.trim() || "Default" } });
      setReveal({ plain: r.plain, last4: r.key.last4 });
      setNewName("Default");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create key");
    } finally {
      setBusy(false);
    }
  };

  const onRevoke = async () => {
    if (!revokeId) return;
    setBusy(true);
    try {
      await revoke({ data: { id: revokeId } });
      toast.success("Key revoked.");
      setRevokeId(null);
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not revoke");
    } finally {
      setBusy(false);
    }
  };

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      toast.error("Couldn't copy");
    }
  };

  const active = (keys ?? []).filter((k) => !k.revoked_at);
  const revoked = (keys ?? []).filter((k) => k.revoked_at);

  return (
    <div>
      <header className="mb-8">
        <p className="font-mono text-xs uppercase tracking-wider text-gold-dark">Portal</p>
        <h1 className="mt-1 font-display text-3xl text-mahogany md:text-4xl">API keys</h1>
        <p className="mt-2 max-w-xl text-sm text-muted-foreground">
          Use API keys to access your Wigsmi catalog programmatically — from
          a custom storefront, a Shopify app, or any backend integration.
        </p>
      </header>

      {/* Create new key */}
      <section className="rounded-xl border border-border bg-card p-6 shadow-[var(--shadow-card)]">
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 text-mahogany" />
          <h2 className="font-display text-lg text-mahogany">Create a new key</h2>
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          You'll only see the full key once. Copy it somewhere safe.
        </p>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Key name (e.g. Shopify)"
            className="flex-1 rounded-md border border-border bg-background px-3 py-2 text-sm focus:border-mahogany focus:outline-none"
            disabled={busy}
          />
          <button
            onClick={onCreate}
            disabled={busy}
            className="inline-flex items-center justify-center gap-2 rounded-md bg-mahogany px-5 py-2 text-sm font-medium text-cream hover:bg-mahogany-soft disabled:opacity-50"
          >
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            Generate key
          </button>
        </div>
      </section>

      {/* Active keys */}
      <section className="mt-8">
        <h2 className="font-display text-lg text-mahogany">Active keys</h2>
        <div className="mt-3 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
          {keys === null ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">Loading…</p>
          ) : active.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">No active keys yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {active.map((k) => (
                <li key={k.id} className="flex items-center justify-between gap-4 px-5 py-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <Key className="h-3.5 w-3.5 text-mahogany" />
                      <p className="truncate font-medium text-foreground">{k.name}</p>
                    </div>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">
                      wsk_live_••••{k.last4} · created{" "}
                      {new Date(k.created_at).toLocaleDateString("en-GB", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {k.last_used_at ? ` · last used ${new Date(k.last_used_at).toLocaleDateString("en-GB")}` : " · never used"}
                    </p>
                  </div>
                  <button
                    onClick={() => setRevokeId(k.id)}
                    className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-error hover:border-error"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Revoke
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* Revoked keys */}
      {revoked.length > 0 && (
        <section className="mt-8">
          <h2 className="font-display text-lg text-mahogany">Revoked</h2>
          <div className="mt-3 rounded-xl border border-border bg-card shadow-[var(--shadow-card)]">
            <ul className="divide-y divide-border">
              {revoked.map((k) => (
                <li key={k.id} className="px-5 py-3">
                  <p className="text-sm text-muted-foreground line-through">
                    {k.name} · wsk_live_••••{k.last4}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {/* Reveal new key modal */}
      <AlertDialog open={!!reveal} onOpenChange={(open) => !open && setReveal(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Your new API key</AlertDialogTitle>
            <AlertDialogDescription>
              Copy this now — for security, we won't show it to you again. If
              you lose it, you'll need to generate a new one.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="rounded-md border border-border bg-sand/40 p-3">
            <code className="block break-all font-mono text-xs text-foreground">
              {reveal?.plain}
            </code>
            <button
              onClick={() => reveal && copy(reveal.plain)}
              className="mt-3 inline-flex items-center gap-2 rounded-md bg-mahogany px-3 py-1.5 text-xs font-medium text-cream hover:bg-mahogany-soft"
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy key"}
            </button>
          </div>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setReveal(null)}>I've saved it</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Revoke confirm */}
      <AlertDialog open={!!revokeId} onOpenChange={(open) => !open && setRevokeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke this key?</AlertDialogTitle>
            <AlertDialogDescription>
              Any integration using this key will stop working immediately.
              This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Keep key</AlertDialogCancel>
            <AlertDialogAction onClick={onRevoke} disabled={busy}>
              {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Revoke
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
