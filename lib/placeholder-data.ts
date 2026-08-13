import type { Episode, EpisodeList, Podcast, Review, User } from "./types";

/**
 * Stand-in content for the landing page.
 *
 * Every item here is replaced by a real API call later — this module is the
 * single seam where that swap happens. No artwork URLs are set, so components
 * render generated placeholder tiles instead of shipping other companies'
 * cover art in the repo.
 *
 * Titles are kept close to the Figma mockup so the built page can be compared
 * against the design side by side.
 */

export const POPULAR_PODCASTS: Podcast[] = [
  { id: "jre", title: "The Joe Rogan Experience", publisher: "Spotify" },
  { id: "up-first", title: "Up First", publisher: "NPR" },
  { id: "search-engine", title: "Search Engine", publisher: "PJ Vogt" },
  { id: "tucker", title: "The Tucker Carlson Show", publisher: "TCN" },
  { id: "pmt", title: "Pardon My Take", publisher: "Barstool Sports" },
  { id: "jre-mma", title: "JRE MMA Show", publisher: "Spotify" },
  { id: "shawn-ryan", title: "The Shawn Ryan Show", publisher: "Vigilance Elite" },
  { id: "crime-junkie", title: "Crime Junkie", publisher: "audiochuck" },
];

const johnJam: User = { id: "u-johnjam", name: "JohnJam" };
const peter: User = { id: "u-peter", name: "Peter Prokhorov" };
const alexander: User = { id: "u-alexander", name: "Alexander Knysh" };

const andrewWilson: Episode = {
  id: "ep-2535",
  title: "#2535 - Andrew Wilson",
  podcastTitle: "The Joe Rogan Experience",
};

const REVIEW_BODY =
  "Bill Simmons is a smart commentator, but I have to say without bias that " +
  "he's slightly underrating the knicks, they'll tear Wemby apart and we'll " +
  "finally have our victory! However I think he has some good takes in this " +
  "episode regarding some of our weaknesses..";

export const POPULAR_REVIEWS: Review[] = [
  {
    id: "rev-1",
    author: johnJam,
    episode: andrewWilson,
    body: REVIEW_BODY,
    rating: "recommend",
  },
  {
    id: "rev-2",
    author: peter,
    episode: andrewWilson,
    body: REVIEW_BODY,
    rating: "highly-recommend",
  },
  {
    id: "rev-3",
    author: johnJam,
    episode: andrewWilson,
    body: REVIEW_BODY,
    rating: "ok",
  },
  {
    id: "rev-4",
    author: peter,
    episode: andrewWilson,
    body: REVIEW_BODY,
    rating: "recommend",
  },
];

export const POPULAR_LISTS: EpisodeList[] = [
  {
    id: "list-1",
    title: "Joe Rogan MMA episodes",
    author: alexander,
    episodeArtwork: [undefined, undefined, undefined],
  },
  {
    id: "list-2",
    title: "Best of true crime 2026",
    author: johnJam,
    episodeArtwork: [undefined, undefined, undefined],
  },
];
