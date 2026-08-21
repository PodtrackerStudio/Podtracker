import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { FilterMenu, type FilterOption } from "@/components/FilterMenu";
import { MediaThumbCard } from "@/components/MediaThumbCard";
import { db } from "@/lib/db";
import {
  getUserRatings,
  TIER_ORDER,
  TIER_LABEL,
  TIER_CLASS,
  SORT_LABEL,
  type Tier,
  type MediaFilter,
  type SortMode,
} from "@/lib/userRatings";
import styles from "./ratings.module.css";

const dateFormatter = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" });

const TIER_OPTIONS: FilterOption[] = TIER_ORDER.map((t) => ({
  value: t,
  label: TIER_LABEL[t],
  tierClass: TIER_CLASS[t],
}));

const MEDIA_OPTIONS: FilterOption[] = [
  { value: "shows", label: "Shows only" },
  { value: "episodes", label: "Episodes only" },
];

const SORT_OPTIONS: FilterOption[] = (Object.keys(SORT_LABEL) as SortMode[]).map((s) => ({
  value: s,
  label: SORT_LABEL[s],
}));

function isTier(v: string | undefined): v is Tier {
  return Boolean(v) && (TIER_ORDER as readonly string[]).includes(v!);
}

/**
 * "Your Ratings" — every rating a user has given, filterable.
 *
 * All three filters live in the query string rather than component state, which
 * is what makes the five tiers in the profile's rating distribution work as
 * plain links: each is this page with `?tier=` pre-set.
 *
 * 32 per page (4 × 8), Sasha's cap.
 */
export default async function RatingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams: Promise<{ tier?: string; media?: string; sort?: string; page?: string }>;
}) {
  const { username } = await params;
  const sp = await searchParams;

  const profileUser = await db.user.findUnique({ where: { username }, select: { id: true, displayName: true } });

  const tier = isTier(sp.tier) ? sp.tier : null;
  const media = (["shows", "episodes"].includes(sp.media ?? "") ? sp.media : "all") as MediaFilter;
  const sort = (Object.keys(SORT_LABEL).includes(sp.sort ?? "") ? sp.sort : "rated-newest") as SortMode;
  const page = Number(sp.page) > 0 ? Number(sp.page) : 1;

  const result = profileUser
    ? await getUserRatings(profileUser.id, { tier, media, sort, page })
    : { items: [], total: 0, page: 1, totalPages: 1 };

  // Preserve the other filters when paging.
  function pageHref(n: number) {
    const q = new URLSearchParams();
    if (tier) q.set("tier", tier);
    if (media !== "all") q.set("media", media);
    if (sort !== "rated-newest") q.set("sort", sort);
    if (n > 1) q.set("page", String(n));
    return `/user/${username}/ratings${q.toString() ? `?${q}` : ""}`;
  }

  return (
    <>
      <SiteNav active="profile" />
      <main className={styles.main}>
        <h1 className={styles.title}>Your Ratings</h1>

        <div className={styles.filters}>
          <FilterMenu param="tier" options={TIER_OPTIONS} defaultLabel="All Ratings" />
          <FilterMenu param="media" options={MEDIA_OPTIONS} defaultLabel="All media" />
          <FilterMenu param="sort" options={SORT_OPTIONS} defaultLabel="Sort by" />
        </div>

        {!profileUser ? (
          <p className={styles.empty}>No user found with username &ldquo;{username}&rdquo;.</p>
        ) : result.total === 0 ? (
          <p className={styles.empty}>
            {tier || media !== "all" ? "Nothing matches those filters yet." : "No ratings yet."}
          </p>
        ) : (
          <>
            <div className={styles.grid}>
              {result.items.map((item) => (
                <div className={styles.card} key={item.key}>
                  {/* MediaThumbCard supplies the shared hover popup. It shows
                      the title and — for episodes — the release date. The
                      average rating inside it is gated on HAS_COMMUNITY_DATA,
                      so it appears on its own once that flips. */}
                  <MediaThumbCard
                    href={item.href}
                    cover={item.coverUrl ?? "/default-avatar.webp"}
                    title={item.title}
                    subtitle={item.kind === "episode" && item.releasedAt ? dateFormatter.format(item.releasedAt) : undefined}
                  />
                  <span className={`${styles.tier} ${styles[TIER_CLASS[item.tier]]} rating-label`}>
                    {TIER_LABEL[item.tier]}
                  </span>
                </div>
              ))}
            </div>

            {result.totalPages > 1 && (
              <div className={styles.pager}>
                {result.page > 1 && (
                  <Link href={pageHref(result.page - 1)} className={styles.pagerLink}>
                    ← Previous
                  </Link>
                )}
                <span className={styles.pagerCount}>
                  Page {result.page} of {result.totalPages}
                </span>
                {result.page < result.totalPages && (
                  <Link href={pageHref(result.page + 1)} className={styles.pagerLink}>
                    Next →
                  </Link>
                )}
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
