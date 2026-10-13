import { createFileRoute, Link, Outlet, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { LayoutDashboard, FolderKanban, ListChecks, LogOut, Menu } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/Logo";
import { useProjects, useWorkspace, initials, colorVar } from "@/lib/data";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/app")({
  head: () => ({
    meta: [
      { title: "Workspace — Flowzeno" },
      { name: "description", content: "Your Flowzeno workspace." },
      { property: "og:title", content: "Workspace — Flowzeno" },
      { property: "og:description", content: "Your Flowzeno workspace." },
    ],
  }),
  component: AppLayout,
});

function AppLayout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 border-r border-sidebar-border bg-sidebar md:block">
        <SidebarBody />
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center gap-3 border-b border-border px-4 py-3 md:hidden">
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Open menu"><Menu /></Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 bg-sidebar p-0">
              <SidebarBody onNavigate={() => setOpen(false)} />
            </SheetContent>
          </Sheet>
          <Logo />
        </header>
        <main className="flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarBody({ onNavigate }: { onNavigate?: () => void }) {
  const { data: ws } = useWorkspace();
  const { data: projects } = useProjects(ws?.workspace.id);
  const qc = useQueryClient();
  const navigate = useNavigate();

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const nav = [
    { to: "/app", label: "Dashboard", icon: LayoutDashboard, exact: true },
    { to: "/app/projects", label: "Projects", icon: FolderKanban, exact: false },
    { to: "/app/tasks", label: "My tasks", icon: ListChecks, exact: false },
  ] as const;

  return (
    <div className="flex h-full flex-col p-4">
      <div className="px-2 py-1"><Logo /></div>
      <div className="mt-6 rounded-xl border border-sidebar-border bg-sidebar-accent/50 px-3 py-2">
        <div className="text-[11px] uppercase tracking-wider text-muted-foreground">Workspace</div>
        <div className="truncate text-sm font-medium">{ws?.workspace.name ?? "…"}</div>
      </div>
      <nav className="mt-6 space-y-1">
        {nav.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            onClick={onNavigate}
            activeOptions={{ exact: n.exact }}
            className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-foreground/80 transition hover:bg-sidebar-accent hover:text-sidebar-foreground data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-foreground"
          >
            <n.icon className="size-4" /> {n.label}
          </Link>
        ))}
      </nav>
      <div className="mt-8 px-3 text-[11px] uppercase tracking-wider text-muted-foreground">Projects</div>
      <div className="mt-2 flex-1 space-y-0.5 overflow-y-auto">
        {projects?.slice(0, 12).map((p) => (
          <Link
            key={p.id}
            to="/app/projects/$projectId"
            params={{ projectId: p.id }}
            onClick={onNavigate}
            className="flex items-center gap-3 rounded-lg px-3 py-1.5 text-sm text-sidebar-foreground/75 hover:bg-sidebar-accent data-[status=active]:bg-sidebar-accent data-[status=active]:text-sidebar-foreground"
          >
            <span className="size-2 rounded-full" style={{ background: colorVar[p.color] ?? colorVar["teal"] }} />
            <span className="truncate">{p.name}</span>
          </Link>
        ))}
        {projects?.length === 0 && <p className="px-3 text-xs text-muted-foreground">No projects yet</p>}
      </div>
      <div className="mt-4 flex items-center gap-3 border-t border-sidebar-border pt-4">
        <div className="flex size-8 items-center justify-center rounded-full bg-brand text-xs font-semibold text-primary-foreground">
          {initials(ws?.profile?.full_name)}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-medium">{ws?.profile?.full_name}</div>
          <div className="truncate text-xs capitalize text-muted-foreground">{ws?.role}</div>
        </div>
        <Button variant="ghost" size="icon" onClick={signOut} aria-label="Sign out"><LogOut /></Button>
      </div>
    </div>
  );
}
