import { defineAgent } from "eve";
import { getGroqModel } from "@/lib/groq";

export default defineAgent({
  description: "يراجع النتائج بشكل مستقل، يختبر الادعاءات، ويكشف فجوات الجودة والأمان قبل التسليم.",
  model: getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b") as any,
  modelContextWindowTokens: 131042,
});
