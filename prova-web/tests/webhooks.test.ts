import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { checkWebhookUrl, signWebhook } from "../lib/server/webhooks";

test("signature is HMAC-SHA256 of '<t>.<body>'", () => {
  const sig = signWebhook("whsec_test", '{"a":1}', 1700000000);
  const expected = createHmac("sha256", "whsec_test").update('1700000000.{"a":1}').digest("hex");
  assert.equal(sig, `t=1700000000,v1=${expected}`);
});

test("webhook URLs must be public https", async () => {
  assert.match((await checkWebhookUrl("http://example.com/x"))!, /https/);
  assert.match((await checkWebhookUrl("https://127.0.0.1/x"))!, /private/);
  assert.match((await checkWebhookUrl("https://10.1.2.3/x"))!, /private/);
  assert.match((await checkWebhookUrl("https://169.254.169.254/latest"))!, /private/);
  assert.match((await checkWebhookUrl("https://[::1]/x"))!, /private/);
  assert.match((await checkWebhookUrl("not a url"))!, /full URL/);
  assert.equal(await checkWebhookUrl("https://8.8.8.8/hook"), null);
});
