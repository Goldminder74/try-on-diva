import { createFileRoute, Link, Outlet, redirect, useLocation, useNavigate } from "@tanstack/react-router";
import { Heart, Home, Sparkles, User as UserIcon, Wand2, LogOut, Shield } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Wordmark } from "@/components/wigsmi/Wordmark";
import { PastDueBanner } from "@/components/PastDueBanner";

export const Route = createFileRoute("/_authenticated")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/auth/login",
        search: { redirect: location.href },
      });
    }
    // Role guard: retailers belong in /portal, not the consumer app.
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", data.user.id);
    const isRetailer = (roles ?? []).some((r) => r.role === "retailer");
    const isAdmin = (roles ?? []).some((r) => r.role === "admin");
    if (isRetailer && !isAdmin) {
      throw redirect({ to: "/portal" });
    }
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  const { user, signOut } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => setIsAdmin(!!data));
  }, [user]);

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  return (
    <div className="min-h-screen bg-cream">
      <PastDueBanner customerType="consumer" />
      <header className="sticky top-0 z-40 border-b border-border bg-cream/85 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <Link to="/app" className="flex items-center"><Wordmark size="md" /></Link>
          <nav className="hidden items-center gap-7 md:flex">
            <NavLink to="/app" label="For You" />
            <NavLink to="/app/try-on" label="Try on" />
            <NavLink to="/app/catalog" label="Catalog" />
            <NavLink to="/app/wishlist" label="Wishlist" />
          </nav>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <Link
                to="/admin"
                className="hidden items-center gap-1 rounded-md border border-gold/60 bg-gold/10 px-3 py-1.5 text-xs text-mahogany hover:bg-gold/20 md:inline-flex"
              >
                <Shield className="h-3.5 w-3.5" /> Admin
              </Link>
            )}
            <Link to="/app/profile" className="flex h-9 w-9 items-center justify-center rounded-full bg-mahogany text-cream">
              <span className="text-xs font-medium">
                {(user?.user_metadata?.display_name || user?.email || "?")
                  .toString()
                  .charAt(0)
                  .toUpperCase()}
              </span>
            </Link>
            <button
              onClick={onSignOut}
              className="hidden items-center gap-1 rounded-md border border-border bg-card px-3 py-1.5 text-xs text-foreground hover:border-mahogany md:inline-flex"
            >
              <LogOut className="h-3.5 w-3.5" /> Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="pb-24 md:pb-12">
        <Outlet />
      </main>

      {/* Mobile bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-cream md:hidden">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-around px-2 py-2">
          <BottomLink to="/app" icon={<Home className="h-5 w-5" />} label="Feed" active={location.pathname === "/app"} />
          <BottomLink to="/app/try-on" icon={<Wand2 className="h-5 w-5" />} label="Try on" active={location.pathname.startsWith("/app/try-on")} />
          <BottomLink to="/app/catalog" icon={<Sparkles className="h-5 w-5" />} label="Catalog" active={location.pathname.startsWith("/app/catalog")} />
          <BottomLink to="/app/wishlist" icon={<Heart className="h-5 w-5" />} label="Saved" active={location.pathname.startsWith("/app/wishlist")} />
          <BottomLink to="/app/profile" icon={<UserIcon className="h-5 w-5" />} label="Me" active={location.pathname.startsWith("/app/profile")} />
        </div>
      </nav>
    </div>
  );
}

function NavLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="text-sm text-foreground/80 hover:text-mahogany"
      activeProps={{ className: "text-sm text-mahogany font-medium" }}
      activeOptions={{ exact: to === "/app" }}
    >
      {label}
    </Link>
  );
}

function BottomLink({ to, icon, label, active }: { to: string; icon: React.ReactNode; label: string; active: boolean }) {
  return (
    <Link
      to={to}
      className={`flex flex-1 flex-col items-center gap-0.5 rounded-md px-2 py-1 text-[10px] ${active ? "text-mahogany" : "text-muted-foreground"}`}
    >
      {icon}
      {label}
    </Link>
  );
}
