import { defineAgent } from "eve";
import { getGroqModel } from "@/lib/groq";

export default defineAgent({
  description: "وكيل بحث وتحليل وتدقيق الجودة، متخصص في جمع البيانات، مراجعة الأكواد والحلول، والتحقق من صحة النتائج.",
  model: getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b") as any,
  modelContextWindowTokens: 131042,
});

