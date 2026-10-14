import type { ReactNode } from "react";
import { useSession, api } from "@/lib/session";
import { Button } from "@/components/ui/button";
import { Link, useRouterState } from "@tanstack/react-router";
import {
  Archive,
  ClipboardList,
  LayoutGrid,
  MonitorSmartphone,
  Settings,
  Users,
} from "lucide-react";
import { LedgerMark } from "@/components/mark";
import { useRegister } from "@/lib/store/use-register";
import { cn } from "@/lib/utils";

const NAV = [
  { to: "/", label: "Ledger", icon: LayoutGrid, exact: true },
  { to: "/stock", label: "Stock", icon: Archive, exact: false },
  { to: "/slips", label: "Slips", icon: ClipboardList, exact: false },
  { to: "/assets", label: "Assets", icon: MonitorSmartphone, exact: false },
  { to: "/people", label: "People", icon: Users, exact: false },
] as const;

function pathActive(pathname: string, to: string, exact: boolean) {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const office = useRegister((s) => s.settings.officeName);
  const storekeeper = useRegister((s) => s.settings.storekeeper);

  const user = useSession(s=>s.user)!;
  const syncError=useRegister(s=>s.syncError);
  const nav = user.role !== "employee" ? NAV : NAV.filter(n=>["/","/slips","/assets"].includes(n.to));
  const logout=async()=>{await api("/logout",{});useSession.getState().setUser(null);};
  const forbidden=user.role === "employee" && ["/people","/stock"].includes(pathname);

  return (
    <div className="min-h-dvh overflow-x-hidden bg-background">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 p-3 lg:block">
        <div className="flex h-full flex-col rounded-2xl border border-border/80 bg-card/80 shadow-[var(--shadow-border)] backdrop-blur-xl">
          <div className="flex items-center gap-3 px-4 pt-5 pb-4">
            <LedgerMark className="size-9 shrink-0" />
            <div className="min-w-0">
              <p className="text-base leading-tight font-semibold tracking-tight">Store Ledger</p>
              <p className="truncate text-xs text-muted-foreground">{office}</p>
            </div>
          </div>
          <nav className="flex flex-1 flex-col gap-1 px-3">
            {nav.map((item) => {
              const active = pathActive(pathname, item.to, item.exact);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.98]",
                    active
                      ? "bg-secondary text-foreground"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <item.icon className="size-4" strokeWidth={1.75} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
          <div className="px-3 pb-4">
            <Link
              to="/settings"
              className={cn(
                "flex h-11 items-center gap-3 rounded-xl px-3 text-sm font-medium transition-[background-color,color] duration-[var(--motion-quick)]",
                pathname === "/settings"
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Settings className="size-4" strokeWidth={1.75} />
              Profile & settings
            </Link>
            <p className="mt-3 truncate px-3 text-xs text-muted-foreground">{user.name}</p><Button variant="ghost" className="mt-2 w-full" onClick={logout}>Sign out</Button>
          </div>
        </div>
      </aside>

      <header className="sticky top-0 z-20 flex items-center gap-3 border-b border-border/70 bg-background/70 px-4 py-3 pt-[max(0.75rem,env(safe-area-inset-top))] backdrop-blur-xl lg:hidden">
        <LedgerMark className="size-8 shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-base leading-tight font-semibold tracking-tight">Store Ledger</p>
          <p className="truncate text-xs text-muted-foreground">{office}</p>
        </div>
        <Link
          to="/settings"
          className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted"
          aria-label="Profile & settings"
        >
          <Settings className="size-5" />
        </Link>
      </header>

      <main className="min-w-0 px-4 pt-5 pb-32 lg:ml-64 lg:px-8 lg:pt-8 lg:pb-10">
        {syncError&&<p role="alert" className="mb-4 rounded-xl bg-warn-soft p-3 text-sm text-warn">Connection interrupted. Displayed records may be out of date. Reconnect before saving.</p>}
        <div className="mb-4 flex items-center justify-between gap-3 text-xs text-muted-foreground"><span>{user.name} · {user.role === "admin" ? "Administrator" : user.role === "store" ? "Storekeeper" : "User"} · Shared register</span><button className="lg:hidden text-primary" onClick={logout}>Sign out</button></div><div key={pathname} className="page-rise">
          {forbidden ? <p>Storekeeper access required.</p> : children}
        </div>
      </main>

      <nav className="fixed inset-x-3 z-20 rounded-full border border-border/80 bg-card/75 px-1 py-1 shadow-[var(--shadow-border)] backdrop-blur-xl lg:hidden bottom-[max(0.6rem,env(safe-area-inset-bottom))]">
        <ul className="grid" style={{gridTemplateColumns:`repeat(${nav.length},minmax(0,1fr))`}}>
          {nav.map((item) => {
            const active = pathActive(pathname, item.to, item.exact);
            return (
              <li key={item.to} className="min-w-0">
                <Link
                  to={item.to}
                  className={cn(
                    "flex min-h-12 min-w-0 flex-col items-center justify-center gap-0.5 rounded-full px-1 text-xs font-medium transition-[background-color,color,transform] duration-[var(--motion-quick)] ease-[var(--ease-out)] active:scale-[0.96]",
                    active ? "bg-secondary text-primary" : "text-muted-foreground",
                  )}
                >
                  <item.icon className="size-5" strokeWidth={active ? 2 : 1.75} />
                  <span className="w-full truncate text-center">{item.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
