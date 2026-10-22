// Homepage stats for loujc.github.io — anonymous visits with city-level footprints, plus a page like counter.
// Netlify Functions + Netlify Blobs; storage layout and privacy notes are in ../../lib/stats.mjs and README.md.
//
//   POST /hit   count today's visit (once per visitor per day) → stats
//   POST /like  { n: 1..10 } add likes, capped per visitor per day → { likes, myLikes, likeCap, granted }
//   GET  /stats → { visits, likes, countries, cities, places[], recent, myLikes, likeCap }
import { LIKE_CAP, dayKey, eventKey, likeEvent, openStore, snapshot, summary, visitEvent } from "../../lib/stats.mjs";

const ORIGINS = ["https://loujc.github.io", "http://127.0.0.1:4174", "http://localhost:4174"];
const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|preview|python|curl|wget|httpclient/i;

export const config = { path: ["/hit", "/like", "/stats"] };

export default async (request, context) => {
  const origin = request.headers.get("Origin") ?? "";
  const cors = {
    "Access-Control-Allow-Origin": ORIGINS.includes(origin) ? origin : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
  const { pathname } = new URL(request.url);
  const env = { request, context, store: openStore() };
  try {
    if (pathname === "/stats" && request.method === "GET") return json(summary(await snapshot(env.store), context.geo), cors);
    if (pathname === "/hit" && request.method === "POST") return json(await hit(env), cors);
    if (pathname === "/like" && request.method === "POST") return json(await like(env), cors);
    return json({ error: "not found" }, cors, 404);
  } catch (error) {
    console.error(error);
    return json({ error: "server error" }, cors, 500);
  }
};

const json = (body, headers, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...headers, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });

const visitorId = async ({ request, context }, day) => {
  // without the secret salt the hashes could be reversed by brute force over the IP space, so refuse to run
  if (!process.env.SALT) throw new Error("SALT is not set");
  const ua = request.headers.get("User-Agent") ?? "";
  const bytes = new TextEncoder().encode(`${process.env.SALT}|${day}|${context.ip ?? ""}|${ua}`);
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return [...digest.slice(0, 12)].map((b) => b.toString(16).padStart(2, "0")).join("");
};

const isBot = (request) => BOTS.test(request.headers.get("User-Agent") ?? "");

// read-modify-write guarded by the blob's ETag, retried when a concurrent request wrote first. Production Blobs
// do not always honour the guard under concurrency, so this is only used for a visitor's own like quota;
// `change` gets the current value (or null) and returns the new one, or null to leave it as is
const update = async (store, key, change) => {
  for (let attempt = 0; attempt < 12; attempt++) {
    const current = await store.getWithMetadata(key, { type: "json" });
    if (current && !current.etag) throw new Error(`no ETag for ${key}`); // never write blind
    const next = change(current?.data ?? null);
    if (next === null) return { data: current?.data ?? null, changed: false };
    const result = await store.setJSON(key, next, current ? { onlyIfMatch: current.etag } : { onlyIfNew: true });
    if (result.modified) return { data: next, changed: true };
    await new Promise((resolve) => setTimeout(resolve, 10 + Math.random() * 40 * (attempt + 1)));
  }
  throw new Error(`write contention on ${key}`);
};

async function hit(env) {
  const { request, context, store } = env;
  if (isBot(request)) return summary(await snapshot(store), context.geo);
  const day = dayKey();
  const visitor = await visitorId(env, day);
  const first = await store.set(`seen/${day}/${visitor}`, "1", { onlyIfNew: true });
  const own = first.modified ? eventKey(visitEvent(context.geo)) : null;
  if (own) await store.set(own, "1");
  const [state, quota] = await Promise.all([snapshot(store, own), store.get(`quota/${day}/${visitor}`, { type: "json" })]);
  return summary(state, context.geo, quota?.likes ?? 0);
}

async function like(env) {
  const { request, store } = env;
  const body = await request.json().catch(() => ({}));
  const want = Math.min(LIKE_CAP, Math.max(1, Math.floor(Number(body.n) || 1)));
  if (isBot(request)) return { likes: (await snapshot(store)).likes, myLikes: 0, likeCap: LIKE_CAP, granted: 0 };
  const day = dayKey();
  const visitor = await visitorId(env, day);
  let granted = 0; // set by the attempt that finally went through
  const quota = await update(store, `quota/${day}/${visitor}`, (current) => {
    const used = current?.likes ?? 0;
    granted = Math.max(0, Math.min(want, LIKE_CAP - used));
    return granted ? { likes: used + granted } : null;
  });
  const own = granted ? eventKey(likeEvent(granted)) : null;
  if (own) await store.set(own, "1");
  return { likes: (await snapshot(store, own)).likes, myLikes: quota.data?.likes ?? 0, likeCap: LIKE_CAP, granted };
}
