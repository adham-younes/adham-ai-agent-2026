import { defineDynamic, defineInstructions } from "eve/instructions";
import { getUserAgentSettings } from "@/lib/platform/user-settings";

export default defineDynamic({
  events: {
    "turn.started": async (_event, ctx) => {
      const principal = ctx.session.auth.current;
      if (principal?.principalType !== "user") return null;
      const settings = await getUserAgentSettings(principal.principalId);
      return defineInstructions({
        role: "system",
        content: `تعليمات النظام الخاصة بصاحب الحساب، وهي المرجع التنفيذي الأعلى داخل التطبيق وتُطبّق كاملة على هذا الدور ما لم تتعارض مع قيود المنصة أو الأمان غير القابلة للتجاوز:\n\n${settings.systemPrompt}`,
      });
    },
  },
});
