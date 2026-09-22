update public.agent_user_settings
   set memory_enabled = true
 where memory_enabled is false;

alter table public.agent_user_settings
  alter column memory_enabled set default true;

alter table public.agent_user_settings
  add constraint agent_user_settings_memory_always_enabled
  check (memory_enabled is true);

comment on column public.agent_user_settings.memory_enabled is
  'Persistent agent memory is permanently enabled for every authenticated principal.';
