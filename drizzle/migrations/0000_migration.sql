create type public.workspace_role as enum ('owner','admin','manager','member','viewer');
create type public.task_status as enum ('backlog','todo','in_progress','review','done');
create type public.task_priority as enum ('low','medium','high','urgent');
create type public.project_status as enum ('planning','active','on_hold','completed','archived');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  avatar_url text,
  created_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;

create table public.workspaces (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  owner_id uuid not null,
  created_at timestamptz not null default now()
);
grant select, insert, update, delete on public.workspaces to authenticated;
grant all on public.workspaces to service_role;
alter table public.workspaces enable row level security;

create table public.workspace_members (
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  user_id uuid not null,
  role public.workspace_role not null default 'member',
  created_at timestamptz not null default now(),
  primary key (workspace_id, user_id)
);
grant select, insert, update, delete on public.workspace_members to authenticated;
grant all on public.workspace_members to service_role;
alter table public.workspace_members enable row level security;

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  name text not null,
  description text,
  color text not null default 'teal',
  status public.project_status not null default 'active',
  start_date date,
  due_date date,
  created_by uuid not null default auth.uid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update, delete on public.projects to authenticated;
grant all on public.projects to service_role;
alter table public.projects enable row level security;

create table public.tasks (
  id uuid primary key default gen_random_uuid(),
  workspace_id uuid not null references public.workspaces(id) on delete cascade,
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null,
  description text,
  status public.task_status not null default 'todo',
  priority public.task_priority not null default 'medium',
  assignee_id uuid,
  due_date date,
  position double precision not null default 0,
  created_by uuid not null default auth.uid(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.tasks(project_id);
create index on public.tasks(workspace_id);
grant select, insert, update, delete on public.tasks to authenticated;
grant all on public.tasks to service_role;
alter table public.tasks enable row level security;

create or replace function public.ws_role(_ws uuid)
returns public.workspace_role language sql stable security definer set search_path = public as $$
  select role from public.workspace_members where workspace_id = _ws and user_id = auth.uid()
$$;
create or replace function public.is_ws_member(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workspace_members where workspace_id = _ws and user_id = auth.uid())
$$;
create or replace function public.can_edit_ws(_ws uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce(public.ws_role(_ws) in ('owner','admin','manager','member'), false)
$$;
create or replace function public.shares_ws(_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.workspace_members a join public.workspace_members b on a.workspace_id=b.workspace_id
    where a.user_id = auth.uid() and b.user_id = _user)
$$;

create policy "own or teammates profiles" on public.profiles for select to authenticated using (id = auth.uid() or public.shares_ws(id));
create policy "insert own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "update own profile" on public.profiles for update to authenticated using (id = auth.uid());

create policy "members read ws" on public.workspaces for select to authenticated using (public.is_ws_member(id) or owner_id = auth.uid());
create policy "create ws" on public.workspaces for insert to authenticated with check (owner_id = auth.uid());
create policy "admins update ws" on public.workspaces for update to authenticated using (public.ws_role(id) in ('owner','admin'));
create policy "owner delete ws" on public.workspaces for delete to authenticated using (owner_id = auth.uid());

create policy "members read members" on public.workspace_members for select to authenticated using (public.is_ws_member(workspace_id));
create policy "owner bootstraps or admins add" on public.workspace_members for insert to authenticated with check (
  (user_id = auth.uid() and role = 'owner' and exists(select 1 from public.workspaces w where w.id = workspace_id and w.owner_id = auth.uid()))
  or public.ws_role(workspace_id) in ('owner','admin'));
create policy "admins update members" on public.workspace_members for update to authenticated using (public.ws_role(workspace_id) in ('owner','admin'));
create policy "admins remove members" on public.workspace_members for delete to authenticated using (public.ws_role(workspace_id) in ('owner','admin') or user_id = auth.uid());

create policy "members read projects" on public.projects for select to authenticated using (public.is_ws_member(workspace_id));
create policy "managers create projects" on public.projects for insert to authenticated with check (public.ws_role(workspace_id) in ('owner','admin','manager'));
create policy "managers update projects" on public.projects for update to authenticated using (public.ws_role(workspace_id) in ('owner','admin','manager'));
create policy "managers delete projects" on public.projects for delete to authenticated using (public.ws_role(workspace_id) in ('owner','admin'));

create policy "members read tasks" on public.tasks for select to authenticated using (public.is_ws_member(workspace_id));
create policy "editors create tasks" on public.tasks for insert to authenticated with check (public.can_edit_ws(workspace_id) and exists(select 1 from public.projects p where p.id = project_id and p.workspace_id = tasks.workspace_id));
create policy "editors update tasks" on public.tasks for update to authenticated using (public.can_edit_ws(workspace_id));
create policy "editors delete tasks" on public.tasks for delete to authenticated using (public.ws_role(workspace_id) in ('owner','admin','manager') or created_by = auth.uid());

create or replace function public.touch_updated() returns trigger language plpgsql set search_path = public as $$
begin new.updated_at = now();
  if tg_table_name = 'tasks' then
    if new.status = 'done' and old.status <> 'done' then new.completed_at = now();
    elsif new.status <> 'done' then new.completed_at = null; end if;
  end if;
  return new; end $$;
create trigger t_projects before update on public.projects for each row execute function public.touch_updated();
create trigger t_tasks before update on public.tasks for each row execute function public.touch_updated();

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
declare ws uuid;
begin
  insert into public.profiles(id, full_name) values (new.id, coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)));
  insert into public.workspaces(name, owner_id) values (coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email,'@',1)) || '''s Workspace', new.id) returning id into ws;
  insert into public.workspace_members(workspace_id, user_id, role) values (ws, new.id, 'owner');
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();