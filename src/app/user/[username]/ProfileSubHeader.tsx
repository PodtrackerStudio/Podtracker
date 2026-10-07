import Link from "next/link";
import styles from "./profileSub.module.css";
import { usernameToPath } from "@/lib/routeParams";

type Tab = "profile" | "favorites" | "reviews" | "lists" | "diary";

/**
 * The tab strip across every profile sub-page.
 *
 * **`isOwnProfile` is not cosmetic.** This was written when a profile was only
 * ever your own, and it showed: Favorites linked at `/following`, which reads
 * the *viewer's* follows, so opening someone else's profile and pressing
 * Favorites listed your shows under their name. The labels had the same
 * assumption baked in — "Your Reviews" on a stranger's page.
 *
 * Both are driven by the same flag now: whose profile this is.
 */
export function ProfileSubHeader({
  username,
  avatarUrl,
  active,
  isOwnProfile,
}: {
  username: string;
  avatarUrl: string | null;
  active: Tab;
  isOwnProfile: boolean;
}) {
  return (
    <div className={styles.subHeader}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.avatar} src={avatarUrl ?? "/default-avatar.webp"} alt="Profile picture" />
      <div className={styles.subnav}>
        <Link href={`/user/${usernameToPath(username)}`} className={active === "profile" ? styles.active : undefined}>
          Profile
        </Link>
        <Link
          href={`/user/${usernameToPath(username)}/following`}
          className={active === "favorites" ? styles.active : undefined}
        >
          Favorites
        </Link>
        <Link href={`/user/${usernameToPath(username)}/reviews`} className={active === "reviews" ? styles.active : undefined}>
          {isOwnProfile ? "Your Reviews" : "Reviews"}
        </Link>
        <Link href={`/user/${usernameToPath(username)}/lists`} className={active === "lists" ? styles.active : undefined}>
          {isOwnProfile ? "Your lists" : "Lists"}
        </Link>
        <Link href={`/user/${usernameToPath(username)}/diary`} className={active === "diary" ? styles.active : undefined}>
          Full diary
        </Link>
      </div>
    </div>
  );
}
