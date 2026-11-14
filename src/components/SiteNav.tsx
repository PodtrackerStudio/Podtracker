import Link from "next/link";
import { PlusIcon, BellIcon } from "./icons";
import { SearchBox } from "./SearchBox";
import { LogoutButton } from "./LogoutButton";
import { NavMenu } from "./NavMenu";
import { getCurrentUser } from "@/lib/auth";
import { cleanTheme, themeCss } from "@/lib/theme";
import { getUnreadNotificationCount } from "@/lib/notifications";

type SiteNavProps = {
  active?: "home" | "profile" | "explore";
};

export async function SiteNav({ active }: SiteNavProps) {
  const user = await getCurrentUser();
  // The signed-in person's own colours and font, if they've chosen any. Here
  // because the nav is on every page that has a signed-in person and already
  // has them in hand. `cleanTheme` re-validates what the database holds before
  // it goes anywhere near a <style> tag.
  const css = user
    ? themeCss(cleanTheme({ main: user.themeMain, accent: user.themeAccent, font: user.themeFont }))
    : "";

  // One extra count on every signed-in page render. It is indexed on
  // (userId, readAt) so it is cheap, but it must never be the thing that
  // breaks the nav: a database blip should cost the badge, not the whole
  // site's navigation on every page.
  let unreadCount = 0;
  if (user) {
    try {
      unreadCount = await getUnreadNotificationCount(user.id);
    } catch (error) {
      console.error("[nav] could not read the notification count:", error);
    }
  }

  return (
    <>
    {css && <style id="personal-theme" dangerouslySetInnerHTML={{ __html: css }} />}
    <nav className="site-nav">
      {/* Logo sits directly on the blue nav — the PNG is transparent, so no
          tile behind it. See the contrast note in globals.css. */}
      <Link className="nav-logo-tile" href="/" aria-label="Podtracker home">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" />
      </Link>
      <Link className="nav-logo" href="/">
        Podtracker
      </Link>
      <SearchBox />
      <NavMenu>
        {user ? (
          <>
            <Link href="/home" className={active === "home" ? "active" : undefined}>
              Home
            </Link>
            <Link href={`/user/${user.username}`} className={active === "profile" ? "active" : undefined}>
              Profile
            </Link>
            <Link href="/following">Following</Link>
            <Link href="/explore" className={active === "explore" ? "active" : undefined}>
              Explore
            </Link>
            {/* The log flow: search, pick a show or episode, then the same
                review popup "Add Log / Review" opens on a podcast page. */}
            <Link href="/log" className="nav-log-btn">
              <PlusIcon size={14} />
              Log podcast
            </Link>
            {/* The bell sits immediately after "+ Log podcast" at the far
                right, which is where Sasha's Frame 21 puts it. The count is
                read on the server with the rest of the nav, so it is as fresh
                as the page around it — there is no polling. It therefore only
                updates on navigation, which for a site this size is the right
                trade. */}
            <Link
              href="/notifications"
              className="nav-bell"
              aria-label={
                unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"
              }
            >
              <BellIcon size={22} />
              {unreadCount > 0 && (
                /* The frame shows a bare red number tucked at the top right of
                   the bell, not a filled circle. Capped at 9+ so a long run of
                   unread notifications cannot push the nav around. */
                <span className="nav-bell-count">{unreadCount > 9 ? "9+" : unreadCount}</span>
              )}
            </Link>
            <LogoutButton />
            <Link href="/donate">Donate</Link>
          </>
        ) : (
          <>
            <Link href="/signup" className="nav-cta">
              Create account
            </Link>
            <Link href="/login">Login</Link>
            <Link href="/explore" className={active === "explore" ? "active" : undefined}>
              Explore
            </Link>
            <Link href="/donate">Donate</Link>
          </>
        )}
      </NavMenu>
    </nav>
    </>
  );
}
