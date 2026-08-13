// Seeds the small set of podcasts already referenced by mock IDs throughout
// the app's UI (e.g. search results, "similar podcasts", list demos) as real
// rows, so features that need an actual foreign key (Favorites, ratings,
// list items) work end-to-end instead of pointing at nothing.
import pg from "pg";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client.js";
import "dotenv/config";

const pool = new pg.Pool({ connectionString: process.env.DATABASE_URL });
const db = new PrismaClient({ adapter: new PrismaPg(pool) });

const podcasts = [
  { id: "modern-wisdom", title: "Modern Wisdom", author: "Chris Williamson", description: "Life is hard. This podcast will help.", coverUrl: "https://picsum.photos/seed/mwcover/300/300" },
  { id: "the-joe-rogan-experience", title: "The Joe Rogan Experience", author: "Joe Rogan", description: "Long-form conversations with Joe Rogan.", coverUrl: "/explore/joe-rogan.jpg" },
  { id: "shawn-ryan-show", title: "The Shawn Ryan Show", author: "Shawn Ryan", description: "Interviews with veterans, spies, and public figures.", coverUrl: "/explore/shawn-ryan.jpg" },
  { id: "crime-junkie", title: "Crime Junkie", author: "Ashley Flowers", description: "True crime, twice a week.", coverUrl: "/explore/crime-junkie.jpg" },
  { id: "the-daily", title: "The Daily", author: "The New York Times", description: "The biggest stories of our time.", coverUrl: "/explore/the-daily.jpg" },
  { id: "diary-of-a-ceo", title: "The Diary of a CEO", author: "Steven Bartlett", description: "Conversations on business and life.", coverUrl: "/explore/diary-of-a-ceo.jpg" },
  { id: "huberman-lab", title: "Huberman Lab", author: "Andrew Huberman", description: "Science and science-based tools for everyday life.", coverUrl: "https://picsum.photos/seed/simhuberman/300/300" },
  { id: "the-tucker-carlson-show", title: "The Tucker Carlson Show", author: "Tucker Carlson", description: "Interviews and commentary.", coverUrl: "https://picsum.photos/seed/tuckershow/300/300" },
  { id: "jack-neel-podcast", title: "Jack Neel podcast", author: "Jack Neel", description: "Conversation and commentary.", coverUrl: "https://picsum.photos/seed/jackneelshow/300/300" },
];

for (const p of podcasts) {
  await db.podcast.upsert({
    where: { id: p.id },
    create: p,
    update: p,
  });
}

console.log(`Seeded ${podcasts.length} podcasts.`);

// The whole UI links every "episode" mock (reviews, list items, featured
// people, etc.) to this one episode — seed it as a real row so rating,
// reviewing, and logging it actually works end-to-end.
await db.episode.upsert({
  where: { id: "1109" },
  create: {
    id: "1109",
    podcastId: "modern-wisdom",
    episodeNumber: 1109,
    title: "Inside Modern Politics – Ezra Klein #1109",
    description:
      "Chris Williamson sits down with Ezra Klein — journalist, author, and co-founder of Vox — to dig into the state of modern politics, the Democratic Party's identity crisis, media polarization, and what it actually takes to change someone's mind.",
    coverUrl: "https://picsum.photos/seed/epcover/300/300",
    publishedAt: new Date("2026-06-01"),
  },
  update: {},
});

console.log("Seeded demo episode 1109.");

await db.$disconnect();
await pool.end();
