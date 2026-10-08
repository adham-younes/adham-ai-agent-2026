import type { Pool, PoolClient } from "pg";

export const MEMORY_NOTE_LIMIT = 10;
export const MEMORY_RECALL_LIMIT = 5;
export const MEMORY_FACT_LIMIT = 500;

export function trustedMemoryPrincipal(principal: { principalType?: string; principalId?: string } | null | undefined): boolean {
  return principal?.principalType === "user" && typeof principal.principalId === "string" && principal.principalId.trim().length > 0;
}

export function validateMemoryFact(key: string, fact: string): void {
  if (!/^[a-z][a-z0-9_-]{0,47}$/.test(key) || !fact.trim() || fact.length > MEMORY_FACT_LIMIT || Buffer.byteLength(fact, "utf8") > 2000 ||
      /[\u0000-\u001f\u007f]|password|api[_ -]?key|secret|bearer\s|sk-[a-z0-9_-]{8,}|-----BEGIN|ignore.{0,30}instructions|system\s*:|developer\s*:|execute\s+(code|command)|<\/?(system|instruction)/i.test(fact)) {
    throw new Error("MEMORY_INVALID_FACT");
  }
}

export function createMemoryStore(pool: Pick<Pool, "connect"> | undefined) {
  async function scoped<T>(scope: string, action: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!scope?.trim() || scope.length > 1024) throw new Error("MEMORY_IDENTITY_REQUIRED");
    if (!pool) throw new Error("MEMORY_UNAVAILABLE");
    let client: PoolClient | undefined;
    try {
      client = await pool.connect();
      await client.query("begin");
      await client.query("select set_config('app.memory_scope', $1, true)", [scope]);
      const result = await action(client);
      await client.query("commit");
      return result;
    } catch (error) {
      if (client) await client.query("rollback").catch(() => undefined);
      if (error instanceof Error && error.message === "MEMORY_CAPACITY_REACHED") throw error;
      throw new Error("MEMORY_UNAVAILABLE");
    } finally {
      client?.release();
    }
  }

  return {
    async recall(scope: string): Promise<{ key: string; fact: string }[]> {
      return scoped(scope, async (client) => {
        const result = await client.query<{ key: string; fact: string }>(
          "select note_key as key, fact from public.agent_memory_notes where scope_key = $1 order by updated_at desc, note_key asc limit 5", [scope],
        );
        return result.rows.filter(({ key, fact }) => {
          try { validateMemoryFact(key, fact); return true; } catch { return false; }
        });
      });
    },
    async save(scope: string, key: string, fact: string): Promise<void> {
      validateMemoryFact(key, fact);
      await scoped(scope, async (client) => {
        // Serialize count + insert for this scope, including concurrent sessions.
        await client.query("select pg_advisory_xact_lock(hashtextextended($1, 0))", [scope]);
        const existing = await client.query("select 1 from public.agent_memory_notes where scope_key = $1 and note_key = $2", [scope, key]);
        if (!existing.rows.length) {
          const count = await client.query<{ count: number }>("select count(*)::int as count from public.agent_memory_notes where scope_key = $1", [scope]);
          if (count.rows[0].count >= MEMORY_NOTE_LIMIT) throw new Error("MEMORY_CAPACITY_REACHED");
        }
        await client.query(
          "insert into public.agent_memory_notes (scope_key, note_key, fact) values ($1, $2, $3) on conflict (scope_key, note_key) do update set fact = excluded.fact, updated_at = now() where agent_memory_notes.fact is distinct from excluded.fact", [scope, key, fact.trim()],
        );
      });
    },
  };
}
