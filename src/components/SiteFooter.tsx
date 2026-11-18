import Link from "next/link";
import { FacebookIcon, XIcon, InstagramIcon, TikTokIcon } from "./icons";

/** Podtracker's accounts, in the order Sasha listed them. */
const SOCIALS = [
  { name: "Facebook", href: "https://www.facebook.com/profile.php?id=61593536326155", Icon: FacebookIcon },
  { name: "X", href: "https://x.com/PodTracker_13", Icon: XIcon },
  { name: "Instagram", href: "https://www.instagram.com/podtracker_13/", Icon: InstagramIcon },
  { name: "TikTok", href: "https://www.tiktok.com/@podtracker_13", Icon: TikTokIcon },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        {/* /about renders the same What is Podtracker? section the landing page
            shows. It used to anchor into the landing page, which redirects
            signed-in users to /home — so About Us was dead for anyone with an
            account. */}
        <Link href="/about">About Us</Link>
        {/* Was a `mailto:` until 2026-11-17, on the reasoning that a form with
            no backend going silently nowhere would be worse than none. The
            form now has one — Discord plus a stored row — and reports failure
            rather than thanking you for a message that vanished, so the
            objection no longer holds.

            One link, not two: a footer offering both "Contact us" and
            "Feedback" makes people stop and wonder which one they want. */}
        <Link href="/contact">Contact us</Link>
        {/* Also in the nav now, top right. Kept here too: the footer is where
            people look for a donate link on a page that isn't the home page. */}
        <Link href="/donate">Donate</Link>
        {/* Last, the way legal links conventionally sit — findable without
            competing with the links people actually came for. */}
        <Link href="/terms">Terms</Link>
        <Link href="/privacy">Privacy</Link>
      </div>
      <div className="footer-social">
        {/* Were the letters "f", "𝕏", "▶" and "d" — a stand-in for the marks,
            and one of them was YouTube rather than a network on this list.
            aria-label carries the name, since the glyph itself says nothing to
            a screen reader. */}
        {SOCIALS.map(({ name, href, Icon }) => (
          <a key={name} href={href} aria-label={name} title={name} target="_blank" rel="noopener noreferrer">
            <Icon />
          </a>
        ))}
      </div>
    </footer>
  );
}
