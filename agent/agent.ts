import { defineAgent } from "eve";
import { getGroqClient } from "@/lib/groq";

export default defineAgent({
  model: getGroqClient("GROQ_API_KEY_1")("openai/gpt-oss-120b") as any,
  modelContextWindowTokens: 131072,
});



