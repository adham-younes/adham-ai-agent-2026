import { createOpenAI } from "@ai-sdk/openai";

export function getGroqClient(keyEnvVar: "GROQ_API_KEY_1" | "GROQ_API_KEY_2" | "GROQ_API_KEY_3" | "GROQ_API_KEY") {
  const key = process.env[keyEnvVar] || process.env.GROQ_API_KEY || "placeholder-key";
  return createOpenAI({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: key,
  });
}
