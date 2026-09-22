begin;

create table if not exists public.agent_workflow_runs (
  id text primary key,
  user_id text not null,
  workflow_id text not null check (workflow_id in (
    'feature-delivery',
    'database-engineering',
    'code-audit-repair',
    'release-readiness',
    'architecture-evaluation',
    'incident-response',
    'continual-learning'
  )),
  status text not null check (status in ('running', 'succeeded', 'failed')),
  input_data jsonb not null,
  output_data jsonb,
  error_message text,
  duration_ms integer check (duration_ms is null or duration_ms >= 0),
  created_at timestamptz not null default now(),
  completed_at timestamptz,
  constraint agent_workflow_runs_completion_consistency check (
    (status = 'running' and completed_at is null)
    or (status in ('succeeded', 'failed') and completed_at is not null)
  )
);

create index if not exists agent_workflow_runs_user_created_idx
  on public.agent_workflow_runs (user_id, created_at desc);

create index if not exists agent_workflow_runs_active_idx
  on public.agent_workflow_runs (created_at desc)
  where status = 'running';

alter table public.agent_workflow_runs enable row level security;
alter table public.agent_workflow_runs force row level security;
revoke all on table public.agent_workflow_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_workflow_runs to service_role;

create policy agent_workflow_runs_server_only
  on public.agent_workflow_runs
  for all
  to service_role
  using (true)
  with check (true);

comment on table public.agent_workflow_runs is
  'Server-owned audit log for authenticated executive workflow executions.';

commit;
