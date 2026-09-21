import { createOpenAI } from "@ai-sdk/openai";

const UNSUPPORTED_GROQ_FIELDS = [
  "safety_identifier",
  "store",
  "metadata",
  "prediction",
  "service_tier",
  "prompt_cache_key",
  "prompt_cache_options",
  "prompt_cache_retention",
  "verbosity",
];

const groqFetch: typeof fetch = async (url, init) => {
  if (init?.body && typeof init.body === "string") {
    try {
      const parsed = JSON.parse(init.body);
      let modified = false;

      for (const field of UNSUPPORTED_GROQ_FIELDS) {
        if (field in parsed) {
          delete parsed[field];
          modified = true;
        }
      }

      if (modified) {
        init = {
          ...init,
          body: JSON.stringify(parsed),
        };
      }
    } catch {
      // Body is not JSON, pass through unchanged
    }
  }

  return fetch(url, init);
};

export function getGroqModel(
  keyEnvVar: "GROQ_API_KEY_1" | "GROQ_API_KEY_2" | "GROQ_API_KEY_3" | "GROQ_API_KEY",
  modelId: string,
) {
  const key = process.env[keyEnvVar] || process.env.GROQ_API_KEY || "placeholder-key";
  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
    fetch: groqFetch,
  });
  // Force chat completions API (/chat/completions) which Groq supports natively
  return groq.chat(modelId);
}
