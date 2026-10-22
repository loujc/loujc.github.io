// Local test for the stats API against Netlify's own local Blobs server.
// usage: npm install && npm test
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { setEnvironmentContext } from "@netlify/blobs";
import { BlobsServer } from "@netlify/blobs/server";

const directory = await mkdtemp(join(tmpdir(), "homepage-stats-"));
const server = new BlobsServer({ directory, token: "test" });
// The local server differs from production in ways that matter for optimistic concurrency: reads carry no ETag,
// ETags come from millisecond mtimes, and If-Match is checked and the write done in separate async steps. Make it
// behave like production (content ETags on reads, one write at a time) so the concurrency checks below are real.
const etagOf = (bytes) => `"${createHash("sha256").update(bytes).digest("hex")}"`;
BlobsServer.generateETag = async (path) => etagOf(await readFile(path));
const get = server.get.bind(server);
server.get = async (request) => {
  const response = await get(request);
  if (response.status !== 200) return response;
  const body = Buffer.from(await response.arrayBuffer());
  const headers = new Headers(response.headers);
  headers.set("etag", etagOf(body));
  return new Response(body, { status: 200, headers });
};
const put = server.put.bind(server);
let writes = Promise.resolve();
server.put = (request) => {
  const result = writes.then(() => put(request));
  writes = result.catch(() => {});
  return result;
};
const { port } = await server.start();
setEnvironmentContext({ siteID: "test", token: "test", edgeURL: `http://localhost:${port}`, uncachedEdgeURL: `http://localhost:${port}` });
const { default: api } = await import("./netlify/functions/api.mjs");
const { compact, openStore } = await import("./lib/stats.mjs");

const CHROME = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/141.0 Safari/537.36";
const BEIJING = { city: "Beijing", country: { code: "CN" }, latitude: 39.9042, longitude: 116.4074 };
const SHANGHAI = { city: "Shanghai", country: { code: "CN" }, latitude: 31.2304, longitude: 121.4737 };
const call = async (path, { ip = "203.0.113.1", ua = CHROME, geo = BEIJING, body, method = body ? "POST" : "GET", origin = "https://loujc.github.io" } = {}) => {
  const request = new Request(`https://stats.example${path}`, {
    method,
    headers: { Origin: origin, "User-Agent": ua, "Content-Type": "text/plain;charset=UTF-8" },
    body: body && JSON.stringify(body),
  });
  const response = await api(request, { ip, geo });
  return { status: response.status, headers: response.headers, data: response.status === 204 ? null : await response.json() };
};
const hit = (options) => call("/hit", { ...options, body: {} });
const like = (n, options) => call("/like", { ...options, body: { n } });

try {
  delete process.env.SALT;
  assert.equal((await hit()).status, 500, "refuses to hash without a salt");
  process.env.SALT = "test-salt";

  let a = (await hit()).data;
  assert.equal(a.visits, 1);
  assert.deepEqual(a.places.map((p) => p.city), ["Beijing"]);
  assert.equal((await hit()).data.visits, 1, "same visitor, same day: counted once");

  const b = (await hit({ ip: "198.51.100.7", geo: SHANGHAI })).data;
  assert.equal(b.visits, 2);
  assert.equal(b.recent.city, "Beijing", "latest visit from another city");
  a = (await hit()).data;
  assert.equal(a.recent.city, "Shanghai");
  assert.equal(a.countries, 1);
  assert.equal(a.cities, 2);

  assert.equal((await hit({ ua: "curl/8.7.1", ip: "192.0.2.9" })).data.visits, 2, "bots are not counted");
  assert.equal((await hit({ ua: "Mozilla/5.0 HeadlessChrome/141.0", ip: "192.0.2.9" })).data.visits, 2);

  assert.deepEqual((await like(3)).data, { likes: 3, myLikes: 3, likeCap: 10, granted: 3 });
  assert.deepEqual((await like(10)).data, { likes: 10, myLikes: 10, likeCap: 10, granted: 7 }, "capped at 10 a day");
  assert.equal((await like(1)).data.granted, 0);
  assert.equal((await like(1, { ip: "198.51.100.7", geo: SHANGHAI })).data.likes, 11);
  assert.equal((await like(2, { ua: "python-requests/2.32" })).data.granted, 0, "bots cannot like");

  // liking before the visit is counted still counts the visit once, and keeps the likes
  assert.equal((await like(2, { ip: "198.51.100.8" })).data.myLikes, 2);
  const c = (await hit({ ip: "198.51.100.8" })).data;
  assert.equal(c.visits, 3);
  assert.equal(c.myLikes, 2);

  // a visit without coordinates is counted but adds no place
  assert.equal((await hit({ ip: "198.51.100.9", geo: { country: { code: "SG" } } })).data.visits, 4);
  assert.equal((await call("/stats")).data.countries, 1);

  // concurrency: 30 new visitors at once, and 20 rapid likes from one of them
  const burst = Array.from({ length: 30 }, (_, i) => hit({ ip: `10.0.0.${i}`, geo: i % 2 ? SHANGHAI : BEIJING }));
  await Promise.all(burst);
  const likes = await Promise.all(Array.from({ length: 20 }, () => like(1, { ip: "10.0.0.1", geo: SHANGHAI })));
  assert.equal(likes.reduce((sum, r) => sum + r.data.granted, 0), 10, "the cap holds under concurrent likes");
  const after = (await call("/stats")).data;
  assert.equal(after.visits, 34, "no visit lost under contention");
  assert.equal(after.likes, 23);
  assert.equal(after.places.reduce((sum, p) => sum + p.visits, 0), 33, "every visit with coordinates is placed");

  // CORS and routing
  const preflight = await call("/hit", { method: "OPTIONS" });
  assert.equal(preflight.status, 204);
  assert.equal(preflight.headers.get("Access-Control-Allow-Origin"), "https://loujc.github.io");
  assert.equal((await call("/stats", { origin: "https://evil.example" })).headers.get("Access-Control-Allow-Origin"), "https://loujc.github.io");
  assert.equal((await call("/nope")).status, 404);

  // nothing identifying is stored, in keys or values: no IPs, no user agents
  const files = (await readdir(directory, { recursive: true, withFileTypes: true })).filter((f) => f.isFile());
  const paths = files.map((f) => join(f.parentPath ?? f.path, f.name));
  const stored = [...paths, ...(await Promise.all(paths.map((path) => readFile(path, "utf8"))))].join("\n");
  for (const secret of ["203.0.113.1", "198.51.100.7", "10.0.0.1", "Mozilla", "Chrome", "test-salt"]) assert.ok(!stored.includes(secret), `stores ${secret}`);

  // hourly compaction: settled events fold into `state` exactly once; visitor records older than yesterday go
  const store = openStore();
  await store.set("seen/2000-01-01/old", "1");
  await store.setJSON("quota/2000-01-01/old", { likes: 3 });
  const totals = (await call("/stats")).data;
  assert.deepEqual(await compact(store), { folded: 0, forgotten: 2 }, "fresh events wait until they settle");
  assert.deepEqual((await call("/stats")).data, totals);
  assert.equal((await hit({ ip: "198.51.100.200" })).data.visits, 35, "visits after a compaction still count");
  const settled = (await call("/stats")).data;
  const later = Date.now() + 11 * 60e3;
  assert.ok((await compact(store, later)).folded > 0);
  assert.equal((await store.list({ prefix: "ev/" })).blobs.length, 0, "folded events are dropped");
  assert.deepEqual((await call("/stats")).data, settled, "same totals after compaction");
  assert.equal((await compact(store, later)).folded, 0);
  assert.deepEqual((await call("/stats")).data, settled, "compaction is idempotent");

  console.log("all stats-api checks passed");
} finally {
  await server.stop();
  await rm(directory, { recursive: true, force: true });
}
