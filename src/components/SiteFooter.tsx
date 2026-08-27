import Link from "next/link";

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        {/* About Us goes to the landing page's "What is Podtracker?" section —
            Sasha's call, rather than a page of its own. **Signed-in users are
            redirected off `/` to `/home`**, so this only lands for signed-out
            visitors; a fragment never reaches the server, so that redirect
            cannot know to make an exception. See the change log. */}
        <Link href="/#what-is-podtracker">About Us</Link>
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
