import {
  createFileRoute,
  Link,
  Outlet,
  redirect,
  useLocation,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router";
import { LayoutDashboard, Package, Settings, LogOut, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { Wordmark } from "@/components/wigsmi/Wordmark";

export const Route = createFileRoute("/portal")({
  beforeLoad: async ({ location }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) {
      throw redirect({
        to: "/retailer/login",
        search: { redirect: location.href },
      });
    }
  },
  component: PortalLayout,
});

function PortalLayout() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const onSignOut = async () => {
    await signOut();
    navigate({ to: "/" });
  };

  const initial = (user?.user_metadata?.display_name || user?.email || "?")
    .toString()
    .charAt(0)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-cream">
      <header className="sticky top-0 z-40 border-b border-border bg-cream/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5">
          <Link to="/portal" className="flex items-center gap-3">
            <Wordmark size="md" />
            <span className="hidden rounded-full border border-mahogany/30 bg-mahogany/5 px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider text-mahogany md:inline-block">
              Retailer
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <a
              href="/"
              className="hidden text-xs text-muted-foreground hover:text-mahogany md:inline-flex md:items-center md:gap-1"
            >
              <ExternalLink className="h-3.5 w-3.5" /> View store
            </a>
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
            <SideLink
              to="/portal"
              icon={<LayoutDashboard className="h-4 w-4" />}
              label="Dashboard"
              active={pathname === "/portal"}
            />
            <SideLink
              to="/portal/catalog"
              icon={<Package className="h-4 w-4" />}
              label="Catalog"
              active={pathname.startsWith("/portal/catalog")}
            />
            <SideLink
              to="/portal/settings"
              icon={<Settings className="h-4 w-4" />}
              label="Settings"
              active={pathname.startsWith("/portal/settings")}
            />
          </nav>
        </aside>

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SideLink({
  to,
  icon,
  label,
  active,
}: {
  to: string;
  icon: React.ReactNode;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors ${
        active
          ? "bg-mahogany text-cream"
          : "text-foreground/80 hover:bg-sand/60 hover:text-mahogany"
      }`}
    >
      {icon}
      {label}
    </Link>
  );
}
