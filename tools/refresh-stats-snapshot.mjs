// Publish only public totals and city aggregates; never visitor identity or quota.
import {readFile, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';

const output = process.argv[2] || fileURLToPath(new URL('../stats-snapshot.json', import.meta.url));
const count = (value) => Number.isSafeInteger(value) && value >= 0;
try {
  const response = await fetch('https://loujc-stats.netlify.app/stats', {
    signal: AbortSignal.timeout(12000),
    cache: 'no-store',
    headers: {'User-Agent': 'loujc-stats-snapshot'},
  });
  if (!response.ok) throw new Error('Stats unavailable');
  const data = await response.json();
  if (!['visits', 'likes', 'countries', 'cities'].every((key) => count(data[key]))
      || !Array.isArray(data.places) || data.places.length > 1000) throw new Error('Invalid totals');
  const places = data.places.map(({city, country, lat, lon, visits}) => {
    if (typeof city !== 'string' || city.length > 160 || typeof country !== 'string'
        || !Number.isFinite(lat) || Math.abs(lat) > 90 || !Number.isFinite(lon)
        || Math.abs(lon) > 180 || !count(visits)) throw new Error('Invalid city');
    return {city, country, lat, lon, visits};
  });
  const snapshot = {
    generated_at: new Date().toISOString(),
    visits: data.visits, likes: data.likes, countries: data.countries, cities: data.cities,
    places,
  };
  await writeFile(output, `${JSON.stringify(snapshot)}\n`);
  console.log('Public stats snapshot refreshed.');
} catch {
  // A provider outage must not remove an existing, timestamped public summary.
  let fallback = JSON.parse(await readFile(output, 'utf8'));
  if (!fallback.generated_at || !count(fallback.visits)) throw new Error('No valid stats snapshot available');
  try {
    const previous = await fetch('https://loujc.github.io/stats-snapshot.json', {
      signal: AbortSignal.timeout(6000), cache: 'no-store',
    });
    if (previous.ok) {
      const published = await previous.json();
      if (Date.parse(published.generated_at) > Date.parse(fallback.generated_at)
          && ['visits', 'likes', 'countries', 'cities'].every((key) => count(published[key]))
          && Array.isArray(published.places)) {
        // Preserve the most recent published summary instead of reverting to the seed.
        fallback = {
          generated_at: published.generated_at,
          visits: published.visits, likes: published.likes,
          countries: published.countries, cities: published.cities,
          places: published.places.map(({city, country, lat, lon, visits}) => ({city, country, lat, lon, visits})),
        };
        await writeFile(output, `${JSON.stringify(fallback)}\n`);
      }
    }
  } catch {}
  console.warn('Live stats unavailable; keeping the existing public snapshot.');
}
