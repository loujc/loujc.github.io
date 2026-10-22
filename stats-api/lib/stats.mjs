// Shared logic for the homepage stats API (see README.md).
//
// Netlify Blobs' conditional writes lost updates under concurrent requests in production, so no request ever
// read-modify-writes a blob that other visitors share. Instead:
//   ev/<ms>-<rand>.<payload>  one blob per counted visit or granted like: created once, never changed. The payload
//                             (base64url JSON) is part of the key, so a single list call reads all pending events
//   state                     totals up to `through` (ms); only the hourly compaction writes it
//   seen/<day>/<visitor>      marks a visitor as counted today (create-only)
//   quota/<day>/<visitor>     likes this visitor has given today; only their own requests touch it
// A "visitor" is a salted SHA-256 of (day, IP, user agent); seen/ and quota/ are deleted after a day.
import { getStore } from "@netlify/blobs";

export const LIKE_CAP = 10;
const SETTLE = 10 * 60e3; // events younger than this may still be missing from listings, so compaction leaves them

export const openStore = () => getStore({ name: "homepage-stats", consistency: "strong" });

// YYYY-MM-DD in Beijing time, offset by whole days
export const dayKey = (offset = 0, now = Date.now()) => new Date(now + 8 * 36e5 + offset * 864e5).toISOString().slice(0, 10);

const round = (value) => Math.round(value * 100) / 100;
const readState = async (store) => ({ through: 0, visits: 0, likes: 0, places: {}, ...(await store.get("state", { type: "json" })) });

export const visitEvent = (geo = {}) => {
  const country = geo.country?.code;
  const lat = parseFloat(geo.latitude);
  const lon = parseFloat(geo.longitude);
  return country && Number.isFinite(lat) && Number.isFinite(lon)
    ? { k: "v", c: country, n: geo.city ?? "", a: round(lat), o: round(lon) }
    : { k: "v" };
};
export const likeEvent = (n) => ({ k: "l", n });

export const eventKey = (event, now = Date.now()) =>
  `ev/${now}-${crypto.randomUUID().slice(0, 8)}.${Buffer.from(JSON.stringify(event)).toString("base64url")}`;

const parseEvent = (key) => {
  const match = /^ev\/(\d+)-[0-9a-f]+\.([\w-]+)$/.exec(key);
  if (!match) return null;
  try {
    return { key, at: Number(match[1]), ...JSON.parse(Buffer.from(match[2], "base64url").toString()) };
  } catch {
    return null;
  }
};

const listKeys = async (store, prefix) => {
  const keys = [];
  for await (const { blobs } of store.list({ prefix, paginate: true })) keys.push(...blobs.map((blob) => blob.key));
  return keys;
};
const listEvents = async (store) => (await listKeys(store, "ev/")).map(parseEvent).filter(Boolean);

const fold = (state, events) => {
  const next = structuredClone(state);
  for (const event of events) {
    if (event.k === "l") next.likes += event.n;
    if (event.k !== "v") continue;
    next.visits += 1;
    if (!event.c) continue;
    const place = (next.places[`${event.c}|${event.n}`] ??= { city: event.n, country: event.c, lat: event.a, lon: event.o, visits: 0, last: 0 });
    place.visits += 1;
    place.last = Math.max(place.last, event.at);
  }
  return next;
};

// current totals: the compacted state plus every event after it. `own` is the event this request just wrote,
// counted even if the listing has not caught up with it yet
export const snapshot = async (store, own = null) => {
  const state = await readState(store);
  const events = await listEvents(store);
  if (own && !events.some((event) => event.key === own)) events.push(parseEvent(own));
  return fold(state, events.filter((event) => event.at > state.through));
};

// fold settled events into `state` and drop them, and forget visitor records older than yesterday
export const compact = async (store, now = Date.now()) => {
  const state = await readState(store);
  const through = Math.max(state.through, now - SETTLE);
  const settled = (await listEvents(store)).filter((event) => event.at <= through);
  await store.setJSON("state", { ...fold(state, settled.filter((event) => event.at > state.through)), through });
  const oldest = dayKey(-1, now);
  const visitors = [...(await listKeys(store, "seen/")), ...(await listKeys(store, "quota/"))].filter((key) => key.split("/")[1] < oldest);
  const drop = [...settled.map((event) => event.key), ...visitors];
  for (let i = 0; i < drop.length; i += 20) await Promise.all(drop.slice(i, i + 20).map((key) => store.delete(key)));
  return { folded: settled.length, forgotten: visitors.length };
};

export function summary(current, geo = {}, myLikes = 0) {
  const self = `${geo.country?.code ?? ""}|${geo.city ?? ""}`;
  const places = Object.entries(current.places).map(([id, place]) => ({ id, ...place }));
  const named = places.filter((place) => place.city);
  // the latest visit from somewhere other than the caller's own city
  const latest = named.reduce((best, place) => (place.id !== self && place.last > (best?.last ?? 0) ? place : best), null);
  return {
    visits: current.visits,
    likes: current.likes,
    countries: new Set(places.map((place) => place.country)).size,
    cities: named.length,
    places: named
      .sort((a, b) => b.visits - a.visits)
      .slice(0, 400)
      .map(({ city, country, lat, lon, visits }) => ({ city, country, lat, lon, visits })),
    recent: latest && { city: latest.city, country: latest.country, lat: latest.lat, lon: latest.lon, at: latest.last },
    myLikes,
    likeCap: LIKE_CAP,
  };
}
