import { createOpenAI } from "@ai-sdk/openai";

export function getGroqModel(
  keyEnvVar: "GROQ_API_KEY_1" | "GROQ_API_KEY_2" | "GROQ_API_KEY_3" | "GROQ_API_KEY",
  modelId: string,
) {
  const key = process.env[keyEnvVar] || process.env.GROQ_API_KEY || "placeholder-key";
  const groq = createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
  });
  // Force chat completions API (/chat/completions) which Groq supports natively
  return groq.chat(modelId);
}
