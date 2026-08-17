/**
 * Whether Podtracker has enough of a user base to show community-generated
 * numbers: average ratings, rating distributions, friends' activity, popular
 * reviews and lists.
 *
 * **This is the single switch for the whole site.** Flip it to `true` once real
 * users are rating things and every gated section appears at once. Sasha's plan
 * is to flip it shortly after he and his partner publish and start logging.
 *
 * Never gate rating or reviewing controls on this — they are how the first data
 * gets created, so they must work while it is still `false`.
 */
export const HAS_COMMUNITY_DATA = false;
