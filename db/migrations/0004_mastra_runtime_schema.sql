begin;

create schema if not exists mastra;
revoke all on schema mastra from public, anon, authenticated;
grant usage, create on schema mastra to agent_runtime;

comment on schema mastra is
  'Isolated durable workflow storage managed by the Mastra runtime role.';

commit;
