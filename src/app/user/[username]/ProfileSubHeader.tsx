import Link from "next/link";
import styles from "./profileSub.module.css";

type Tab = "profile" | "favorites" | "reviews" | "lists" | "diary";

export function ProfileSubHeader({ username, avatarUrl, active }: { username: string; avatarUrl: string | null; active: Tab }) {
  return (
    <div className={styles.subHeader}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img className={styles.avatar} src={avatarUrl ?? "/default-avatar.webp"} alt="Profile picture" />
      <div className={styles.subnav}>
        <Link href={`/user/${username}`} className={active === "profile" ? styles.active : undefined}>
          Profile
        </Link>
        <Link href="/following" className={active === "favorites" ? styles.active : undefined}>
          Favorites
        </Link>
        <Link href={`/user/${username}/reviews`} className={active === "reviews" ? styles.active : undefined}>
          Your Reviews
        </Link>
        <Link href={`/user/${username}/lists`} className={active === "lists" ? styles.active : undefined}>
          Your lists
        </Link>
        <Link href={`/user/${username}/diary`} className={active === "diary" ? styles.active : undefined}>
          Full diary
        </Link>
      </div>
    </div>
  );
}
