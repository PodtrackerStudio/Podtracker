/**
 * How many episodes the full episode list shows per "Load more".
 *
 * **Its own module, importing nothing**, because both sides need it:
 *
 * - The client list can't import it from `episodeDetail.ts`, which pulls in
 *   the feed parser and the rest of the server-side fetching.
 * - The server page can't import it from `EpisodeListClient.tsx`. A value
 *   imported from a `"use client"` module arrives on the server as a client
 *   reference, not the number. That is what happened on 2026-11-06, about an
 *   hour after paging went live: the page asked for `NaN` episodes and
 *   production showed "No episodes found for this show" above a "Load more"
 *   button.
 */
export const EPISODE_PAGE_SIZE = 20;
