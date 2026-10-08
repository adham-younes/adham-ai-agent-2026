begin;

create table public.engineering_projects (
  id uuid primary key,
  owner_id text not null,
  name text not null,
  goal text not null,
  stack text not null default '',
  source text not null default '',
  status text not null default 'active',
  session_id text unique,
  sandbox_id text,
  active_task_id uuid,
  workspace_root text not null,
  workspace_version integer not null default 0 check (workspace_version >= 0),
  active_run_id uuid,
  lease_expires_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_id, id)
);

create table public.engineering_tasks (
  id uuid primary key,
  owner_id text not null,
  project_id uuid not null,
  title text not null,
  kind text not null check (kind in ('implementation', 'analysis')),
  acceptance_criteria jsonb not null default '[]',
  required_checks jsonb not null default '[]',
  required_artifacts jsonb not null default '[]',
  status text not null default 'draft' check (
    status in (
      'draft',
      'planned',
      'running',
      'needs_review',
      'verified',
      'accepted',
      'blocked',
      'failed',
      'cancelled'
    )
  ),
  current_run_id uuid,
  version integer not null default 0,
  created_at timestamptz not null default now(),
  unique (owner_id, project_id, id),
  foreign key (owner_id, project_id) references public.engineering_projects (owner_id, id)
);

create table public.engineering_runs (
  id uuid primary key,
  owner_id text not null,
  project_id uuid not null,
  task_id uuid not null,
  capability text not null,
  idempotency_key text not null,
  status text not null check (
    status in ('running', 'succeeded', 'failed', 'cancelled')
  ),
  workspace_version integer not null,
  parent_call_id text,
  root_session_id text,
  error text,
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  command text,
  cwd text,
  exit_code integer,
  logs text check (octet_length(logs) <= 65536),
  unique (owner_id, project_id, id),
  unique (owner_id, project_id, task_id, id),
  unique (owner_id, project_id, idempotency_key),
  foreign key (owner_id, project_id, task_id) references public.engineering_tasks (owner_id, project_id, id)
);

create table public.engineering_artifacts (
  id uuid primary key,
  owner_id text not null,
  project_id uuid not null,
  task_id uuid not null,
  run_id uuid not null,
  path text not null,
  kind text not null,
  content text not null check (
    (
      kind = 'archive-base64'
      and octet_length(content) <= 4194304
    )
    or (
      kind <> 'archive-base64'
      and octet_length(content) <= 262144
    )
  ),
  content_hash text not null,
  workspace_version integer not null,
  created_at timestamptz not null default now(),
  foreign key (owner_id, project_id, task_id, run_id) references public.engineering_runs (owner_id, project_id, task_id, id)
);

create table public.engineering_checks (
  id uuid primary key,
  owner_id text not null,
  project_id uuid not null,
  task_id uuid not null,
  run_id uuid not null,
  check_id text not null,
  command text not null,
  workspace_version integer not null,
  status text not null check (status in ('passed', 'failed', 'cancelled')),
  exit_code integer,
  logs text not null check (octet_length(logs) <= 65536),
  created_at timestamptz not null default now(),
  foreign key (owner_id, project_id, task_id, run_id) references public.engineering_runs (owner_id, project_id, task_id, id),
  check (
    status <> 'passed'
    or exit_code = 0
  )
);

alter table public.engineering_projects
add foreign key (owner_id, id, active_task_id) references public.engineering_tasks (owner_id, project_id, id);

alter table public.engineering_projects
add foreign key (owner_id, id, active_run_id) references public.engineering_runs (owner_id, project_id, id);

alter table public.engineering_tasks
add foreign key (owner_id, project_id, id, current_run_id) references public.engineering_runs (owner_id, project_id, task_id, id);

-- Legacy report attempts remain readable and may optionally link to a project.
alter table public.agent_workflow_runs
add column project_id uuid;

alter table public.agent_workflow_runs
add column task_id uuid;

alter table public.agent_workflow_runs
add foreign key (user_id, project_id, task_id) references public.engineering_tasks (owner_id, project_id, id);

alter table public.engineering_projects enable row level security;

alter table public.engineering_projects force row level security;

revoke all on public.engineering_projects
from
  public,
  anon,
  authenticated;

grant
select
,
  insert,
update on public.engineering_projects to agent_runtime;

create policy engineering_projects_owner on public.engineering_projects for all to agent_runtime using (
  owner_id = current_setting('app.engineering_owner', true)
)
with
  check (
    owner_id = current_setting('app.engineering_owner', true)
  );

create index engineering_projects_owner_idx on public.engineering_projects (owner_id, created_at desc);

alter table public.engineering_tasks enable row level security;

alter table public.engineering_tasks force row level security;

revoke all on public.engineering_tasks
from
  public,
  anon,
  authenticated;

grant
select
,
  insert,
update on public.engineering_tasks to agent_runtime;

create policy engineering_tasks_owner on public.engineering_tasks for all to agent_runtime using (
  owner_id = current_setting('app.engineering_owner', true)
)
with
  check (
    owner_id = current_setting('app.engineering_owner', true)
  );

create index engineering_tasks_owner_idx on public.engineering_tasks (owner_id, created_at desc);

alter table public.engineering_runs enable row level security;

alter table public.engineering_runs force row level security;

revoke all on public.engineering_runs
from
  public,
  anon,
  authenticated;

grant
select
,
  insert,
update on public.engineering_runs to agent_runtime;

create policy engineering_runs_owner on public.engineering_runs for all to agent_runtime using (
  owner_id = current_setting('app.engineering_owner', true)
)
with
  check (
    owner_id = current_setting('app.engineering_owner', true)
  );

create index engineering_runs_owner_idx on public.engineering_runs (owner_id, created_at desc);

alter table public.engineering_artifacts enable row level security;

alter table public.engineering_artifacts force row level security;

revoke all on public.engineering_artifacts
from
  public,
  anon,
  authenticated;

grant
select
,
  insert,
update on public.engineering_artifacts to agent_runtime;

create policy engineering_artifacts_owner on public.engineering_artifacts for all to agent_runtime using (
  owner_id = current_setting('app.engineering_owner', true)
)
with
  check (
    owner_id = current_setting('app.engineering_owner', true)
  );

create index engineering_artifacts_owner_idx on public.engineering_artifacts (owner_id, created_at desc);

alter table public.engineering_checks enable row level security;

alter table public.engineering_checks force row level security;

revoke all on public.engineering_checks
from
  public,
  anon,
  authenticated;

grant
select
,
  insert,
update on public.engineering_checks to agent_runtime;

create policy engineering_checks_owner on public.engineering_checks for all to agent_runtime using (
  owner_id = current_setting('app.engineering_owner', true)
)
with
  check (
    owner_id = current_setting('app.engineering_owner', true)
  );

create index engineering_checks_owner_idx on public.engineering_checks (owner_id, created_at desc);

commit;
