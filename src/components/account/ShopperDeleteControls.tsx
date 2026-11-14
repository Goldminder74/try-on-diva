import { useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import {
  listMyTryOns,
  deleteMyTryOn,
  deleteAllMyTryOns,
  deleteMyAccount,
} from "@/lib/account.functions";
import { getStripeEnvironment } from "@/lib/stripe";
import { supabase } from "@/integrations/supabase/client";

type TryOn = { id: string; createdAt: string; url: string | null };

function Confirm({
  text,
  busy,
  onYes,
  onNo,
}: {
  text: string;
  busy: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  return (
    <div
      role="alertdialog"
      aria-label={text}
      className="mt-2 rounded-md border border-error/40 bg-card p-3"
    >
      <p className="text-sm text-foreground">{text}</p>
      <div className="mt-2 flex gap-2">
        <button
          onClick={onYes}
          disabled={busy}
          className="rounded-md bg-error px-3 py-1.5 text-xs text-cream disabled:opacity-50"
        >
          {busy ? "Deleting…" : "Delete"}
        </button>
        <button
          onClick={onNo}
          disabled={busy}
          className="rounded-md border border-border px-3 py-1.5 text-xs text-mahogany"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

export function SavedTryOns() {
  const list = useServerFn(listMyTryOns);
  const delOne = useServerFn(deleteMyTryOn);
  const delAll = useServerFn(deleteAllMyTryOns);
  const [items, setItems] = useState<TryOn[] | null>(null);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = () =>
    list()
      .then(setItems)
      .catch(() => setItems([]));
  useEffect(() => {
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const run = async (fn: () => Promise<unknown>, done: string) => {
    setBusy(true);
    setNote(null);
    try {
      await fn();
      setNote(done);
      await load();
    } catch (e) {
      setNote(e instanceof Error ? e.message : "Could not delete. Please try again.");
    } finally {
      setBusy(false);
      setConfirmId(null);
      setConfirmAll(false);
    }
  };

  return (
    <section className="mt-10 border-t border-border pt-6" aria-labelledby="saved-tryons">
      <div className="flex items-center justify-between gap-3">
        <h2 id="saved-tryons" className="font-display text-2xl text-mahogany">
          Saved try-ons
        </h2>
        {items && items.length > 0 && !confirmAll && (
          <button
            onClick={() => setConfirmAll(true)}
            className="text-sm text-error hover:underline"
          >
            Delete all my try-ons
          </button>
        )}
      </div>
      {note && (
        <p role="status" className="mt-2 text-sm text-gold-dark">
          {note}
        </p>
      )}
      {confirmAll && (
        <Confirm
          text="Delete all your try-ons? This cannot be undone."
          busy={busy}
          onYes={() => run(() => delAll(), "All your try-ons have been deleted.")}
          onNo={() => setConfirmAll(false)}
        />
      )}
      {items === null ? (
        <p className="mt-3 text-sm text-muted-foreground">Loading…</p>
      ) : items.length === 0 ? (
        <p className="mt-3 text-sm text-muted-foreground">You have no saved try-ons.</p>
      ) : (
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
          {items.map((t) => (
            <li key={t.id} className="rounded-md border border-border bg-card p-2">
              {t.url ? (
                <img
                  src={t.url}
                  alt="Saved try-on"
                  className="aspect-square w-full rounded object-cover"
                />
              ) : (
                <div className="aspect-square w-full rounded bg-muted" />
              )}
              <div className="mt-2 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  {new Date(t.createdAt).toLocaleDateString("en-GB")}
                </span>
                {confirmId !== t.id && (
                  <button
                    onClick={() => setConfirmId(t.id)}
                    className="text-xs text-error hover:underline"
                  >
                    Delete
                  </button>
                )}
              </div>
              {confirmId === t.id && (
                <Confirm
                  text="Delete this try-on? This cannot be undone."
                  busy={busy}
                  onYes={() => run(() => delOne({ data: { id: t.id } }), "Try-on deleted.")}
                  onNo={() => setConfirmId(null)}
                />
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function DeleteAccountSection() {
  const del = useServerFn(deleteMyAccount);
  const nav = useNavigate();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onDelete = async () => {
    setBusy(true);
    setError(null);
    try {
      const r: any = await del({ data: { confirm: text, environment: getStripeEnvironment() } });
      if (r && "error" in r) throw new Error(r.error);
      await supabase.auth.signOut({ scope: "local" });
      sessionStorage.setItem("wigsmi_account_deleted", "1");
      nav({ to: "/" });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not delete your account. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="mt-12 rounded-md border-2 border-error/50 p-5"
      aria-labelledby="danger-zone"
    >
      <h2 id="danger-zone" className="font-display text-2xl text-error">
        Delete my account
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">
        This permanently deletes your try-ons and their images, your profile photo, wishlist, quiz
        answers and profile, and cancels any subscription straight away with no further charge.
        Payment records we must keep by law are kept without your name or email.
      </p>
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          className="mt-4 rounded-md border border-error px-4 py-2 text-sm text-error hover:bg-error hover:text-cream"
        >
          Delete my account
        </button>
      ) : (
        <div className="mt-4 space-y-3">
          <label className="block text-sm">
            Type <strong>DELETE</strong> to confirm
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              aria-label="Type DELETE to confirm"
              className="mt-1 w-full rounded-md border border-border bg-input px-3 py-2 text-sm"
            />
          </label>
          {error && <p className="text-sm text-error">{error}</p>}
          <div className="flex gap-2">
            <button
              onClick={onDelete}
              disabled={busy || text.trim() !== "DELETE"}
              className="rounded-md bg-error px-4 py-2 text-sm text-cream disabled:opacity-50"
            >
              {busy ? "Deleting…" : "Delete my account"}
            </button>
            <button
              onClick={() => {
                setOpen(false);
                setText("");
              }}
              disabled={busy}
              className="rounded-md border border-border px-4 py-2 text-sm text-mahogany"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

/** Shown once on the homepage after an account is deleted. */
export function AccountDeletedNotice() {
  const [show, setShow] = useState(false);
  useEffect(() => {
    if (sessionStorage.getItem("wigsmi_account_deleted")) {
      sessionStorage.removeItem("wigsmi_account_deleted");
      setShow(true);
    }
  }, []);
  if (!show) return null;
  return (
    <div
      role="status"
      className="w-full border-b border-border bg-card px-4 py-3 text-center text-sm text-mahogany"
    >
      Your account has been deleted.
    </div>
  );
}
