import assert from "node:assert/strict";
import { test } from "node:test";
import { readFile } from "node:fs/promises";
import ts from "typescript";

// Load authored TS without importing a live database pool or modifying app source.
let source = await readFile(new URL("../agent/memory/file.ts", import.meta.url), "utf8");
for (const name of ["eve/memory", "eve/memory/scope", "eve/tools", "zod"]) {
  source = source.replace(`"${name}"`, JSON.stringify(import.meta.resolve(name)));
}
source = source.replace('"../../lib/platform/memory-store"', JSON.stringify(new URL("../lib/platform/memory-store.ts", import.meta.url).href));
source = source.replace('import { database } from "../../lib/platform/database";', "const database = undefined;");
const javascript = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const { default: slot, supabaseMemory } = await import(`data:text/javascript;base64,${Buffer.from(javascript).toString("base64")}`);

function context(id, key = id) {
  return { session: { auth: { current: id ? { principalType: "user", principalId: id, authenticator: "test", issuer: "test" } : null } }, memory: { scope: { key } } };
}

test("slot disables missing/runtime/local development principals and scopes authenticated users", () => {
  assert.equal(slot.scope(context(undefined)), null);
  assert.equal(slot.scope({ session: { auth: { current: { principalType: "local-dev", principalId: "shared" } } } }), null);
  assert.notEqual(slot.scope(context("visitor-a")), slot.scope(context("visitor-b")));
});

test("provider closes tools over locked scope, recalls bounded facts as untrusted data, omits tools without identity", async () => {
  const scopes = [];
  const provider = supabaseMemory({
    async save(scope, key, fact) { scopes.push([scope, key, fact]); },
    async recall(scope) { scopes.push(scope); return [{ key: "language", fact: "I prefer English." }]; },
  });
  assert.equal(await provider.tools(context(undefined)), null);
  assert.equal(await provider.recall["turn.started"](context(undefined)), null);
  const tools = await provider.tools(context("visitor-a", "eve-locked-a"));
  await tools.save_memory.execute({ key: "language", fact: "I prefer English.", scope: "hostile-other-scope" });
  assert.deepEqual(scopes[0], ["eve-locked-a", "language", "I prefer English."]);
  const recall = await provider.recall["turn.started"](context("visitor-b", "eve-locked-b"));
  assert.equal(scopes[1], "eve-locked-b");
  assert.equal(recall.messages[0].id, "language");
  assert.match(recall.messages[0].content, /untrusted data/);
});

test("provider propagates database failure instead of inventing successful recall", async () => {
  const provider = supabaseMemory({ recall: async () => { throw new Error("MEMORY_UNAVAILABLE"); } });
  await assert.rejects(provider.recall["turn.started"](context("visitor-a")), /MEMORY_UNAVAILABLE/);
});
