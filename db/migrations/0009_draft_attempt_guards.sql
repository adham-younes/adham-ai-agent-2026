begin;
-- Freeze task authority when a workflow first binds. Replays cannot nominate a newer attempt.
alter table public.engineering_tasks add column latest_draft_run_id text;
alter table public.agent_workflow_runs add column draft_task_version integer;
alter table public.agent_workflow_runs add column draft_execution_run_id uuid;
alter table public.agent_workflow_runs add unique (user_id, project_id, task_id, id);
alter table public.engineering_tasks add foreign key (owner_id, project_id, id, latest_draft_run_id)
  references public.agent_workflow_runs (user_id, project_id, task_id, id);
alter table public.agent_workflow_runs add foreign key (user_id, project_id, task_id, draft_execution_run_id)
  references public.engineering_runs (owner_id, project_id, task_id, id);
commit;
