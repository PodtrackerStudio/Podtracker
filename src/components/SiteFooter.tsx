import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        {/* /about renders the same What is Podtracker? section the landing page
            shows. It used to anchor into the landing page, which redirects
            signed-in users to /home — so About Us was dead for anyone with an
            account. */}
        <Link href="/about">About Us</Link>
        <a href="#">Contact us</a>
        {/* Also in the nav now, top right. Kept here too: the footer is where
            people look for a donate link on a page that isn't the home page. */}
        <Link href="/donate">Donate</Link>
      </div>
      <div className="footer-social">
        <a href="#">f</a>
        <a href="#">𝕏</a>
        <a href="#">▶</a>
        <a href="#">d</a>
      </div>
    </footer>
  );
}
