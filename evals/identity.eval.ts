import { defineEval } from "eve/evals";
import { includes } from "eve/evals/expect";

export default defineEval({
  description: "ADHAM AGENT introduces itself without unnecessary tools.",
  async test(t) {
    await t.send("ما اسمك؟ أجب بجملة واحدة فقط.");
    t.succeeded();
    t.check(t.reply, includes("ADHAM AGENT"));
  },
});
