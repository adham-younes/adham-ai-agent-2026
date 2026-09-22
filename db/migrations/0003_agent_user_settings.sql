begin;

create table if not exists public.agent_user_settings (
  user_id text primary key,
  system_prompt text not null check (char_length(system_prompt) between 1 and 8000),
  memory_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.agent_user_settings enable row level security;
alter table public.agent_user_settings force row level security;
revoke all on table public.agent_user_settings from public, anon, authenticated;
grant select, insert, update, delete on table public.agent_user_settings to service_role;
grant select, insert, update, delete on table public.agent_user_settings to agent_runtime;

create policy agent_user_settings_service_role
  on public.agent_user_settings for all to service_role
  using (true) with check (true);

create policy agent_user_settings_runtime_role
  on public.agent_user_settings for all to agent_runtime
  using (true) with check (true);

comment on table public.agent_user_settings is
  'Server-owned per-user agent preferences and dynamic system instructions.';

commit;
