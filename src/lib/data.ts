import { queryOptions, useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { toast } from "sonner";

export type Project = Database["public"]["Tables"]["projects"]["Row"];
export type Task = Database["public"]["Tables"]["tasks"]["Row"];
export type TaskStatus = Database["public"]["Enums"]["task_status"];
export type TaskPriority = Database["public"]["Enums"]["task_priority"];
export type ProjectStatus = Database["public"]["Enums"]["project_status"];
export type Role = Database["public"]["Enums"]["workspace_role"];

export const STATUSES: { id: TaskStatus; label: string }[] = [
  { id: "backlog", label: "Backlog" },
  { id: "todo", label: "To do" },
  { id: "in_progress", label: "In progress" },
  { id: "review", label: "Review" },
  { id: "done", label: "Done" },
];
export const PRIORITIES: { id: TaskPriority; label: string }[] = [
  { id: "low", label: "Low" },
  { id: "medium", label: "Medium" },
  { id: "high", label: "High" },
  { id: "urgent", label: "Urgent" },
];
export const PROJECT_COLORS = ["teal", "ember", "sky", "lime", "rose"] as const;
export const colorVar: Record<string, string> = {
  teal: "var(--chart-1)",
  ember: "var(--chart-2)",
  sky: "var(--chart-3)",
  lime: "var(--chart-4)",
  rose: "var(--chart-5)",
};

export const workspaceQuery = queryOptions({
  queryKey: ["workspace"],
  queryFn: async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) throw new Error("Not signed in");
    const { data, error } = await supabase
      .from("workspace_members")
      .select("role, workspace:workspaces(id, name)")
      .eq("user_id", u.user.id)
      .order("created_at")
      .limit(1)
      .single();
    if (error) throw error;
    const { data: profile } = await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle();
    return {
      user: u.user,
      profile,
      role: data.role as Role,
      workspace: data.workspace as { id: string; name: string },
    };
  },
  staleTime: 60_000,
});

export function useWorkspace() {
  return useQuery(workspaceQuery);
}

export function useMembers(wsId?: string) {
  return useQuery({
    queryKey: ["members", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data: m, error } = await supabase.from("workspace_members").select("user_id, role").eq("workspace_id", wsId!);
      if (error) throw error;
      const ids = m.map((x) => x.user_id);
      const { data: p } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", ids);
      return m.map((x) => ({ ...x, profile: p?.find((pp) => pp.id === x.user_id) }));
    },
  });
}

export function useProjects(wsId?: string) {
  return useQuery({
    queryKey: ["projects", wsId],
    enabled: !!wsId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("workspace_id", wsId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useProject(id: string) {
  return useQuery({
    queryKey: ["project", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("projects").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data;
    },
  });
}

export function useTasks(wsId?: string, projectId?: string) {
  return useQuery({
    queryKey: ["tasks", wsId, projectId ?? "all"],
    enabled: !!wsId,
    queryFn: async () => {
      let q = supabase.from("tasks").select("*").eq("workspace_id", wsId!);
      if (projectId) q = q.eq("project_id", projectId);
      const { data, error } = await q.order("position").order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

function onErr(e: unknown) {
  toast.error(e instanceof Error ? e.message : "Something went wrong");
}

export function useSaveProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: Partial<Project> & { workspace_id: string; name: string }) => {
      if (p.id) {
        const { id, ...rest } = p;
        const { error } = await supabase.from("projects").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("projects").insert(p);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["projects"] });
      qc.invalidateQueries({ queryKey: ["project"] });
    },
    onError: onErr,
  });
}

export function useDeleteProject() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries(),
    onError: onErr,
  });
}

export function useSaveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (t: Partial<Task> & { workspace_id: string; project_id: string; title: string }) => {
      if (t.id) {
        const { id, ...rest } = t;
        const { error } = await supabase.from("tasks").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("tasks").insert({ ...t, position: Date.now() });
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: onErr,
  });
}

export function useMoveTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TaskStatus }) => {
      const { error } = await supabase.from("tasks").update({ status, position: Date.now() }).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, status }) => {
      await qc.cancelQueries({ queryKey: ["tasks"] });
      const snaps = qc.getQueriesData<Task[]>({ queryKey: ["tasks"] });
      snaps.forEach(([k, v]) => v && qc.setQueryData(k, v.map((t) => (t.id === id ? { ...t, status, position: Date.now() } : t))));
      return { snaps };
    },
    onError: (e, _v, ctx) => {
      ctx?.snaps.forEach(([k, v]) => qc.setQueryData(k, v));
      onErr(e);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });
}

export function useDeleteTask() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tasks").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
    onError: onErr,
  });
}

export function isOverdue(t: Task) {
  return !!t.due_date && t.status !== "done" && new Date(t.due_date + "T23:59:59") < new Date();
}
export function initials(name?: string | null) {
  return (name ?? "?").split(/\s+/).map((s) => s[0]).slice(0, 2).join("").toUpperCase();
}
