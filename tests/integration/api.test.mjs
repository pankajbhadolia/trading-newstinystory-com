import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "better-auth/crypto";

const databaseUrl = process.env.TEST_DATABASE_URL;
const baseUrl = process.env.TEST_APP_URL;
if (!databaseUrl || !baseUrl) throw new Error("Set TEST_DATABASE_URL and TEST_APP_URL for an isolated integration run.");
const db = new URL(databaseUrl);
const app = new URL(baseUrl);
if (!["localhost", "127.0.0.1"].includes(db.hostname) || db.pathname !== "/tcc_integration" ||
    !["localhost", "127.0.0.1"].includes(app.hostname) || app.port !== "3014" ||
    app.protocol !== "http:" || app.pathname !== "/") {
  throw new Error("Integration tests require localhost database tcc_integration and http://localhost:3014.");
}
const prisma = new PrismaClient({ datasourceUrl: databaseUrl });
const origin = app.origin;

async function request(path, { cookie, method = "GET", json, body, headers = {}, ...options } = {}) {
  return fetch(`${origin}${path}`, {
    method, ...options,
    headers: { ...(method !== "GET" ? { origin } : {}), ...(cookie ? { cookie } : {}), ...(json !== undefined ? { "content-type": "application/json" } : {}), ...headers },
    body: json !== undefined ? JSON.stringify(json) : body,
  });
}

test("private API authentication, isolation, calculations, uploads, limits and health", async () => {
  const suffix = randomUUID();
  const users = [`integration-a-${suffix}`, `integration-b-${suffix}`, `integration-unverified-${suffix}`];
  const password = `integration-${randomUUID()}-password`;
  const hash = await hashPassword(password);
  const date = new Date().toISOString().slice(0, 10);
  try {
    for (const id of users) {
      await prisma.user.create({ data: {
        id, name: "Synthetic integration user", email: `${id}@example.invalid`, emailVerified: id !== users[2],
        accounts: { create: { id: `account-${id}`, accountId: id, providerId: "credential", password: hash } },
      } });
    }

    assert.equal((await request("/api/health/live")).status, 200);
    const ready = await request("/api/health/ready");
    assert.equal(ready.status, 200);
    assert.match(ready.headers.get("cache-control"), /no-store/);
    assert.equal((await request("/api/journal/trades")).status, 401);
    const cookies = [];
    for (const id of users.slice(0, 2)) {
      const login = await request("/api/auth/sign-in/email", { method: "POST", json: { email: `${id}@example.invalid`, password } });
      assert.equal(login.status, 200, await login.clone().text());
      const cookie = login.headers.getSetCookie().map((entry) => entry.split(";")[0]).join("; ");
      assert.match(cookie, /session_token/);
      cookies.push(cookie);
    }
    const invalidLogin = await request("/api/auth/sign-in/email", { method: "POST", json: { email: `${users[0]}@example.invalid`, password: "incorrect-integration-password" } });
    assert.equal(invalidLogin.status, 401);
    const unverifiedLogin = await request("/api/auth/sign-in/email", { method: "POST", json: { email: `${users[2]}@example.invalid`, password } });
    assert.equal(unverifiedLogin.status, 403);

    const pinkPreference = await request("/api/account", { method: "PUT", cookie: cookies[0], json: { name: "Synthetic integration user", theme: "pink" } });
    assert.equal(pinkPreference.status, 200);
    const account = await request("/api/account", { cookie: cookies[0] });
    assert.equal((await account.json()).user.preference.theme, "pink");
    const retiredPreference = await request("/api/account", { method: "PUT", cookie: cookies[0], json: { name: "Synthetic integration user", theme: "high-contrast" } });
    assert.equal(retiredPreference.status, 400);

    const trade = {
      date, session: "Morning", instrument: "Equity", symbol: "SYNTH", segment: "NSE", strikePrice: null, expiryDate: null,
      direction: "BUY", executions: [{ side: "ENTRY", price: 100, quantity: 10 }, { side: "ENTRY", price: 110, quantity: 20 }, { side: "EXIT", price: 120, quantity: 6 }, { side: "EXIT", price: 115, quantity: 9 }],
      stopLoss: 95, target: 125, charges: 5, strategy: "", entryReason: "", exitReason: "", emotion: "", notes: "", draft: false,
    };
    const created = await request("/api/journal/trades", { method: "POST", cookie: cookies[0], json: trade });
    assert.equal(created.status, 201, await created.clone().text());
    const { id } = await created.json();
    const stored = await prisma.journalTrade.findUniqueOrThrow({ where: { id } });
    assert.equal(stored.gross.toFixed(2), "155.00");
    assert.equal(stored.net.toFixed(2), "150.00");
    const basic = await request(`/api/analytics/basic?start=${date}&end=${date}&interval=daily`, { cookie: cookies[0] });
    assert.equal(basic.status, 200);
    const report = await basic.json();
    assert.equal(report.gross, "155.00");
    assert.equal(report.net, "150.00");
    const other = await (await request(`/api/journal/trades?id=${id}`, { cookie: cookies[1] })).json();
    assert.equal(other.trades.length, 0);
    assert.equal((await request(`/api/journal/trades/${id}`, { method: "PUT", cookie: cookies[1], json: trade })).status, 404);
    assert.equal((await request(`/api/analytics?aStart=${date}&aEnd=${date}&bStart=${date}&bEnd=${date}`, { cookie: cookies[0] })).status, 403);
    assert.equal((await request("/api/journal/trades", { method: "POST", cookie: cookies[0], json: trade, headers: { origin: "https://not-the-app.example" } })).status, 403);

    const upload = (bytes, type) => {
      const form = new FormData();
      form.set("kind", "trade"); form.set("id", id);
      form.set("file", new Blob([bytes], { type }), "synthetic.png");
      return form;
    };
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=", "base64");
    const image = await request("/api/journal/screenshots", { method: "POST", cookie: cookies[0], body: upload(png, "image/png") });
    assert.equal(image.status, 201, await image.clone().text());
    const { id: imageId } = await image.json();
    assert.equal((await request(`/api/journal/screenshots/${imageId}`, { cookie: cookies[1] })).status, 404);
    assert.equal((await request(`/api/journal/screenshots/${imageId}`, { method: "DELETE", cookie: cookies[1] })).status, 404);
    const download = await request(`/api/journal/screenshots/${imageId}`, { cookie: cookies[0] });
    assert.equal(download.status, 200);
    assert.equal(download.headers.get("content-security-policy"), "default-src 'none'; sandbox");
    assert.deepEqual(Buffer.from(await download.arrayBuffer()), png);
    assert.equal((await request("/api/journal/screenshots", { method: "POST", cookie: cookies[0], body: upload(Buffer.from("not an image"), "image/png") })).status, 400);
    assert.equal((await request("/api/journal/screenshots", { method: "POST", cookie: cookies[0], body: upload(new Uint8Array(5 * 1024 * 1024 + 1), "image/png") })).status, 400);
    assert.equal((await request("/api/risk/assessments", { method: "POST", cookie: cookies[0], headers: { "content-type": "application/json" }, body: " ".repeat(262145) })).status, 413);
    assert.equal((await request("/api/risk/assessments", { method: "POST", cookie: cookies[0], headers: { "content-type": "application/json" }, body: "{" })).status, 400);
    const exportResponse = await request("/api/account/export", { cookie: cookies[0] });
    assert.equal(exportResponse.status, 200);
    assert.equal((await exportResponse.json()).trades[0].id, id);
    const attempts = [];
    for (let i = 0; i < 6; i++) {
      attempts.push((await request("/api/auth/sign-in/email", { method: "POST", json: { email: `${users[0]}@example.invalid`, password: "incorrect-integration-password" } })).status);
    }
    assert.ok(attempts.includes(429), `Expected a rate limit; received ${attempts.join(", ")}`);
  } finally {
    await prisma.user.deleteMany({ where: { id: { in: users } } });
    await prisma.$disconnect();
  }
});
