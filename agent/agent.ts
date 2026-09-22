import { defineAgent } from "eve";
import { getGroqModel } from "@/lib/groq";

export default defineAgent({
  model: getGroqModel("GROQ_API_KEY_1", "qwen/qwen3.8-27b") as any,
  modelContextWindowTokens: 131042,
  reasoning: "low",
});




