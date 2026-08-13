export type SearchPodcast = {
  type: "podcast";
  id: string;
  title: string;
  cover: string;
  episodeCount: number;
  popularity: number;
};

export type SearchEpisode = {
  type: "episode";
  id: string;
  podcastId: string;
  episodeId: string;
  title: string;
  podcastTitle: string;
  cover: string;
  popularity: number;
  // Extra terms (guest names, description snippets) a title-only match would miss.
  matchTerms?: string;
};

export type SearchItem = SearchPodcast | SearchEpisode;

// Mock searchable index standing in for a real Podcast Index-backed search
// (podcasts + episodes + popularity stats) until that's wired up.
export const searchIndex: SearchItem[] = [
  { type: "podcast", id: "modern-wisdom", title: "Modern Wisdom", cover: "https://picsum.photos/seed/mwcover/300/300", episodeCount: 1111, popularity: 9800 },
  { type: "podcast", id: "the-joe-rogan-experience", title: "The Joe Rogan Experience", cover: "/explore/joe-rogan.jpg", episodeCount: 2200, popularity: 20000 },
  { type: "podcast", id: "shawn-ryan-show", title: "The Shawn Ryan Show", cover: "/explore/shawn-ryan.jpg", episodeCount: 220, popularity: 15000 },
  { type: "podcast", id: "crime-junkie", title: "Crime Junkie", cover: "/explore/crime-junkie.jpg", episodeCount: 430, popularity: 13000 },
  { type: "podcast", id: "the-daily", title: "The Daily", cover: "/explore/the-daily.jpg", episodeCount: 2600, popularity: 12000 },
  { type: "podcast", id: "diary-of-a-ceo", title: "The Diary of a CEO", cover: "/explore/diary-of-a-ceo.jpg", episodeCount: 480, popularity: 14000 },
  { type: "podcast", id: "huberman-lab", title: "Huberman Lab", cover: "https://picsum.photos/seed/simhuberman/300/300", episodeCount: 260, popularity: 11000 },
  { type: "podcast", id: "the-tucker-carlson-show", title: "The Tucker Carlson Show", cover: "https://picsum.photos/seed/tuckershow/300/300", episodeCount: 414, popularity: 9500 },

  {
    type: "episode",
    id: "e-tucker-fuentes",
    podcastId: "the-tucker-carlson-show",
    episodeId: "1109",
    title: "Tucker Carlson Interviews Nick Fuentes",
    podcastTitle: "The Tucker Carlson show",
    cover: "https://picsum.photos/seed/tuckerfuentes/300/200",
    popularity: 8000,
  },
  {
    type: "episode",
    id: "e-shawnryan-tucker",
    podcastId: "shawn-ryan-show",
    episodeId: "1109",
    title: "Tucker Carlson- Responding to the biggest conspiracies in the world",
    podcastTitle: "Shawn Ryan show",
    cover: "https://picsum.photos/seed/shawnryantucker/300/200",
    popularity: 6000,
  },
  {
    type: "episode",
    id: "e-jackneel-trump",
    podcastId: "jack-neel-podcast",
    episodeId: "1109",
    title: "“This World is Not run by humans!” Trump has Supernatural Powers",
    podcastTitle: "Jack Neel podcast",
    cover: "https://picsum.photos/seed/jackneeltrump/300/200",
    popularity: 900,
    matchTerms: "Tucker Carlson guest interview",
  },
];
