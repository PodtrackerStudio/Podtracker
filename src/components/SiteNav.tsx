import Link from "next/link";
import { PlusIcon } from "./icons";
import { SearchBox } from "./SearchBox";
import { LogoutButton } from "./LogoutButton";
import { getCurrentUser } from "@/lib/auth";

type SiteNavProps = {
  active?: "home" | "profile" | "explore";
};

export async function SiteNav({ active }: SiteNavProps) {
  const user = await getCurrentUser();

  return (
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
      <div className="nav-links">
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
            {/* Links to Explore for now — there's no dedicated "log an episode" flow yet (rating/review persistence isn't wired up), so this just gets you to something you can open and log from its own page. */}
            <Link href="/explore" className="nav-log-btn">
              <PlusIcon size={14} />
              Log podcast
            </Link>
            <LogoutButton />
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
          </>
        )}
      </div>
    </nav>
  );
}
