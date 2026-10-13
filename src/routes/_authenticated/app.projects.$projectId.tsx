import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/projects/$projectId")({
  component: () => (
    <div className="p-8">
      <h1 className="text-2xl font-semibold">Project</h1>
      <p className="mt-2 text-sm text-muted-foreground">This page is coming next.</p>
    </div>
  ),
});
