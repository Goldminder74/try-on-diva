import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Wordmark } from "@/components/wigsmi/Wordmark";
import { getAdminContext } from "@/lib/admin.functions";
import { LayoutDashboard, Users, Store, Package, Star, LogOut } from "lucide-react";

export const Route = createFileRoute("/admin")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({ to: "/auth/login", search: { redirect: location.href } });
    }
  },
  component: AdminLayout,
});

function AdminLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const ctxFn = useServerFn(getAdminContext);
  const [checked, setChecked] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    ctxFn({})
      .then((r) => {
        if (!active) return;
        setIsAdmin(r.isAdmin);
        setChecked(true);
        if (!r.isAdmin) navigate({ to: "/app" });
      })
      .catch(() => {
        if (active) navigate({ to: "/app" });
      });
    return () => {
      active = false;
    };
  }, [ctxFn, navigate]);

  if (!checked) {
    return <div className="flex min-h-screen items-center justify-center bg-cream text-sm text-muted-foreground">Checking access…</div>;
  }
  if (!isAdmin) return null;

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const initial = (user?.user_metadata?.display_name || user?.email || "?").toString().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <Link to="/admin" className="flex items-center gap-3">
            <Wordmark size="md" />
            <span className="rounded-full border border-gold/60 bg-gold/10 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mahogany">
              Admin
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-mahogany text-cream">
              <span className="text-xs font-medium">{initial}</span>
            </div>
            <button
              onClick={onSignOut}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-mahogany"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl gap-8 px-5 py-8">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav className="sticky top-24 space-y-1">
            <SideLink to="/admin" icon={<LayoutDashboard className="h-4 w-4" />} label="Overview" active={pathname === "/admin"} />
            <SideLink to="/admin/retailers" icon={<Store className="h-4 w-4" />} label="Retailers" active={pathname.startsWith("/admin/retailers")} />
            <SideLink to="/admin/consumers" icon={<Users className="h-4 w-4" />} label="Consumers" active={pathname.startsWith("/admin/consumers")} />
            <SideLink to="/admin/catalog" icon={<Package className="h-4 w-4" />} label="Catalog" active={pathname.startsWith("/admin/catalog")} />
            <SideLink to="/admin/featured" icon={<Star className="h-4 w-4" />} label="Featured" active={pathname.startsWith("/admin/featured")} />
          </nav>
        </aside>
        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active ? "bg-mahogany text-cream" : "text-foreground/80 hover:bg-sand/60 hover:text-mahogany"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
