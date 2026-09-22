import { defineDynamic, defineInstructions } from "eve/instructions";
import { getUserAgentSettings } from "@/lib/platform/user-settings";

export default defineDynamic({
  events: {
    "session.started": async (_event, ctx) => {
      const principal = ctx.session.auth.current;
      if (principal?.principalType !== "user") return null;
      const settings = await getUserAgentSettings(principal.principalId);
      return defineInstructions({
        content: `تعليمات المستخدم الدائمة لهذه الجلسة:\n${settings.systemPrompt}`,
      });
    },
  },
});
