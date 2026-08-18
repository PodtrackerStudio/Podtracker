/**
 * The curated creator registry — the single source of truth for who made a
 * show, shared by the Creators strip on `/podcast/[id]` and the creator page at
 * `/person/[slug]`. Adding one entry here lights up both.
 *
 * Deliberately hand-curated rather than derived from an API. iTunes gives a
 * podcast an `artistName`, but that field is free text and is frequently an
 * organisation rather than a person ("Up First NPR", "The New York Times"), so
 * resolving it automatically against any biography source would confidently
 * render a company's history under a person's headshot with no error anywhere.
 * A name only becomes a creator here because a human put it here.
 *
 * The host/show pairings come from `prisma/seed.mts` and the `hosts` fields in
 * `src/app/following/FollowingGrid.tsx`, which are the two places in this repo
 * that already record who presents what.
 */

export type Creator = {
  slug: string;
  name: string;
  /** The line under the name in a creator strip — what they are known for. */
  role: string;
  avatarUrl: string;
  /** Long-form copy for the creator page. */
  bio: string;
  hostedShow: { title: string; cover: string; href: string } | null;
};

/**
 * The neutral silhouette already shipped in this repo, used for every creator we
 * do not hold a real photograph of.
 *
 * These entries previously pointed at random picsum images. That is worse than
 * no photo: it attaches an unrelated stranger's face to a named, real, living
 * person, and it looks convincing enough that nobody notices it is wrong. A
 * blank silhouette is honest about what we have.
 *
 * TO ADD A REAL PHOTO: drop the file in `public/creators/` named after the slug
 * (e.g. `public/creators/joe-rogan.jpg`) and change that creator's `avatarUrl`
 * to `/creators/joe-rogan.jpg`. See `public/creators/README.md` — the licensing
 * note there matters, these are photographs of real people.
 */
const NO_PHOTO = "/default-avatar.webp";

export const CREATORS: Record<string, Creator> = {
  "joe-rogan": {
    slug: "joe-rogan",
    name: "Joe Rogan",
    role: "Host, The Joe Rogan Experience",
    avatarUrl: NO_PHOTO,
    bio: "Joseph James Rogan Jr. (born August 11, 1967) is an American podcaster, sports commentator, comedian, actor, and former television host. He hosts The Joe Rogan Experience, which is one of the most popular podcasts in the world and has been the most streamed podcast on Spotify since 2020. Rogan was born in Newark, New Jersey, and began his career in comedy in 1988 in the Boston area. After relocating to Los Angeles in 1994, he signed an exclusive developmental deal with Disney and appeared as an actor on several television shows, including Hardball and NewsRadio. In 1997, he started working for the UFC as an interviewer and color commentator. He released his first comedy special, I'm Gonna Be Dead Someday..., in 2000 and hosted the game show Fear Factor from 2001 to 2006. After leaving Fear Factor, Rogan focused on his stand-up career and hosted more comedy specials. He launched The Joe Rogan Experience in 2009; by 2015, it was one of the most popular podcasts in the world, regularly receiving millions of plays per episode. Spotify obtained exclusive distribution rights to The Joe Rogan Experience in 2020 for $200 million. Rogan's audience has since grown significantly, and in 2024, he renewed his deal with Spotify for an estimated $250 million, but will no longer be exclusive to them.",
    hostedShow: {
      title: "The Joe Rogan Experience",
      cover: "/explore/joe-rogan.jpg",
      href: "/podcast/the-joe-rogan-experience",
    },
  },
  "chris-williamson": {
    slug: "chris-williamson",
    name: "Chris Williamson",
    role: "Host, Modern Wisdom",
    // The one real creator photograph already in this repo — Sasha added it for
    // the Trending users strip on Explore, where the same person is modelled as
    // a site user. Reused here rather than shipping a second copy.
    avatarUrl: "/explore/trending-chris-williamson.jpg",
    bio: "Chris Williamson is a British podcaster and former club night promoter, best known as the host of Modern Wisdom, a podcast focused on self-improvement and conversations with leading thinkers across psychology, philosophy, health, and business.",
    hostedShow: {
      title: "Modern Wisdom",
      cover: "https://picsum.photos/seed/mwcover/460/460",
      href: "/podcast/modern-wisdom",
    },
  },
  "ezra-klein": {
    slug: "ezra-klein",
    name: "Ezra Klein",
    role: "Host, The Ezra Klein Show",
    avatarUrl: NO_PHOTO,
    bio: "Ezra Klein is an American journalist, political analyst, and podcast host. He is a columnist for The New York Times and co-founder of Vox, known for his in-depth conversations on politics, media, and public policy.",
    hostedShow: {
      title: "The Ezra Klein Show",
      cover: "https://picsum.photos/seed/ezrashow/460/460",
      href: "/podcast/the-ezra-klein-show",
    },
  },
  "shawn-ryan": {
    slug: "shawn-ryan",
    name: "Shawn Ryan",
    role: "Host, The Shawn Ryan Show",
    avatarUrl: NO_PHOTO,
    bio: "Shawn Ryan is an American podcaster and a former US Navy SEAL and CIA contractor. He hosts The Shawn Ryan Show, a long-form interview podcast featuring veterans, intelligence officers, and public figures talking about service, conflict, and life after it.",
    hostedShow: {
      title: "The Shawn Ryan Show",
      cover: "/explore/shawn-ryan.jpg",
      href: "/podcast/shawn-ryan-show",
    },
  },
  "steven-bartlett": {
    slug: "steven-bartlett",
    name: "Steven Bartlett",
    role: "Host, The Diary of a CEO",
    avatarUrl: NO_PHOTO,
    bio: "Steven Bartlett is a British entrepreneur and broadcaster. He co-founded the social media marketing agency Social Chain and hosts The Diary of a CEO, a long-form interview podcast covering business, health, and personal life. He has also appeared as an investor on the BBC series Dragons' Den.",
    hostedShow: {
      title: "The Diary of a CEO",
      cover: "/explore/diary-of-a-ceo.jpg",
      href: "/podcast/diary-of-a-ceo",
    },
  },
  "ashley-flowers": {
    slug: "ashley-flowers",
    name: "Ashley Flowers",
    role: "Host, Crime Junkie",
    avatarUrl: NO_PHOTO,
    bio: "Ashley Flowers is an American podcaster and the founder of the audio company Audiochuck. She hosts Crime Junkie, one of the most listened-to true crime podcasts, which covers a different case each week.",
    hostedShow: {
      title: "Crime Junkie",
      cover: "/explore/crime-junkie.jpg",
      href: "/podcast/crime-junkie",
    },
  },
  "andrew-huberman": {
    slug: "andrew-huberman",
    name: "Andrew Huberman",
    role: "Host, Huberman Lab",
    avatarUrl: NO_PHOTO,
    bio: "Andrew Huberman is an American neuroscientist and a professor at Stanford University School of Medicine. He hosts Huberman Lab, a podcast covering neuroscience and science-based tools for sleep, focus, stress, and physical health.",
    hostedShow: {
      title: "Huberman Lab",
      cover: "https://picsum.photos/seed/simhuberman/460/460",
      href: "/podcast/huberman-lab",
    },
  },
  "tucker-carlson": {
    slug: "tucker-carlson",
    name: "Tucker Carlson",
    role: "Host, The Tucker Carlson Show",
    avatarUrl: NO_PHOTO,
    bio: "Tucker Carlson is an American conservative political commentator and writer who hosts The Tucker Carlson Show. He previously presented programmes on CNN, MSNBC, and Fox News, and co-founded the news site The Daily Caller.",
    hostedShow: {
      title: "The Tucker Carlson Show",
      cover: "https://picsum.photos/seed/tuckershow/460/460",
      href: "/podcast/the-tucker-carlson-show",
    },
  },
  "theo-von": {
    slug: "theo-von",
    name: "Theo Von",
    role: "Host, This Past Weekend",
    avatarUrl: NO_PHOTO,
    bio: "Theo Von is an American stand-up comedian and podcaster. He hosts This Past Weekend, a conversational podcast that mixes guest interviews with stories from his upbringing in Louisiana.",
    hostedShow: {
      title: "This Past Weekend with Theo Von",
      cover: "/explore/theo-von.jpg",
      href: "/podcast/tpw",
    },
  },
  "michael-barbaro": {
    slug: "michael-barbaro",
    name: "Michael Barbaro",
    role: "Host, The Daily",
    avatarUrl: NO_PHOTO,
    bio: "Michael Barbaro is an American journalist and the host of The Daily, the New York Times' weekday news podcast. He joined the paper as a reporter before moving to audio.",
    hostedShow: {
      title: "The Daily",
      cover: "/explore/the-daily.jpg",
      href: "/podcast/the-daily",
    },
  },
  "shane-gillis": {
    slug: "shane-gillis",
    name: "Shane Gillis",
    role: "Co-host, Matt and Shane's Secret Podcast",
    avatarUrl: NO_PHOTO,
    bio: "Shane Gillis is an American stand-up comedian and actor. He co-hosts Matt and Shane's Secret Podcast with Matt McCusker, and has released stand-up specials and the sketch series Tires.",
    hostedShow: {
      title: "Matt and Shane's Secret Podcast",
      cover: "/explore/matt-and-shane.jpg",
      href: "/podcast/matt-shane",
    },
  },
  "matt-mccusker": {
    slug: "matt-mccusker",
    name: "Matt McCusker",
    role: "Co-host, Matt and Shane's Secret Podcast",
    avatarUrl: NO_PHOTO,
    bio: "Matt McCusker is an American stand-up comedian and podcaster. He co-hosts Matt and Shane's Secret Podcast with Shane Gillis.",
    hostedShow: {
      title: "Matt and Shane's Secret Podcast",
      cover: "/explore/matt-and-shane.jpg",
      href: "/podcast/matt-shane",
    },
  },
  "bill-simmons": {
    slug: "bill-simmons",
    name: "Bill Simmons",
    role: "Host, The Rewatchables",
    avatarUrl: NO_PHOTO,
    bio: "Bill Simmons is an American sports writer and podcaster. He founded the sports and culture site Grantland and later The Ringer, and hosts The Bill Simmons Podcast alongside The Rewatchables, a film podcast.",
    hostedShow: {
      title: "The Rewatchables",
      cover: "https://picsum.photos/seed/rewatchables/460/460",
      href: "/podcast/rewatchables",
    },
  },
  // Sean Fennessey and Chris Ryan are here because FollowingGrid records all
  // three Rewatchables hosts. Listing only Bill Simmons would have the strip
  // print the singular "Creator" and assert he is the whole answer, which
  // contradicts what /following already shows the user. Their bios stay narrow
  // — only what this repo's own data supports.
  "sean-fennessey": {
    slug: "sean-fennessey",
    name: "Sean Fennessey",
    role: "Co-host, The Rewatchables",
    avatarUrl: NO_PHOTO,
    bio: "Sean Fennessey is an American writer and editor who co-hosts The Rewatchables, a film podcast, with Bill Simmons and Chris Ryan.",
    hostedShow: {
      title: "The Rewatchables",
      cover: "https://picsum.photos/seed/rewatchables/460/460",
      href: "/podcast/rewatchables",
    },
  },
  "chris-ryan": {
    slug: "chris-ryan",
    name: "Chris Ryan",
    role: "Co-host, The Rewatchables",
    avatarUrl: NO_PHOTO,
    bio: "Chris Ryan is an American writer and editor who co-hosts The Rewatchables, a film podcast, with Bill Simmons and Sean Fennessey.",
    hostedShow: {
      title: "The Rewatchables",
      cover: "https://picsum.photos/seed/rewatchables/460/460",
      href: "/podcast/rewatchables",
    },
  },
  "alex-hormozi": {
    slug: "alex-hormozi",
    name: "Alex Hormozi",
    role: "Host, The Game",
    avatarUrl: NO_PHOTO,
    bio: "Alex Hormozi is an American entrepreneur and investor, known for his books on offers and acquisition and for The Game, his podcast on building and scaling companies.",
    hostedShow: {
      title: "The Game",
      cover: "https://picsum.photos/seed/thegame/460/460",
      href: "/podcast/the-game",
    },
  },
  "amy-poehler": {
    slug: "amy-poehler",
    name: "Amy Poehler",
    role: "Host, Good Hang",
    avatarUrl: NO_PHOTO,
    bio: "Amy Poehler is an American actress, comedian, writer, and director, known for Saturday Night Live and Parks and Recreation. She hosts Good Hang, a conversational interview podcast.",
    hostedShow: {
      title: "Good Hang with Amy Poehler",
      cover: "/explore/good-hang-amy-poehler.jpg",
      href: "/podcast/good-hang",
    },
  },
  "tim-dillon": {
    slug: "tim-dillon",
    name: "Tim Dillon",
    role: "Host, The Tim Dillon Show",
    avatarUrl: NO_PHOTO,
    bio: "Tim Dillon is an American stand-up comedian and podcaster who hosts The Tim Dillon Show, a comedy podcast built around monologues on current events and interviews.",
    hostedShow: {
      title: "The Tim Dillon Show",
      cover: "/explore/ep-tim-dillon.jpg",
      href: "/podcast/tim-dillon",
    },
  },
};

/**
 * Which creators present which show, keyed by every podcast id the app actually
 * links to. Ids are messy on purpose: the app mixes legacy slugs ("jre"), seed
 * ids ("the-joe-rogan-experience") and live numeric iTunes ids, and several of
 * them point at the same show.
 *
 * Order matters — it is the billing order shown on the page.
 */
const PODCAST_CREATORS: Record<string, string[]> = {
  jre: ["joe-rogan"],
  "the-joe-rogan-experience": ["joe-rogan"],
  "modern-wisdom": ["chris-williamson"],
  "the-ezra-klein-show": ["ezra-klein"],
  "shawn-ryan": ["shawn-ryan"],
  "shawn-ryan-show": ["shawn-ryan"],
  doac: ["steven-bartlett"],
  "diary-of-a-ceo": ["steven-bartlett"],
  "crime-junkie": ["ashley-flowers"],
  huberman: ["andrew-huberman"],
  "huberman-lab": ["andrew-huberman"],
  "the-tucker-carlson-show": ["tucker-carlson"],
  tpw: ["theo-von"],
  "theo-von": ["theo-von"],
  "the-daily": ["michael-barbaro"],
  "matt-shane": ["shane-gillis", "matt-mccusker"],
  rewatchables: ["bill-simmons", "sean-fennessey", "chris-ryan"],
  "the-game": ["alex-hormozi"],
  "good-hang": ["amy-poehler"],
  "tim-dillon": ["tim-dillon"],
};

/**
 * Name → slug, following the convention every hand-written slug in this repo
 * already uses: lowercase ASCII, punctuation dropped, runs of whitespace
 * collapsed to single hyphens. This is the forward direction of the slug→name
 * title-caser the creator page falls back to.
 */
export function toCreatorSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
}

/**
 * `Object.hasOwn` rather than a bare lookup throughout this file: both maps are
 * indexed with an unsanitised URL path segment, and a plain object literal
 * inherits from Object.prototype. Without the guard, `/person/constructor` or
 * `/podcast/toString` reaches a truthy non-Creator and crashes the page.
 */
export function getCreator(slug: string): Creator | null {
  return Object.hasOwn(CREATORS, slug) ? CREATORS[slug] : null;
}

/**
 * The creators to show on a podcast page.
 *
 * Resolution order:
 *   1. The explicit map above, which handles multi-host shows and the legacy
 *      slugs that no API knows about.
 *   2. Failing that, the show's author name — but only when it slugifies to
 *      someone already in the registry. A live iTunes lookup returns an
 *      `artistName` that may be a network, a company, or a person; requiring an
 *      exact hit in the curated registry means an unknown name yields nothing
 *      rather than a wrong person.
 *
 * Returns an empty array when nothing matches, and the page renders no strip.
 */
export function getCreatorsForPodcast(podcastId: string, author?: string): Creator[] {
  if (Object.hasOwn(PODCAST_CREATORS, podcastId)) {
    return PODCAST_CREATORS[podcastId]
      .map((slug) => getCreator(slug))
      .filter((c): c is Creator => c !== null);
  }

  if (author) {
    const creator = getCreator(toCreatorSlug(author));
    if (creator) return [creator];
  }

  return [];
}
