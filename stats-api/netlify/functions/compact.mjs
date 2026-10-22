// Hourly: fold new visit and like events into the totals, and forget visitor records older than yesterday.
import { compact, openStore } from "../../lib/stats.mjs";

export const config = { schedule: "7 * * * *" };

export default async () => {
  const { folded, forgotten } = await compact(openStore());
  console.log(`folded ${folded} events, forgot ${forgotten} visitor records`);
};
