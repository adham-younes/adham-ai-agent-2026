begin;

create table if not exists public.agent_memory_notes (
  scope_key text not null check (char_length(scope_key) between 1 and 1024),
  note_key text not null check (note_key ~ '^[a-z][a-z0-9_-]{0,47}$'),
  fact text not null check (char_length(btrim(fact)) between 1 and 500 and octet_length(fact) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (scope_key, note_key)
);

alter table public.agent_memory_notes enable row level security;
alter table public.agent_memory_notes force row level security;
revoke all on table public.agent_memory_notes from public, anon, authenticated;
grant select, insert, update on table public.agent_memory_notes to service_role, agent_runtime;

create policy agent_memory_notes_runtime_scope
  on public.agent_memory_notes for all to agent_runtime
  using (scope_key = nullif(current_setting('app.memory_scope', true), ''))
  with check (scope_key = nullif(current_setting('app.memory_scope', true), ''));

create policy agent_memory_notes_service_scope
  on public.agent_memory_notes for all to service_role
  using (scope_key = nullif(current_setting('app.memory_scope', true), ''))
  with check (scope_key = nullif(current_setting('app.memory_scope', true), ''));

create index if not exists agent_memory_notes_recent
  on public.agent_memory_notes (scope_key, updated_at desc);

comment on table public.agent_memory_notes is
  'Explicit bounded stable facts, partitioned by Eve locked principal scope. No conversation events or credentials.';

commit;
