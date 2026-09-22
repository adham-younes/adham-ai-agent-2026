begin;

revoke all on table public.agent_workflow_runs from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_workflow_runs to service_role;

drop policy if exists agent_workflow_runs_server_only
  on public.agent_workflow_runs;

create policy agent_workflow_runs_server_only
  on public.agent_workflow_runs
  for all
  to service_role
  using (true)
  with check (true);

commit;
