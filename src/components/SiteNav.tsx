import Link from "next/link";
import { PlusIcon } from "./icons";
import { SearchBox } from "./SearchBox";
import { LogoutButton } from "./LogoutButton";
import { NavMenu } from "./NavMenu";
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
  );
}
