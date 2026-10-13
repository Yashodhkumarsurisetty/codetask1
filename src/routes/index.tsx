import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, KanbanSquare, LineChart, Sparkles, Users, CalendarClock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Flowzeno — Project management that flows" },
      { name: "description", content: "Flowzeno turns scattered tasks into clear, measurable progress. Projects, Kanban boards and team workspaces in one place." },
      { property: "og:title", content: "Flowzeno — Project management that flows" },
      { property: "og:description", content: "Projects, Kanban boards and team workspaces in one calm, fast workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const features = [
  { icon: KanbanSquare, title: "Boards that keep up", body: "Drag work across stages and watch progress update instantly." },
  { icon: LineChart, title: "Health at a glance", body: "Completion, overdue work and workload — explained, not just charted." },
  { icon: Users, title: "Built for teams", body: "Workspaces with owners, managers, members and viewers." },
  { icon: CalendarClock, title: "Deadlines you trust", body: "Due dates, priorities and overdue flags across every project." },
  { icon: Sparkles, title: "AI copilot", body: "Plan, summarize and break down work. Coming next." },
  { icon: ShieldCheck, title: "Secure by default", body: "Row-level access rules protect every workspace." },
];

function Landing() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      <div className="pointer-events-none absolute inset-0 bg-aurora" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[700px] grid-fade" />

      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Logo />
        <div className="flex items-center gap-2">
          <Button variant="ghost" asChild><Link to="/auth">Sign in</Link></Button>
          <Button variant="hero" asChild><Link to="/auth" search={{ mode: "signup" }}>Start free</Link></Button>
        </div>
      </header>

      <section className="relative z-10 mx-auto max-w-4xl px-6 pb-20 pt-16 text-center md:pt-24">
        <span className="animate-rise inline-flex items-center gap-2 rounded-full border border-border bg-foreground/5 px-3 py-1 text-xs text-muted-foreground">
          <span className="size-1.5 rounded-full bg-primary" /> The calm workspace for ambitious teams
        </span>
        <h1 className="animate-rise mt-6 text-5xl font-semibold leading-[1.05] md:text-7xl" style={{ animationDelay: "80ms" }}>
          From scattered tasks<br />to <span className="text-brand">clear progress.</span>
        </h1>
        <p className="animate-rise mx-auto mt-6 max-w-xl text-lg text-muted-foreground" style={{ animationDelay: "160ms" }}>
          Flowzeno brings projects, deadlines and your team into one fast workspace — so everyone knows what matters next.
        </p>
        <div className="animate-rise mt-10 flex flex-wrap justify-center gap-3" style={{ animationDelay: "240ms" }}>
          <Button variant="hero" size="lg" asChild>
            <Link to="/auth" search={{ mode: "signup" }}>Create your workspace <ArrowRight /></Link>
          </Button>
          <Button variant="glass" size="lg" asChild><Link to="/auth">I have an account</Link></Button>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-6">
        <BoardPreview />
      </section>

      <section className="relative z-10 mx-auto max-w-6xl px-6 py-28">
        <h2 className="text-center text-3xl font-semibold md:text-4xl">Everything your projects need. Nothing they don't.</h2>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="group rounded-2xl border border-border bg-card/60 p-6 shadow-card transition hover:-translate-y-1 hover:border-primary/40">
              <div className="mb-4 inline-flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <f.icon className="size-5" />
              </div>
              <h3 className="font-semibold">{f.title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="relative z-10 border-t border-border py-8 text-center text-sm text-muted-foreground">
        © {new Date().getFullYear()} Flowzeno
      </footer>
    </div>
  );
}

function BoardPreview() {
  const cols = [
    { t: "To do", c: ["Draft launch brief", "Audit onboarding"], tone: "var(--chart-3)" },
    { t: "In progress", c: ["Pricing page redesign", "API rate limits", "Customer interviews"], tone: "var(--chart-2)" },
    { t: "Done", c: ["Sprint planning", "Brand refresh"], tone: "var(--chart-1)" },
  ];
  return (
    <div className="animate-rise rounded-3xl border border-border bg-card/70 p-4 shadow-glow backdrop-blur md:p-6" style={{ animationDelay: "320ms" }}>
      <div className="mb-4 flex items-center gap-2">
        <span className="size-2.5 rounded-full bg-destructive/70" />
        <span className="size-2.5 rounded-full bg-warning/70" />
        <span className="size-2.5 rounded-full bg-success/70" />
        <span className="ml-3 text-xs text-muted-foreground">Website relaunch · Board</span>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {cols.map((col) => (
          <div key={col.t} className="rounded-2xl bg-surface p-3">
            <div className="mb-3 flex items-center gap-2 text-xs font-medium text-muted-foreground">
              <span className="size-2 rounded-full" style={{ background: col.tone }} /> {col.t}
            </div>
            <div className="space-y-2">
              {col.c.map((c) => (
                <div key={c} className="rounded-xl border border-border bg-card p-3 text-left text-sm">{c}</div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
