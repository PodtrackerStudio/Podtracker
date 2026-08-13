import Link from "next/link";

/** Frame 5, bottom strip. Social links are placeholders until accounts exist. */

const SOCIALS = [
  {
    label: "Facebook",
    href: "#",
    path: "M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.4h-1.2c-1.2 0-1.6.8-1.6 1.6V12h2.7l-.4 2.9h-2.3v7A10 10 0 0 0 22 12Z",
  },
  {
    label: "Instagram",
    href: "#",
    path: "M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c0 1.2-.2 1.8-.4 2.2-.2.6-.5 1-.9 1.4-.4.4-.8.7-1.4.9-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2 0-1.8-.2-2.2-.4-.6-.2-1-.5-1.4-.9-.4-.4-.7-.8-.9-1.4-.2-.4-.4-1-.4-2.2-.1-1.3-.1-1.7-.1-4.9s0-3.6.1-4.9c0-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4 1.3-.1 1.7-.1 4.9-.1Zm0 3.3a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13Zm0 10.7a4.2 4.2 0 1 1 0-8.4 4.2 4.2 0 0 1 0 8.4Zm6.8-11a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0Z",
  },
  {
    label: "X",
    href: "#",
    path: "M18.9 2H22l-7 8 8.2 12H16l-5.2-7.4L4.8 22H1.7l7.5-8.6L1.3 2h7l4.7 6.8L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z",
  },
];

export function SiteFooter() {
  return (
    <footer className="mt-8 border-t border-ink/10 px-6 py-8">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-6">
        <nav aria-label="Footer">
          <ul className="flex gap-8 font-serif text-lg">
            <li>
              <Link href="/about" className="hover:underline">
                About us
              </Link>
            </li>
            <li>
              <Link href="/contact" className="hover:underline">
                Contact us
              </Link>
            </li>
          </ul>
        </nav>

        <ul className="flex items-center gap-4">
          {SOCIALS.map((social) => (
            <li key={social.label}>
              <a
                href={social.href}
                aria-label={social.label}
                className="block transition-opacity hover:opacity-70"
              >
                <svg viewBox="0 0 24 24" className="size-8" fill="currentColor">
                  <path d={social.path} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </footer>
  );
}
