import type { RatingId } from "./ratings";

/**
 * Domain shapes for the landing page.
 *
 * These mirror what a podcast API (Podcast Index, Listen Notes, Spotify) hands
 * back, so wiring one up later is a change of data source rather than a
 * rewrite of the components. `artworkUrl` is optional throughout: until an API
 * is connected, components fall back to a generated placeholder tile.
 */

export type User = {
  id: string;
  /** Display handle, e.g. "JohnJam". */
  name: string;
  avatarUrl?: string;
};

export type Podcast = {
  id: string;
  title: string;
  /** Publisher or network, e.g. "NPR". */
  publisher?: string;
  artworkUrl?: string;
};

export type Episode = {
  id: string;
  /** Episode title as shown, e.g. "#2535 - Andrew Wilson". */
  title: string;
  podcastTitle: string;
  artworkUrl?: string;
};

export type Review = {
  id: string;
  author: User;
  episode: Episode;
  body: string;
  rating?: RatingId;
};

export type EpisodeList = {
  id: string;
  title: string;
  author: User;
  /** Cover collage; up to three episode artworks fanned out. */
  episodeArtwork: (string | undefined)[];
};
