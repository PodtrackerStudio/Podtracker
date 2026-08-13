import Link from "next/link";

/** Frame 2 of the design: the persistent top navigation. */

const NAV_LINKS = [
  { label: "Home", href: "/" },
  { label: "Profile", href: "/profile" },
  { label: "Following", href: "/following" },
  { label: "Explore", href: "/explore" },
  { label: "Genres", href: "/genres" },
];

export function SiteHeader() {
  return (
    <header className="w-full bg-panel">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4">
        <Link href="/" className="font-serif text-2xl tracking-tight">
          Podtracker
        </Link>

        <form
          role="search"
          className="flex flex-1 items-center gap-2 sm:max-w-xs"
          // No search backend yet; the field is present so the layout matches
          // the design and the route exists to wire up later.
          action="/explore"
        >
          <label htmlFor="site-search" className="sr-only">
            Search podcasts and episodes
          </label>
          <svg
            aria-hidden="true"
            viewBox="0 0 24 24"
            className="size-5 shrink-0 text-ink/70"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" strokeLinecap="round" />
          </svg>
          <input
            id="site-search"
            name="q"
            type="search"
            placeholder="Search"
            className="w-full rounded-full bg-canvas px-4 py-1.5 text-sm outline-none placeholder:text-ink/40 focus-visible:ring-2 focus-visible:ring-accent"
          />
        </form>

        <nav aria-label="Main">
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-lg">
            {NAV_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="hover:underline">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <Link
          href="/log"
          className="rounded-md bg-accent px-4 py-2 text-white transition-colors hover:bg-accent/85"
        >
          + Log podcast
        </Link>
      </div>
    </header>
  );
}
