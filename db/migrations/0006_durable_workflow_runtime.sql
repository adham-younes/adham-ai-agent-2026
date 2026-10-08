begin;

-- Existing login credentials and data remain unchanged. A fresh role needs
-- credentials provisioned separately; migrations never embed passwords.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'agent_runtime') then
    create role agent_runtime nologin nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;

grant usage on schema public to agent_runtime;
revoke all on table public.agent_workflow_runs from public, anon, authenticated;
grant select, insert, update on table public.agent_workflow_runs to agent_runtime;
alter table public.agent_workflow_runs enable row level security;
alter table public.agent_workflow_runs force row level security;
drop policy if exists agent_workflow_runs_runtime_role on public.agent_workflow_runs;
drop policy if exists agent_workflow_runs_runtime on public.agent_workflow_runs;
create policy agent_workflow_runs_runtime_role on public.agent_workflow_runs
  for all to agent_runtime using (true) with check (true);

alter table public.agent_workflow_runs add column if not exists idempotency_key text;
create unique index if not exists agent_workflow_runs_owner_request_idx
  on public.agent_workflow_runs (user_id, idempotency_key)
  where idempotency_key is not null;

create schema if not exists mastra;
revoke all on schema mastra from public, anon, authenticated;
grant usage, create on schema mastra to agent_runtime;
grant all on all tables in schema mastra to agent_runtime;
grant all on all sequences in schema mastra to agent_runtime;
revoke all on all tables in schema mastra from public, anon, authenticated;
revoke all on all sequences in schema mastra from public, anon, authenticated;
revoke all on all functions in schema mastra from public, anon, authenticated;

-- Secure future objects owned by the migration role. Runtime-owned defaults
-- are hardened by initializeWorkflowStorage under its own connection role.
alter default privileges for role postgres in schema public
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema public
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema mastra
  revoke all on tables from public, anon, authenticated;
alter default privileges for role postgres in schema mastra
  revoke all on sequences from public, anon, authenticated;
alter default privileges for role postgres in schema mastra
  revoke execute on functions from public, anon, authenticated;
alter default privileges for role postgres in schema mastra
  grant all on tables to agent_runtime;
alter default privileges for role postgres in schema mastra
  grant all on sequences to agent_runtime;

commit;
