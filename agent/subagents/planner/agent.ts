import { defineAgent } from "eve";
import { getGroqModel } from "@/lib/groq";

export default defineAgent({
  description: "يحوّل الأهداف المركبة إلى خطة قصيرة، حدود واضحة، عقود بيانات ومعايير قبول قبل التنفيذ.",
  model: getGroqModel("GROQ_API_KEY_2", "qwen/qwen3.8-27b") as any,
  modelContextWindowTokens: 131042,
});
