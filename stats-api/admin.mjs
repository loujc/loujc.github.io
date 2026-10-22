// Inspect or reset the production stats store. Needs `npx netlify-cli login` and this folder linked to the site.
//   node admin.mjs            blob counts by kind, and the current totals
//   node admin.mjs --compact  fold pending events into the totals now (the hourly job does the same)
//   node admin.mjs --wipe     delete every blob: all counts start again from zero
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { getStore } from "@netlify/blobs";
import { compact, snapshot } from "./lib/stats.mjs";

const configs = ["Library/Preferences/netlify/config.json", ".config/netlify/config.json", ".netlify/config.json"];
const config = configs.map((path) => join(homedir(), path)).map((path) => {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch {
    return null;
  }
}).find(Boolean);
const token = Object.values(config?.users ?? {}).map((user) => user.auth?.token).find(Boolean);
const { siteId } = JSON.parse(readFileSync(new URL(".netlify/state.json", import.meta.url), "utf8"));
if (!token) throw new Error("not logged in: run `npx netlify-cli login`");
const store = getStore({ name: "homepage-stats", siteID: siteId, token, consistency: "strong" });

const keys = [];
for await (const { blobs } of store.list({ paginate: true })) keys.push(...blobs.map((blob) => blob.key));
console.log("blobs:", Object.fromEntries(Object.entries(Object.groupBy(keys, (key) => key.split("/")[0])).map(([kind, list]) => [kind, list.length])));

if (process.argv.includes("--wipe")) {
  for (let i = 0; i < keys.length; i += 20) await Promise.all(keys.slice(i, i + 20).map((key) => store.delete(key)));
  console.log(`deleted ${keys.length} blobs`);
} else {
  if (process.argv.includes("--compact")) console.log("compact:", await compact(store));
  const { visits, likes, places } = await snapshot(store);
  console.log({ visits, likes, cities: Object.keys(places).length });
}
