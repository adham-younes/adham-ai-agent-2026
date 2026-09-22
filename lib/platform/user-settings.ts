import { database } from "./database";

export const DEFAULT_SYSTEM_PROMPT =
  "نفّذ الطلبات بوضوح ودقة. استخدم الأدوات عند الحاجة، تحقق من النتائج، واطلب الموافقة قبل أي إجراء حساس أو غير قابل للتراجع.";

export interface UserAgentSettings {
  readonly systemPrompt: string;
  readonly memoryEnabled: boolean;
  readonly updatedAt: string | null;
}

const localSettings = new Map<string, UserAgentSettings>();

export async function getUserAgentSettings(userId: string): Promise<UserAgentSettings> {
  if (!database) {
    return localSettings.get(userId) ?? {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      memoryEnabled: true,
      updatedAt: null,
    };
  }
  const result = await database.query<{
    system_prompt: string;
    memory_enabled: boolean;
    updated_at: Date;
  }>(
    `select system_prompt, memory_enabled, updated_at
       from public.agent_user_settings
      where user_id = $1`,
    [userId],
  );
  const row = result.rows[0];
  return row
    ? {
        systemPrompt: row.system_prompt,
        memoryEnabled: row.memory_enabled,
        updatedAt: row.updated_at.toISOString(),
      }
    : { systemPrompt: DEFAULT_SYSTEM_PROMPT, memoryEnabled: true, updatedAt: null };
}

export async function saveUserAgentSettings(
  userId: string,
  settings: Pick<UserAgentSettings, "systemPrompt" | "memoryEnabled">,
): Promise<UserAgentSettings> {
  if (!database) {
    const value = {
      systemPrompt: settings.systemPrompt,
      memoryEnabled: settings.memoryEnabled,
      updatedAt: new Date().toISOString(),
    };
    localSettings.set(userId, value);
    return value;
  }
  const result = await database.query<{
    system_prompt: string;
    memory_enabled: boolean;
    updated_at: Date;
  }>(
    `insert into public.agent_user_settings (user_id, system_prompt, memory_enabled)
     values ($1, $2, $3)
     on conflict (user_id) do update
       set system_prompt = excluded.system_prompt,
           memory_enabled = excluded.memory_enabled,
           updated_at = now()
     returning system_prompt, memory_enabled, updated_at`,
    [userId, settings.systemPrompt, settings.memoryEnabled],
  );
  const row = result.rows[0];
  if (!row) throw new Error("Settings were not saved");
  return {
    systemPrompt: row.system_prompt,
    memoryEnabled: row.memory_enabled,
    updatedAt: row.updated_at.toISOString(),
  };
}
