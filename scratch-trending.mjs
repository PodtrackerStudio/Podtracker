import Parser from "rss-parser";
import { createHash } from "crypto";
const key = (g) => createHash("sha256").update(g).digest("hex").slice(0, 12);
const parser = new Parser();

const cases = [
  ["1200361736", "5452adaffabf"],
  ["1089022756", "e9d6f1df404d"],
  ["1222114325", "25c5d4847a26"],
];

for (const [showId, wantKey] of cases) {
  const look = await (await fetch(`https://itunes.apple.com/lookup?id=${showId}&entity=podcast`)).json();
  const p = look.results?.[0];
  if (!p?.feedUrl) { console.log(showId, "NO FEED URL"); continue; }
  let feed;
  try { feed = await parser.parseString(await (await fetch(p.feedUrl)).text()); }
  catch (e) { console.log(showId, p.trackName, "FEED PARSE FAILED:", e.message.slice(0,60)); continue; }
  const keys = feed.items.map(i => key(i.guid));
  const hit = keys.indexOf(wantKey);
  console.log(`${p.trackName} (${showId}): ${feed.items.length} eps, key ${wantKey} -> ${hit === -1 ? "NOT FOUND" : "found at " + hit + " = " + feed.items[hit].title.slice(0,45)}`);
  if (hit === -1) console.log("   first 3 guids:", feed.items.slice(0,3).map(i => `${JSON.stringify(i.guid).slice(0,50)} -> ${key(i.guid)}`).join("\n                  "));
}
