export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-links">
        <a href="#">About Us</a>
        <a href="#">Contact us</a>
        {/* The donation page needs a way in. The footer is the conventional home
            for it and leaves the nav untouched — move it if Sasha wants it more
            prominent. */}
        <a href="/donate">Donate</a>
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
