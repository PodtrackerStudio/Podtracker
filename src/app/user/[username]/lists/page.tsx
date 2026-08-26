import Link from "next/link";
import { SiteNav } from "@/components/SiteNav";
import { SiteFooter } from "@/components/SiteFooter";
import { PlusIcon } from "@/components/icons";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { ProfileSubHeader } from "../ProfileSubHeader";
import styles from "../profileSub.module.css";

export default async function ListsPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params;
  const profileUser = await db.user.findUnique({ where: { username } });

  if (!profileUser) {
    return (
      <>
        <SiteNav active="profile" />
        <main className={styles.main}>
          <p style={{ textAlign: "center", padding: "80px 0", color: "var(--text-muted)" }}>No user found with username &ldquo;{username}&rdquo;.</p>
        </main>
        <SiteFooter />
      </>
    );
  }

  const viewer = await getCurrentUser();
  const isOwnProfile = viewer?.id === profileUser.id;

  // isWatchlist excluded: Next listening is stored as a List and would
  // otherwise show up here as a list the user made.
  const lists = await db.list.findMany({
    where: { userId: profileUser.id, isWatchlist: false },
    include: { items: { include: { podcast: true, episode: { include: { podcast: true } } }, take: 3 }, _count: { select: { items: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <SiteNav active="profile" />
      <main className={styles.main}>
        <ProfileSubHeader username={username} avatarUrl={profileUser.avatarUrl} active="lists" />

        {lists.length === 0 ? (
          <div className={styles.emptyWrap}>
            <p className={styles.emptyText}>No lists yet...</p>
            {isOwnProfile && (
              <Link href="/list/create" className={styles.emptyAction}>
                Create list
                <PlusIcon size={26} />
              </Link>
            )}
          </div>
        ) : (
          <>
            <div>
              {lists.map((list) => (
                <Link className={styles.listRow} href={`/list/${list.id}`} key={list.id}>
                  <div className={styles.listRowGallery}>
                    {list.items.map((item) => {
                      const cover = item.podcast?.coverUrl ?? item.episode?.coverUrl ?? item.episode?.podcast?.coverUrl ?? "https://picsum.photos/seed/listdefault/80/80";
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img className={styles.listRowGalleryImg} src={cover} alt="" key={item.id} />
                      );
                    })}
                  </div>
                  <div>
                    <div className={styles.listRowTitle}>{list.title}</div>
                    <div className={styles.listRowCount}>
                      {list._count.items} {list._count.items === 1 ? "podcast" : "podcasts"}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
            {isOwnProfile && (
              <div className={styles.addRow} style={{ marginTop: 24 }}>
                <Link href="/list/create" className={styles.emptyAction}>
                  Create list
                  <PlusIcon size={26} />
                </Link>
              </div>
            )}
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
