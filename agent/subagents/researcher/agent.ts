import { defineAgent } from "eve";
import { getGroqModel } from "@/lib/groq";

export default defineAgent({
  description: "يجري بحثاً لحظياً مركزاً، يقارن المصادر، ويعيد حقائق موثقة وروابط مباشرة.",
  model: getGroqModel("GROQ_API_KEY_3", "qwen/qwen3.8-27b") as any,
  modelContextWindowTokens: 131042,
});
