import { defineAgent } from "eve";
import { getGroqClient } from "@/lib/groq";

export default defineAgent({
  description: "وكيل تنفيذي متخصص في كتابة الأكواد، استدعاء الأدوات والموصلات، وتنفيذ العمليات البرمجية وقواعد البيانات.",
  model: getGroqClient("GROQ_API_KEY_2")("qwen/qwen3.8-27b") as any,
  modelContextWindowTokens: 131042,
});
