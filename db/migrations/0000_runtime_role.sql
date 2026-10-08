begin;
-- Fresh databases need this role before settings migration 0003 references it.
-- Provision its login secret outside migrations; never embed credentials.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'agent_runtime') then
    create role agent_runtime nologin nosuperuser nocreatedb nocreaterole nobypassrls;
  end if;
end $$;
grant usage on schema public to agent_runtime;
commit;
