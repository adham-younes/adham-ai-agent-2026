import { defineAgent } from "eve";
import { getGroqModel } from "@/lib/groq";

export default defineAgent({
  model: getGroqModel("GROQ_API_KEY_1", "openai/gpt-oss-120b") as any,
  modelContextWindowTokens: 131072,
});




