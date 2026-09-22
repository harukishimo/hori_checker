import { test } from "node:test";
import assert from "node:assert/strict";
import { POST } from "../app/api/check/route";
const req = (body: unknown, headers: Record<string, string> = {}) =>
  new Request("http://localhost/api/check", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
test("rejects cross-origin and invalid input before contacting upstream", async () => {
  assert.equal(
    (
      await POST(
        req(
          { text: "好きな車のデザインを考えています" },
          { origin: "https://other.example" },
        ),
      )
    ).status,
    403,
  );
  assert.equal((await POST(req({ text: "短い" }))).status, 400);
  assert.equal((await POST(req({ text: "a".repeat(41000) }))).status, 413);
  assert.equal(
    (
      await POST(
        new Request("http://localhost/api/check", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "{",
        }),
      )
    ).status,
    400,
  );
});
test("missing key returns safe configuration error", async () => {
  const key = process.env.TYPESAFE_API_KEY;
  delete process.env.TYPESAFE_API_KEY;
  try {
    assert.equal(
      (await POST(req({ text: "車のアップデートに魅力を感じています。" })))
        .status,
      503,
    );
  } finally {
    if (key !== undefined) process.env.TYPESAFE_API_KEY = key;
  }
});
test("provider failures never disclose upstream details or credentials", async () => {
  const original = globalThis.fetch;
  const key = process.env.TYPESAFE_API_KEY;
  process.env.TYPESAFE_API_KEY = "test-only-secret";
  try {
    for (const status of [401, 429, 500]) {
      globalThis.fetch = async () =>
        new Response("test-only-secret", { status });
      const response = await POST(
        req({ text: "車のアップデートに魅力を感じています。" }),
      );
      assert.equal(response.status, status === 429 ? 429 : 502);
      assert.ok(!(await response.text()).includes("test-only-secret"));
    }
    globalThis.fetch = async () => Response.json({ unexpected: true });
    assert.equal(
      (await POST(req({ text: "車のアップデートに魅力を感じています。" })))
        .status,
      502,
    );
  } finally {
    globalThis.fetch = original;
    if (key === undefined) delete process.env.TYPESAFE_API_KEY;
    else process.env.TYPESAFE_API_KEY = key;
  }
});

test("allows the public Host when Next.js normalizes the internal URL", async () => {
  // Invalid input should reach validation (400), rather than fail origin (403).
  const request = new Request("http://localhost:3100/api/check", {method:"POST",headers:{"Content-Type":"application/json",Host:"127.0.0.1:3100",Origin:"http://127.0.0.1:3100"},body:JSON.stringify({text:"short"})});
  assert.equal((await POST(request)).status,400);
});
