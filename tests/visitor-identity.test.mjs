import assert from "node:assert/strict";
import { test } from "node:test";
import {
  createVisitorToken, visitorIdFromToken, createSessionGrant,
  verifySessionGrant, visitorIdFromRequest, isCrossOriginMutation,
} from "../lib/visitor-identity.ts";

process.env.BETTER_AUTH_SECRET = "test-only-signing-key-for-visitor-identity";

test("visitors get distinct stable identities without credentials", () => {
  const first = createVisitorToken();
  const second = createVisitorToken();
  assert.notEqual(visitorIdFromToken(first), visitorIdFromToken(second));
  const request = new Request("https://example.com", { headers: { cookie: `adham_visitor=${first}` } });
  assert.equal(visitorIdFromRequest(request), visitorIdFromToken(first));
});

test("same-origin browser requests survive the internal Eve proxy", () => {
  const request = new Request("http://127.0.0.1:49771/eve/v1/session", {
    method: "POST", headers: { origin: "http://localhost:3000", "sec-fetch-site": "same-origin" },
  });
  assert.equal(isCrossOriginMutation(request), false);
  const hostile = new Request("http://127.0.0.1:49771/eve/v1/session", {
    method: "POST", headers: { origin: "https://unrelated.example", "sec-fetch-site": "cross-site" },
  });
  assert.equal(isCrossOriginMutation(hostile), true);
});

test("tampered, expired and malformed identities are rejected", () => {
  const token = createVisitorToken();
  assert.equal(visitorIdFromToken(`${token.slice(0, -1)}!`), undefined);
  assert.equal(visitorIdFromToken(createVisitorToken(0)), undefined);
  for (const bad of [undefined, "", "..", "arbitrary-user.signature", "a".repeat(10000)]) {
    assert.equal(visitorIdFromToken(bad), undefined);
  }
});

test("session access belongs to its original visitor and session", () => {
  const owner = visitorIdFromToken(createVisitorToken());
  const other = visitorIdFromToken(createVisitorToken());
  const grant = createSessionGrant(owner, "wrun_one");
  assert.equal(verifySessionGrant(grant, owner, "wrun_one"), true);
  assert.equal(verifySessionGrant(grant, other, "wrun_one"), false);
  assert.equal(verifySessionGrant(grant, owner, "wrun_two"), false);
  assert.equal(verifySessionGrant(`${grant}!`, owner, "wrun_one"), false);
  assert.equal(verifySessionGrant(createSessionGrant(owner, "wrun_one", 0), owner, "wrun_one"), false);
});
